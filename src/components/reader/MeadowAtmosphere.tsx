"use client";

import { useRef } from "react";
import { useCanvasField, rng, useWorld } from "./atmosphere";

/**
 * The rl-lab project page, standing in an open field.
 *
 * Every other world on this site borrows a look the project already has
 * somewhere else. This one borrows a *place*: rl-lab is a top-down arena where
 * legged and wheeled bodies are turned loose to see how far they get, and an
 * open field of grass is where you would actually put one. The page is the
 * pitch rather than a picture of the software.
 *
 * The blades are real geometry — a few hundred quadratic curves, each with its
 * own height, lean and phase — because grass drawn as a texture never sways
 * right. The wind is a travelling gust rather than a global oscillation: a band
 * of displacement crossing the field so blades bend in sequence, which is the
 * difference between a meadow and a stadium doing the wave.
 *
 * It is masked hard toward the top and the reading column (see globals.css) and
 * banked toward the bottom and the gutters. A field is ground; ground belongs
 * under your feet, not across the paragraph you are reading.
 *
 * No theme is forced. Light is a bright afternoon; dark is the same field at
 * dusk, which is a real place too and the better one for long reading.
 */

const BLADES = 340;
/** How far a gust reaches, as a fraction of viewport width. */
const GUST_WIDTH = 0.42;
const MOTES = 26;

type Blade = {
  /** Base position, as fractions of the viewport. */
  x: number;
  /** Depth, 0 = far, 1 = near. Drives height, width, colour and parallax. */
  depth: number;
  height: number;
  /** Resting lean, in radians from vertical. */
  lean: number;
  /** Per-blade offset so neighbours never move in lockstep. */
  phase: number;
  hue: number;
  light: number;
};

type Mote = { x: number; y: number; r: number; rate: number; phase: number };

function buildBlades() {
  const random = rng(0x6a55);
  const blades: Blade[] = Array.from({ length: BLADES }, () => {
    const depth = random();
    return {
      x: random(),
      depth,
      // Near blades are taller and coarser; far ones are short and fine, which
      // is the whole of the depth cue on a field with no horizon in it.
      height: 0.1 + depth * 0.3 + random() * 0.08,
      lean: (random() - 0.5) * 0.5,
      phase: random() * Math.PI * 2,
      hue: 78 + random() * 34,
      light: 24 + depth * 22 + random() * 10,
    };
  });
  // Painter's algorithm: far blades first, so near ones overlap them.
  blades.sort((a, b) => a.depth - b.depth);
  return blades;
}

function buildMotes() {
  const random = rng(0x9107);
  return Array.from({ length: MOTES }, (): Mote => ({
    x: random(),
    y: random(),
    r: 0.6 + random() * 1.6,
    rate: 0.01 + random() * 0.02,
    phase: random() * Math.PI * 2,
  }));
}

export function MeadowAtmosphere() {
  useWorld("meadow");

  const bladesRef = useRef<Blade[]>([]);
  const motesRef = useRef<Mote[]>([]);
  const darkRef = useRef(false);

  const canvasRef = useCanvasField({
    fps: 30,
    measure() {
      darkRef.current = document.documentElement.dataset.theme === "dark";
      bladesRef.current = buildBlades();
      motesRef.current = buildMotes();
    },

    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;

      // The gust: a band of displacement travelling left to right on a loop, so
      // blades bend in sequence. A single global sine makes the whole field
      // move as one object, which reads as a flag rather than as grass.
      const gust = ((t * 0.13) % 1.6) - 0.3;

      ctx.lineCap = "round";
      for (const b of bladesRef.current) {
        // Near blades travel further with scroll than far ones — walking
        // across the field rather than watching it slide.
        const px = (b.x + scroll * 0.06 * (0.3 + b.depth)) % 1;
        const x = px * w;
        // The base sits below the bottom edge for the near blades, so the
        // field runs off the screen instead of resting on a visible line.
        const base = h + b.depth * h * 0.06;
        const len = b.height * h;

        const reach = Math.max(0, 1 - Math.abs(px - gust) / GUST_WIDTH);
        const bend =
          b.lean +
          // Under the gust, plus a small constant shimmer so a still field is
          // never actually still.
          reach * reach * 0.62 * Math.sin(t * 2.1 + b.phase) +
          0.05 * Math.sin(t * 0.9 + b.phase * 2);

        const tipX = x + Math.sin(bend) * len * 0.55;
        const tipY = base - Math.cos(bend) * len;
        // The control point sits high and barely bent, which is what gives a
        // blade its stiff-at-the-base, whippy-at-the-tip curve.
        const cx = x + Math.sin(bend) * len * 0.12;
        const cy = base - len * 0.62;

        ctx.strokeStyle = `hsl(${b.hue}, ${dark ? 30 : 46}%, ${dark ? b.light * 0.5 : b.light}%)`;
        ctx.globalAlpha = dark ? 0.5 : 0.42;
        ctx.lineWidth = 0.7 + b.depth * 1.7;
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(cx, cy, tipX, tipY);
        ctx.stroke();
      }

      // Pollen and seed-fluff, drifting up and across on the same gust. A field
      // in daylight always has something in the air over it.
      ctx.fillStyle = dark ? "#ffe9a8" : "#ffffff";
      for (const m of motesRef.current) {
        const x = ((m.x + t * m.rate + Math.sin(t * 0.4 + m.phase) * 0.02) % 1) * w;
        const y = ((m.y - t * m.rate * 0.35 + 1) % 1) * h;
        ctx.globalAlpha = (dark ? 0.4 : 0.55) * (0.5 + 0.5 * Math.sin(t * 0.7 + m.phase));
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="meadow-field" aria-hidden="true">
      <canvas className="meadow-grass" ref={canvasRef} />
    </div>
  );
}
