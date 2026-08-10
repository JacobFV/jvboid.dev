"use client";

import { useWorld } from "./atmosphere";

/**
 * The academic world: ink on paper.
 *
 * Used by `living-with-intelligence`, whose whole argument is that a reading
 * environment should be a reading environment and not a dashboard — "the
 * failure mode I wanted to avoid is the one every content platform drifts into:
 * the reading surface becomes a card in a feed of tools." A page making that
 * case in the site's ordinary chrome is arguing against itself.
 *
 * Nearly all of this world is typography and lives in globals.css: a serif
 * text face instead of the UI sans, a measure set by the line rather than the
 * viewport, numbered sections, a title block, and margins wide enough to be
 * margins. That is the correct division — an academic page is made of type, not
 * of effects.
 *
 * **This one does not move, and that is deliberate.** Every other world here
 * animates because the thing it documents does: signal crosses a dependency
 * graph, a wallpaper breathes, glass refracts what passes under it, grass
 * bends. Paper does none of that. An animated backdrop behind a long argument
 * is a thing competing with the argument, and this is the one page on the site
 * whose subject is the reading itself. So the ground is a still sheet: laid
 * lines, a faint grain, and the shadow of a page edge.
 *
 * Because nothing animates there is no canvas and no loop — the grain is a
 * handful of gradients in CSS, which costs a paint on load and nothing after.
 *
 * No theme is forced. A long read is exactly the case where a reader's dark
 * preference is a considered choice rather than a whim, and cream paper under a
 * lamp is as real a reading surface as cream paper in daylight.
 */
export function AcademicAtmosphere() {
  useWorld("academic");

  return (
    <div className="academic-field" aria-hidden="true">
      {/* Laid lines and chain lines: the impression a paper mould leaves, and
          the reason good paper is never quite flat. Two repeating gradients,
          one fine and one coarse, at the angle a sheet is actually laid. */}
      <div className="academic-laid" />
      {/* The leaf: a soft edge shadow down both gutters, so the reading column
          sits on a sheet rather than being painted directly onto the window. */}
      <div className="academic-leaf" />
    </div>
  );
}
