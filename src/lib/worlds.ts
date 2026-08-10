/**
 * Worlds: the handful of routes that take the whole window over with a palette
 * and a set of furniture of their own.
 *
 * A world is not a theme picker. It exists for pages documenting something that
 * *already has a look somewhere else* — jterm's black-and-gold download page,
 * langcurriculum's instrument panel, Windows 11's Mica and bloom — so that the
 * write-up and the thing it documents read as one artifact instead of a review
 * of something living elsewhere. If a page's world had to be invented for the
 * page, it is decoration, and it does not belong here.
 *
 * This module is deliberately pure data and safe to import from anywhere: the
 * root layout serialises it into the pre-paint script (so a first load never
 * shows the site's palette for a frame before the world's), and each atmosphere
 * component reads it through `useWorld` (which covers client-side navigation,
 * where no script runs).
 *
 * Keeping the table here rather than inline in the boot script also retires a
 * real hazard: that script is a template literal, so a stray backtick anywhere
 * inside it silently truncates the string. It now interpolates JSON instead.
 */

export type WorldTheme = "light" | "dark";

export type World = {
  /** Written to `data-page-theme` on <html>; everything in globals.css hangs
   *  off it. Several routes may share one id — the three academic pages do. */
  id: string;
  /**
   * The theme this world insists on, or `null` to leave the reader's choice
   * alone.
   *
   * Force one only where the subject genuinely has a single look: jterm is a
   * black-and-gold application and a white version of that page would be a
   * picture of somewhere else. Anything that ships light *and* dark and looks
   * deliberate in both — langcurriculum, both desktop simulators, a paper —
   * is misrepresented just as badly by pinning one, so those pass `null`.
   */
  theme: WorldTheme | null;
};

export const WORLDS: Record<string, World> = {
  // Black and gold over ASCII Julia sets — jterm's own download page.
  "/projects/jterm": { id: "jterm", theme: "dark" },
  // An instrument panel: hairlines, right angles, mono labels in small caps.
  "/projects/langcurriculum": { id: "langcurriculum", theme: null },
  // Windows 11: Mica, the bloom wallpaper, Fluent controls.
  "/projects/windows-web-next": { id: "fluent", theme: null },
  // macOS: vibrancy, capsule controls, traffic lights on every window.
  "/projects/macos-web-next": { id: "aqua", theme: null },
  // The refractive glass itself — this page runs the real lens.
  "/projects/halo-prismatic": { id: "halo", theme: null },
  // An open field, which is where you would actually test the thing.
  "/projects/rl-lab": { id: "meadow", theme: null },
  // Ink on paper, for a reading environment built to hold texts like them.
  //
  // The obvious companions here would be `/papers/the-shape-of-experience` and
  // `/papers/the-shape-of-inquiry`. They are deliberately absent: papers link
  // out (see CLAUDE.md), so `/papers/{id}` redirects to the PDF and there is no
  // page to dress. Entries for them would be config that can never fire. If
  // either ever grows a page of its own — drop `pdf:` from its frontmatter and
  // place a `<Pdf>` in the body — add it here and the world is already built.
  "/projects/living-with-intelligence": { id: "academic", theme: null },
};

/** Trailing slashes are stripped, and the lookup goes through hasOwnProperty:
 *  a bare index would resolve `/constructor` off Object.prototype and hand back
 *  a truthy non-world. */
export function worldFor(pathname: string): World | null {
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return Object.prototype.hasOwnProperty.call(WORLDS, p) ? WORLDS[p] : null;
}
