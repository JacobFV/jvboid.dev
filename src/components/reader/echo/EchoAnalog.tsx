"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, rng, useFigureCanvas } from "./figure";

/**
 * Why the physical stage would be analog.
 *
 * Two copies of one adjustable coordinate, fed the same weak drift and the
 * same noise. The lower one is a digital implementation: after every step it
 * is projected back onto its prescribed values — every departure from the
 * intended computation treated as error and corrected. When each step's
 * drift is smaller than half the spacing, the rounding returns it every
 * time, and nothing accumulates. The upper one is left free to respond in
 * that coordinate, and the drift adds up.
 */

const DRIFT = 0.11; // units per second
const SIGMA = 0.1;
const GRID = 0.5;
const WINDOW = 14; // seconds across the panel

type State = { xa: number; xd: number; hist: { t: number; a: number; d: number }[]; r: () => number; t0: number };

export function EchoAnalog() {
  const st = useRef<State>({ xa: 0, xd: 0, hist: [], r: rng(0x4a1), t0: -1 });

  const canvasRef = useFigureCanvas({
    height: (w) => Math.max(230, Math.min(320, w * 0.46)),
    fps: 30,
    warm: 360,
    draw({ ctx, w, h, t, dt, pal }) {
      const S = st.current;
      if (S.t0 < 0 || t - S.t0 > WINDOW + 1.2) {
        S.t0 = t;
        S.xa = 0;
        S.xd = 0;
        S.hist = [];
      }
      const step = Math.min(dt, 1 / 30);
      if (step > 0 && t - S.t0 <= WINDOW) {
        const noise = (S.r() + S.r() + S.r() - 1.5) * 2 * SIGMA * Math.sqrt(step);
        S.xa += DRIFT * step + noise;
        S.xd += DRIFT * step + noise;
        S.xd = Math.round(S.xd / GRID) * GRID;
        S.hist.push({ t: t - S.t0, a: S.xa, d: S.xd });
      }

      // ---- layout --------------------------------------------------------
      const pad = { l: 14, r: 14, t: 26, b: 22 };
      const gap = 30;
      const rowH = (h - pad.t - pad.b - gap) / 2;
      const X = (tt: number) => pad.l + (tt / WINDOW) * (w - pad.l - pad.r);
      const range = 2.2;
      const rows = [
        { y: pad.t, label: "analog: the coordinate left free to respond", x: (p: { a: number }) => p.a },
        { y: pad.t + rowH + gap, label: "digital: projected back to prescribed values every step", x: (p: { d: number }) => p.d },
      ];
      rows.forEach((row, k) => {
        const Y = (v: number) => row.y + rowH * (0.85 - (v / range) * 0.7);
        ctx.strokeStyle = alpha(pal.dim, 0.45);
        ctx.strokeRect(pad.l + 0.5, row.y + 0.5, w - pad.l - pad.r - 1, rowH - 1);
        // Baseline, and for the digital row the lattice of prescribed values.
        ctx.strokeStyle = alpha(pal.dim, 0.4);
        ctx.setLineDash(k === 1 ? [] : [2, 4]);
        for (let v = 0; v <= range; v += k === 1 ? GRID : range) {
          ctx.beginPath();
          ctx.moveTo(pad.l, Y(v));
          ctx.lineTo(w - pad.r, Y(v));
          ctx.stroke();
        }
        ctx.setLineDash([]);
        // The drift to be measured.
        ctx.strokeStyle = alpha(pal.accent, 0.55);
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        ctx.lineTo(X(WINDOW), Y(DRIFT * WINDOW));
        ctx.stroke();
        ctx.setLineDash([]);
        // The trajectory.
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        S.hist.forEach((p, i) => {
          const x = X(p.t);
          const y = Y(k === 0 ? p.a : p.d);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.lineWidth = 1;
        canvasLabel(ctx, pal, row.label, pad.l, row.y - 10, { color: pal.ink, size: w < 480 ? 9.5 : 11 });
      });
      const last = S.hist[S.hist.length - 1];
      if (last) {
        const Ya = (v: number) => rows[0].y + rowH * (0.85 - (v / range) * 0.7);
        const Yd = (v: number) => rows[1].y + rowH * (0.85 - (v / range) * 0.7);
        ctx.fillStyle = pal.ink;
        ctx.beginPath();
        ctx.arc(X(last.t), Ya(last.a), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(X(last.t), Yd(last.d), 3, 0, Math.PI * 2);
        ctx.fill();
        canvasLabel(ctx, pal, `accumulated ${last.a.toFixed(2)}`, w - pad.r - 6, rows[0].y + 12, { align: "right", size: 10 });
        canvasLabel(ctx, pal, `accumulated ${last.d.toFixed(2)}`, w - pad.r - 6, rows[1].y + 12, { align: "right", size: 10 });
      }
      canvasLabel(ctx, pal, w < 480 ? "dashed orange: the drift under test" : "dashed orange: the weak drift under test · same noise in both rows", pad.l, h - 8, { size: 10, color: pal.mute });
    },
  });

  return (
    <EchoFigure
      label="Two time-series rows. In the upper analog row a trajectory drifts steadily upward along a dashed orange trend line. In the lower digital row, ruled with a lattice of prescribed values, the same trajectory is snapped back to the lattice at every step and stays flat."
      caption={
        <>
          The same weak drift and the same noise, twice. Above, the coordinate is left physically free
          and the drift accumulates. Below, every step is projected back onto the prescribed digital
          values, and because each step&rsquo;s drift is smaller than half a lattice spacing, the correction
          returns it every time. A digital host that treats every departure as error would erase the very
          signal the experiment is looking for.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
