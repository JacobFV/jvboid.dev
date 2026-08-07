"use client";

import { useEffect, useRef } from "react";

// A bioluminescent mesh that lives in the page's margins.
//
// The field is generated in *document* space — a node at document
// y = 8400 stays at 8400 — so scrolling reveals different parts of one
// long organism rather than replaying a viewport-local animation. The
// canvas itself stays fixed and viewport-sized, and the scroll offset is
// folded into the draw transform. (A canvas literally as tall as the
// document would be 10-20k px on a page like /projects: past Chrome's
// per-side limit, and hundreds of MB of backing store for something that
// is ~99% off screen at any moment.)
//
// Density peaks at the viewport edges and Gaussian-decays inward,
// reaching ~0 *before the content column* rather than before the
// viewport edge. That is what guarantees the mesh can never end up
// behind text — the failure that got the previous backdrop deleted (see
// docs/DESIGN.md). When the viewport is too narrow to have gutters, the
// falloff has nowhere to live and the component renders nothing at all.
//
// Three spatial scales are drawn, so it reads as a structure inhabiting
// the boundary rather than a graph-viz demo:
//
//   membranes  long bezier folds following the edge      ~400-700px
//   filaments  the network proper, between nearby nodes   ~40-120px
//   nodes      points with a cheap two-circle halo          ~1-4px
//
// Motion is deliberately near-subliminal: a couple of px of drift over
// tens of seconds, plus excitation pulses on a small fraction of edges.
// Anything faster reads as a screensaver.

// --- configuration -------------------------------------------------------

/** Vertical generation block, px. Geometry is seeded per block. */
const CHUNK_H = 700;
/**
 * Nodes per px² of gutter area, before noise rejection. This has to be
 * read together with CONNECT_R: at density d the mean spacing is
 * ~1/sqrt(d * 0.675), and if that exceeds the connect radius almost no
 * node finds a neighbour and there is no network, just dust. 0.00035
 * puts mean spacing near 65px against a 90px radius.
 */
const DENSITY = 0.00035;
/** Widest content container on the site (`max-w-5xl`). */
const CONTENT_W = 1024;
/**
 * The mesh always gets at least this much band to live in, even when the
 * viewport is too narrow to have real gutters (phones, split windows,
 * zoomed-in desktops). Past that point it is borrowing space the text
 * column also wants, so `encroach` below fades it back hard — a faint
 * fringe hugging both edges rather than a network behind the words.
 */
const MIN_BAND = 74;
/** Alpha multiplier once the band is entirely borrowed from the column. */
const ENCROACH_FLOOR = 0.3;
/** Fraction of the band the Gaussian uses as its width. */
const FEATHER = 0.62;
const CONNECT_R = 90;
const MAX_CONN = 3;
/** Segments per membrane. Also the resolution of its fade envelope. */
const MEMBRANE_STEPS = 8;
const NODE_R_MIN = 0.8;
const NODE_R_MAX = 3;
/** Redraw budget. The motion is slow enough that 25fps is invisible. */
const FRAME_MS = 40;
/** Roughly what share of edges carry a travelling pulse at any time. */
const PULSE_SHARE = 0.02;
const PULSE_MS_MIN = 4200;
const PULSE_MS_MAX = 9000;

// --- deterministic noise -------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer hash → [0, 1). The lattice under the value noise below. */
function hash2(x: number, y: number, seed: number) {
  let h =
    Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Smooth 2D value noise. This is the single most important ingredient:
 * a uniform feather field looks like a CSS gradient with dots on it,
 * whereas a correlated field grows patches where the mesh reaches
 * further inward and patches where there is almost nothing — which is
 * what makes it read as something living in the margin.
 */
function vnoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  return lerp(
    lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), u),
    lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), u),
    v,
  );
}

// --- geometry ------------------------------------------------------------

type Node = {
  x: number;
  y: number;
  r: number;
  /** Edge falloff × per-node jitter. Scales every alpha it touches. */
  strength: number;
  /** Drift parameters — a couple of px over tens of seconds. */
  phase: number;
  amp: number;
  rate: number;
};

