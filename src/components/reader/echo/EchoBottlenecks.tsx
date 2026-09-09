"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, rng, useFigureCanvas } from "./figure";

/**
 * Two bottlenecks between a person and what we know of them.
 *
 * The old static version drew three boxes of decreasing size. But the
 * essay's first move is that a person is dynamics before substance, so the
 * interior here is alive: a field of units carrying several travelling
 * waves at once. What passes the first bottleneck — their capacity for
 * expression — is a handful of one-dimensional projections of that field,
 * scrolling as traces. What passes the second — our capacity for perception
 * — is those same traces sampled sparsely, quantised to a few levels, and
 * partly dropped. The last panel is thin. That does not make the first one
 * thin.
 */

const COLS = 18;
const ROWS = 12;
const TRACES = 4;
const HISTORY = 160;

type State = {
  phase: Float32Array;
  weights: Float32Array[];
  hist: Float32Array[];
  head: number;
  samples: { t: number; v: number[] }[];
  lastSample: number;
  r: () => number;
};

function makeState(): State {
  const r = rng(0xec40);
  const phase = new Float32Array(COLS * ROWS);
  for (let i = 0; i < phase.length; i += 1) phase[i] = r() * Math.PI * 2;
  const weights: Float32Array[] = [];
  for (let k = 0; k < TRACES; k += 1) {
    const w = new Float32Array(COLS * ROWS);
    // Smooth-ish random readout weights: a couple of localised patches, so a
    // trace is a real projection of the field rather than white noise.
    const px = r() * COLS;
    const py = r() * ROWS;
    const qx = r() * COLS;
    const qy = r() * ROWS;
    for (let j = 0; j < ROWS; j += 1)
      for (let i = 0; i < COLS; i += 1) {
        const d1 = ((i - px) ** 2 + (j - py) ** 2) / 14;
        const d2 = ((i - qx) ** 2 + (j - qy) ** 2) / 14;
        w[j * COLS + i] = Math.exp(-d1) - Math.exp(-d2) + (r() - 0.5) * 0.15;
      }
    // Unit L1 norm, so a projection is a weighted average of the field and
    // stays inside its lane whatever the patches happened to be.
    let norm = 0;
    for (let n = 0; n < w.length; n += 1) norm += Math.abs(w[n]);
    for (let n = 0; n < w.length; n += 1) w[n] /= norm;
    weights.push(w);
  }
  return {
    phase,
    weights,
    hist: Array.from({ length: TRACES }, () => new Float32Array(HISTORY)),
    head: 0,
    samples: [],
    lastSample: -1,
    r,
  };
}

function field(i: number, j: number, t: number, ph: number): number {
  return (
    0.5 * Math.sin(0.62 * i + 0.38 * j - 1.4 * t) +
    0.35 * Math.sin(-0.5 * i + 0.8 * j + 0.9 * t + 1) +
    0.28 * Math.sin(0.9 * i - 0.2 * j + 2.1 * t) +
    0.22 * Math.sin(ph + 0.7 * t)
  );
}

