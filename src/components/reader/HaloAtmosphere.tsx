"use client";

import { useRef } from "react";
import { useCanvasField, rng, useWorld } from "./atmosphere";

/**
 * The halo-prismatic project page, dressed in halo-prismatic.
 *
 * This is the one world on the site that is not an homage. Halo's claim is that
 * a browser can do real refraction rather than a picture of it, so the page
 * does not borrow its look — it runs its material. The plates, code blocks and
 * image frames on this page are panes of the same glass, filtered through the
 * same three-index displacement chain, refracting the same ground.
 *
 * Three parts, in the order they are painted:
 *
 *  1. **The cloud field** — 150 particles on a low-resolution dye buffer,
 *     advected by a time-varying curl-ish flow. It is upscaled into the visible
 *     canvas with smoothing on, which is what makes a 40-pixel-wide buffer read
 *     as soft weather rather than as a mosaic.
 *  2. **The hex dot lattice** — three equally strong axes, so it reads as grain
 *     rather than as ruling. It feathers against the viewport edge by dot
 *     *size*, not opacity: a mask can only grey out a 1px dot, and shrinking it
 *     is what actually reads as thinning. It is deliberately the highest
 *     frequency thing on the page, because **refraction is invisible without
 *     something to bend.**
 *  3. **The lens** — an SVG filter, declared here and referenced from CSS as
 *     `backdrop-filter: url(#halo-lens)`. A bevel-shaped displacement map,
 *     sampled three times at three indices of refraction, keeping red from the
 *     weakest pass, green from the middle and blue from the strongest. That
 *     separation *is* dispersion; the colour fringe at the rim of a pane is the
 *     fringe a slab of glass would leave there.
 *
 * Two failure modes the project itself documents, both of which apply here:
 *
 *  - **Blur is the enemy of refraction.** Blur destroys exactly the
 *    high-frequency detail displacement is supposed to be moving. The panes in
 *    globals.css carry ~3px, not the 16px the rest of the web uses.
 *  - **A backdrop root leaves every pane with an empty backdrop.** Never put
 *    `isolation: isolate` on an ancestor of a pane; there is nothing to refract
 *    behind an isolated stacking context.
 *
 * Where `backdrop-filter: url()` is unsupported — Safari, Firefox — the panes
 * degrade to a tint and a hairline, and the page is merely ordinary.
 */

/** The bevel, as a displacement map.
 *
 * Red carries the horizontal offset and green the vertical; 128 in a channel
 * means "bend nothing", which is why the middle of the map is flat mid-level
 * and only the bands at each edge ramp away from it — a flat slab bends
 * nothing, and only the roll-over at the rim does.
 *
 * The ramp is eased rather than linear because a bevel is a *curve*: the
 * surface normal turns slowly while the glass is still nearly flat and quickly
 * as it rolls over. The two ramps are screened together so each keeps its own
 * channel, and blue is left at zero and unused.
 */
