"use client";

import { useLayoutEffect, useRef } from "react";

// Fits a stack of blocks to the inside of a hexagon.
//
// The hero used to inscribe its contents in the largest rectangle that
// fits the hexagon — 56% of the width — so every row paid for the two
// narrow ends even though only the portrait sits up there.
//
// The walls are not vertical, so nothing here is rectangular. For the
// flat-top hexagon the frame draws, the usable width at height fraction
// y is
//
//   u(y) = 1 − ½·|2y − 1|
//
// — full width across the middle, half of it at the very top and bottom.
//
// Two levels of fit:
//
//   • Plain blocks get a max-width: the narrower of their two ends, since
//     u is concave and a block is safe wherever its corners are.
//   • A block marked `data-hex-shape` gets the wall itself. It is laid
//     out at its *widest* point and two floats — sized and shaped from
//     here, styled in globals.css — take back everything outside the
//     hexagon, so its text wraps to the real diagonals. A block below the
//     middle is a trapezoid; one straddling the middle bulges out to full
//     width there and closes in above and below it, which is the shape
//     the links row actually sits in.
//
// Which row lands where depends on how long the bio is and how many
// links are showing, so the bands are measured, not assumed: each child
// is placed by normal flow, its box is read back, and its width comes
// from the hexagon at the height it actually occupies. Shaping a block
// reflows it, which moves everything below it, so a pass repeats until
// the numbers stop changing (or the cap is hit). The first run is a
// layout effect, before paint, so none of the settling is visible.

/** Usable width at height fraction `y`, as a fraction of the full width. */
const usableWidth = (y: number) => 1 - 0.5 * Math.abs(2 * y - 1);

/** Keeps content off the hairline edge and its corners off the diagonals. */
const INSET = 0.94;

/** Enough to settle in practice; a hard cap so a reflow cannot spin. */
const PASSES = 5;

/** Sweeps allowed per hexagon size — see `settle`. */
const BUDGET = 40;

/** Below this the taper is not worth a float. */
const MIN_TAPER_PX = 1.5;

/** Keeps the column off the flat top and bottom of the frame. */
const VPAD = 0.02;

/** How far the gaps between rows may be squeezed before the portrait gives. */
const MIN_SQUEEZE = 0.15;

/** And how small the portrait may get once the gaps are spent. */
const MIN_PFP = 0.5;

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Keeps the column inside the frame vertically.
 *
 * The column is centered, so anything taller than the hexagon spills out
 * of both ends — expand the link row far enough and the portrait climbs
 * out over the top edge. Two things give, in order: first the gaps
 * between the rows (the air around the name), then the portrait itself.
 *
 * Both are scale factors the hero multiplies into its own margins and
 * portrait width, which makes the height linear in them:
 *
 *   height(squeeze, pfp) = fixed + squeeze·G + pfp·P
 *
 * G and P are recovered by dividing the measured gap total and portrait
 * height by the factors currently applied, so the two are solved for
 * directly rather than crept toward. That matters in both directions: it
 * relaxes straight back to full size when the row collapses again.
 */
function fitHeight(
  el: HTMLElement,
  box: DOMRect,
  write: (node: HTMLElement, prop: string, value: string) => void,
) {
  const kids = Array.from(el.children) as HTMLElement[];
  if (kids.length < 2) return;

  const squeeze = Number(el.style.getPropertyValue("--hex-squeeze")) || 1;
  const pfpScale = Number(el.style.getPropertyValue("--hex-pfp")) || 1;

  const contentH =
    kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top;
  let gapPx = 0;
  for (const kid of kids.slice(1)) gapPx += parseFloat(getComputedStyle(kid).marginTop) || 0;
  const pfp = el.querySelector("[data-hex-pfp]") as HTMLElement | null;
  const pfpPx = pfp ? pfp.getBoundingClientRect().height : 0;

  // The row heights themselves are not ours to compress.
  const fixed = contentH - gapPx - pfpPx;
  const G = gapPx / squeeze;
  const P = pfpPx / pfpScale;
  const room = box.height * (1 - 2 * VPAD) - fixed;

  let nextSqueeze = 1;
  let nextPfp = 1;
  if (fixed + G + P > box.height * (1 - 2 * VPAD)) {
    nextSqueeze = G > 0 ? clamp((room - P) / G, MIN_SQUEEZE, 1) : MIN_SQUEEZE;
    if (nextSqueeze <= MIN_SQUEEZE + 1e-4) {
      nextSqueeze = MIN_SQUEEZE;
      nextPfp = P > 0 ? clamp((room - MIN_SQUEEZE * G) / P, MIN_PFP, 1) : 1;
    }
  }

  write(el, "--hex-squeeze", nextSqueeze.toFixed(3));
  write(el, "--hex-pfp", nextPfp.toFixed(3));
}

