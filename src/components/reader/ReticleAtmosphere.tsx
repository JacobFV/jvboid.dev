"use client";

import { useRef } from "react";
import { useCanvasField, useWorld } from "./atmosphere";

/**
 * The precisionbom project page, dressed as precisionbom.com.
 *
 * The site is one idea executed hard: a black field, a faint green survey grid
 * over it, a serif wordmark with a *targeting reticle* punched through the O,
 * and everything else — nav, status line, terminal panel, buttons — in a mono
 * with square corners and a phosphor-green accent. "Precision sourcing for
 * precision engineering", and the reticle is the argument.
 *
 * So the backdrop is the instrument: the survey grid, a large reticle off to
 * the right where the site puts its own, its rings turning at different rates,
 * ticks around the outer ring, and a slow sweep line through the whole thing.
 * The grid parallaxes against the reticle on scroll so the two read as separate
 * planes rather than one flat texture.
 *
 * Under both of those runs the thing precisionBOM is actually about: **copper.**
 * The product exists because a bill of materials is a list of parts that end up
 * soldered to a board, so the field routes buses across the page the way a
 * board does — bundles of parallel traces on a fixed pitch, turning only in 45°
 * and 90° steps, offset around each corner with a real mitre so the bundle
 * stays parallel through the bend. Ribbons, not single routes: one wire on a
 * black field is a diagram, and a bus is what a board looks like.
 *
 * They are alive. Each trace carries a pulse marching along it, staggered
 * across the bundle so a word arrives on the bus one bit at a time — done with
 * a dash pattern rather than by walking the polyline, which hands the whole
 * arc-length problem to the rasteriser and costs one `stroke` per trace.
 *
 * Dark is forced, for jterm's reason: the product has exactly one look. A white
 * precisionbom is a picture of some other product, and the phosphor green only
 * means phosphor against black.
 */

/** Ring radii as fractions of the reticle's reach, with their own turn rates
 *  (in turns per second) and tick counts. A ring with no ticks is a plain
 *  circle and turning it would be invisible, so every turning ring has some. */
const RINGS = [
  { r: 1.0, rate: 0.012, ticks: 48, tick: 0.05, width: 1 },
  { r: 0.78, rate: -0.021, ticks: 12, tick: 0.09, width: 1.5 },
  { r: 0.5, rate: 0.034, ticks: 24, tick: 0.06, width: 1 },
  { r: 0.22, rate: -0.05, ticks: 4, tick: 0.16, width: 1.5 },
];

const GRID = 44;

type Bus = {
  /** Where the bundle enters, as a fraction of the window. */
  from: [number, number];
  /**
   * The route, as `[direction, length]` pairs. Direction is one of the eight
   * compass steps a router is allowed — `0` is due east and each increment is
   * 45° clockwise on screen — and length is in units of the *uniform* scale, so
   * a 45° segment is still 45° after the window changes shape. Mapping the two
   * axes independently would have quietly turned every diagonal into some other
   * angle, which is the one thing a board never contains.
   */
  steps: [number, number][];
  /** Traces in the bundle, and the gap between them in CSS pixels. */
  traces: number;
  pitch: number;
  /** Pixels per second the pulses travel, and how far behind its neighbour each
   *  trace's pulse runs. Negative speed sends the word the other way. */
  speed: number;
  stagger: number;
  /** Fraction of `TRAVEL` this bundle shifts over a full read. */
  depth: number;
};

/**
 * Six bundles, routed to sit in the gutters and cross the corners. The centre
 * of the window is left to the reading column — the field is masked there in
 * any case, but a bus running under a paragraph would be wrong even faint.
 */
