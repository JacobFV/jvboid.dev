"use client";

import { useRef } from "react";
import { rng, token, useCanvasField, useWorld } from "./atmosphere";

/**
 * The tensor-computer project page, dressed as the machine's own state.
 *
 * There is no site to borrow from here, and the project's look is not a
 * question of taste: everything this computer has *is* a tensor, and the only
 * picture it has ever produced of itself is the `H×W×3 float32` framebuffer in
 * the clip further down the page — a hard-edged pixel grid with no interpolation
 * anywhere, because there is no rasteriser under it to interpolate.
 *
 * So the field is three of the machine's tensors, drawn the way the machine
 * holds them:
 *
 *   - **The framebuffer.** A coarse grid of cells, square and unsmoothed.
 *   - **The opcode distribution.** Thirty-two bars along the bottom — the ALU
 *     computes all 32 operations every step and blends them by weight, and this
 *     is that weight vector.
 *   - **The program counter.** The same thing down the left edge: a probability
 *     distribution over instruction addresses, not an address.
 *
 * **Scroll is the temperature**, and that is the whole reason this world exists
 * rather than a texture. At the top of the article τ is high: every opcode is
 * lit, the PC is smeared across a dozen addresses, and the framebuffer is a
 * uniform grey blend of every value it might hold — differentiable, and not a
 * program. Reading down anneals it. By the Lessons section τ has gone to
 * ~0, every softmax has collapsed to one-hot, the pixels are on or off, and the
 * machine is executing exact discrete semantics — at which point the gradients
 * the whole project wanted are gone. The page's argument, run as a backdrop.
 *
 * No theme is forced. The machine has no opinion about the colour of paper, and
 * the field takes its ink from the cascade.
 */

/** The ALU's 32 operations, and the window of instruction addresses the PC is
 *  drawn over. Both are the real widths from the architecture. */
const OPS = 32;
const ADDRS = 24;

/** Framebuffer cell, in CSS pixels. Large: this is a 480×640 display being
 *  suggested, not simulated, and small cells would cost thousands of fills a
 *  frame to draw a texture nobody can resolve anyway. */
const CELL = 26;

/** Temperature at the top of the article and at the bottom. The five-phase
 *  schedule in the paper is warm-up → anneal → crystallize → discrete local
 *  search → extraction; this is the middle three, which are the ones with
 *  something to look at. */
const TAU_HOT = 0.42;
const TAU_COLD = 0.012;

type Ref = { logits: number[]; pc: number[]; noise: Float32Array; cols: number; rows: number };

/** Softmax at temperature `tau`, in place of the caller's array. Written out
 *  rather than pulled in because it is six lines and this file is the only
 *  thing on the site that needs one. */
function softmax(logits: number[], tau: number, out: number[]): number[] {
  let max = -Infinity;
  for (const l of logits) if (l > max) max = l;
  let sum = 0;
  for (let i = 0; i < logits.length; i += 1) {
    const e = Math.exp((logits[i] - max) / tau);
    out[i] = e;
    sum += e;
  }
  for (let i = 0; i < out.length; i += 1) out[i] /= sum;
  return out;
}

function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const v = Number.parseInt(m[1], 16);
  const l = 0.2126 * ((v >> 16) & 0xff) + 0.7152 * ((v >> 8) & 0xff) + 0.0722 * (v & 0xff);
  return l < 128;
}

