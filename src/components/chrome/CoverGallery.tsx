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
          card.style.transform = "";
          card.style.opacity = "";
          continue;
        }
        const mid = card.offsetLeft - el.scrollLeft + card.offsetWidth / 2;
        const t = clamp((mid - half) / half, -1, 1);
        const a = Math.abs(t);
        // Ease the middle flat so only the shoulders of the rail bend.
        const bend = Math.sign(t) * Math.pow(a, 1.2);
        const z = LIFT - DEPTH * Math.pow(a, 1.5);
        card.style.transform = `translateX(${-bend * SQUEEZE}px) translateZ(${z}px) rotateY(${bend * MAX_TILT}deg)`;
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

    const onPointerDown = (e: PointerEvent) => {
      // Touch keeps the platform's own scrolling — it is better than
      // anything we would reimplement here.
      if (e.pointerType === "touch" || e.button !== 0) return;
      stopGlide();
      dragging = true;
      pointer = e.pointerId;
      lastX = e.clientX;
      travel = 0;
      velocity = 0;
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "true";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      travel += Math.abs(dx);
      el.scrollLeft -= dx;
      // Smooth the velocity so a jittery last frame does not decide the flick.
      velocity = velocity * 0.7 + dx * 0.3;
      if (travel > DRAG_SLOP) suppressClick = true;
      e.preventDefault();
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointer) return;
      dragging = false;
      pointer = -1;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (Math.abs(velocity) < MIN_VELOCITY) return;

      const max = el.scrollWidth - el.clientWidth;
      const tick = () => {
        el.scrollLeft -= velocity;
        velocity *= FRICTION;
        const stuck = el.scrollLeft <= 0 || el.scrollLeft >= max - 0.5;
        glide = Math.abs(velocity) < MIN_VELOCITY || stuck ? 0 : requestAnimationFrame(tick);
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
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);

    layout();

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
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
