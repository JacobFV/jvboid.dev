"use client";

import { useEffect, useRef } from "react";
import { useCanvasField, token, useWorld } from "./atmosphere";

/**
 * The sc-wbd project page, dressed as SC-WBD.
 *
 * The site it documents (sc-wbd.pages.dev) has one image on it, and everything
 * else on the page is subordinate to that image: 414 brain regions at their
 * real anatomical coordinates, over the strongest tracts of the measured
 * connectome, turning slowly until you grab it. So the world does not invent a
 * texture — it runs the same drawing, from the same geometry file.
 *
 * **The geometry is the project's, byte for byte.** `/assets/data/sc-wbd/` is a
 * copy of `site/static/brain.json` and `edges.json` out of the model
 * repository: `p` is `AnatomyPrior.positions` in the fsLR_32k surface RAS frame
 * — the coordinates the EEG lead field is integrated against — `f` is the
 * nine-family partition, and `e`/`w` are the 900 strongest edges of the
 * connectome with their weights. Nothing here is a brain-shaped scatter of
 * random points, which is the only version of this backdrop worth having.
 *
 * Three things it does that the model's own canvas does too, for the same
 * reasons:
 *
 *   - **Depth is alpha and radius, not perspective.** A parcel at the back of
 *     the head is smaller and fainter; there is no vanishing point. The volume
 *     reads correctly and the projection stays a projection.
 *   - **Colour is the partition.** Two cortical families in blues, the seven
 *     subcortical ones warm. The split that carries meaning is
 *     cortex-versus-subcortex, and blue-versus-amber survives a red-green
 *     deficiency where a spectral ramp would not.
 *   - **It turns.** Slowly, on its own — and scrolling turns it further, so
 *     reading down the article walks around the head rather than past it.
 *
 * **No theme is forced.** The model's site defines every colour once on `:root`
 * and once under `prefers-color-scheme`, with no toggle and no stored
 * preference — it ships light and dark as equals and means both. Pinning one
 * here would misrepresent it. Only the tokens and the furniture move.
 */

/** Identical to `COL` in the model repo's `site/static/brain.js` and to the
 *  matplotlib table in `scripts/render_mark.py`, which is why the backdrop and
 *  the figures further down the page are the same drawing in two media. */
const COL: [number, number, number][] = [
  [96, 165, 232],
  [52, 110, 190],
  [232, 156, 74],
  [225, 133, 92],
  [214, 160, 58],
  [236, 176, 102],
  [204, 122, 70],
  [244, 194, 122],
  [214, 145, 48],
];

/** The model's canvas starts here, and so does this. */
const YAW0 = -0.5;
const PITCH = -0.18;
/** Radians per second of the idle rotation. `brain.js` turns 0.0032 rad a frame
 *  at 60 Hz; this is the same rate expressed in wall time, so a dropped frame
 *  slows it rather than stalling it. */
const SPIN = 0.19;
/** Extra rotation across the whole article. A little over half a turn: enough
 *  that the far hemisphere comes round while you read, not so much that the
 *  head is a spinning top. */
const SCROLL_TURN = 2.0;

type Brain = {
  n: number;
  p: number[];
  f: number[];
  div: string[];
};
type Edges = { e: number[]; w: number[] };

/** Relative luminance of a `#rrggbb` token, for the one decision the field
 *  cannot take from a CSS variable: ink on paper wants less alpha than the
 *  same linework glowing on a dark ground. */
function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const v = Number.parseInt(m[1], 16);
  const l = 0.2126 * ((v >> 16) & 0xff) + 0.7152 * ((v >> 8) & 0xff) + 0.0722 * (v & 0xff);
  return l < 128;
}

