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
  // The window manager with no OS on top of it — the third of the desktop
  // family, and the one both others are built out of.
  "/projects/browser-os": { id: "shell", theme: null },
  // The compiler's own output: latent regions auto-packed onto the canvas.
  "/projects/canvas-engineering": { id: "canvas", theme: null },
  // The Reference Monograph — yt2ctx's paper, red rule, and filmstrip.
  "/projects/yt2ctx": { id: "monograph", theme: null },
  // Phosphor green on black behind a targeting reticle: precisionbom.com.
  "/projects/precisionbom": { id: "reticle", theme: "dark" },
  // The contact sheet: RackSavant's own near-black ground, paper type and
  // oxblood, with the mood rail running behind the article. Forced dark — the
  // product's token file declares its palette exactly once and has no light
  // half, so a cream version would be a picture of an app that does not exist.
  "/projects/racksavant": { id: "editorial", theme: "dark" },
  // The machine's own tensors — framebuffer, opcode weights, program counter —
  // annealing as the reader scrolls. No theme is forced: the computer has no
  // opinion about the colour of paper and the field takes its ink from the
  // cascade.
  "/projects/tensor-computer": { id: "tensor", theme: null },
  // The room you watch a film in, for the four pages whose artifact is one.
  //
  // The only world here that dresses a *viewing condition* rather than an
  // existing interface, which is the honest answer for a page that is a video
  // and a caption. Dark is forced and is not a preference: the clip is the
  // page, the room around it is supposed to disappear, and a cinema with the
  // lights on is just a room with a screen in it.
  "/projects/space-pong": { id: "cinema", theme: "dark" },
  "/projects/looking-for-princess-suzzane": { id: "cinema", theme: "dark" },
  "/projects/the-right-night-light": { id: "cinema", theme: "dark" },
  "/projects/fieldratchet": { id: "cinema", theme: "dark" },
  // The refractive glass itself — this page runs the real lens.
  "/projects/halo-prismatic": { id: "halo", theme: null },
  // An open field, which is where you would actually test the thing.
  "/projects/rl-lab": { id: "meadow", theme: null },
  // The model's own drawing: 414 parcels and the connectome between them,
  // hairlines on paper. No theme is forced — the site it documents defines
  // every colour once on `:root` and once under `prefers-color-scheme`, with
  // no toggle, so it means light and dark equally.
  "/projects/sc-wbd": { id: "wbd", theme: null },
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
