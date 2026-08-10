"use client";

import { useRef } from "react";
import { useCanvasField, useWorld } from "./atmosphere";

/**
 * The windows-web-next project page, dressed as Windows 11.
 *
 * The project is a browser-based Windows 11 desktop, so the page wears the two
 * things that make Windows 11 unmistakable at a glance: the *bloom* wallpaper —
 * translucent petals of light radiating from a point, the default desktop since
 * 21H2 — and Fluent's control language, which the stylesheet handles.
 *
 * The petals are drawn rather than shipped as an image: a JPEG of someone
 * else's wallpaper is a picture of Windows, and it would also be a megabyte
 * behind an article. Nine lobes on a slow differential rotation is the same
 * gesture at a few hundred bytes of state, and it breathes.
 *
 * Additive on dark, subtractive on light. The bloom is *light* — on a dark
 * ground it accumulates the way light does, but the same composite on white
 * only bleaches, and Windows 11's light wallpaper is a wash of colour on paper
 * rather than a glow. So the composite flips with the theme.
 *
 * No theme is forced. Windows 11 ships light and dark, both first-class, and
 * the simulator implements both — pinning one here would misrepresent it the
 * way a white jterm page would misrepresent jterm.
 */

/** Nine lobes, each with its own turn rate so the flower opens and closes
 *  instead of rotating rigidly. Angles are in turns, not radians. */
const PETALS = [
  { angle: 0.0, len: 1.0, wide: 0.30, rate: 0.019, hue: 0 },
  { angle: 0.11, len: 0.72, wide: 0.20, rate: -0.013, hue: 1 },
  { angle: 0.24, len: 0.88, wide: 0.26, rate: 0.024, hue: 2 },
  { angle: 0.37, len: 0.62, wide: 0.17, rate: -0.021, hue: 1 },
  { angle: 0.5, len: 0.95, wide: 0.28, rate: 0.016, hue: 0 },
  { angle: 0.62, len: 0.68, wide: 0.19, rate: -0.026, hue: 3 },
  { angle: 0.74, len: 0.84, wide: 0.24, rate: 0.012, hue: 2 },
  { angle: 0.86, len: 0.58, wide: 0.16, rate: -0.017, hue: 3 },
  { angle: 0.94, len: 0.78, wide: 0.22, rate: 0.022, hue: 1 },
];

/** Windows 11's own accent ramp: the 21H2 blue, its lighter partner, and the
 *  violet and teal the bloom picks up at its edges. */
const HUES = ["#0078d4", "#4cc2ff", "#8b5cf6", "#2dd4bf"];

export function FluentAtmosphere() {
  useWorld("fluent");
  const darkRef = useRef(false);

  const canvasRef = useCanvasField({
    fps: 24,
    measure() {
      darkRef.current = document.documentElement.dataset.theme === "dark";
    },
    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;
      // Off-centre and high, the way the wallpaper sits behind a desktop: the
      // dense middle of the bloom should not land under the reading column.
      const cx = w * 0.5;
      const cy = h * (dark ? 0.42 : 0.38);
      const reach = Math.max(w, h) * 0.62;

      ctx.save();
      // On dark the petals accumulate like light; on light they tint like ink
      // in water, because a bleached white rectangle is not a wallpaper.
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      for (const petal of PETALS) {
        // Scroll adds a slow turn on top of the clock, so moving down the
        // article rotates the bloom a little — the desktop is being looked at
        // from a slightly different angle rather than merely elapsing.
        const turn = (petal.angle + t * petal.rate + scroll * 0.09) * Math.PI * 2;
        // Each lobe breathes on its own period; without this the flower is a
        // rigid pinwheel and the eye locks onto the rotation.
        const breath = 0.86 + 0.14 * Math.sin(t * 0.31 + petal.angle * 11);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(turn);
        // A petal is a circle stretched along its own axis — cheaper than a
        // path, and the falloff stays radial, which is what makes it read as
        // light rather than as a painted shape.
        ctx.scale(petal.len * breath, petal.wide);
        ctx.translate(reach * 0.5, 0);

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.6);
        const color = HUES[petal.hue];
        grad.addColorStop(0, color);
        grad.addColorStop(0.55, `${color}80`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.globalAlpha = dark ? 0.2 : 0.13;
        ctx.beginPath();
        ctx.arc(0, 0, reach * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // The core: the bright pinhole every bloom render has at its origin.
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * 0.34);
      core.addColorStop(0, dark ? "#cfeaff" : "#7cc7ff");
      core.addColorStop(1, "transparent");
      ctx.fillStyle = core;
      ctx.globalAlpha = dark ? 0.24 : 0.16;
      ctx.beginPath();
      ctx.arc(cx, cy, reach * 0.34, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
  });

  return (
    <div className="fluent-field" aria-hidden="true">
      <canvas className="fluent-bloom" ref={canvasRef} />
    </div>
  );
}
