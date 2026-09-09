"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, mix, useFigureCanvas } from "./figure";
import type { Palette } from "./figure";
import { BRAIN_E, BRAIN_G, BRAIN_P, BRAIN_ROLE } from "./brain-data";

/**
 * A brain, in a body, in a world.
 *
 * The substrate is a subsample of IBM-1's structural graph — the MNE
 * "sample" subject's pial surface under the Desikan–Killiany atlas, plus
 * thalamus, basal ganglia, hippocampus, amygdala, brainstem, cerebellum,
 * spinal cord, retinae and cochleae — turning slowly under a simple
 * perspective camera. What moves through it is borrowed from the IBM-1 hero:
 * a signal is not a marker travelling over the anatomy but the anatomy
 * itself, nodes and edges along the route briefly brighter, the route
 * staying lit behind it and slowly fading, coloured by where it sits along
 * the way — sensory blue where it entered, action orange where it leaves.
 *
 * The route is the essay's loop. Each pulse enters at a retina or cochlea,
 * runs through thalamus to the matching sensory cortex, on through
 * association and prefrontal cortex to motor cortex, down the brainstem and
 * out the spinal cord — and then leaves the brain entirely, travelling the
 * outer arc through a body and a world before returning as the next
 * observation. Movement, perception, need and consequence close the loops.
 */

const N = BRAIN_P.length / 3;
const ADJ: number[][] = Array.from({ length: N }, () => []);
const EDGE_OF = new Map<number, number>();
for (let e = 0; e < BRAIN_E.length; e += 2) {
  const a = BRAIN_E[e];
  const b = BRAIN_E[e + 1];
  ADJ[a].push(b);
  ADJ[b].push(a);
  EDGE_OF.set(Math.min(a, b) * N + Math.max(a, b), e / 2);
}
const E = BRAIN_E.length / 2;

// Group indices, per BRAIN_GROUPS.
const G_CORTEX = 0;
const G_THAL = 1;
const G_BRAINSTEM = 5;
const G_SPINAL = 7;
const G_RETINA = 8;
const G_COCHLEA = 9;

const where = (f: (i: number) => boolean) => {
  const out: number[] = [];
  for (let i = 0; i < N; i += 1) if (f(i)) out.push(i);
  return out;
};
const RETINA = where((i) => BRAIN_G[i] === G_RETINA);
const COCHLEA = where((i) => BRAIN_G[i] === G_COCHLEA);
const THAL = where((i) => BRAIN_G[i] === G_THAL);
const VISUAL = where((i) => BRAIN_ROLE[i] === 1);
const AUDITORY = where((i) => BRAIN_ROLE[i] === 2);
const MOTOR = where((i) => BRAIN_ROLE[i] === 3);
const PREFRONTAL = where((i) => BRAIN_ROLE[i] === 4);
const ASSOC = where((i) => BRAIN_ROLE[i] === 5 || BRAIN_ROLE[i] === 6);
const BRAINSTEM = where((i) => BRAIN_G[i] === G_BRAINSTEM);
const SPINAL = where((i) => BRAIN_G[i] === G_SPINAL);
// The lowest point of the cord: where action leaves.
const SPINAL_TIP = SPINAL.reduce((best, i) => (BRAIN_P[3 * i + 2] < BRAIN_P[3 * best + 2] ? i : best), SPINAL[0]);

/** Resting brightness per group, as IBM-1 keys it: cortex reads as a sheet,
 *  the deep structures a little brighter, the periphery faint. */
const REST = [0.5, 0.85, 0.8, 0.85, 0.85, 0.8, 0.6, 0.75, 0.8, 0.8];
const SIZE = [1.3, 2.2, 2.1, 2.2, 2.2, 2.2, 1.6, 2.4, 2.3, 2.3];
/** Edges are batched into a few alpha buckets by depth: one stroke per
 *  bucket rather than one per edge, which is what keeps six thousand
 *  cortical edges cheap on a 2D canvas. */
const BUCKETS = 6;

