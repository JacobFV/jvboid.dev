"use client";

import { useRef } from "react";
import { rng, useCanvasField, useWorld } from "./atmosphere";

/**
 * The racksavant project page, dressed as RackSavant.
 *
 * The product has a real design system and it is not a fashion-app pastel: the
 * ground is near-black `#0b0b0c`, the type is a warm paper `#efebe3`, the one
 * accent is oxblood `#7e2436` with an orange `#ff3b00` reserved for the moment
 * something actually fires, the display face is Instrument Serif, and every
 * radius token in the file is `0px` except the pill on a control. Editorial,
 * printed, unfriendly to rounded corners — which is exactly the argument the
 * project makes about clothes, that they are styling and not SKUs.
 *
 * So the backdrop is the object that language is built for: **the contact
 * sheet.** Columns of portrait plates running up the page, each one a duotone
 * in one of the moods the product browses by — soft, sharp, feral, regal,
 * dreamy — with a caption rule under it and a hairline grid behind the lot.
 * The columns run at different rates and scrolling pulls them, so reading the
 * page is turning the rail.
 *
 * Deliberately no photographs. The seed gallery is 68 generated packshots and
 * they belong in the article where they can be looked at; a wall of them behind
 * the text would be the same images at a size where nobody can see them, and it
 * would put a person's body under a paragraph.
 *
 * Dark is forced. RackSavant declares its palette exactly once — there is no
 * light half of the token file and no toggle in the product — so a cream
 * version of this page would be a picture of an app that does not exist.
 */

/** The moods the product browses by, as the duotone each one is graded to.
 *  Two stops, because a plate in a contact sheet is a print and a print is a
 *  process with a colour cast, not a rainbow. */
const MOODS: [string, string][] = [
  ["#c9a898", "#3a2a28"], // soft
  ["#8f9aa6", "#12151a"], // sharp
  ["#ff3b00", "#4a121f"], // feral
  ["#7e2436", "#241017"], // regal
  ["#8f93c9", "#1b1b2e"], // dreamy
];

/** Columns of plates, and the height of one plate as a fraction of the window.
 *  Portrait, because every image in the product is a person standing up. */
const COLUMNS = 5;
const PLATE_H = 0.46;
const PLATE_W = 0.62;

type Column = { x: number; w: number; rate: number; travel: number; phase: number; moods: number[] };

export function EditorialAtmosphere() {
  useWorld("editorial", "dark");

  const colsRef = useRef<Column[]>([]);

  const canvasRef = useCanvasField({
    fps: 20,
    measure({ w }) {
      const r = rng(0x5a17);
      const pitch = w / COLUMNS;
      const plateW = pitch * PLATE_W;
      colsRef.current = Array.from({ length: COLUMNS }, (_, i) => ({
        x: pitch * (i + 0.5) - plateW / 2,
        w: plateW,
        // Slow. This is a rail being browsed, not a slot machine.
        rate: 5 + r() * 9,
        // How far the column is pulled over a full read, in plate heights. The
        // spread is what keeps the columns from locking into one moving block.
        travel: 1.1 + r() * 2.4,
        phase: r(),
        moods: Array.from({ length: 6 }, () => Math.floor(r() * MOODS.length)),
      }));
    },
    draw({ ctx, w, h, t, scroll }) {
      const plateH = h * PLATE_H;
      // Plate plus the caption space under it — the pitch of the rail.
      const cell = plateH * 1.18;

      // The grid the sheet is laid out on. Fixed: it is the page, not the
      // content, and moving it would make the whole field one texture.
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = "#efebe3";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < COLUMNS; i += 1) {
        const x = Math.round((w / COLUMNS) * i) + 0.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      ctx.stroke();

      for (const col of colsRef.current) {
        // How far this column has been pulled, wrapped into one cell. The
        // double modulo is because the phase term can go negative on the first
        // frames and a negative shift drops the top plate off the sheet.
        const pulled = t * col.rate + scroll * cell * col.travel + col.phase * cell;
        const shift = ((pulled % cell) + cell) % cell;
        // Which plate of the rail is currently at the top of the window. Taking
        // the mood off `k` alone would recolour the whole column every time the
        // shift wraps, which is a rail of plates changing their minds rather
        // than a rail of plates going past.
        const base = Math.floor(pulled / cell);
        const n = col.moods.length;
        // One extra cell above and below, so a plate is already on its way in
        // before its edge would have appeared.
        for (let k = -1; k * cell - shift < h + cell; k += 1) {
          const y = k * cell - shift;
          const [from, to] = MOODS[col.moods[((((k + base) % n) + n) % n)]];
          // Top-left to bottom-right, the way a light source falls across a
          // standing figure — the grade reads as a photograph rather than as a
          // swatch even with nothing in the frame.
          const grad = ctx.createLinearGradient(col.x, y, col.x + col.w, y + plateH);
          grad.addColorStop(0, from);
          grad.addColorStop(1, to);
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = grad;
          ctx.fillRect(col.x, y, col.w, plateH);

          // The caption rule: a short hairline under the plate, left-aligned,
          // which is the single mark that makes a rectangle read as a plate on
          // a sheet rather than as a coloured box.
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "#efebe3";
          ctx.fillRect(col.x, Math.round(y + plateH + plateH * 0.06), col.w * 0.42, 1);
        }
      }

      // The house scrim: the product darkens the bottom of every editorial
      // image so type can sit on it, and the page is doing the same job.
      const scrim = ctx.createLinearGradient(0, 0, 0, h);
      scrim.addColorStop(0, "rgba(11, 11, 12, 0.55)");
      scrim.addColorStop(0.5, "rgba(11, 11, 12, 0.1)");
      scrim.addColorStop(1, "rgba(11, 11, 12, 0.75)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);
    },
  });

  return (
    <div className="editorial-field" aria-hidden="true">
      <canvas className="editorial-sheet" ref={canvasRef} />
    </div>
  );
}