const BUSES: Bus[] = [
  // Down the left gutter, stepping in twice.
  { from: [-0.06, 0.12], steps: [[0, 0.16], [1, 0.1], [2, 0.34], [1, 0.08], [2, 0.5]], traces: 8, pitch: 5, speed: 62, stagger: 0.18, depth: 0.35 },
  // Across the top, breaking out to the right edge.
  { from: [0.1, -0.05], steps: [[2, 0.12], [1, 0.14], [0, 0.42], [7, 0.12], [0, 0.6]], traces: 6, pitch: 6, speed: -74, stagger: 0.22, depth: 0.7 },
  // The long diagonal under the reticle.
  { from: [0.42, 1.08], steps: [[6, 0.2], [7, 0.26], [0, 0.3], [7, 0.34]], traces: 10, pitch: 4, speed: 96, stagger: 0.1, depth: 1.0 },
  // Right gutter, dropping to the fold.
  { from: [1.07, 0.3], steps: [[4, 0.24], [3, 0.12], [4, 0.3], [5, 0.1], [4, 0.4]], traces: 5, pitch: 7, speed: 54, stagger: 0.3, depth: 0.5 },
  // A short bus across the bottom-left corner.
  { from: [-0.05, 0.86], steps: [[0, 0.2], [7, 0.14], [0, 0.44]], traces: 12, pitch: 4, speed: -110, stagger: 0.07, depth: 0.85 },
  // And one high on the right, running back into the reticle.
  { from: [1.06, 0.08], steps: [[4, 0.14], [3, 0.2], [2, 0.26]], traces: 4, pitch: 8, speed: 44, stagger: 0.35, depth: 0.2 },
];

/** How far the deepest bundle shifts over a full read, as a fraction of the
 *  window height. The buses travel *with* the reader; the grid drifts against
 *  them, and the reticle rides between the two. */
const TRAVEL = 0.16;

/** Length of the lit part of a pulse, and of the dark run behind it, in CSS
 *  pixels. A long gap is what makes it read as one packet passing rather than
 *  as a dashed line. */
const PULSE = 16;
const GAP = 190;

type Built = { copper: Path2D; traces: Path2D[]; bus: Bus };

/** One of the eight allowed directions as a unit vector. Screen y grows
 *  downward, which is why `offsetRoute` takes "left of travel" as `(sin, -cos)`
 *  rather than the other sign. */
