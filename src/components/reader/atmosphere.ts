"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { WorldTheme } from "@/lib/worlds";

/**
 * The two things every world page needs, factored out of the atmosphere
 * components so nine of them don't carry nine copies.
 *
 *  - `useWorld` puts the world on <html> and takes it off again.
 *  - `useCanvasField` runs a frugal, well-behaved canvas behind the article.
 *
 * Both are deliberately small. The interesting part of a world is what it
 * draws and what it restyles; none of that lives here.
 */

/**
 * The reader's actual stored choice, read the way the pre-paint script in
 * `app/layout.tsx` reads it.
 *
 * Deliberately not "whatever `data-theme` said a moment ago": on a first load
 * into a theme-forcing world that is already the forced value, and restoring
 * *that* on the way out would let one visit to jterm silently convert the whole
 * site to dark.
 */
function storedTheme(): WorldTheme {
  try {
    let t = localStorage.getItem("jacobfv:theme") || localStorage.getItem("theme");
    if (t && t.charAt(0) === '"') t = JSON.parse(t) as string;
    if (t === "light" || t === "dark") return t;
  } catch {
    /* private mode / disabled storage — fall through to the default */
  }
  return "light";
}

/**
 * Hold `data-page-theme` (and, for a world that forces one, `data-theme`) on
 * <html> while this page is mounted; put both back on the way out.
 *
 * On a first load the pre-paint script has already set these — anywhere later
 * is a frame too late and the reader watches the page change its mind. This is
 * what covers a *client-side* navigation, where no script runs, and it is
 * idempotent so the two never fight. A forced theme is never written to
 * storage, so it cannot leak into the rest of the site.
 */
export function useWorld(id: string, theme: WorldTheme | null = null) {
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-page-theme", id);
    if (theme) root.setAttribute("data-theme", theme);
    return () => {
      root.removeAttribute("data-page-theme");
      if (theme) root.setAttribute("data-theme", storedTheme());
    };
  }, [id, theme]);
}

export type FieldFrame = {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels — the context is already scaled by DPR. */
  w: number;
  h: number;
  /** Seconds since mount, advanced only while the field is actually running. */
  t: number;
  /** How far down the document the reader is, 0…1. */
  scroll: number;
};

export type FieldPainter = {
  /** Run on mount and after every resize, before the next draw. Build whatever
   *  is expensive and size-dependent here rather than per frame. */
  measure?: (frame: Omit<FieldFrame, "t" | "scroll">) => void;
  draw: (frame: FieldFrame) => void;
  /** Frames per second. These are backdrops to an article, not the point of
   *  the page — 20–30 is plenty and 60 is rude. */
  fps?: number;
};

/**
 * A device-pixel-correct canvas that clears itself, throttles to `fps`, stops
 * dead when the tab is hidden, rebuilds on a debounced resize, and honours
 * `prefers-reduced-motion` by drawing exactly one frame and stopping.
 *
 * Returns the ref to hang on the <canvas>.
 */
export function useCanvasField(painter: FieldPainter): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Through a ref, so consumers can pass inline closures without the effect
  // tearing down and rebuilding the field on every render.
  const painterRef = useRef(painter);
  painterRef.current = painter;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = 0;
    let t = 0;
    let running = true;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });

    const scrolled = () => {
      const doc = document.documentElement;
      const span = doc.scrollHeight - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
    };

    const measure = () => {
      const { w, h } = size();
      // Capped at 2: past that the extra pixels cost real time and buy nothing
      // on a backdrop that is mostly soft shapes.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      painterRef.current.measure?.({ ctx, w, h });
    };

    const paint = () => {
      const { w, h } = size();
      ctx.clearRect(0, 0, w, h);
      painterRef.current.draw({ ctx, w, h, t, scroll: scrolled() });
    };

    const fps = painterRef.current.fps ?? 30;
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (time - last < 1000 / fps) return;
      // Advance by the wall time actually elapsed rather than a fixed step, so
      // a field that drops frames slows down instead of falling behind.
      t += last ? Math.min(0.25, (time - last) / 1000) : 0;
      last = time;
      paint();
    };

    const start = () => {
      if (!raf && running) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) start();
      else stop();
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        paint();
      }, 160);
    };

    // Fields read their colours from the cascade at measure time rather than
    // per frame, because `getComputedStyle` is far too expensive to call at
    // 30Hz. That leaves them stale when the reader flips the theme, so watch
    // the one attribute that changes and re-measure. Cheaper and more precise
    // than a `matchMedia` listener, which would miss an explicit toggle.
    const themeWatch = new MutationObserver(() => {
      measure();
      paint();
    });
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    measure();
    paint();

    // A still first frame is already on screen, so honouring the preference
    // costs the reader the motion and none of the structure. Scroll-linked
    // redraws go with it: scroll-driven parallax is exactly what the
    // preference is asking us not to do.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      start();
      document.addEventListener("visibilitychange", onVisibility);
    }
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return canvasRef;
}

/** A tiny deterministic generator, so a field is the same field after a resize
 *  instead of a brand-new one every time the window moves. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Read a design token off the cascade, so a field carries the theme's colour
 *  rather than one of its own and retunes when the reader flips the switch. */
export function token(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
