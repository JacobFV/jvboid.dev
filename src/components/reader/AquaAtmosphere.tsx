"use client";

import { useRef } from "react";
import { useCanvasField, useWorld } from "./atmosphere";

/**
 * The macos-web-next project page, dressed as macOS.
 *
 * Companion to `FluentAtmosphere`, deliberately built to the same shape: a
 * drawn wallpaper behind the article and the OS's control language in the
 * stylesheet. The two projects are companions — same controllable-desktop
 * plumbing, different chrome — and their pages should read as siblings that
 * disagree about chrome rather than as two unrelated treatments.
 *
 * What macOS has been since Big Sur is *ribbons*: broad smooth bands of colour
 * folding over one another, soft enough that no edge is ever a line. Nine of
 * them here, each a filled region between two travelling sine curves, each on
 * its own period so the stack kneads rather than scrolling. Drawn, not shipped,
 * for the same reason as the bloom: a screenshot of someone's desktop is a
 * picture of macOS and it weighs a megabyte.
 *
 * The other half of the homage is in globals.css, and it is the better half —
 * traffic lights on every screenshot. It is the single most recognisable object
 * in the operating system, and the images on this page are literally windows.
 *
 * No theme is forced. macOS ships light and dark as equals.
 */

type Ribbon = {
  /** Vertical centre, as a fraction of viewport height. */
  y: number;
  /** Thickness, as a fraction of viewport height. */
  thickness: number;
  /** Wave height and how many crests span the window. */
  amp: number;
  freq: number;
  /** Radians per second — signed, so neighbours travel against each other. */
  rate: number;
  phase: number;
  light: [string, string];
  dark: [string, string];
};

/** Sonoma's palette on top, Ventura's cooler half underneath. */
const RIBBONS: Ribbon[] = [
  { y: 0.08, thickness: 0.30, amp: 0.055, freq: 0.9, rate: 0.10, phase: 0.0, light: ["#ffd8a8", "#ff9f6b"], dark: ["#7c3f1d", "#b8562a"] },
  { y: 0.20, thickness: 0.26, amp: 0.045, freq: 1.3, rate: -0.14, phase: 1.1, light: ["#ffb4b4", "#ff7d97"], dark: ["#8d2f4e", "#c04a6b"] },
  { y: 0.33, thickness: 0.28, amp: 0.06, freq: 0.7, rate: 0.08, phase: 2.4, light: ["#e2b0ff", "#a97bff"], dark: ["#4a2c8f", "#7350c9"] },
  { y: 0.46, thickness: 0.24, amp: 0.05, freq: 1.1, rate: -0.11, phase: 3.3, light: ["#b0c4ff", "#6f8fff"], dark: ["#263a91", "#4361cc"] },
  { y: 0.58, thickness: 0.30, amp: 0.065, freq: 0.8, rate: 0.13, phase: 4.7, light: ["#9fdcff", "#4fb8f5"], dark: ["#14496e", "#2a7aa8"] },
  { y: 0.70, thickness: 0.26, amp: 0.05, freq: 1.4, rate: -0.09, phase: 5.9, light: ["#a6f0e2", "#4fd3bb"], dark: ["#135b52", "#278c7c"] },
  { y: 0.82, thickness: 0.28, amp: 0.055, freq: 1.0, rate: 0.12, phase: 0.6, light: ["#c9edb4", "#84cf6a"], dark: ["#2d5a24", "#4d8b3c"] },
  { y: 0.92, thickness: 0.24, amp: 0.04, freq: 1.6, rate: -0.16, phase: 2.9, light: ["#ffe9a8", "#ffc95c"], dark: ["#6d5417", "#a3811f"] },
  { y: 1.02, thickness: 0.26, amp: 0.05, freq: 0.6, rate: 0.07, phase: 4.1, light: ["#ffc8dd", "#ff8fb8"], dark: ["#7a2145", "#ad3a68"] },
];

/** Points across the window; enough that a bezier-free polyline reads smooth
 *  at any width, few enough that nine ribbons cost nothing. */
const STEPS = 26;

export function AquaAtmosphere() {
  useWorld("aqua");
  const darkRef = useRef(false);

  const canvasRef = useCanvasField({
    fps: 24,
    measure() {
      darkRef.current = document.documentElement.dataset.theme === "dark";
    },
    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;
      ctx.save();
      // Scroll slides the whole stack, so reading down the page travels across
      // the desktop rather than watching one fixed patch of it wobble.
      ctx.translate(0, -h * 0.14 * scroll);

      for (const r of RIBBONS) {
        const mid = h * r.y;
        const half = (h * r.thickness) / 2;
        const amp = h * r.amp;

        ctx.beginPath();
        for (let i = 0; i <= STEPS; i += 1) {
          const x = (w * i) / STEPS;
          const u = i / STEPS;
          const y =
            mid -
            half +
            Math.sin(u * Math.PI * 2 * r.freq + r.phase + t * r.rate) * amp;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // Back along the underside on a slightly different wave, so the band
        // varies in thickness the way a folded ribbon does. Sharing one curve
        // would give a constant-width stripe, which reads as a graph.
        for (let i = STEPS; i >= 0; i -= 1) {
          const x = (w * i) / STEPS;
          const u = i / STEPS;
          const y =
            mid +
            half +
            Math.sin(u * Math.PI * 2 * r.freq * 0.72 - r.phase + t * r.rate * 0.8) * amp;
          ctx.lineTo(x, y);
        }
        ctx.closePath();

        const [from, to] = dark ? r.dark : r.light;
        const grad = ctx.createLinearGradient(0, mid - half, w, mid + half);
        grad.addColorStop(0, from);
        grad.addColorStop(1, to);
        ctx.fillStyle = grad;
        ctx.globalAlpha = dark ? 0.34 : 0.28;
        ctx.fill();
      }

      ctx.restore();
      // One broad soft pass over everything, which is what turns nine stacked
      // translucent shapes into a single continuous surface. Without it the
      // overlaps read as separate sheets of coloured acetate.
      ctx.globalAlpha = dark ? 0.5 : 0.34;
      ctx.globalCompositeOperation = "overlay";
      const sheen = ctx.createLinearGradient(0, 0, w, h);
      sheen.addColorStop(0, dark ? "#1a1a2e" : "#ffffff");
      sheen.addColorStop(0.5, "transparent");
      sheen.addColorStop(1, dark ? "#000010" : "#fff8f0");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="aqua-field" aria-hidden="true">
      <canvas className="aqua-ribbons" ref={canvasRef} />
    </div>
  );
}