function dir(d: number): [number, number] {
  const a = (d * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

/**
 * The route's centreline, offset sideways by `o` pixels with a proper mitre at
 * each bend.
 *
 * Offsetting each segment independently and joining the results is the version
 * that looks right until the first 45° corner, where the traces on the outside
 * of the bend visibly separate. The mitre keeps the pitch constant through the
 * turn, which is exactly what a board's bus does and the reason this reads as
 * routing rather than as a bundle of drawn lines.
 */
function offsetRoute(pts: [number, number][], dirs: [number, number][], o: number): Path2D {
  const p = new Path2D();
  const n = pts.length;
  for (let i = 0; i < n; i += 1) {
    // Incoming and outgoing directions at this vertex; at the two ends there is
    // only one, so the mitre degenerates to a plain normal offset.
    const a = dirs[Math.max(0, i - 1)];
    const b = dirs[Math.min(dirs.length - 1, i)];
    const nax = a[1];
    const nay = -a[0];
    const nbx = b[1];
    const nby = -b[0];
    let mx = nax + nbx;
    let my = nay + nby;
    const len = Math.hypot(mx, my);
    // A perfect reversal has no mitre. Routers do not emit one; guard anyway.
    if (len < 1e-6) {
      mx = nax;
      my = nay;
    } else {
      mx /= len;
      my /= len;
    }
    const scale = o / Math.max(0.35, mx * nax + my * nay);
    const x = pts[i][0] + mx * scale;
    const y = pts[i][1] + my * scale;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

function build(bus: Bus, w: number, h: number): Built {
  const s = Math.max(w, h);
  const pts: [number, number][] = [[bus.from[0] * w, bus.from[1] * h]];
  const dirs: [number, number][] = [];
  for (const [d, len] of bus.steps) {
    const [dx, dy] = dir(d);
    dirs.push([dx, dy]);
    const last = pts[pts.length - 1];
    pts.push([last[0] + dx * len * s, last[1] + dy * len * s]);
  }
  const traces: Path2D[] = [];
  // Centred on the route, so widening a bundle grows it both ways rather than
  // walking it off its anchor.
  const first = -((bus.traces - 1) * bus.pitch) / 2;
  for (let i = 0; i < bus.traces; i += 1) {
    traces.push(offsetRoute(pts, dirs, first + i * bus.pitch));
  }
  const copper = new Path2D();
  for (const tr of traces) copper.addPath(tr);
  return { copper, traces, bus };
}

export function ReticleAtmosphere() {
  useWorld("reticle", "dark");

  const builtRef = useRef<Built[]>([]);

  const canvasRef = useCanvasField({
    fps: 24,
    measure({ w, h }) {
      builtRef.current = BUSES.map((b) => build(b, w, h));
    },
    draw({ ctx, w, h, t, scroll }) {
      const green = "#22c55e";

      // The survey grid. Drifts a little against the scroll, which is the only
      // thing separating it from the reticle's plane.
      const drift = (scroll * GRID * 3) % GRID;
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = green;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -drift; x < w + GRID; x += GRID) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, h);
      }
      for (let y = -drift; y < h + GRID; y += GRID) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(w, Math.round(y) + 0.5);
      }
      ctx.stroke();

      // The copper. Two passes over the same paths: the traces themselves, then
      // the pulses on top through a dash pattern whose offset is the clock.
      // Building the geometry per frame would be the expensive version of this;
      // it is built once per resize and only the dash phase moves.
      ctx.lineCap = "butt";
      for (const { copper, traces, bus } of builtRef.current) {
        ctx.save();
        ctx.translate(0, -h * TRAVEL * bus.depth * scroll);

        ctx.setLineDash([]);
        ctx.globalAlpha = 0.14;
        ctx.lineWidth = 1;
        ctx.strokeStyle = green;
        ctx.stroke(copper);

        // One pulse per trace, each a fixed distance behind the last, so the
        // bundle reads as a word in flight rather than as a bar moving sideways.
        ctx.setLineDash([PULSE, GAP]);
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "#a7f3c4";
        const period = PULSE + GAP;
        for (let i = 0; i < traces.length; i += 1) {
          ctx.lineDashOffset = -(t * bus.speed + i * bus.stagger * period);
          ctx.stroke(traces[i]);
        }

        ctx.restore();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;

      // The reticle sits where the site puts it: low and to the right, mostly
      // off the edge, so it frames the column rather than sitting behind it.
      const cx = w * 0.86;
      const cy = h * (0.62 - 0.18 * scroll);
      const reach = Math.max(w, h) * 0.34;

      ctx.save();
      ctx.translate(cx, cy);

      for (const ring of RINGS) {
        const radius = reach * ring.r;
        const turn = t * ring.rate * Math.PI * 2;

        ctx.globalAlpha = 0.13;
        ctx.lineWidth = ring.width;
        ctx.strokeStyle = green;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Ticks: short radial marks outside the ring. This is what a reticle
        // has and a decorative circle does not.
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        for (let i = 0; i < ring.ticks; i += 1) {
          const a = turn + (i / ring.ticks) * Math.PI * 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          ctx.moveTo(cos * radius, sin * radius);
          ctx.lineTo(cos * radius * (1 + ring.tick), sin * radius * (1 + ring.tick));
        }
        ctx.stroke();
      }

      // The crosshair: gapped at the centre, the way the wordmark's is.
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        ctx.moveTo(dx * reach * 0.08, dy * reach * 0.08);
        ctx.lineTo(dx * reach * 1.16, dy * reach * 1.16);
      }
      ctx.stroke();

      // The sweep: one line rotating slowly with a short trailing glow behind
      // it, which is the only thing on this page that says the instrument is
      // powered rather than printed.
      const sweep = t * 0.11 * Math.PI * 2;
      const trail = ctx.createLinearGradient(0, 0, Math.cos(sweep) * reach, Math.sin(sweep) * reach);
      trail.addColorStop(0, "transparent");
      trail.addColorStop(1, green);
      ctx.globalAlpha = 0.24;
      ctx.strokeStyle = trail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweep) * reach * 1.05, Math.sin(sweep) * reach * 1.05);
      ctx.stroke();

      ctx.restore();

      // The horizon glow the site has behind its hero: a wide, very faint green
      // bloom off the bottom edge. Without it the black is flat paper.
      const bloom = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, h * 0.8);
      bloom.addColorStop(0, green);
      bloom.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="reticle-field" aria-hidden="true">
      <canvas className="reticle-grid" ref={canvasRef} />
    </div>
  );
}