function bfs(src: number, dst: number): number[] {
  if (src === dst) return [src];
  const prev = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  seen[src] = 1;
  const q = [src];
  for (let qi = 0; qi < q.length && !seen[dst]; qi += 1) {
    for (const v of ADJ[q[qi]]) {
      if (seen[v]) continue;
      seen[v] = 1;
      prev[v] = q[qi];
      if (v === dst) break;
      q.push(v);
    }
  }
  if (!seen[dst]) return [src];
  const path = [dst];
  for (let u = dst; u !== src; ) {
    u = prev[u];
    path.push(u);
  }
  return path.reverse();
}

const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

/** One trip around the loop, as a node sequence: sense → thalamus → sensory
 *  cortex → association → prefrontal → motor → brainstem → cord. */
function route(r: () => number): { path: number[]; ear: boolean } {
  const ear = r() < 0.35;
  const stops = ear
    ? [pick(COCHLEA, r), pick(THAL, r), pick(AUDITORY, r)]
    : [pick(RETINA, r), pick(THAL, r), pick(VISUAL, r)];
  stops.push(pick(ASSOC, r), pick(PREFRONTAL, r), pick(MOTOR, r), pick(BRAINSTEM, r), SPINAL_TIP);
  const path: number[] = [];
  for (let i = 0; i + 1 < stops.length; i += 1) {
    const seg = bfs(stops[i], stops[i + 1]);
    for (let k = path.length ? 1 : 0; k < seg.length; k += 1) path.push(seg[k]);
  }
  return { path, ear };
}

type Pulse = { path: number[]; at: number; speed: number };
type WorldDot = { at: number };

type State = {
  sx: Float32Array;
  sy: Float32Array;
  sz: Float32Array;
  flash: Float32Array;
  trail: Float32Array;
  u: Float32Array;
  eflash: Float32Array;
  etrail: Float32Array;
  eu: Float32Array;
  pulses: Pulse[];
  dots: WorldDot[];
  nextSpawn: number;
  rnd: () => number;
};

function makeState(): State {
  let s = 0x9e3779b9;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  return {
    sx: new Float32Array(N),
    sy: new Float32Array(N),
    sz: new Float32Array(N),
    flash: new Float32Array(N),
    trail: new Float32Array(N),
    u: new Float32Array(N),
    eflash: new Float32Array(E),
    etrail: new Float32Array(E),
    eu: new Float32Array(E),
    pulses: [],
    dots: [],
    nextSpawn: 0.4,
    rnd,
  };
}

/** Bezier point for the outer arc (body → world → observation). */
function bez(p0: number[], p1: number[], p2: number[], p3: number[], t: number): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
    mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function ramp(pal: Palette, u: number): string {
  return mix(pal.blue, pal.accent, Math.max(0, Math.min(1, u)));
}