export function HexFit({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // One sweep. Returns whether it actually wrote anything — the loop
    // and the observer both stop on a fixpoint, which is what keeps the
    // observer from re-triggering itself forever.
    const sweep = () => {
      const box = el.getBoundingClientRect();
      if (box.height <= 0 || box.width <= 0) return false;
      let changed = false;
      const write = (node: HTMLElement, prop: string, value: string) => {
        if (node.style.getPropertyValue(prop) === value) return;
        node.style.setProperty(prop, value);
        changed = true;
      };

      fitHeight(el, box, write);

      for (const child of Array.from(el.children)) {
        const node = child as HTMLElement;
        const r = node.getBoundingClientRect();

        if (node.dataset.hexShape === undefined) {
          const y0 = (r.top - box.top) / box.height;
          const y1 = (r.bottom - box.top) / box.height;
          write(node, "max-width", pct(INSET * Math.min(usableWidth(y0), usableWidth(y1))));
          continue;
        }

        // Measure the body, not the block. A flex item is a block
        // formatting context, so it contains its own floats — read its
        // height back and the walls would be holding it open at whatever
        // they were last set to, and it could never shrink again (collapse
        // the link row and the gap would stay). The body is an inner block
        // the floats shape but do not live in, so its height is the text's
        // own, and it falls when the content does.
        const body = (node.querySelector("[data-hex-body]") as HTMLElement | null) ?? node;
        const b = body.getBoundingClientRect();
        const y0 = (b.top - box.top) / box.height;
        const y1 = (b.bottom - box.top) / box.height;

        // The widest the hexagon gets anywhere across this block. A block
        // that contains the middle reaches full width there; one that
        // does not is widest at whichever end is nearer the middle.
        const straddles = y0 < 0.5 && y1 > 0.5;
        const uMax = straddles ? 1 : Math.max(usableWidth(y0), usableWidth(y1));
        const uMin = Math.min(usableWidth(y0), usableWidth(y1));
        const span = y1 - y0;
        // How far each side has to close in, at its worst — the width of
        // the float that does the closing.
        const wall = INSET * (uMax - uMin) * 0.5 * box.width;

        write(node, "max-width", pct(INSET * uMax));

        if (span <= 0 || wall < MIN_TAPER_PX) {
          write(node, "--hex-wall-w", "0px");
          write(node, "--hex-wall-left", "none");
          write(node, "--hex-wall-right", "none");
          continue;
        }

        // Sample the profile at its corners — and at the middle, if the
        // block spans it, since that is where u peaks and the two
        // straight walls meet.
        const stops = straddles ? [0, (0.5 - y0) / span, 1] : [0, 1];
        // Inset at local position t, as a fraction of the float's width:
        // 0 where the block is already at the hexagon's edge, 1 where the
        // wall has closed in as far as it goes.
        const insetAt = (t: number) =>
          (INSET * (uMax - usableWidth(y0 + t * span)) * 0.5 * box.width) / wall;

        const left = stops.map((t) => `${pct(insetAt(t))} ${pct(t)}`);
        const right = stops.map((t) => `${pct(1 - insetAt(t))} ${pct(t)}`);

        write(node, "--hex-wall-w", `${wall.toFixed(1)}px`);
        // The floats have to be as tall as the content they shape, and
        // that height is only known once it has wrapped — which is why
        // this sweep runs to a fixpoint rather than once.
        write(node, "--hex-wall-h", `${b.height.toFixed(1)}px`);
        // Each polygon runs down the profile, then back up the outside
        // edge of the float, enclosing everything the hexagon excludes.
        write(node, "--hex-wall-left", `polygon(${[...left, "0% 100%", "0% 0%"].join(",")})`);
        write(node, "--hex-wall-right", `polygon(${[...right, "100% 100%", "100% 0%"].join(",")})`);
      }
      return changed;
    };

    // Shaping a block changes how its text wraps, which changes its
    // height, which changes the shape — normally that converges in two or
    // three passes. It is not guaranteed to: a block one word away from
    // dropping a line can flip between two states forever, and since the
    // observer below is watching for exactly those size changes, that
    // would spin. So sweeps run on a budget, refilled only when the
    // hexagon itself is resized — at worst the layout stops a pass or two
    // short of perfect instead of pinning a core.
    let budget = BUDGET;
    let lastBox = "";
    const settle = () => {
      const { width, height } = el.getBoundingClientRect();
      const size = `${Math.round(width)}x${Math.round(height)}`;
      if (size !== lastBox) {
        lastBox = size;
        budget = BUDGET;
      }
      for (let pass = 0; pass < PASSES && budget > 0; pass++) {
        budget -= 1;
        if (!sweep()) break;
      }
    };

    settle();

    // The hexagon's box changes with the comb, and the children move
    // when the link row expands or a web font swaps in.
    const ro = new ResizeObserver(settle);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    // The shaped bodies too: when the link row collapses, the block
    // around it is still held open by its own floats, so the body is the
    // only thing whose size actually changes.
    for (const body of Array.from(el.querySelectorAll("[data-hex-body]"))) ro.observe(body);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * A block whose text wraps to the hexagon's walls instead of a box.
 *
 * Three parts: the block HexFit measures and sizes, two contentless
 * floats carrying the diagonals, and an inner body the floats shape but
 * do not live in — so its height is the text's own and can fall again
 * when the content shrinks. Until HexFit has measured (and on the
 * server) the floats are 0×0 and this is an ordinary rectangle.
 */
export function HexShaped({
  as: Tag = "div",
  className,
  style,
  bodyClassName,
  children,
}: {
  as?: "div" | "p";
  className?: string;
  style?: React.CSSProperties;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag data-hex-shape="" className={className} style={style}>
      <span aria-hidden className="hex-wall hex-wall-l" />
      <span aria-hidden className="hex-wall hex-wall-r" />
      <span data-hex-body="" className={`block ${bodyClassName ?? ""}`}>
        {children}
      </span>
    </Tag>
  );
}
