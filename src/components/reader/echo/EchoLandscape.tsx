"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, rng, useFigureCanvas } from "./figure";

/**
 * What the evidence leaves open is not a blur around one answer.
 *
 * One coordinate of candidate space, drawn as the landscape the evidence
 * model scores it with: three wells, all equally deep, because three
 * different internal organizations explain every surviving trace equally
 * well. The evolutionary sampler is the dots — proposed, scored, varied —
 * and they settle into whichever well they were nearest. Their parameter
 * mean, the diamond, comes to rest on a ridge: a system that was never a
 * plausible candidate at all.
 */

const WELLS = [
  { m: 0.1, s: 0.05, d: 1.0, label: "A", note: "different memories" },
  { m: 0.36, s: 0.05, d: 0.96, label: "B", note: "different mechanism" },
  { m: 0.88, s: 0.06, d: 1.02, label: "C", note: "different learning rule" },
];
const COUNT = 64;

function V(x: number): number {
  let v = 0.12 * Math.sin(x * 9 + 1) + 0.05;
  for (const w of WELLS) v -= w.d * Math.exp(-(((x - w.m) / w.s) ** 2));
  return v;
}
function dV(x: number): number {
  const e = 1e-4;
  return (V(x + e) - V(x - e)) / (2 * e);
}

type State = { x: Float32Array; born: number; r: () => number };

export function EchoLandscape() {
  const st = useRef<State>({ x: new Float32Array(COUNT), born: -1, r: rng(0xa77) });

  const canvasRef = useFigureCanvas({
    height: (w) => Math.max(220, Math.min(330, w * 0.46)),
    fps: 30,
    warm: 220,
    draw({ ctx, w, h, t, dt, pal }) {
      const S = st.current;
      const CYCLE = 9;
      if (S.born < 0 || t - S.born > CYCLE) {
        for (let i = 0; i < COUNT; i += 1) S.x[i] = 0.03 + S.r() * 0.94;
        S.born = t;
      }
      const age = t - S.born;
      // Sampling temperature that cools over the cycle: proposals wander, then
      // are retained where they score well.
      const temp = 0.0008 * Math.exp(-age * 0.7) + 0.00001;
      const step = Math.min(dt, 1 / 30);
      for (let i = 0; i < COUNT; i += 1) {
        const g = dV(S.x[i]);
        const noise = (S.r() + S.r() + S.r() - 1.5) * 2;
        let x = S.x[i] - g * 0.0026 * step * 60 + noise * Math.sqrt(2 * temp * step * 60);
        if (x < 0.01) x = 0.01;
        if (x > 0.99) x = 0.99;
        S.x[i] = x;
      }
      let mean = 0;
      for (let i = 0; i < COUNT; i += 1) mean += S.x[i] / COUNT;

      // ---- layout -------------------------------------------------------
      const pad = { l: 16, r: 16, t: 26, b: 46 };
      const px = (x: number) => pad.l + x * (w - pad.l - pad.r);
      const vmin = -1.05;
      const vmax = 0.2;
      const py = (v: number) => pad.t + ((v - vmax) / (vmin - vmax)) * (h - pad.t - pad.b);

      // The evidence floor: every well bottoms out here.
      const floor = py(-0.95);
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = alpha(pal.dim, 0.5);
      ctx.beginPath();
      ctx.moveTo(pad.l, floor);
      ctx.lineTo(w - pad.r, floor);
      ctx.stroke();
      ctx.setLineDash([]);
      canvasLabel(ctx, pal, "equal fit to every surviving trace", w - pad.r, floor + 12, { align: "right", size: 10 });

      // The landscape.
      ctx.strokeStyle = alpha(pal.ink, 0.85);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let k = 0; k <= 240; k += 1) {
        const x = k / 240;
        const y = py(V(x));
        if (k === 0) ctx.moveTo(px(x), y);
        else ctx.lineTo(px(x), y);
      }
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = alpha(pal.ink, 0.04);
      ctx.lineTo(px(1), h - pad.b);
      ctx.lineTo(px(0), h - pad.b);
      ctx.closePath();
      ctx.fill();

      // Samplers, sitting on the curve.
      for (let i = 0; i < COUNT; i += 1) {
        const x = S.x[i];
        ctx.fillStyle = alpha(pal.blue, 0.85);
        ctx.beginPath();
        ctx.arc(px(x), py(V(x)) - 3, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // The mean.
      const mx = px(mean);
      const my = py(V(mean)) - 5;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.moveTo(mx, my - 6);
      ctx.lineTo(mx + 6, my);
      ctx.lineTo(mx, my + 6);
      ctx.lineTo(mx - 6, my);
      ctx.closePath();
      ctx.fill();
      const settled = Math.min(1, Math.max(0, (age - 2.5) / 1.5));
      ctx.globalAlpha = settled;
      ctx.strokeStyle = alpha(pal.accent, 0.6);
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(mx, my - 8);
      ctx.lineTo(mx, pad.t + 22);
      ctx.stroke();
      ctx.setLineDash([]);
      canvasLabel(ctx, pal, "parameter mean · never a candidate", mx, pad.t + 12, { align: "center", color: pal.accent, size: 10.5 });
      ctx.globalAlpha = 1;

      // Labels for the wells.
      for (const wl of WELLS) {
        canvasLabel(ctx, pal, wl.label, px(wl.m), h - pad.b + 14, { align: "center", color: pal.ink, size: 12 });
        if (w > 460) canvasLabel(ctx, pal, wl.note, px(wl.m), h - pad.b + 30, { align: "center", size: 10 });
      }
      canvasLabel(ctx, pal, "one coordinate of Θ", pad.l, 12, { size: 10 });
      canvasLabel(ctx, pal, `${COUNT} candidates · retained, varied, scored`, w - pad.r, 12, { align: "right", size: 10 });
    },
  });

  return (
    <EchoFigure
      label="A one-dimensional landscape with three equally deep wells labelled A, B and C. Blue sampler dots fall into the wells; an orange diamond marking their parameter mean sits on a ridge between wells, labelled never a candidate."
      caption={
        <>
          Different organizations can explain every available trace. Candidate samplers (blue) are
          retained and varied until they settle, and they settle into three separate regions with
          different memories, mechanisms and learning rules. Their mean (orange) lands where no candidate
          is. The goal is a coherent organization, or an explicitly unresolved family, never a parameter
          average.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