type Edge = { a: number; b: number; curve: number };

type Membrane = {
  pts: number[];
  strands: number;
  strength: number;
  phase: number;
  rate: number;
  sway: number;
};

type Pulse = { edge: number; start: number; dur: number };

/**
 * Gaussian falloff measured inward from the viewport edge, normalised
 * against the band so alpha is ~0.07 by the time it reaches the band's
 * inner limit. On wide viewports the band *is* the gutter, so the mesh
 * dies before the content column; on narrow ones the band is MIN_BAND
 * and the falloff simply gets tighter.
 */
function feather(x: number, width: number, band: number) {
  const d = Math.min(x, width - x);
  const w = band * FEATHER;
  return Math.exp(-((d / w) ** 2));
}

/** The band actually available, and how much to fade for borrowing it. */
function bandOf(width: number) {
  const gutter = Math.max(0, (width - CONTENT_W) / 2);
  const band = Math.max(gutter, MIN_BAND);
  const encroach =
    gutter >= MIN_BAND
      ? 1
      : ENCROACH_FLOOR + (1 - ENCROACH_FLOOR) * (gutter / MIN_BAND);
  return { band, encroach };
}

/** One vertical block of nodes. Seeded by index, so block 17 is always block 17. */
function buildNodes(
  chunk: number,
  width: number,
  band: number,
  encroach: number,
): Node[] {
  const rng = mulberry32(Math.imul(chunk + 1, 0x9e3779b1) ^ 0x5eed1a2b);
  const y0 = chunk * CHUNK_H;
  const target = Math.floor(2 * band * CHUNK_H * DENSITY);
  // Drift scales with the room available — 20px of wander reads as life
  // in a 448px gutter and as chaos in a 74px fringe.
  const ampScale = Math.max(0.35, Math.min(1.6, band / 200));
  // Nodes are sampled over a shortened band so that the widest possible
  // excursion still lands inside it. Without this the drift added below
  // would let edge nodes wander past the content boundary — faintly, but
  // the whole point of the design is that they cannot.
  const maxDrift = 14 * ampScale + 9 * Math.max(0.35, Math.min(1.5, band / 220));
  const usable = Math.max(24, band - maxDrift);
  const nodes: Node[] = [];

  for (let i = 0; i < target; i++) {
    // Square the depth so samples bunch against the actual edge.
    const depth = rng() ** 2 * usable;
    const x = rng() < 0.5 ? depth : width - depth;
    const y = y0 + rng() * CHUNK_H;

    // Patchiness comes from the noise field; the edge falloff is carried
    // by `strength` instead, so the two effects stay separable.
    if (rng() > 0.35 + 0.65 * vnoise(x * 0.002, y * 0.002, 1337)) continue;

    nodes.push({
      x,
      y,
      r: NODE_R_MIN + rng() * (NODE_R_MAX - NODE_R_MIN),
      // The jitter floor matters: at 0.35 the random factor was dimming
      // half the field below the visible threshold on light backgrounds.
      strength: feather(x, width, band) * (0.55 + rng() * 0.45) * encroach,
      phase: rng() * Math.PI * 2,
      amp: (4 + rng() * 10) * ampScale,
      // Periods of roughly 40-160s. Slow enough to read as drift rather
      // than animation, fast enough that the field is visibly different
      // if you look back a minute later.
      rate: 0.04 + rng() * 0.12,
    });
  }
  return nodes;
}

/**
 * Sparse geometric graph over the active nodes, via a uniform grid so it
 * stays linear in node count. Built across the whole active set rather
 * than per block, which is what keeps chunk seams from showing.
 */