const BEVEL_MAP = (() => {
  // Eased stops, inner → outer. Offsets are fractions of the map.
  const ramp = [
    [0.0, 0],
    [0.045, 46],
    [0.09, 92],
    [0.155, 120],
    [0.22, 128],
  ] as const;

  const stops = (channel: "r" | "g") => {
    const at = (v: number) =>
      channel === "r" ? `rgb(${v},0,0)` : `rgb(0,${v},0)`;
    const out: string[] = [];
    // leading edge: 0 → 128
    for (const [o, v] of ramp) out.push(`<stop offset="${o}" stop-color="${at(v)}"/>`);
    // trailing edge: 128 → 255, mirrored
    for (let i = ramp.length - 1; i >= 0; i -= 1) {
      const [o, v] = ramp[i];
      out.push(`<stop offset="${1 - o}" stop-color="${at(255 - v)}"/>`);
    }
    return out.join("");
  };

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">` +
    `<defs>` +
    `<linearGradient id="h" x1="0" y1="0" x2="1" y2="0">${stops("r")}</linearGradient>` +
    `<linearGradient id="v" x1="0" y1="0" x2="0" y2="1">${stops("g")}</linearGradient>` +
    `</defs>` +
    `<rect width="240" height="240" fill="url(#h)"/>` +
    // screen, so the vertical ramp lands in green without touching red
    `<rect width="240" height="240" fill="url(#v)" style="mix-blend-mode:screen"/>` +
    `</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

/** Three indices of refraction. Weakest bends red least, strongest bends blue
 *  most — the ordering is the whole point, and reversing it would produce a
 *  fringe that no material makes. */
const IOR = { r: 0.82, g: 1.0, b: 1.22 };
const BASE_SCALE = 26;

const PARTICLES = 150;
/** Divisor for the dye buffer. The clouds are the lowest-frequency thing on
 *  screen, so they cost almost nothing to store coarse. */
const DYE_DIV = 10;
const DOT_SPACING = 26;

type P = { x: number; y: number; hue: number };

export function HaloAtmosphere() {
  useWorld("halo");

  const dyeRef = useRef<HTMLCanvasElement | null>(null);
  const partsRef = useRef<P[]>([]);
  const darkRef = useRef(false);

  const canvasRef = useCanvasField({
    fps: 30,
    measure({ w, h }) {
      darkRef.current = document.documentElement.dataset.theme === "dark";

      const dye = dyeRef.current ?? document.createElement("canvas");
      dye.width = Math.max(2, Math.round(w / DYE_DIV));
      dye.height = Math.max(2, Math.round(h / DYE_DIV));
      dyeRef.current = dye;

      const random = rng(0x4a10);
      partsRef.current = Array.from({ length: PARTICLES }, () => ({
        x: random() * dye.width,
        y: random() * dye.height,
        // Halo gives each route its own hue band; the article is one route, so
        // the field sits in one band and only wanders inside it.
        hue: 68 + random() * 34,
      }));
    },

    draw({ ctx, w, h, t, scroll }) {
      const dye = dyeRef.current;
      const dark = darkRef.current;
      if (!dye) return;
      const dctx = dye.getContext("2d");
      if (!dctx) return;

      // --- 1. advect the dye ------------------------------------------------
      // Fade rather than clear, so a particle leaves a trail and the buffer
      // holds weather instead of 150 disconnected dots.
      dctx.globalCompositeOperation = "destination-out";
      dctx.fillStyle = "rgba(0,0,0,0.055)";
      dctx.fillRect(0, 0, dye.width, dye.height);
      dctx.globalCompositeOperation = "lighter";

      for (const p of partsRef.current) {
        // A curl-ish flow: each component driven by the *other* axis, which is
        // what keeps the field swirling instead of draining in one direction.
        const vx = Math.sin(p.y * 0.055 + t * 0.24) * Math.cos(p.x * 0.031 - t * 0.13);
        const vy = Math.cos(p.x * 0.048 - t * 0.19) * Math.sin(p.y * 0.036 + t * 0.11);
        p.x += vx * 0.9;
        p.y += vy * 0.9;
        // Wrap: an unbounded field empties itself within a minute.
        if (p.x < 0) p.x += dye.width;
        if (p.x > dye.width) p.x -= dye.width;
        if (p.y < 0) p.y += dye.height;
        if (p.y > dye.height) p.y -= dye.height;

        const r = 3.4;
        const g = dctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        const light = dark ? 34 : 62;
        g.addColorStop(0, `hsla(${p.hue}, 74%, ${light}%, 0.5)`);
        g.addColorStop(1, `hsla(${p.hue}, 74%, ${light}%, 0)`);
        dctx.fillStyle = g;
        dctx.beginPath();
        dctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        dctx.fill();
      }
      dctx.globalCompositeOperation = "source-over";

      // --- 2. upscale it ----------------------------------------------------
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = dark ? 0.85 : 0.62;
      // Scroll drifts the weather sideways, so the ground under the glass is
      // never quite the ground it was a screen ago.
      ctx.drawImage(dye, -w * 0.06 * scroll, 0, w * 1.06, h);
      ctx.restore();

      // --- 3. the hex dot lattice ------------------------------------------
      // Rows offset by half a step give three equally spaced axes, so it reads
      // as grain. A square grid reads as ruling and the eye follows the lines.
      const rowStep = DOT_SPACING * 0.866;
      const feather = Math.min(w, h) * 0.34;
      ctx.fillStyle = dark ? "#e9ffb0" : "#4c5a20";

      for (let row = 0, y = 0; y < h + rowStep; row += 1, y += rowStep) {
        const offset = row % 2 ? DOT_SPACING / 2 : 0;
        for (let x = offset; x < w + DOT_SPACING; x += DOT_SPACING) {
          const edge = Math.min(x, w - x, y, h - y);
          // Feather by *size*: opacity on a 1px dot only greys it, and grey
          // dots on a pale ground still read as a hard grid stopping dead.
          const k = Math.max(0, Math.min(1, edge / feather));
          const r = 1.5 * k * k;
          if (r < 0.06) continue;
          ctx.globalAlpha = dark ? 0.3 : 0.24;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  return (
    <>
      {/* The lens. Zero-sized and hidden — this SVG is a definition, not a
          picture; every pane on the page references it from CSS. */}
      <svg className="halo-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="halo-lens" colorInterpolationFilters="sRGB">
            {/* No x/y/width/height: the sub-region defaults to the filter
                region, and preserveAspectRatio="none" stretches the bevel to
                whatever the pane actually is. One filter, any pane size. */}
            <feImage href={BEVEL_MAP} preserveAspectRatio="none" result="map" />

            {/* Three passes, one index of refraction each, each reduced to the
                single channel it is responsible for. */}
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={BASE_SCALE * IOR.r}
              xChannelSelector="R"
              yChannelSelector="G"
              result="pr"
            />
            <feColorMatrix
              in="pr"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="cr"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={BASE_SCALE * IOR.g}
              xChannelSelector="R"
              yChannelSelector="G"
              result="pg"
            />
            <feColorMatrix
              in="pg"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="cg"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="map"
              scale={BASE_SCALE * IOR.b}
              xChannelSelector="R"
              yChannelSelector="G"
              result="pb"
            />
            <feColorMatrix
              in="pb"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="cb"
            />

            {/* Recombined. Screen, because the three are disjoint channels —
                anything else would darken where they overlap, and they never
                overlap. */}
            <feBlend in="cr" in2="cg" mode="screen" result="crg" />
            <feBlend in="crg" in2="cb" mode="screen" />
          </filter>
        </defs>
      </svg>

      <div className="halo-field" aria-hidden="true">
        <canvas className="halo-ground" ref={canvasRef} />
      </div>
    </>
  );
}
