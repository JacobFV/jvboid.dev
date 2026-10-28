"use client";

import { useWorld } from "./atmosphere";

/**
 * The My Little Brain project page, dressed as My Little Brain.
 *
 * The app is soft and light: a pale sage ground `#f3f4ef` washed with three
 * blurred blooms (blush, mint, lilac), grey-green text `#58635b`, a sage
 * accent, frosted white panels with 14px corners, pill buttons, and DM Sans
 * for text with Manrope for display. That is almost all type and colour, so
 * it lives in globals.css; this component adds the blooms behind the article.
 *
 * Light is forced. The app ships one light palette with no dark half.
 */
export function LittleBrainAtmosphere() {
  useWorld("littlebrain", "light");
  return (
    <div className="littlebrain-field" aria-hidden="true">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Manrope:wght@500;700;800&display=swap"
        precedence="default"
      />
    </div>
  );
}
