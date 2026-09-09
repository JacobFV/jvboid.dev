"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, rng, useFigureCanvas } from "./figure";

/**
 * One extra term, and everything rides on whether it is zero.
 *
 *   dθ = [ b₀(θ, x, u) + λ r(θ, x, h) ] dt + σ(θ, x, u) dW
 *
 * Two panels, the same slice of candidate space, the same calibrated drift
 * b₀ toward what the apparatus prefers, the same noise — literally the same
 * random numbers, so anything that differs between them is the term. On the
 * left λ = 0. On the right a weak pull toward h, an organization that has
 * existed before, bends the same field. The individual candidates look the
 * same in both; the ensemble's centre does not stay in the same place.
 */

const COUNT = 140;
const K = 1.3; // calibrated restoring drift
const SIGMA = 0.36;
const LAMBDA = 0.5;
const CENTRE = [0.5, 0.5];
const H = [0.8, 0.32];

type State = { a: Float32Array; b: Float32Array; r: () => number; ready: boolean };

export function EchoDrift() {
  const st = useRef<State>({ a: new Float32Array(COUNT * 2), b: new Float32Array(COUNT * 2), r: rng(0xd41f), ready: false });

  const canvasRef = useFigureCanvas({
    height: (w) => (w < 480 ? w * 1.1 + 40 : Math.max(220, w * 0.5)),
    fps: 30,
    warm: 300,
    draw({ ctx, w, h, t, dt, pal }) {
      const S = st.current;
      if (!S.ready) {
        for (let i = 0; i < COUNT; i += 1) {
          const x = 0.5 + (S.r() - 0.5) * 0.35;
          const y = 0.5 + (S.r() - 0.5) * 0.35;
          S.a[2 * i] = x;
          S.a[2 * i + 1] = y;
          S.b[2 * i] = x;
          S.b[2 * i + 1] = y;
        }
        S.ready = true;
      }
      const step = Math.min(dt, 1 / 30);
      const sq = Math.sqrt(step);
      for (let i = 0; i < COUNT; i += 1) {
        // The same noise for both, so the only difference is r.
        const nx = (S.r() + S.r() + S.r() - 1.5) * 2 * SIGMA * sq;
        const ny = (S.r() + S.r() + S.r() - 1.5) * 2 * SIGMA * sq;
        const ax = S.a[2 * i];
        const ay = S.a[2 * i + 1];
        S.a[2 * i] = ax - K * (ax - CENTRE[0]) * step + nx;
        S.a[2 * i + 1] = ay - K * (ay - CENTRE[1]) * step + ny;
        const bx = S.b[2 * i];
        const by = S.b[2 * i + 1];
        S.b[2 * i] = bx - K * (bx - CENTRE[0]) * step + LAMBDA * (H[0] - bx) * step + nx;
        S.b[2 * i + 1] = by - K * (by - CENTRE[1]) * step + LAMBDA * (H[1] - by) * step + ny;
      }

      // ---- layout -----------------------------------------------------
      const stack = w < 480;
      const pad = 12;
      const top = 26;
      const bottom = 20;
      const panels: { x: number; y: number; s: number }[] = [];
      if (stack) {
        const s = w - pad * 2;
        panels.push({ x: pad, y: top, s: Math.min(s, (h - top - bottom - 40) / 2) });
        panels.push({ x: pad, y: panels[0].y + panels[0].s + 40, s: panels[0].s });
      } else {
        const s = Math.min((w - pad * 3) / 2, h - top - bottom);
        const x0 = (w - (s * 2 + pad)) / 2;
        panels.push({ x: x0, y: top, s });
        panels.push({ x: x0 + s + pad, y: top, s });
      }

      const draw = (P: { x: number; y: number; s: number }, pts: Float32Array, hyp: boolean) => {
        const X = (u: number) => P.x + u * P.s;
        const Y = (v: number) => P.y + v * P.s;
        ctx.strokeStyle = alpha(pal.dim, 0.45);
        ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.s - 1, P.s - 1);
        // The field, as short strokes on a grid, bent on the right.
        const n = 7;
        ctx.strokeStyle = alpha(pal.dim, 0.4);
        ctx.lineWidth = 1;
        for (let j = 0; j < n; j += 1)
          for (let i = 0; i < n; i += 1) {
            const u = (i + 0.5) / n;
            const v = (j + 0.5) / n;
            let fx = -K * (u - CENTRE[0]);
            let fy = -K * (v - CENTRE[1]);
            if (hyp) {
              fx += LAMBDA * (H[0] - u);
              fy += LAMBDA * (H[1] - v);
            }
            const m = Math.hypot(fx, fy) || 1;
            const L = Math.min(P.s * 0.05, m * P.s * 0.05);
            ctx.beginPath();
            ctx.moveTo(X(u), Y(v));
            ctx.lineTo(X(u) + (fx / m) * L, Y(v) + (fy / m) * L);
            ctx.stroke();
            ctx.fillStyle = alpha(pal.dim, 0.5);
            ctx.beginPath();
            ctx.arc(X(u) + (fx / m) * L, Y(v) + (fy / m) * L, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        // h: the organization that existed before.
        const hx = X(H[0]);
        const hy = Y(H[1]);
        ctx.strokeStyle = hyp ? pal.accent : alpha(pal.dim, 0.5);
        ctx.setLineDash(hyp ? [] : [2, 3]);
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        canvasLabel(ctx, pal, "h", hx + 10, hy, { color: hyp ? pal.accent : pal.dim, size: 11, italic: true });
        // Candidates.
        let mx = 0;
        let my = 0;
        for (let i = 0; i < COUNT; i += 1) {
          const u = pts[2 * i];
          const v = pts[2 * i + 1];
          mx += u / COUNT;
          my += v / COUNT;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          ctx.fillStyle = alpha(pal.blue, 0.75);
          ctx.beginPath();
          ctx.arc(X(u), Y(v), 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return [X(mx), Y(my)] as const;
      };

      const [ax, ay] = draw(panels[0], S.a, false);
      const [bx, by] = draw(panels[1], S.b, true);
      // Ensemble centres: the null's is also ghosted into the hypothesis
      // panel, so the displacement is the visible thing.
      const centre = (x: number, y: number, col: string, ghost = false) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = ghost ? 1 : 1.6;
        ctx.setLineDash(ghost ? [2, 3] : []);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
      };
      centre(ax, ay, pal.ink);
      const gx = panels[1].x + (ax - panels[0].x);
      const gy = panels[1].y + (ay - panels[0].y);
      centre(gx, gy, alpha(pal.ink, 0.5), true);
      centre(bx, by, pal.ink);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.lineWidth = 1;
      canvasLabel(ctx, pal, "λ r", (gx + bx) / 2, Math.min(gy, by) - 10, { align: "center", color: pal.accent, size: 11, italic: true });

      canvasLabel(ctx, pal, "null: λ = 0", panels[0].x, panels[0].y - 11, { color: pal.ink });
      canvasLabel(ctx, pal, "hypothesis: λ > 0", panels[1].x, panels[1].y - 11, { color: pal.ink });
      if (!stack) {
        canvasLabel(ctx, pal, "the field is what the apparatus does", panels[0].x, panels[0].y + panels[0].s + 12, { size: 10 });
        canvasLabel(ctx, pal, "the same field, bent toward what existed before", panels[1].x, panels[1].y + panels[1].s + 12, { size: 10 });
      }
      canvasLabel(ctx, pal, `t = ${Math.floor(t)} s · same noise in both`, w - pad, 12, { align: "right", size: 10, color: pal.mute });
    },
  });

  return (
    <EchoFigure
      label="Two square panels of the same drifting particle cloud. Left, labelled null with lambda equal to zero, the cloud sits centred in a restoring field. Right, labelled hypothesis with lambda greater than zero, the same field is bent slightly toward a marked point h and the cloud's centre is displaced toward it, the displacement marked in orange."
      caption={
        <>
          The whole hypothesis is one term. Both panels run the same calibrated drift b₀, the same
          noise, the same random numbers. On the right an additional weak drift toward h, an organization
          that existed before, is switched on. No single candidate looks different. The ensemble&rsquo;s
          centre (ring) moves; the orange segment is λ r, and the experiment is whether it is zero.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
