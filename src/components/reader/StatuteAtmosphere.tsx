"use client";

import { useWorld } from "./atmosphere";

/**
 * The runlaw project page, dressed as runlaw.
 *
 * runlaw's site is a printed annual: sand paper `#e6dbc7`, one cobalt
 * `#062b8a` doing all the ink, the text, the drawings and the solid blocks,
 * Hanken Grotesk at two weights, square corners, and no gradients or shadows
 * anywhere. Its pictures are archival and greyscale, and the one that carries
 * the idea is the Code of Hammurabi: law cut into stone where anyone could
 * check a ruling against it, which is the product's argument about policy at
 * runtime. Nearly all of that is type and colour and lives in globals.css.
 *
 * What this component adds is the stele itself, standing in the gutters: the
 * relief at the top of the stone on the left and the carved columns of law on
 * the right, full height and greyscale, kept out of the reading column. They
 * are photographs, not drawings, because the site's pictures are photographs.
 *
 * It does not move. The site's one loud moment is a shutter opening on the
 * stele once, and a backdrop that kept animating behind a long write-up would
 * be a second loud moment competing with the reading.
 *
 * Light is forced. runlaw declares its palette exactly once, with no dark half
 * and no toggle, so a dark version of this page would be a picture of a site
 * that does not exist.
 */
export function StatuteAtmosphere() {
  useWorld("statute", "light");

  return (
    <div className="statute-field" aria-hidden="true">
      {/* React 19 hoists this into <head> and loads it once; only this page
          pays for the face. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;700&display=swap"
        precedence="default"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed decoration, not content */}
      <img className="statute-stone statute-stone--relief" src="/assets/media/runlaw/stele.jpg" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed decoration, not content */}
      <img className="statute-stone statute-stone--text" src="/assets/media/runlaw/stele-text.jpg" alt="" />
    </div>
  );
}
