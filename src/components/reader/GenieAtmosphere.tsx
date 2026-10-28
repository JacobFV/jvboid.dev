"use client";

import { useWorld } from "./atmosphere";

/**
 * The GenieEDA project page, dressed as genieeda's staging site.
 *
 * That site is a dark lab: near-black `#0a0c0b`, ink `#e8eae4`, one orange
 * `#ff8a52` for every action, Instrument Sans condensed for display, small
 * uppercase JetBrains Mono for navigation and labels, square corners, and a
 * live workbench running dimmed behind the hero. Nearly all of it is type and
 * colour in globals.css; this component adds the dimmed bill-of-materials
 * screen in the gutter, the way the hero sits on one.
 *
 * Dark is forced. The marketing site declares one dark palette; the light
 * palette belongs to the workbench, which the page shows as a screenshot.
 */
export function GenieAtmosphere() {
  useWorld("genie", "dark");
  return (
    <div className="genie-field" aria-hidden="true">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&family=JetBrains+Mono:wght@400;500&display=swap"
        precedence="default"
      />
    </div>
  );
}
