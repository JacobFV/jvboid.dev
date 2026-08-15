"use client";

import { useRef } from "react";
import { rng, useCanvasField, useWorld } from "./atmosphere";

/**
 * The canvas-engineering project page, dressed as its own compiler output.
 *
 * Every figure in this write-up is drawn in the same language: hard-edged
 * rectangles on a shelf-packed grid, one flat colour per declared entity, a
 * hairline of near-black around every one, diagonal hatching on the regions the
 * compiler inserted rather than the author, and a light grey field showing
 * through wherever positions are still free. Panel 3 of `fig_icu_allocation`
 * is the canonical version: 199 regions and 1,077 connections, auto-packed.
 *
 * So the backdrop is a canvas being packed. The same shelf packer the figures
 * illustrate, running: rows fill left to right, a block takes as many positions
 * as its region needs, coarse-grained fields come in hatched, and the gaps are
 * the positions nobody claimed. A compile wave sweeps down the allocation order
 * so blocks arrive in the order `compile_schema()` would emit them, then the
 * layout re-packs and it happens again.
 *
 * Nothing here is decorative in the sense of being invented for the page. The
 * palette below is read straight off the figure legend.
 *
 * No theme is forced: the figures are ink-on-white PNGs and the stylesheet
 * gives them their own sheet of paper in either theme, exactly as the sc-wbd
 * world does for the same reason.
 */

/** The legend, in the figure's own order: patients, nurses, families,
 *  bureaucratic, ward globals. Light and dark are the same hues held to the
 *  same relative weight, not two unrelated palettes. */
const REGIONS: { light: string; dark: string; weight: number }[] = [
  { light: "#4a90d9", dark: "#3f78b4", weight: 34 }, // patients[0..5]
  { light: "#7fb069", dark: "#5d8a4c", weight: 16 }, // nurses[0..3]
  { light: "#c46a94", dark: "#9c4f75", weight: 14 }, // families[0..5]
  { light: "#e0a33d", dark: "#a97a26", weight: 8 }, //  bureaucratic
  { light: "#8d8d92", dark: "#6b6b70", weight: 8 }, //  ward globals
];

const TOTAL_WEIGHT = REGIONS.reduce((n, r) => n + r.weight, 0);

type Block = {
  row: number;
  /** Grid columns, not pixels — the packer allocates positions. */
  col: number;
  span: number;
  region: number;
  /** The auto-inserted coarse-grained field, drawn hatched in the figure. */
  hatched: boolean;
  /** Allocation order, 0…1. The compile wave reveals blocks by this. */
  order: number;
};

/**
 * The shelf packer, which is the only algorithm on this page. Walk the rows;
 * on each row lay blocks of 1–5 positions until the row is full, dropping a
 * gap now and then so the field shows through the way "235 positions free"
 * does in the figure.
 */
function pack(cols: number, rows: number, seed: number): Block[] {
  const r = rng(seed);
  const blocks: Block[] = [];
  for (let row = 0; row < rows; row += 1) {
    let col = 0;
    while (col < cols) {
      const span = Math.min(cols - col, 1 + Math.floor(r() * 5));
      // A gap is a position the packer never claimed. Roughly one in six, which
      // is close to the figure's 235-of-784.
      if (r() < 0.17) {
        col += span;
        continue;
      }
      // Pick a region by weight, so the canvas is mostly patients the way the
      // ICU schema is mostly patients.
      let pick = r() * TOTAL_WEIGHT;
      let region = 0;
      for (let i = 0; i < REGIONS.length; i += 1) {
        pick -= REGIONS[i].weight;
        if (pick <= 0) {
          region = i;
          break;
        }
      }
      blocks.push({
        row,
        col,
        span,
        region,
        hatched: r() < 0.22,
        order: 0,
      });
      col += span;
    }
  }
  // Allocation order is row-major, which is the order the packer emits.
  blocks.forEach((b, i) => {
    b.order = blocks.length > 1 ? i / (blocks.length - 1) : 0;
  });
  return blocks;
}