export function WbdAtmosphere() {
  useWorld("wbd");

  const dataRef = useRef<{ brain: Brain; edges: Edges } | null>(null);
  const darkRef = useRef(true);
  // Scratch buffers, allocated once the geometry is known. Projecting 414
  // parcels into freshly allocated arrays 30 times a second is the one thing
  // in this file that would actually cost something.
  const xsRef = useRef<Float32Array | null>(null);
  const ysRef = useRef<Float32Array | null>(null);
  const dsRef = useRef<Float32Array | null>(null);
  const orderRef = useRef<number[]>([]);

  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      fetch("/assets/data/sc-wbd/brain.json", { signal: abort.signal }).then((r) => r.json()),
      fetch("/assets/data/sc-wbd/edges.json", { signal: abort.signal }).then((r) => r.json()),
    ])
      .then(([brain, edges]: [Brain, Edges]) => {
        dataRef.current = { brain, edges };
        xsRef.current = new Float32Array(brain.n);
        ysRef.current = new Float32Array(brain.n);
        dsRef.current = new Float32Array(brain.n);
        orderRef.current = Array.from({ length: brain.n }, (_, i) => i);
        // Under `prefers-reduced-motion` the field draws exactly one frame, at
        // mount — which is before this resolves, so without a nudge the reader
        // who asked for less motion gets an empty backdrop rather than a still
        // one. A resize is the field's own "measure and paint again".
        window.dispatchEvent(new Event("resize"));
      })
      .catch(() => {
        // The geometry did not arrive, so there is no backdrop. Deliberately
        // nothing else: this is ambient decoration behind an article, and a
        // stand-in brain drawn from invented coordinates would be worse than
        // the plain page.
      });
    return () => abort.abort();
  }, []);

  const canvasRef = useCanvasField({
    fps: 30,
    measure() {
      darkRef.current = isDark(token("--color-bg-0", "#08090b"));
    },
    draw({ ctx, w, h, t, scroll }) {
      const data = dataRef.current;
      const xs = xsRef.current;
      const ys = ysRef.current;
      const ds = dsRef.current;
      if (!data || !xs || !ys || !ds) return;

      const { n, p, f, div } = data.brain;
      const dark = darkRef.current;

      const yaw = YAW0 + t * SPIN + scroll * SCROLL_TURN;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(PITCH);
      const sp = Math.sin(PITCH);
      // Big enough to run off the top and bottom of the window: the reader is
      // standing inside the head rather than looking at a diagram of one.
      const s = Math.max(w, h) * 0.46;
      const ox = w / 2;
      const oy = h * 0.44;

      for (let i = 0; i < n; i += 1) {
        // Anatomical RAS: x right, y anterior, z superior. Screen up is +z.
        const X = p[i * 3];
        const Y = p[i * 3 + 1];
        const Z = p[i * 3 + 2];
        const x1 = X * cy + Y * sy;
        const y1 = -X * sy + Y * cy;
        xs[i] = ox + x1 * s;
        ys[i] = oy - (y1 * sp + Z * cp) * s;
        ds[i] = y1 * cp - Z * sp;
      }

      // The tracts, under the parcels and in one flat grey: they are the
      // structure the parcels sit in, and colouring them as well would make
      // the whole field one texture.
      const { e, w: ew } = data.edges;
      ctx.strokeStyle = dark ? "#8c9bad" : "#5c6675";
      ctx.lineWidth = 1;
      for (let k = 0; k < ew.length; k += 1) {
        const a = e[k * 2];
        const b = e[k * 2 + 1];
        const depth = ((ds[a] + ds[b]) / 2 + 1) / 2;
        ctx.globalAlpha = (0.02 + 0.1 * ew[k] * depth) * (dark ? 1 : 0.9);
        ctx.beginPath();
        ctx.moveTo(xs[a], ys[a]);
        ctx.lineTo(xs[b], ys[b]);
        ctx.stroke();
      }

      // Painter's algorithm, far first — the same sort `brain.js` runs, on an
      // array that is already nearly ordered from the previous frame.
      const order = orderRef.current;
      order.sort((a, b) => ds[a] - ds[b]);

      for (let k = 0; k < n; k += 1) {
        const j = order[k];
        const depth = (ds[j] + 1) / 2; // 0 far .. 1 near
        const c = COL[f[j]] ?? COL[0];
        const sub = div[f[j]] !== "cortex";
        ctx.globalAlpha = (0.05 + 0.16 * depth) * (dark ? 1 : 0.85);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.beginPath();
        ctx.arc(xs[j], ys[j], (sub ? 3.4 : 2.2) * (0.62 + 0.55 * depth), 0, 6.2832);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="wbd-field" aria-hidden="true">
      <canvas className="wbd-brain" ref={canvasRef} />
    </div>
  );
}