function buildEdges(nodes: Node[]): Edge[] {
  const cell = CONNECT_R;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < nodes.length; i++) {
    const k = `${Math.floor(nodes[i].x / cell)},${Math.floor(nodes[i].y / cell)}`;
    const bucket = grid.get(k);
    if (bucket) bucket.push(i);
    else grid.set(k, [i]);
  }

  const edges: Edge[] = [];
  const near: { j: number; d: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    const gx = Math.floor(a.x / cell);
    const gy = Math.floor(a.y / cell);
    near.length = 0;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = grid.get(`${gx + dx},${gy + dy}`);
        if (!bucket) continue;
        for (const j of bucket) {
          if (j <= i) continue;
          const b = nodes[j];
          // Never bridge the left margin to the right one.
          if (Math.abs(a.x - b.x) > CONNECT_R) continue;
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < CONNECT_R) near.push({ j, d });
        }
      }
    }

    near.sort((p, q) => p.d - q.d);
    const take = Math.min(near.length, MAX_CONN);
    for (let k = 0; k < take; k++) {
      // Curvature seeded off the pair, so an edge keeps its bend across
      // rebuilds instead of flicking to a new one when a chunk reloads.
      edges.push({ a: i, b: near[k].j, curve: (hash2(i, near[k].j, 77) - 0.5) * 0.44 });
    }
  }
  return edges;
}

/**
 * The macro scale: a correlated random walk down the gutter, drawn as a
 * few near-parallel strands so it reads as a translucent fold rather
 * than a line.
 */
function buildMembranes(
  chunk: number,
  width: number,
  band: number,
  encroach: number,
): Membrane[] {
  const rng = mulberry32(Math.imul(chunk + 1, 0x85ebca6b) ^ 0x1234567);
  const y0 = chunk * CHUNK_H;
  const out: Membrane[] = [];
  const count = 1 + Math.floor(rng() * 2);

  for (let m = 0; m < count; m++) {
    const left = rng() < 0.5;
    // Walk x within the band, biased shallow, and let it wander.
    let x = rng() ** 1.6 * band * 0.8;
    const pts: number[] = [];
    for (let s = 0; s <= MEMBRANE_STEPS; s++) {
      pts.push(left ? x : width - x, y0 + (CHUNK_H / MEMBRANE_STEPS) * s);
      x = Math.max(4, Math.min(band, x + (rng() - 0.45) * band * 0.55));
    }
    out.push({
      pts,
      strands: 3 + Math.floor(rng() * 3),
      strength: (0.5 + rng() * 0.5) * encroach,
      // Each membrane sways on its own long period.
      phase: rng() * Math.PI * 2,
      rate: 0.02 + rng() * 0.04,
      sway: (6 + rng() * 10) * Math.max(0.35, Math.min(1.4, band / 220)),
    });
  }
  return out;
}

// --- paint ---------------------------------------------------------------