/** Seconds for one full compile sweep plus the pause at the end. Slow — this
 *  is a backdrop to an argument, and a canvas that re-packs every few seconds
 *  reads as a loading spinner. */
const CYCLE = 26;

export function CanvasAtmosphere() {
  useWorld("canvas");
  const darkRef = useRef(false);
  const blocksRef = useRef<Block[]>([]);
  const gridRef = useRef({ cols: 40, rows: 26, cw: 20, ch: 20 });
  const cycleRef = useRef(0);
  const seedRef = useRef(0x0ca4a5);

  const canvasRef = useCanvasField({
    fps: 20,
    measure({ w, h }) {
      darkRef.current = document.documentElement.dataset.theme === "dark";
      // Positions are square and chunky — the figures' blocks are big enough to
      // point at, and a fine grid here would cost several hundred extra rects a
      // frame to look like noise.
      const cw = w < 700 ? 22 : 34;
      const cols = Math.max(8, Math.ceil(w / cw));
      const rows = Math.max(8, Math.ceil(h / cw));
      gridRef.current = { cols, rows, cw, ch: cw };
      blocksRef.current = pack(cols, rows, seedRef.current);
    },
    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;
      const { cw, ch } = gridRef.current;

      // The field: the light grey the unallocated positions show through as.
      ctx.fillStyle = dark ? "#16181b" : "#f2f2f0";
      ctx.fillRect(0, 0, w, h);

      // One sweep per cycle. The tail of the cycle is held at "fully packed"
      // so the canvas spends most of its time being a canvas rather than being
      // an animation of one.
      const phase = (t % CYCLE) / CYCLE;
      const cycle = Math.floor(t / CYCLE);
      if (cycle !== cycleRef.current) {
        cycleRef.current = cycle;
        seedRef.current = (seedRef.current * 1103515245 + 12345) >>> 0;
        blocksRef.current = pack(gridRef.current.cols, gridRef.current.rows, seedRef.current);
      }
      // 0…1 over the first 55% of the cycle, then pinned.
      const wave = Math.min(1, phase / 0.55);

      ctx.save();
      // Scroll slides the packing, so reading down the article travels across
      // the canvas rather than staring at one allocation.
      ctx.translate(0, -h * 0.12 * scroll);

      ctx.lineWidth = 1;
      for (const b of blocksRef.current) {
        // A block has landed once the wave has passed its allocation index; the
        // 0.08 lead-in is the fade rather than a pop.
        const arrived = (wave - b.order + 0.08) / 0.08;
        if (arrived <= 0) continue;
        const alpha = Math.min(1, arrived);

        const x = b.col * cw;
        const y = b.row * ch;
        const bw = b.span * cw;

        const region = REGIONS[b.region];
        ctx.globalAlpha = alpha * (dark ? 0.3 : 0.24);
        ctx.fillStyle = dark ? region.dark : region.light;
        ctx.fillRect(x, y, bw - 1, ch - 1);

        if (b.hatched) {
          // The auto-inserted coarse-grained field. Diagonals at 45°, clipped
          // to the block, at the same pitch the figures use.
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, bw - 1, ch - 1);
          ctx.clip();
          ctx.globalAlpha = alpha * (dark ? 0.34 : 0.3);
          ctx.strokeStyle = dark ? "#c9ccd2" : "#25272b";
          ctx.beginPath();
          for (let d = -ch; d < bw; d += 7) {
            ctx.moveTo(x + d, y + ch);
            ctx.lineTo(x + d + ch, y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // The hairline. Every region in every figure carries one, and it is
        // what keeps a wall of translucent fills from turning into a wash.
        ctx.globalAlpha = alpha * (dark ? 0.34 : 0.32);
        ctx.strokeStyle = dark ? "#c9ccd2" : "#25272b";
        ctx.strokeRect(x + 0.5, y + 0.5, bw - 2, ch - 2);
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="canvas-field" aria-hidden="true">
      <canvas className="canvas-packing" ref={canvasRef} />
    </div>
  );
}