export function EchoBottlenecks() {
  const st = useRef<State>(makeState());

  const canvasRef = useFigureCanvas({
    height: (w) => (w < 480 ? 420 : Math.max(240, w * 0.46)),
    fps: 24,
    warm: 200,
    draw({ ctx, w, h, t, pal }) {
      const S = st.current;
      const stack = w < 480;
      // Three panels: interior, traces, what we know.
      const pad = 14;
      const gap = stack ? 26 : 40;
      const panels: { x: number; y: number; w: number; h: number }[] = [];
      if (stack) {
        const ph = (h - pad * 2 - gap * 2) / 3;
        for (let k = 0; k < 3; k += 1) panels.push({ x: pad, y: pad + k * (ph + gap), w: w - pad * 2, h: ph });
      } else {
        const widths = [0.4, 0.33, 0.27];
        const inner = w - pad * 2 - gap * 2;
        let x = pad;
        for (let k = 0; k < 3; k += 1) {
          const pw = inner * widths[k];
          const shrink = [0, 0.16, 0.32][k];
          const inner_h = h - pad * 2 - 58;
          panels.push({ x, y: pad + 22 + inner_h * shrink * 0.5, w: pw, h: inner_h * (1 - shrink) });
          x += pw + gap;
        }
      }
      const [P0, P1, P2] = panels;

      // ---- interior: the field ----------------------------------------
      const cw = P0.w / COLS;
      const ch = P0.h / ROWS;
      const vals = new Float32Array(COLS * ROWS);
      for (let j = 0; j < ROWS; j += 1)
        for (let i = 0; i < COLS; i += 1) {
          const v = field(i, j, t, S.phase[j * COLS + i]);
          vals[j * COLS + i] = v;
          const a = Math.max(0, Math.min(1, (v + 1.1) / 2.2));
          ctx.fillStyle = alpha(pal.ink, 0.06 + a * a * 0.75);
          ctx.fillRect(P0.x + i * cw + 0.5, P0.y + j * ch + 0.5, cw - 1, ch - 1);
        }

      // ---- traces: projections of the field ----------------------------
      const proj: number[] = [];
      for (let k = 0; k < TRACES; k += 1) {
        let s = 0;
        const wk = S.weights[k];
        for (let n = 0; n < vals.length; n += 1) s += wk[n] * vals[n];
        proj.push(s * 3);
      }
      // Advance the history at the frame rate: fine for a figure whose scale
      // is arbitrary anyway.
      S.head = (S.head + 1) % HISTORY;
      for (let k = 0; k < TRACES; k += 1) S.hist[k][S.head] = proj[k];

      const lane = P1.h / TRACES;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = alpha(pal.ink, 0.8);
      for (let k = 0; k < TRACES; k += 1) {
        const y0 = P1.y + lane * (k + 0.5);
        ctx.strokeStyle = alpha(pal.bg2, 1);
        ctx.beginPath();
        ctx.moveTo(P1.x, y0);
        ctx.lineTo(P1.x + P1.w, y0);
        ctx.stroke();
        ctx.strokeStyle = alpha(pal.ink, 0.8);
        ctx.beginPath();
        for (let n = 0; n < HISTORY; n += 1) {
          const idx = (S.head + 1 + n) % HISTORY;
          const x = P1.x + (n / (HISTORY - 1)) * P1.w;
          const y = y0 - S.hist[k][idx] * lane * 0.42;
          if (n === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // ---- what we know: sparse, quantised, partly missing -------------
      const period = 0.55;
      if (t - S.lastSample >= period) {
        S.lastSample = t;
        const v = proj.map((p) => (S.r() < 0.62 ? Math.round(Math.max(-1, Math.min(1, p)) * 1.5) / 1.5 : Number.NaN));
        S.samples.push({ t, v });
      }
      const span = (HISTORY / 24) * 1; // seconds visible in the trace panel
      S.samples = S.samples.filter((s) => t - s.t < span);
      const lane2 = P2.h / TRACES;
      for (let k = 0; k < TRACES; k += 1) {
        const y0 = P2.y + lane2 * (k + 0.5);
        ctx.strokeStyle = alpha(pal.bg2, 1);
        ctx.beginPath();
        ctx.moveTo(P2.x, y0);
        ctx.lineTo(P2.x + P2.w, y0);
        ctx.stroke();
        for (const s of S.samples) {
          const v = s.v[k];
          if (Number.isNaN(v)) continue;
          const x = P2.x + (1 - (t - s.t) / span) * P2.w;
          const y = y0 - v * lane2 * 0.42;
          ctx.fillStyle = pal.ink;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- frames, tapers, labels ---------------------------------------
      ctx.strokeStyle = alpha(pal.dim, 0.5);
      ctx.lineWidth = 1;
      for (const P of panels) ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);
      if (!stack) {
        ctx.fillStyle = alpha(pal.dim, 0.12);
        const taper = (a: typeof P0, b: typeof P1) => {
          ctx.beginPath();
          ctx.moveTo(a.x + a.w, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(b.x, b.y + b.h);
          ctx.lineTo(a.x + a.w, a.y + a.h);
          ctx.closePath();
          ctx.fill();
        };
        taper(P0, P1);
        taper(P1, P2);
        canvasLabel(ctx, pal, "interior organization", P0.x, P0.y - 11, { color: pal.ink });
        canvasLabel(ctx, pal, "surviving traces", P1.x, P1.y - 11, { color: pal.ink });
        canvasLabel(ctx, pal, "what we know", P2.x, P2.y - 11, { color: pal.ink });
        canvasLabel(ctx, pal, `${COLS * ROWS} coupled units`, P0.x, P0.y + P0.h + 12, { size: 10, color: pal.mute });
        canvasLabel(ctx, pal, `${TRACES} projections`, P1.x + P1.w, P1.y + P1.h + 12, { size: 10, color: pal.mute, align: "right" });
        canvasLabel(ctx, pal, "sampled · quantised · gappy", P2.x + P2.w, P2.y + P2.h + 12, { size: 10, color: pal.mute, align: "right" });
        canvasLabel(ctx, pal, "their capacity for expression", P0.x + P0.w + gap / 2, h - 12, { align: "center", size: 10, italic: true });
        canvasLabel(ctx, pal, "our capacity for perception", P1.x + P1.w + gap / 2, h - 12, { align: "center", size: 10, italic: true });
      } else {
        canvasLabel(ctx, pal, "interior organization", P0.x, P0.y - 9, { color: pal.ink });
        canvasLabel(ctx, pal, "surviving traces — their capacity for expression", P1.x, P1.y - 9, { color: pal.ink, size: 10 });
        canvasLabel(ctx, pal, "what we know — our capacity for perception", P2.x, P2.y - 9, { color: pal.ink, size: 10 });
      }
    },
  });

  return (
    <EchoFigure
      label="Three panels. A dense field of coupled units carrying travelling waves; four scrolling traces that are projections of that field; and the same traces sampled sparsely, quantised and with gaps. Tapers between the panels are labelled their capacity for expression and our capacity for perception."
      caption={
        <>
          Everything we know of a person came through two bottlenecks. The interior is a dynamics, not a
          record; what survives their capacity for expression is a few projections of it; what survives
          our capacity for perception is those projections sampled, quantised, and partly lost. The width
          of the last stage is not a measurement of the first.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