export function EchoBrain() {
  const st = useRef<State>(makeState());

  const canvasRef = useFigureCanvas({
    height: (w) => Math.max(300, Math.min(480, w * 0.7)),
    fps: 30,
    warm: 140,
    draw({ ctx, w, h, t, dt, pal }) {
      const S = st.current;
      const narrow = w < 480;

      // ---- camera: a slow turn, a little elevation --------------------
      const az = -0.9 + t * 0.11;
      const el = 0.24;
      const ca = Math.cos(az);
      const sa = Math.sin(az);
      const ce = Math.cos(el);
      const se = Math.sin(el);
      const D = 560;
      const F = h * 2.15;
      const cx = w * (narrow ? 0.5 : 0.45);
      const cy = h * 0.4;
      for (let i = 0; i < N; i += 1) {
        // RAS → x right, y up, z toward the viewer.
        const x = -BRAIN_P[3 * i] / 10;
        const y = BRAIN_P[3 * i + 2] / 10;
        const z = BRAIN_P[3 * i + 1] / 10;
        const x1 = x * ca - z * sa;
        const z1 = x * sa + z * ca;
        const y2 = y * ce - z1 * se;
        const z2 = y * se + z1 * ce;
        const k = F / (D + z2);
        S.sx[i] = cx + x1 * k;
        S.sy[i] = cy - y2 * k;
        S.sz[i] = z2;
      }

      // ---- pulses ----------------------------------------------------
      const fdec = Math.exp(-dt * 9);
      const tdec = Math.exp(-dt * 0.45);
      for (let i = 0; i < N; i += 1) {
        S.flash[i] *= fdec;
        S.trail[i] *= tdec;
      }
      for (let e = 0; e < E; e += 1) {
        S.eflash[e] *= fdec;
        S.etrail[e] *= tdec;
      }
      if (t >= S.nextSpawn) {
        const { path } = route(S.rnd);
        S.pulses.push({ path, at: 0, speed: 22 + S.rnd() * 8 });
        S.nextSpawn = t + 2.6 + S.rnd() * 1.2;
      }
      for (const p of S.pulses) {
        const before = Math.floor(p.at);
        p.at += p.speed * dt;
        const after = Math.min(p.path.length - 1, Math.floor(p.at));
        for (let k = Math.max(0, before); k <= after; k += 1) {
          const n = p.path[k];
          const u = k / (p.path.length - 1);
          S.flash[n] = 1;
          S.trail[n] = Math.max(S.trail[n], 0.7);
          S.u[n] = u;
          if (k > 0) {
            const a = p.path[k - 1];
            const e = EDGE_OF.get(Math.min(a, n) * N + Math.max(a, n));
            if (e !== undefined) {
              S.eflash[e] = 1;
              S.etrail[e] = Math.max(S.etrail[e], 0.7);
              S.eu[e] = u;
            }
          }
        }
        if (p.at >= p.path.length - 1) S.dots.push({ at: 0 });
      }
      S.pulses = S.pulses.filter((p) => p.at < p.path.length - 1);

      // ---- the outer loop: action → body → world → observation ---------
      const eye: [number, number] = [0, 0];
      for (const i of RETINA) {
        eye[0] += S.sx[i] / RETINA.length;
        eye[1] += S.sy[i] / RETINA.length;
      }
      const tip: [number, number] = [S.sx[SPINAL_TIP], S.sy[SPINAL_TIP]];
      const right = w - (narrow ? 26 : 60);
      const c1 = [tip[0] + 40, h - 22];
      const c2 = [right + 30, h * 0.9];
      const mid: [number, number] = [right, h * 0.5];
      const c3 = [right + 30, h * 0.1];
      const c4 = [eye[0] + 60, Math.max(28, eye[1] - 90)];
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = alpha(pal.dim, 0.55);
      ctx.beginPath();
      ctx.moveTo(tip[0], tip[1]);
      ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], mid[0], mid[1]);
      ctx.bezierCurveTo(c3[0], c3[1], c4[0], c4[1], eye[0], eye[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      // the world: where consequences come from
      ctx.fillStyle = pal.bg0;
      ctx.beginPath();
      ctx.arc(mid[0], mid[1], 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = alpha(pal.dim, 0.8);
      ctx.stroke();
      ctx.restore();

      const wdec = 0.75; // seconds to go round
      for (const d of S.dots) d.at += dt / wdec;
      for (const d of S.dots) {
        const u = d.at;
        const pos =
          u < 0.5
            ? bez(tip, c1, c2, mid, u * 2)
            : bez(mid, c3, c4, eye, (u - 0.5) * 2);
        const col = ramp(pal, 1 - u);
        ctx.fillStyle = alpha(pal.bg0, 1);
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
      S.dots = S.dots.filter((d) => d.at < 1);

      // ---- edges, batched by depth ------------------------------------
      ctx.lineWidth = 0.7;
      const glowing: number[] = [];
      for (let b = 0; b < BUCKETS; b += 1) {
        ctx.beginPath();
        for (let e = 0; e < E; e += 1) {
          const a = BRAIN_E[2 * e];
          const c = BRAIN_E[2 * e + 1];
          const z = Math.min(S.sz[a], S.sz[c]);
          const depth = Math.max(0, Math.min(0.999, (z + 100) / 200));
          if (Math.floor(depth * BUCKETS) !== b) continue;
          if (b === 0 && Math.max(S.eflash[e], S.etrail[e]) > 0.03) glowing.push(e);
          ctx.moveTo(S.sx[a], S.sy[a]);
          ctx.lineTo(S.sx[c], S.sy[c]);
        }
        const k = (b + 0.5) / BUCKETS;
        ctx.strokeStyle = alpha(pal.ink, (pal.dark ? 0.06 : 0.09) + k * (pal.dark ? 0.2 : 0.22));
        ctx.stroke();
      }
      if (!glowing.length) for (let e = 0; e < E; e += 1) if (Math.max(S.eflash[e], S.etrail[e]) > 0.03) glowing.push(e);
      ctx.lineWidth = 1.4;
      for (const e of glowing) {
        const a = BRAIN_E[2 * e];
        const c = BRAIN_E[2 * e + 1];
        const g = Math.max(S.eflash[e], S.etrail[e] * 0.6);
        ctx.strokeStyle = ramp(pal, S.eu[e]);
        ctx.globalAlpha = Math.min(1, g * 1.4);
        ctx.beginPath();
        ctx.moveTo(S.sx[a], S.sy[a]);
        ctx.lineTo(S.sx[c], S.sy[c]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;

      // ---- nodes ----------------------------------------------------
      // Resting nodes as squares in a few depth buckets (one fill each);
      // the lit ones drawn individually on top, larger and in the route's
      // colour.
      for (let b = 0; b < BUCKETS; b += 1) {
        const k = (b + 0.5) / BUCKETS;
        for (let g = 0; g < REST.length; g += 1) {
          ctx.fillStyle = alpha(pal.ink, REST[g] * (0.3 + 0.7 * k));
          const r = SIZE[g] * (0.75 + 0.5 * k);
          ctx.beginPath();
          for (let i = 0; i < N; i += 1) {
            if (BRAIN_G[i] !== g) continue;
            const depth = Math.max(0, Math.min(0.999, (S.sz[i] + 100) / 200));
            if (Math.floor(depth * BUCKETS) !== b) continue;
            ctx.rect(S.sx[i] - r, S.sy[i] - r, 2 * r, 2 * r);
          }
          ctx.fill();
        }
      }
      for (let i = 0; i < N; i += 1) {
        const glow = Math.max(S.flash[i], S.trail[i] * 0.55);
        if (glow < 0.03) continue;
        const depth = 0.45 + 0.55 * Math.max(0, Math.min(1, (S.sz[i] + 100) / 200));
        const r = SIZE[BRAIN_G[i]] * (0.8 + 0.5 * depth) * (1 + glow * 1.4) + 0.6;
        ctx.fillStyle = mix(pal.ink, ramp(pal, S.u[i]), Math.min(1, glow * 1.6));
        ctx.globalAlpha = Math.min(1, 0.5 + glow);
        ctx.beginPath();
        ctx.arc(S.sx[i], S.sy[i], r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ---- labels ----------------------------------------------------
      canvasLabel(ctx, pal, "observation", eye[0] + 8, Math.max(14, eye[1] - 14), { color: pal.blue, size: 10.5 });
      canvasLabel(ctx, pal, "action", tip[0] + 8, Math.min(h - 8, tip[1] + 6), { color: pal.accent, size: 10.5 });
      canvasLabel(ctx, pal, "world", mid[0], mid[1] + 22, { align: "center", size: 10.5 });
      if (!narrow) {
        canvasLabel(ctx, pal, "sense → thalamus → cortex → brainstem → cord", 12, h - 12, { size: 10, color: pal.mute });
      }
    },
  });

  return (
    <EchoFigure
      label="A subsampled structural brain graph turning slowly. Pulses enter at a retina or cochlea in blue, travel through thalamus, sensory, association, prefrontal and motor cortex, down the brainstem and out the spinal cord in orange, then travel an outer arc through the world and re-enter as the next observation."
      caption={
        <>
          The object the reconstruction targets: a mesoscale brain (IBM-1&rsquo;s substrate, subsampled) whose
          loops close through a body in a world. Each signal enters as observation, crosses the
          organization, leaves as action, and returns changed. Blue is where a route entered; orange where
          it left; the trace it lit fades behind it.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