function rgb(value: string, fallback: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

type Paint = {
  dark: boolean;
  glow: string;
  hot: string;
  membrane: number;
  filament: number;
  node: number;
  halo: number;
  pulse: number;
};

function readPaint(): Paint {
  const cs = getComputedStyle(document.documentElement);
  const dark = document.documentElement.getAttribute("data-theme") !== "light";
  const accent = rgb(cs.getPropertyValue("--color-accent"), "255,107,53");
  const ink = rgb(cs.getPropertyValue("--color-ink"), "242,244,248");

  // Dark: emissive points on a night field, composited additively.
  // Light: the same topology as faint ink in the margin — paper does not
  // glow, and `lighter` over near-white would simply erase it.
  // Note these are all multiplied by a node's `strength` (edge falloff ×
  // jitter), which averages ~0.35 — so the effective on-screen alpha is
  // roughly a third of what is written here. Tuned by measuring actual
  // rendered pixels, not by eye off the numbers.
  return dark
    ? {
        dark: true,
        glow: accent,
        hot: "255,214,170",
        membrane: 0.05,
        filament: 0.35,
        node: 0.95,
        halo: 0.26,
        pulse: 1,
      }
    : {
        dark: false,
        glow: ink,
        hot: accent,
        membrane: 0.1,
        filament: 0.38,
        node: 0.85,
        halo: 0.22,
        pulse: 0.9,
      };
}

/** Point on a quadratic bezier, for placing a pulse along a filament. */
function quadAt(
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  t: number,
) {
  const u = 1 - t;
  return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

export function Bioluminescence() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let band = 0;
    let encroach = 1;
    let dpr = 1;
    let paint = readPaint();

    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let membranes: Membrane[] = [];
    let pulses: Pulse[] = [];
    let range = [-1, -1];
    // Drifted positions, recomputed per frame so the graph and the draw
    // agree about where a node currently is.
    let dx: Float32Array = new Float32Array(0);
    let dy: Float32Array = new Float32Array(0);

    const measure = () => {
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      ({ band, encroach } = bandOf(width));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    /** Rebuild the active window of chunks around the current scroll. */
    const rebuild = (scroll: number) => {
      const first = Math.max(0, Math.floor(scroll / CHUNK_H) - 1);
      const last = Math.floor((scroll + height) / CHUNK_H) + 1;
      if (first === range[0] && last === range[1]) return;
      range = [first, last];

      nodes = [];
      membranes = [];
      for (let c = first; c <= last; c++) {
        nodes.push(...buildNodes(c, width, band, encroach));
        membranes.push(...buildMembranes(c, width, band, encroach));
      }
      edges = buildEdges(nodes);
      dx = new Float32Array(nodes.length);
      dy = new Float32Array(nodes.length);
      // Pulses index into `edges`, so they cannot survive a rebuild.
      // They are faint and short; dropping them is imperceptible.
      pulses = [];
    };

    // Stroked one segment at a time rather than as a single path, so each
    // segment can carry its own alpha. That envelope is what makes a
    // membrane fade up out of nothing and dissolve again inside its own
    // chunk — otherwise every strand would terminate on the chunk
    // boundary and the 700px generation grid would be visible as a row
    // of hard endpoints down both margins.
    const drawMembrane = (m: Membrane, t: number) => {
      const base = paint.membrane * m.strength;
      // Whole-membrane sway, so the macro folds migrate across the band
      // over a minute or two instead of sitting still.
      const swayX = still ? 0 : Math.sin(t * m.rate + m.phase) * m.sway;
      ctx.lineWidth = 0.7;
      for (let s = 0; s < m.strands; s++) {
        // Near-parallel offsets: the stack is the membrane, not any one line.
        const off = (s - m.strands / 2) * 2.6 + swayX;
        const fade = 1 - Math.abs(off) / 24;
        for (let i = 0; i < MEMBRANE_STEPS; i++) {
          const k = i * 2;
          const mid = (i + 0.5) / MEMBRANE_STEPS;
          const env = Math.sin(mid * Math.PI) ** 1.5;
          ctx.strokeStyle = `rgba(${paint.glow},${base * fade * env})`;
          ctx.beginPath();
          ctx.moveTo(m.pts[k] + off, m.pts[k + 1]);
          // Midpoint control turns the walk into a continuous fold.
          const cx = (m.pts[k] + m.pts[k + 2]) / 2 + off;
          const cy = (m.pts[k + 1] + m.pts[k + 3]) / 2;
          ctx.quadraticCurveTo(cx, cy, m.pts[k + 2] + off, m.pts[k + 3]);
          ctx.stroke();
        }
      }
    };

    const draw = (t: number, scroll: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // No width gate any more: `bandOf` always yields a workable band,
      // and `encroach` (folded into every node's strength at build time)
      // is what keeps the narrow case from crowding the text.
      if (width < 260) return;

      // Everything below is in document coordinates.
      ctx.setTransform(dpr, 0, 0, dpr, 0, -scroll * dpr);
      ctx.globalCompositeOperation = paint.dark ? "lighter" : "source-over";
      ctx.lineCap = "round";

      for (const m of membranes) drawMembrane(m, t);

      // Two motions superposed. The per-node term is independent wander;
      // the coherent term is a slow standing wave keyed to position, so
      // neighbouring nodes move *together* and whole patches of the mesh
      // breathe rather than every point jittering on its own.
      if (!still) {
        const flow = Math.max(0.35, Math.min(1.5, band / 220));
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          dx[i] =
            Math.sin(t * n.rate + n.phase) * n.amp +
            Math.sin(t * 0.045 + n.x * 0.004 + n.y * 0.0015) * 9 * flow;
          dy[i] =
            Math.cos(t * n.rate * 0.8 + n.phase) * n.amp * 0.6 +
            Math.cos(t * 0.037 + n.y * 0.003) * 7 * flow;
        }
      }

      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const ax = a.x + dx[e.a];
        const ay = a.y + dy[e.a];
        const bx = b.x + dx[e.b];
        const by = b.y + dy[e.b];
        // Perpendicular offset on the midpoint gives an organic strand
        // instead of a triangulation edge.
        const cx = (ax + bx) / 2 - (by - ay) * e.curve;
        const cy = (ay + by) / 2 + (bx - ax) * e.curve;
        ctx.strokeStyle = `rgba(${paint.glow},${paint.filament * Math.min(a.strength, b.strength)})`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const x = n.x + dx[i];
        const y = n.y + dy[i];
        // Two circles rather than shadowBlur — a real blur per node is
        // an order of magnitude more expensive for the same read.
        ctx.fillStyle = `rgba(${paint.glow},${paint.halo * n.strength})`;
        ctx.beginPath();
        ctx.arc(x, y, n.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${paint.hot},${paint.node * n.strength})`;
        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      const now = t * 1000;
      for (const p of pulses) {
        const e = edges[p.edge];
        if (!e) continue;
        const a = nodes[e.a];
        const b = nodes[e.b];
        const k = (now - p.start) / p.dur;
        if (k < 0 || k > 1) continue;
        const ax = a.x + dx[e.a];
        const ay = a.y + dy[e.a];
        const bx = b.x + dx[e.b];
        const by = b.y + dy[e.b];
        const cx = (ax + bx) / 2 - (by - ay) * e.curve;
        const cy = (ay + by) / 2 + (bx - ax) * e.curve;
        const [px, py] = quadAt(ax, ay, cx, cy, bx, by, k);
        // Fade in and out so a pulse never pops at either terminal.
        const env = Math.sin(k * Math.PI) ** 2;
        ctx.fillStyle = `rgba(${paint.hot},${paint.pulse * env * Math.min(a.strength, b.strength)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
    };

    // --- loop ---
    const t0 = performance.now();
    let raf = 0;
    let last = -Infinity;
    // Kept so a resize can repaint at the current animation time instead
    // of snapping the drift back to t = 0.
    let clock = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      last = now;

      const scroll = window.scrollY;
      rebuild(scroll);

      const t = (now - t0) / 1000;
      clock = t;
      const want = Math.round(edges.length * PULSE_SHARE);
      pulses = pulses.filter((p) => now - p.start < p.dur);
      while (pulses.length < want && edges.length) {
        pulses.push({
          edge: Math.floor(Math.random() * edges.length),
          start: now,
          dur: PULSE_MS_MIN + Math.random() * (PULSE_MS_MAX - PULSE_MS_MIN),
        });
      }
      draw(t, scroll);
    };

    measure();
    if (still) {
      // One static frame: the topology, none of the motion.
      rebuild(window.scrollY);
      draw(0, window.scrollY);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => {
      measure();
      // x depends on width, so a width change invalidates every chunk.
      range = [-1, -1];
      rebuild(window.scrollY);
      // Assigning canvas.width in measure() wipes the backing store, so
      // this repaint is not optional: without it the mesh is blank from
      // here until the next animation frame (and forever, on the
      // reduced-motion path, which has no frames at all).
      draw(clock, window.scrollY);
    };
    window.addEventListener("resize", onResize);

    // The header's theme toggle flips `data-theme` on <html>.
    const themeObserver = new MutationObserver(() => {
      paint = readPaint();
      if (still) draw(0, window.scrollY);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      themeObserver.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="biolume" aria-hidden />;
}
