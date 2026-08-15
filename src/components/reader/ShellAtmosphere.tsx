"use client";

import { useRef } from "react";
import { rng, useCanvasField, useWorld } from "./atmosphere";

/**
 * The browser-os project page, dressed as the shell itself.
 *
 * The third page in the desktop family, and the only one that cannot borrow an
 * operating system's look — because the whole point of the project is that it
 * doesn't have one. `browser-os` is what is left when you take the chrome off:
 * a window manager, a virtual filesystem, an app lifecycle. So this world draws
 * that, and only that. Windows, stacking, drifting, snapping. No Mica, no
 * vibrancy, no traffic lights, no taskbar iconography — every one of those is
 * something `windows-web-next` or `macos-web-next` layers on afterwards, and
 * putting any of them here would be documenting the wrong project.
 *
 * The one colour it does own is its icon's: the indigo→violet gradient the
 * shell ships as its default wallpaper. Everything on top of it is a hairline.
 *
 * The stylesheet carries the better half of the joke — every screenshot gets a
 * titlebar strip with three dots in it, *unpainted*. Aqua colours those dots
 * red/amber/green because macOS does. Here they stay grey, because the strip is
 * the shell's and the colour is the chrome's.
 *
 * No theme is forced. The shell is chrome-agnostic by construction and ships
 * both.
 */

type Pane = {
  /** Position and size as fractions of the viewport. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Drift amplitude and period — the window manager settling, not floating. */
  driftX: number;
  driftY: number;
  rate: number;
  phase: number;
};

/** Enough panes to read as a stack, few enough that the reading column is not
 *  behind a solid wall of rectangles. Built once from a fixed seed so a resize
 *  reflows the same desktop rather than dealing a new one. */
function buildPanes(count: number): Pane[] {
  const r = rng(0x5be11);
  const panes: Pane[] = [];
  for (let i = 0; i < count; i += 1) {
    panes.push({
      x: 0.04 + r() * 0.66,
      y: 0.05 + r() * 0.78,
      w: 0.2 + r() * 0.26,
      h: 0.16 + r() * 0.22,
      driftX: 6 + r() * 16,
      driftY: 4 + r() * 12,
      rate: 0.05 + r() * 0.09,
      phase: r() * Math.PI * 2,
    });
  }
  return panes;
}

/** Titlebar height in CSS pixels — the shell's own, and the same number the
 *  stylesheet pads screenshots by so the two read as one desktop. */
const TITLEBAR = 22;

export function ShellAtmosphere() {
  useWorld("shell");
  const darkRef = useRef(false);
  const panesRef = useRef<Pane[]>([]);

  const canvasRef = useCanvasField({
    fps: 24,
    measure({ w }) {
      darkRef.current = document.documentElement.dataset.theme === "dark";
      // Fewer panes on a phone: at 380px wide, nine overlapping windows is a
      // grey smear rather than a stack.
      panesRef.current = buildPanes(w < 700 ? 5 : 9);
    },
    draw({ ctx, w, h, t, scroll }) {
      const dark = darkRef.current;

      // The wallpaper: the icon's gradient, corner to corner, kept faint
      // because everything legible on this page sits on top of it.
      const ground = ctx.createLinearGradient(0, 0, w, h);
      if (dark) {
        ground.addColorStop(0, "#1e1b3a");
        ground.addColorStop(1, "#2c1e3f");
      } else {
        ground.addColorStop(0, "#eceafb");
        ground.addColorStop(1, "#f3ecf7");
      }
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, w, h);

      // A single soft light off the icon's indigo, so the ground has a
      // direction and the panes have something to cast against.
      const glow = ctx.createRadialGradient(
        w * 0.72,
        h * 0.22,
        0,
        w * 0.72,
        h * 0.22,
        Math.max(w, h) * 0.7,
      );
      glow.addColorStop(0, dark ? "#667eea" : "#8b9bf0");
      glow.addColorStop(1, "transparent");
      ctx.globalAlpha = dark ? 0.22 : 0.28;
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;

      ctx.save();
      // Scrolling walks down the desktop rather than watching one patch of it
      // breathe — same gesture as the two chrome worlds.
      ctx.translate(0, -h * 0.1 * scroll);

      panesRef.current.forEach((p, i) => {
        const x = p.x * w + Math.sin(t * p.rate + p.phase) * p.driftX;
        const y = p.y * h + Math.cos(t * p.rate * 0.8 + p.phase) * p.driftY;
        const pw = p.w * w;
        const ph = p.h * h;
        // Later panes are nearer the front of the stack, so they are a little
        // more opaque. That gradient *is* the z-order, drawn.
        const depth = 0.5 + (0.5 * i) / panesRef.current.length;

        ctx.beginPath();
        // `roundRect` is recent enough that a browser without it would throw
        // inside the animation loop and take the whole field down. Square
        // corners are a fine degradation; a blank backdrop is not.
        if (ctx.roundRect) ctx.roundRect(x, y, pw, ph, 8);
        else ctx.rect(x, y, pw, ph);

        ctx.globalAlpha = (dark ? 0.16 : 0.4) * depth;
        ctx.fillStyle = dark ? "#0e0d1c" : "#ffffff";
        ctx.fill();

        ctx.globalAlpha = (dark ? 0.34 : 0.55) * depth;
        ctx.lineWidth = 1;
        ctx.strokeStyle = dark ? "#a5b0f5" : "#4b4478";
        ctx.stroke();

        // The titlebar: a rule across the top and three dots at the left. This
        // is the entire visual vocabulary the shell owns — an OS is what adds
        // anything else, including colour in those dots.
        ctx.beginPath();
        ctx.moveTo(x, y + TITLEBAR);
        ctx.lineTo(x + pw, y + TITLEBAR);
        ctx.globalAlpha = (dark ? 0.22 : 0.34) * depth;
        ctx.stroke();

        ctx.globalAlpha = (dark ? 0.4 : 0.5) * depth;
        ctx.fillStyle = dark ? "#a5b0f5" : "#4b4478";
        for (let d = 0; d < 3; d += 1) {
          ctx.beginPath();
          ctx.arc(x + 12 + d * 11, y + TITLEBAR / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();
      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="shell-field" aria-hidden="true">
      <canvas className="shell-desktop" ref={canvasRef} />
    </div>
  );
}
