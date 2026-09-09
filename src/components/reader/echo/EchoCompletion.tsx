"use client";

import { useRef } from "react";
import { EchoFigure, alpha, canvasLabel, rng, useFigureCanvas } from "./figure";

/**
 * Pattern completion: a partial cue recruits the rest.
 *
 * A small Hopfield network holds three patterns. Each cycle, a fragment of
 * one of them is presented as a cue — the orange cells — with every other
 * unit left in a random state. Asynchronous updates then pull the whole
 * network into the basin the fragment lies in, and the stored pattern
 * re-forms cell by cell around the cue. The stored patterns are correlated
 * enough that plain Hebbian weights would leave spurious mixtures, so the
 * weights use the projection rule; the point of the figure is the
 * re-entry, not the learning rule.
 *
 * This is the essay's central image of memory: not a record retrieved from
 * storage, but an attractor that an initial fragment recruits.
 */

const SIDE = 20;
const UNITS = SIDE * SIDE;

function makePatterns(): Float32Array[] {
  const c = (SIDE - 1) / 2;
  const P: Float32Array[] = [];
  const mk = (f: (i: number, j: number) => boolean) => {
    const p = new Float32Array(UNITS);
    for (let j = 0; j < SIDE; j += 1) for (let i = 0; i < SIDE; i += 1) p[j * SIDE + i] = f(i, j) ? 1 : -1;
    P.push(p);
  };
  // a ring
  mk((i, j) => {
    const r = Math.hypot(i - c, j - c);
    return r >= 4.6 && r <= 8.4;
  });
  // two thick diagonals
  mk((i, j) => Math.abs(i - j) <= 1.6 || Math.abs(i + j - (SIDE - 1)) <= 1.6);
  // a diamond with a filled centre
  mk((i, j) => {
    const d = Math.abs(i - c) + Math.abs(j - c);
    return (d >= 6.5 && d <= 9.2) || d <= 2.6;
  });
  return P;
}

