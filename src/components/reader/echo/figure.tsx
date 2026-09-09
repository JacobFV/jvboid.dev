"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { rng, token } from "../atmosphere";

/**
 * The scaffolding under the figures in "Can an Echo Become a Voice Again?".
 *
 * These are content figures, not backdrops: they sit inside the reading
 * column, so they take the article's own tokens (ink, accent, lane blues)
 * from the cascade rather than carrying colours of their own, and they
 * retune when the reader flips the theme. Everything animated here goes
 * through `useFigureCanvas`, which keeps a figure frugal — it only runs
 * while on screen, throttles to a modest frame rate, and under
 * `prefers-reduced-motion` warms the simulation up off-screen and shows a
 * single settled frame.
 */

export type Palette = {
  ink: string;
  dim: string;
  mute: string;
  bg0: string;
  bg1: string;
  bg2: string;
  accent: string;
  blue: string;
  green: string;
  pink: string;
  gold: string;
  mono: string;
  sans: string;
  dark: boolean;
};

function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const v = Number.parseInt(m[1], 16);
  const l = 0.2126 * ((v >> 16) & 0xff) + 0.7152 * ((v >> 8) & 0xff) + 0.0722 * (v & 0xff);
  return l < 128;
}

export function readPalette(): Palette {
  const bg0 = token("--color-bg-0", "#08090b");
  return {
    ink: token("--color-ink", "#f2f4f8"),
    dim: token("--color-ink-dim", "#9097a3"),
    mute: token("--color-ink-mute", "#5a6070"),
    bg0,
    bg1: token("--color-bg-1", "#0e1014"),
    bg2: token("--color-bg-2", "#15181e"),
    accent: token("--color-accent", "#ff6b35"),
    blue: token("--color-lane-research", "#6fa8dc"),
    green: token("--color-lane-building", "#93c47d"),
    pink: token("--color-lane-writing", "#c27ba0"),
    gold: token("--color-lane-personal", "#f1c232"),
    mono: token("--font-mono", "ui-monospace, monospace") || "ui-monospace, monospace",
    sans: token("--font-sans", "system-ui, sans-serif") || "system-ui, sans-serif",
    dark: isDark(bg0),
  };
}

/** `#rrggbb` → `rgba(r,g,b,a)`. Tokens are all six-digit hex. */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const v = Number.parseInt(m[1], 16);
  return `rgba(${(v >> 16) & 0xff},${(v >> 8) & 0xff},${v & 0xff},${a})`;
}

/** Linear blend of two hex colours, `k` from a to b. */
export function mix(a: string, b: string, k: number): string {
  const pa = /^#?([0-9a-f]{6})$/i.exec(a.trim());
  const pb = /^#?([0-9a-f]{6})$/i.exec(b.trim());
  if (!pa || !pb) return a;
  const va = Number.parseInt(pa[1], 16);
  const vb = Number.parseInt(pb[1], 16);
  const ch = (s: number) => Math.round(((va >> s) & 0xff) * (1 - k) + ((vb >> s) & 0xff) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export { rng };

export type Frame = {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels; the context is already scaled for the device. */
  w: number;
  h: number;
  /** Seconds since the figure started running. */
  t: number;
  /** Seconds since the previous frame, clamped so a dropped frame cannot
   *  fling a simulation. */
  dt: number;
  pal: Palette;
};

export type Painter = {
  /** Height for a given width, in CSS pixels. */
  height: (w: number) => number;
  /** Run on mount, on resize and on a theme flip, before the next draw. */
  measure?: (f: Omit<Frame, "t" | "dt">) => void;
  draw: (f: Frame) => void;
  fps?: number;
  /** Under reduced motion, how many frames to simulate before the one that
   *  is shown, so a figure whose point is a settled state shows it. */
  warm?: number;
};

/**
 * A device-pixel-correct canvas that sizes itself to its container, runs
 * only while visible, throttles to `fps`, and re-reads the palette when the
 * theme changes. Returns the ref to hang on the <canvas>.
 */
export function useFigureCanvas(painter: Painter): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const painterRef = useRef(painter);
  painterRef.current = painter;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = 0;
    let t = 0;
    let visible = false;
    let pageShown = !document.hidden;
    let pal = readPalette();
    let w = 0;
    let h = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const measure = () => {
      const parent = canvas.parentElement;
      w = Math.max(1, Math.round(parent ? parent.clientWidth : canvas.clientWidth));
      h = Math.max(1, Math.round(painterRef.current.height(w)));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pal = readPalette();
      painterRef.current.measure?.({ ctx, w, h, pal });
    };

    const paint = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      painterRef.current.draw({ ctx, w, h, t, dt, pal });
    };

    const fps = painterRef.current.fps ?? 30;
    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (time - last < 1000 / fps) return;
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 1 / fps;
      t += dt;
      last = time;
      paint(dt);
    };
    const start = () => {
      if (!raf && visible && pageShown && !reduced) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const still = () => {
      const warm = painterRef.current.warm ?? 0;
      const step = 1 / fps;
      for (let i = 0; i < warm; i += 1) {
        t += step;
        paint(step);
      }
      if (!warm) paint(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting);
        if (visible) start();
        else stop();
      },
      { rootMargin: "120px" },
    );
    const onVisibility = () => {
      pageShown = !document.hidden;
      if (pageShown) start();
      else stop();
    };
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        paint(0);
      }, 120);
    });
    const themeWatch = new MutationObserver(() => {
      measure();
      paint(0);
    });

    measure();
    if (reduced) still();
    else paint(0);

    if (canvas.parentElement) ro.observe(canvas.parentElement);
    io.observe(canvas);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return canvasRef;
}

/** The frame around every figure in the essay: the drawing, then a short
 *  mono caption that says what to look for. */
export function EchoFigure({
  caption,
  children,
  label,
}: {
  caption: ReactNode;
  children: ReactNode;
  /** Accessible name for the drawing itself. */
  label: string;
}) {
  return (
    <figure className="echo-figure">
      <div className="echo-figure-frame" role="img" aria-label={label}>
        {children}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Small caps-ish label drawn on a canvas, in the mono face. */
export function canvasLabel(
  ctx: CanvasRenderingContext2D,
  pal: Palette,
  text: string,
  x: number,
  y: number,
  opts: { align?: CanvasTextAlign; color?: string; size?: number; italic?: boolean } = {},
) {
  ctx.save();
  ctx.font = `${opts.italic ? "italic " : ""}${opts.size ?? 11}px ${pal.mono}`;
  ctx.fillStyle = opts.color ?? pal.dim;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}
