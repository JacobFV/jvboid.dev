"use client";

import { useEffect, useRef } from "react";

/**
 * A drag-to-scroll cover shelf with real perspective: the rail is a 3D
 * viewport, and every cover rotates around its own vertical axis by how
 * far it sits from the middle. Covers at the middle face you flat and
 * float slightly forward; covers near the edges swing their outer edge
 * back into the page, like flipping through a shelf of spines.
 *
 * Mouse/pen drag is captured (with flick inertia); touch is left to the
 * platform so momentum scrolling and rubber-banding stay native. Either
 * way the geometry is driven off `scrollLeft`, so keyboard focus, wheel,
 * and scrollbar dragging all move the shelf too.
 *
 * The ends are elastic rather than hard: past the first or last cover the
 * rail keeps following the pointer through a stiffening rubber band
 * (`pull`), and lets go into a spring on release. A flick that runs out
 * of rail hands its leftover momentum to the same band, so it bounces
 * instead of stopping dead.
 */

/** rotateY at the very edge of the rail. */
const MAX_TILT = 36;
/** How far an edge cover is pushed into the page. */
const DEPTH = 190;
/** How far a centered cover floats toward the viewer. */
const LIFT = 28;
/** Edge covers slide back toward the middle to close the perspective gap. */
const SQUEEZE = 34;
/** Opacity floor for the outermost covers — the edge mask finishes the job. */
const MIN_OPACITY = 0.62;
/** How long the scrollbar lingers after the rail stops moving. */
const LINGER_MS = 700;
/** Per-frame velocity decay after a flick. */
const FRICTION = 0.94;
/** Below this (px/frame) the flick is over. */
const MIN_VELOCITY = 0.05;
/** Pointer travel that turns a click into a drag. */
const DRAG_SLOP = 6;
/** How far past either end the rail can be stretched. */
const MAX_PULL = 110;
/** Spring pulling the stretch back to zero, per frame. */
const PULL_STIFFNESS = 0.16;
/** Velocity retained per frame — under 1 so the bounce settles. */
const PULL_DAMPING = 0.76;
/** Share of a flick's leftover momentum that becomes stretch. */
const PULL_TRANSFER = 0.55;
/** Below this (px) the spring is considered home. */
const PULL_EPSILON = 0.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CoverGallery({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const flat = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // How far the rail is stretched past an end, in px. Positive means
    // pulled past the first cover (content shifted right), negative past
    // the last. The scroller itself stays clamped; the stretch is carried
    // by the cards' own transforms, so the rail's edge mask holds still.
    let pull = 0;
    let pullV = 0;

    // ---- geometry ----
    const layout = () => {
      const half = el.clientWidth / 2;
      if (half <= 0) return;
      // With fewer covers than the rail is wide there is nothing to
      // scroll, so center them and let the tilt fall out symmetrically.
      const overflows = el.scrollWidth - el.clientWidth > 1;
      el.style.justifyContent = overflows ? "flex-start" : "center";

      for (const child of Array.from(el.children)) {
        const card = child as HTMLElement;
        if (flat) {
          card.style.transform = pull ? `translateX(${pull}px)` : "";
          card.style.opacity = "";
          continue;
        }
        const mid = card.offsetLeft - el.scrollLeft + pull + card.offsetWidth / 2;
        const t = clamp((mid - half) / half, -1, 1);
        const a = Math.abs(t);
        // Ease the middle flat so only the shoulders of the rail bend.
        const bend = Math.sign(t) * Math.pow(a, 1.2);
        const z = LIFT - DEPTH * Math.pow(a, 1.5);
        card.style.transform = `translateX(${pull - bend * SQUEEZE}px) translateZ(${z}px) rotateY(${bend * MAX_TILT}deg)`;
        card.style.opacity = `${1 - (1 - MIN_OPACITY) * Math.pow(a, 1.8)}`;
        // Nearer covers paint over the ones folding away behind them.
        card.style.zIndex = `${100 - Math.round(a * 100)}`;
      }
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        layout();
      });
    };

    // ---- scrollbar reveal ----
    let linger: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.dataset.scrolling = "true";
      clearTimeout(linger);
      linger = setTimeout(() => {
        delete el.dataset.scrolling;
      }, LINGER_MS);
      schedule();
    };

    // ---- drag + flick ----
    let dragging = false;
    let pointer = -1;
    let lastX = 0;
    let travel = 0;
    let velocity = 0;
    let glide = 0;
    let suppressClick = false;

    const stopGlide = () => {
      if (glide) cancelAnimationFrame(glide);
      glide = 0;
    };

    const maxScroll = () => Math.max(0, el.scrollWidth - el.clientWidth);

    // The band stiffens as it stretches: the first pixels of overscroll
    // track the pointer almost 1:1, the last barely move at all.
    const stretch = (by: number) => {
      const give = 1 - Math.min(1, Math.abs(pull) / MAX_PULL);
      pull = clamp(pull + by * give, -MAX_PULL, MAX_PULL);
    };

    // Release the band: a damped spring back to zero, with a little
    // overshoot so the end reads as elastic rather than merely soft.
    const settle = () => {
      pullV = (pullV - PULL_STIFFNESS * pull) * PULL_DAMPING;
      // Momentum heading further out still meets the stiffening band, so a
      // hard flick eases into the stop instead of hitting the clamp.
      if (pull === 0 || Math.sign(pullV) === Math.sign(pull)) stretch(pullV);
      else pull = clamp(pull + pullV, -MAX_PULL, MAX_PULL);
      if (Math.abs(pull) < PULL_EPSILON && Math.abs(pullV) < PULL_EPSILON) {
        pull = 0;
        pullV = 0;
        glide = 0;
        layout();
        return;
      }
      layout();
      glide = requestAnimationFrame(settle);
    };

    const releasePull = (momentum = 0) => {
      pullV = momentum;
      if (pull === 0 && pullV === 0) return;
      stopGlide();
      glide = requestAnimationFrame(settle);
    };

    const onPointerDown = (e: PointerEvent) => {
      // Touch keeps the platform's own scrolling — it is better than
      // anything we would reimplement here.
      if (e.pointerType === "touch" || e.button !== 0) return;
      stopGlide();
      // Grabbing mid-bounce catches the band where it is, at rest.
      pullV = 0;
      dragging = true;
      pointer = e.pointerId;
      lastX = e.clientX;
      travel = 0;
      velocity = 0;
      // A fresh press is a fresh verdict on whether this ends in a click.
      suppressClick = false;
      el.dataset.dragging = "true";
      // Deliberately no setPointerCapture: capturing retargets the
      // compatibility `click` to the rail, so a plain press on a cover
      // would never reach the cover's own link and nothing would open.
      // The move/up listeners live on the window instead, which catches
      // the pointer just as well without touching click routing.
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      travel += Math.abs(dx);
      if (travel > DRAG_SLOP) suppressClick = true;
      e.preventDefault();
      // Smooth the velocity so a jittery last frame does not decide the flick.
      velocity = velocity * 0.7 + dx * 0.3;

      let remaining = dx;
      // Dragging back toward the middle pays off the stretch first, 1:1,
      // before the rail starts scrolling again — otherwise the band would
      // stay stretched while the covers slide under it.
      if (pull !== 0 && Math.sign(remaining) !== Math.sign(pull)) {
        const paid = Math.sign(remaining) * Math.min(Math.abs(remaining), Math.abs(pull));
        pull += paid;
        remaining -= paid;
      }
      if (remaining !== 0 && pull === 0) {
        // Compare against the *wanted* scroll position, not the one the
        // browser reports back — scrollLeft is rounded, and the rounding
        // error would read as a stretch in the middle of the rail.
        const max = maxScroll();
        const want = el.scrollLeft - remaining;
        el.scrollLeft = clamp(want, 0, max);
        remaining = want < 0 ? -want : want > max ? max - want : 0;
      }
      // Whatever travel the rail could not absorb goes into the band.
      if (remaining !== 0) {
        stretch(remaining);
        layout();
      }
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      dragging = false;
      pointer = -1;
      delete el.dataset.dragging;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      // Let go of the band: either the flick carries on from here, or the
      // spring takes over immediately.
      if (Math.abs(velocity) < MIN_VELOCITY) {
        releasePull();
        return;
      }
      if (pull !== 0) {
        releasePull(velocity);
        return;
      }

      const tick = () => {
        const max = maxScroll();
        const want = el.scrollLeft - velocity;
        el.scrollLeft = clamp(want, 0, max);
        // Momentum the rail could not spend — it ran into an end, so the
        // band takes the rest and bounces.
        const leftover = want < 0 ? -want : want > max ? max - want : 0;
        if (leftover !== 0) {
          glide = 0;
          releasePull(leftover * PULL_TRANSFER);
          return;
        }
        velocity *= FRICTION;
        glide = Math.abs(velocity) < MIN_VELOCITY ? 0 : requestAnimationFrame(tick);
      };
      glide = requestAnimationFrame(tick);
    };

    // A drag that ends on top of a cover must not open it.
    const onClickCapture = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);

    layout();

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      ro.disconnect();
      stopGlide();
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(linger);
    };
  }, []);

  return (
    <ul ref={ref} className={["cover-gallery rail-scroll", className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
}