/** Projection-rule weights W = Ξ (ΞᵀΞ)⁻¹ Ξᵀ, zero diagonal. */
function makeWeights(P: Float32Array[]): Float32Array {
  const K = P.length;
  const C: number[][] = Array.from({ length: K }, () => new Array<number>(K).fill(0));
  for (let a = 0; a < K; a += 1)
    for (let b = 0; b < K; b += 1) {
      let s = 0;
      for (let n = 0; n < UNITS; n += 1) s += P[a][n] * P[b][n];
      C[a][b] = s;
    }
  // Invert the small Gram matrix by Gauss–Jordan.
  const A = C.map((row, i) => [...row, ...Array.from({ length: K }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < K; col += 1) {
    let piv = col;
    for (let r = col + 1; r < K; r += 1) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    const d = A[col][col];
    for (let j = 0; j < 2 * K; j += 1) A[col][j] /= d;
    for (let r = 0; r < K; r += 1) {
      if (r === col) continue;
      const f = A[r][col];
      for (let j = 0; j < 2 * K; j += 1) A[r][j] -= f * A[col][j];
    }
  }
  const inv = A.map((row) => row.slice(K));
  const W = new Float32Array(UNITS * UNITS);
  for (let a = 0; a < K; a += 1)
    for (let b = 0; b < K; b += 1) {
      const g = inv[a][b];
      if (g === 0) continue;
      for (let i = 0; i < UNITS; i += 1) {
        const pi = P[a][i] * g;
        for (let j = 0; j < UNITS; j += 1) W[i * UNITS + j] += pi * P[b][j];
      }
    }
  for (let i = 0; i < UNITS; i += 1) W[i * UNITS + i] = 0;
  return W;
}

type Phase = "cue" | "settle" | "hold" | "fade";

type State = {
  P: Float32Array[];
  W: Float32Array;
  s: Float32Array;
  cue: Uint8Array;
  target: number;
  phase: Phase;
  phaseAt: number;
  r: () => number;
  ready: boolean;
  cycle: number;
};

function makeState(): State {
  const P = makePatterns();
  return {
    P,
    W: makeWeights(P),
    s: new Float32Array(UNITS),
    cue: new Uint8Array(UNITS),
    target: 0,
    phase: "cue",
    phaseAt: 0,
    r: rng(0x5eed),
    ready: false,
    cycle: 0,
  };
}

function present(S: State, t: number) {
  const k = S.cycle % S.P.length;
  S.target = k;
  const p = S.P[k];
  // A blob of known cells centred on some lit unit of the pattern.
  const lit: number[] = [];
  for (let n = 0; n < UNITS; n += 1) if (p[n] > 0) lit.push(n);
  const centre = lit[Math.floor(S.r() * lit.length)];
  const ci = centre % SIDE;
  const cj = Math.floor(centre / SIDE);
  const rad = 5 + S.r() * 1.5;
  for (let j = 0; j < SIDE; j += 1)
    for (let i = 0; i < SIDE; i += 1) {
      const n = j * SIDE + i;
      const inCue = Math.hypot(i - ci, j - cj) <= rad;
      S.cue[n] = inCue ? 1 : 0;
      S.s[n] = inCue ? p[n] : S.r() < 0.5 ? 1 : -1;
    }
  S.phase = "cue";
  S.phaseAt = t;
  S.ready = true;
  S.cycle += 1;
}

export function EchoCompletion() {
  const st = useRef<State | null>(null);

  const canvasRef = useFigureCanvas({
    // Stacked below 420px: the grid, then the thumbnails, then the readout.
    height: (w) => (w < 420 ? w - 24 + 24 + (w - 48) / 3 + 96 : Math.max(240, Math.min(360, w * 0.5))),
    fps: 30,
    warm: 110,
    draw({ ctx, w, h, t, pal }) {
      if (!st.current) st.current = makeState();
      const S = st.current;
      if (!S.ready) present(S, t);
      const stack = w < 420;

      // ---- schedule ------------------------------------------------------
      const since = t - S.phaseAt;
      if (S.phase === "cue" && since > 1.1) {
        S.phase = "settle";
        S.phaseAt = t;
      } else if (S.phase === "settle") {
        // Asynchronous updates, a handful per frame.
        for (let k = 0; k < 9; k += 1) {
          const n = Math.floor(S.r() * UNITS);
          let field = 0;
          const row = n * UNITS;
          for (let j = 0; j < UNITS; j += 1) field += S.W[row + j] * S.s[j];
          S.s[n] = field >= 0 ? 1 : -1;
        }
        if (since > 3.2) {
          S.phase = "hold";
          S.phaseAt = t;
        }
      } else if (S.phase === "hold" && since > 1.8) {
        S.phase = "fade";
        S.phaseAt = t;
      } else if (S.phase === "fade" && since > 0.5) {
        present(S, t);
      }

      // ---- layout ---------------------------------------------------------
      const pad = 12;
      const gridSize = stack ? w - pad * 2 : Math.min(h - pad * 2, w * 0.56);
      const gx = pad;
      const gy = pad;
      const cell = gridSize / SIDE;
      const fade = S.phase === "fade" ? 1 - (t - S.phaseAt) / 0.5 : 1;

      // ---- the network -----------------------------------------------------
      const settleK = S.phase === "settle" ? Math.min(1, (t - S.phaseAt) / 3.2) : S.phase === "cue" ? 0 : 1;
      const target = S.P[S.target];
      let agree = 0;
      for (let j = 0; j < SIDE; j += 1)
        for (let i = 0; i < SIDE; i += 1) {
          const n = j * SIDE + i;
          const x = gx + i * cell;
          const y = gy + j * cell;
          const on = S.s[n] > 0;
          if (on === target[n] > 0) agree += 1;
          const isCue = S.cue[n] === 1;
          let fill: string;
          if (S.phase === "cue" && !isCue) {
            // Unknown cells, before any dynamics: shown as undecided.
            fill = alpha(pal.dim, 0.14);
          } else if (on) {
            fill = isCue ? pal.accent : pal.ink;
          } else {
            fill = alpha(pal.dim, isCue ? 0.28 : 0.1);
          }
          ctx.globalAlpha = fade;
          ctx.fillStyle = fill;
          ctx.fillRect(x + 0.6, y + 0.6, cell - 1.2, cell - 1.2);
        }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = alpha(pal.dim, 0.5);
      ctx.strokeRect(gx + 0.5, gy + 0.5, gridSize - 1, gridSize - 1);

      // ---- the stored patterns, and the one being recruited --------------
      const thumbCell = stack ? (w - pad * 2 - 24) / 3 / SIDE : Math.min(3.6, (w - gx - gridSize - pad * 3) / 3 / SIDE);
      const thumb = thumbCell * SIDE;
      const tx0 = stack ? pad : gx + gridSize + pad * 2;
      const ty0 = stack ? gy + gridSize + 30 : gy + 20;
      canvasLabel(ctx, pal, "stored patterns", tx0, ty0 - 10, { color: pal.ink });
      for (let k = 0; k < S.P.length; k += 1) {
        const ox = tx0 + k * (thumb + 12);
        const oy = ty0 + 4;
        const p = S.P[k];
        for (let n = 0; n < UNITS; n += 1) {
          if (p[n] < 0) continue;
          const i = n % SIDE;
          const j = Math.floor(n / SIDE);
          ctx.fillStyle = alpha(pal.ink, 0.7);
          ctx.fillRect(ox + i * thumbCell, oy + j * thumbCell, thumbCell - 0.4, thumbCell - 0.4);
        }
        if (k === S.target && S.phase !== "cue") {
          ctx.strokeStyle = alpha(pal.accent, Math.min(1, settleK) * fade);
          ctx.lineWidth = 1.2;
          ctx.strokeRect(ox - 3.5, oy - 3.5, thumb + 7, thumb + 7);
          ctx.lineWidth = 1;
        }
      }

      // ---- readout ------------------------------------------------------
      const ry = stack ? ty0 + thumb + 26 : ty0 + thumb + 40;
      const rx = tx0;
      const known = S.cue.reduce((a, b) => a + b, 0);
      const pct = Math.round((agree / UNITS) * 100);
      const state =
        S.phase === "cue" ? "cue presented" : S.phase === "settle" ? "recruiting the rest" : "settled";
      canvasLabel(ctx, pal, state, rx, ry, { color: pal.ink });
      canvasLabel(ctx, pal, `${Math.round((known / UNITS) * 100)}% of units given`, rx, ry + 16, { size: 10 });
      canvasLabel(ctx, pal, `${S.phase === "cue" ? "—" : `${pct}%`} match to the stored pattern`, rx, ry + 30, { size: 10 });
      if (!stack) {
        const legY = h - pad - 8;
        ctx.fillStyle = pal.accent;
        ctx.fillRect(rx, legY - 4, 8, 8);
        canvasLabel(ctx, pal, "the cue", rx + 14, legY, { size: 10 });
        ctx.fillStyle = pal.ink;
        ctx.fillRect(rx + 78, legY - 4, 8, 8);
        canvasLabel(ctx, pal, "what the cue recruited", rx + 92, legY, { size: 10 });
      }
    },
  });

  return (
    <EchoFigure
      label="A 20 by 20 grid of units. A small orange fragment of a stored pattern is presented with every other unit random; over a few seconds the rest of the grid settles into the full pattern. Beside it, three small thumbnails of the stored patterns, with the one being recruited outlined."
      caption={
        <>
          A partial cue recruits a much larger pattern. Three patterns live in one small attractor
          network; each cycle a fragment of one is given (orange) with everything else undecided, and
          asynchronous updates carry the whole network into the basin that fragment sits in. Memory as
          machinery, not a file: the cue does not retrieve the pattern, it starts the process that
          re-forms it.
        </>
      }
    >
      <canvas ref={canvasRef} />
    </EchoFigure>
  );
}
