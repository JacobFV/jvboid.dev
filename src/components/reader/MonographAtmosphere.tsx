"use client";

import { useRef } from "react";
import { rng, useCanvasField, useWorld } from "./atmosphere";

/**
 * The yt2ctx project page, dressed as the Reference Monograph.
 *
 * yt2ctx's app calls itself a monograph and means it: warm paper, a high-
 * contrast serif set enormous, one vermilion accent, mono labels in small caps
 * tracked wide, and rules — hairline rules everywhere, dividing the page into
 * a print grid. Almost all of that is type and lives in globals.css, which for
 * this world is the more important half.
 *
 * What the canvas draws is the pipeline: filmstrips. Candidate frames sampled
 * along a video, scored, and a few of them selected. A read head crosses the
 * strip left to right; frames it has passed carry their salience as a small bar
 * beneath them, and the ones that won their neighbourhood get the vermilion
 * rule that means "this frame is in the pack". That is exactly what the
 * analyzer does — sample, describe, score for novelty, take the top of each
 * density window — and it is a much better backdrop than a picture of paper.
 *
 * Kept to the gutters by the mask in globals.css, and drawn at paper weights,
 * because a page arguing that reference material should be legible should not
 * put a moving film strip under its own body copy.
 *
 * No theme is forced. The app is a paper-coloured light interface, but a dark
 * reader on this site should not be ambushed by a cream rectangle, so the world
 * carries a dark paper too — the same ink relationship on a darker sheet.
 */

type Frame = {
  /** Position along the strip, 0…1 of a strip's own scrolling length. */
  u: number;
  /** Vision score, 0…1 — bar height, and what selection is decided on. */
  score: number;
  selected: boolean;
};

type Strip = {
  /** Vertical centre as a fraction of viewport height. */
  y: number;
  /** Frame width and gap in CSS pixels. */
  fw: number;
  gap: number;
  /** Pixels per second, signed — strips run against each other. */
  speed: number;
  frames: Frame[];
};

/** Frame height, in CSS pixels. 16:9-ish at the widths below. */
const FH = 34;

function buildStrips(count: number, seed: number): Strip[] {
  const r = rng(seed);
  const strips: Strip[] = [];
  for (let i = 0; i < count; i += 1) {
    const fw = 52 + Math.floor(r() * 18);
    const frames: Frame[] = [];
    const n = 40;
    for (let f = 0; f < n; f += 1) {
      frames.push({ u: f / n, score: 0.1 + r() * 0.9, selected: false });
    }
    // Selection is top-of-window, not top-k overall: yt2ctx picks by density so
    // the pack covers the whole runtime instead of clustering on one busy shot.
    const win = 5;
    for (let f = 0; f < n; f += win) {
      let best = f;
      for (let k = f; k < Math.min(n, f + win); k += 1) {
        if (frames[k].score > frames[best].score) best = k;
      }
      frames[best].selected = true;
    }
    strips.push({
      y: (i + 0.5) / count,
      fw,
      gap: 5,
      speed: (r() < 0.5 ? -1 : 1) * (5 + r() * 9),
      frames,
    });
  }
  return strips;
}

export function MonographAtmosphere() {
  useWorld("monograph");
  const darkRef = useRef(false);
  const stripsRef = useRef<Strip[]>([]);

  const canvasRef = useCanvasField({
    fps: 20,
    measure({ h }) {
      darkRef.current = document.documentElement.dataset.theme === "dark";
      // One strip per ~190px of height, so the spacing holds from a phone to a
      // tall desktop window without ever becoming a stack of stripes.
      stripsRef.current = buildStrips(Math.max(2, Math.round(h / 190)), 0x7c2c78);
    },
    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;
      const ink = dark ? "#cfc7b8" : "#3a3733";
      const frameFill = dark ? "#211f1c" : "#e0d9cc";
      const red = dark ? "#e0745c" : "#c0503c";

      // The read head: one pass across the window every 14 seconds. Everything
      // to its left has been described and scored; everything to its right is
      // still just a sampled frame.
      const head = ((t / 14) % 1) * w;

      ctx.save();
      // Scroll runs the tape, so moving down the article moves through the
      // video — the one motion on this page that is not a loop.
      ctx.translate(0, -h * 0.08 * scroll);
      ctx.lineWidth = 1;

      for (const strip of stripsRef.current) {
        const y = strip.y * h;
        const pitch = strip.fw + strip.gap;
        const span = strip.frames.length * pitch;
        // Two copies laid end to end, so a strip wraps instead of running out.
        const offset = ((t * strip.speed) % span) - span;

        for (let copy = 0; copy < 2; copy += 1) {
          strip.frames.forEach((f, i) => {
            const x = offset + copy * span + i * pitch;
            if (x + strip.fw < 0 || x > w) return;
            const read = x < head;

            // The frame itself: a plate with a hairline, the way every card on
            // the app is drawn.
            ctx.globalAlpha = dark ? 0.5 : 0.55;
            ctx.fillStyle = frameFill;
            ctx.fillRect(x, y - FH / 2, strip.fw, FH);
            ctx.globalAlpha = dark ? 0.3 : 0.28;
            ctx.strokeStyle = ink;
            ctx.strokeRect(x + 0.5, y - FH / 2 + 0.5, strip.fw - 1, FH - 1);

            // Sprocket holes. Two rows, because that is what makes a rectangle
            // read as film rather than as a table cell.
            ctx.globalAlpha = dark ? 0.26 : 0.22;
            ctx.fillStyle = ink;
            for (let s = 0; s < 2; s += 1) {
              const sx = x + strip.fw * (0.28 + s * 0.44);
              ctx.fillRect(sx, y - FH / 2 - 5, 6, 3);
              ctx.fillRect(sx, y + FH / 2 + 2, 6, 3);
            }

            if (!read) return;

            // Scored: the salience bar under the frame.
            const barH = f.score * 14;
            ctx.globalAlpha = f.selected ? 0.6 : 0.26;
            ctx.fillStyle = f.selected ? red : ink;
            ctx.fillRect(x, y + FH / 2 + 8, strip.fw, barH);

            // Selected: the vermilion rule across the top of the frame, which
            // is how the app marks a still that made the pack.
            if (f.selected) {
              ctx.globalAlpha = 0.75;
              ctx.fillStyle = red;
              ctx.fillRect(x, y - FH / 2 - 2, strip.fw, 2);
            }
          });
        }
      }

      // The head itself: a single hairline, the app's own vertical rule.
      ctx.globalAlpha = dark ? 0.4 : 0.34;
      ctx.strokeStyle = red;
      ctx.beginPath();
      ctx.moveTo(head + 0.5, 0);
      ctx.lineTo(head + 0.5, h);
      ctx.stroke();

      ctx.restore();
      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="monograph-field" aria-hidden="true">
      <canvas className="monograph-strip" ref={canvasRef} />
    </div>
  );
}