export function TensorAtmosphere() {
  useWorld("tensor");

  const stateRef = useRef<Ref | null>(null);
  const darkRef = useRef(true);
  const opsRef = useRef<number[]>(new Array(OPS).fill(0));
  const pcRef = useRef<number[]>(new Array(ADDRS).fill(0));

  const canvasRef = useCanvasField({
    fps: 20,
    measure({ w, h }) {
      darkRef.current = isDark(token("--color-bg-0", "#0d0f12"));
      const r = rng(0x7c0de);
      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const noise = new Float32Array(cols * rows);
      for (let i = 0; i < noise.length; i += 1) noise[i] = r();
      stateRef.current = {
        // One clear winner and a couple of plausible rivals, which is what a
        // trained instruction actually looks like — a flat set of logits would
        // never resolve and a single spike would never have been interesting.
        logits: Array.from({ length: OPS }, () => r() * 0.7),
        pc: Array.from({ length: ADDRS }, () => r() * 0.5),
        noise,
        cols,
        rows,
      };
      const s = stateRef.current;
      s.logits[11] += 1.9;
      s.logits[4] += 1.2;
      s.logits[26] += 0.9;
      s.pc[7] += 1.7;
      s.pc[8] += 1.1;
    },
    draw({ ctx, w, h, t, scroll }) {
      const s = stateRef.current;
      if (!s) return;
      const dark = darkRef.current;
      const ink = dark ? "#8ee6b8" : "#1f7a52";
      const hot = dark ? "#f0b429" : "#b8720b";

      // Geometric in the temperature, which is how annealing schedules are
      // actually written, so the visible collapse happens over the middle of
      // the page rather than all at once at the end.
      const tau = TAU_HOT * Math.pow(TAU_COLD / TAU_HOT, scroll);
      // How discrete the machine currently is, 0…1 — used for everything that
      // should get harder-edged as the page cools.
      const crisp = 1 - Math.min(1, tau / TAU_HOT);

      // ---- The framebuffer -------------------------------------------------
      // A slow travelling field per cell, pushed through a sigmoid whose width
      // is the temperature. Hot, every cell sits near 0.5 and the grid is one
      // flat blend of every value it might take; cold, each cell is on or off.
      ctx.globalAlpha = 1;
      for (let j = 0; j < s.rows; j += 1) {
        const y = j * CELL;
        for (let i = 0; i < s.cols; i += 1) {
          const n = s.noise[j * s.cols + i];
          const v =
            0.5 +
            0.3 * Math.sin(i * 0.31 + t * 0.35 + n * 6.283) +
            0.2 * Math.sin(j * 0.27 - t * 0.22 + n * 3.1);
          const p = 1 / (1 + Math.exp(-(v - 0.5) / tau));
          // Below a quarter there is nothing to see and the fill is pure cost.
          if (p < 0.25) continue;
          ctx.globalAlpha = (p - 0.25) * (dark ? 0.11 : 0.08);
          ctx.fillStyle = n > 0.94 ? hot : ink;
          ctx.fillRect(i * CELL, y, CELL - 1, CELL - 1);
        }
      }

      // ---- The opcode distribution ----------------------------------------
      // Along the bottom, where it reads as the machine's status bar. The bars
      // are normalised to the largest weight rather than to 1, so a uniform
      // distribution is a flat wall and a one-hot is a single spike — the
      // difference the reader is meant to see is the *shape*, not the height.
      const p = softmax(s.logits, tau, opsRef.current);
      let peak = 0;
      for (const q of p) if (q > peak) peak = q;
      const barW = w / OPS;
      const baseY = h * 0.955;
      const maxH = h * 0.1;
      for (let i = 0; i < OPS; i += 1) {
        const bh = (p[i] / peak) * maxH;
        ctx.globalAlpha = dark ? 0.2 : 0.16;
        ctx.fillStyle = p[i] === peak ? hot : ink;
        ctx.fillRect(i * barW + 1, baseY - bh, barW - 2, bh);
      }
      // The baseline the bars stand on, so they are a chart and not a skyline.
      ctx.globalAlpha = dark ? 0.16 : 0.12;
      ctx.fillStyle = ink;
      ctx.fillRect(0, Math.round(baseY), w, 1);

      // ---- The program counter ---------------------------------------------
      // Down the left edge, drawn as a column of cells whose brightness is the
      // probability that the machine is about to execute that address.
      const q = softmax(s.pc, tau, pcRef.current);
      let qpeak = 0;
      for (const v of q) if (v > qpeak) qpeak = v;
      const rowH = (h * 0.62) / ADDRS;
      const top = h * 0.16;
      for (let i = 0; i < ADDRS; i += 1) {
        const a = q[i] / qpeak;
        ctx.globalAlpha = a * (dark ? 0.3 : 0.22);
        ctx.fillStyle = q[i] === qpeak ? hot : ink;
        ctx.fillRect(w * 0.022, top + i * rowH, 10 + 26 * a, rowH - 2);
      }

      // Once it is cold the machine is running exact discrete semantics, and a
      // fetch is a fetch: one hairline through the address it actually picked.
      // Nothing to draw while it is hot, because while it is hot there is no
      // address, which is the point.
      if (crisp > 0.55) {
        const picked = q.indexOf(qpeak);
        ctx.globalAlpha = (crisp - 0.55) * 0.5;
        ctx.fillStyle = hot;
        ctx.fillRect(0, Math.round(top + picked * rowH + rowH / 2), w, 1);
      }

      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="tensor-field" aria-hidden="true">
      <canvas className="tensor-state" ref={canvasRef} />
    </div>
  );
}
