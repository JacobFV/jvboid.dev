"use client";

import { useRef } from "react";
import { rng, useCanvasField, useWorld } from "./atmosphere";

/**
 * The four pages whose artifact is a *film*, dressed as the room you watch one
 * in: Space Pong, Looking for Princess Suzzane, The Right Night Light, and
 * fieldratchet's rendered pipeline walkthrough.
 *
 * Every other world here borrows the look of a thing that exists somewhere
 * else — an operating system, a site, a compiler's own figures. This one
 * borrows the look of the *viewing condition*, which is the honest answer for a
 * page whose subject is a video: the projector, the dust in its beam, the film
 * running through the gate, and black everywhere the picture is not. The clip
 * sits at the top of each of these pages and the room is built around it.
 *
 * Three things it draws, all of them the room rather than the picture:
 *
 *   - **The beam.** A cone from the back of the house, widening across the
 *     window. Its edges weave a little, the way a gate does.
 *   - **The dust.** Motes drifting through it, lit only where the beam is —
 *     which is the reason anyone can see a projector beam at all.
 *   - **The film.** A strip down each gutter, sprockets and frame lines, pulled
 *     down by its own transport *and* by the reader: scrolling the article runs
 *     the reel.
 *
 * Dark is forced, and here that is not a preference. A cinema with the lights
 * on is a room with a screen in it. The clip is the page, everything around it
 * is supposed to disappear, and the whole argument of the treatment collapses
 * the moment the ground goes white.
 */

/** Motes in the beam. Enough to read as suspended dust, few enough that this
 *  costs nothing next to the gradients. */
const MOTES = 90;

/** Sprocket pitch and frame height on the gutter strips, in CSS pixels. Four
 *  perforations to a frame is Super 8 rather than 35mm, which is the right
 *  format for a school Blender project shot in 2013. */
const PERF = 26;
const FRAME = PERF * 4;

type Mote = { x: number; y: number; r: number; drift: number; rate: number; phase: number };

export function CinemaAtmosphere() {
  useWorld("cinema", "dark");

  const motesRef = useRef<Mote[]>([]);

  const canvasRef = useCanvasField({
    fps: 24,
    measure({ w, h }) {
      // Seeded, so a resize re-lays the same dust rather than a new cloud.
      const r = rng(0x1f57);
      motesRef.current = Array.from({ length: MOTES }, () => ({
        x: r() * w,
        y: r() * h,
        r: 0.5 + r() * 1.6,
        drift: 6 + r() * 22,
        rate: 0.2 + r() * 0.6,
        phase: r() * Math.PI * 2,
      }));
    },
    draw({ ctx, w, h, t, scroll }) {
      // Gate flicker: two incommensurable frequencies, so it never settles into
      // a pulse you can count. A single sine reads as a heartbeat.
      const flicker = 1 + 0.05 * Math.sin(t * 17.3) + 0.028 * Math.sin(t * 28.7);
      // The beam's own slow weave, shared by the cone and the dust so they
      // move together rather than sliding past each other.
      const weave = Math.sin(t * 0.6) * 0.012;

      // The beam. It comes from behind and above the reader's right shoulder,
      // which is where a booth is, and opens across the page to the lower left.
      const ax = w * 1.02;
      const ay = -h * 0.14;
      const spread = 0.42 + weave;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(w * (0.34 - spread), h * 1.18);
      ctx.lineTo(w * (0.96 + spread * 0.4), h * 1.3);
      ctx.closePath();
      const beam = ctx.createLinearGradient(ax, ay, w * 0.3, h);
      beam.addColorStop(0, "rgba(226, 232, 240, 0.14)");
      beam.addColorStop(0.45, "rgba(203, 213, 225, 0.05)");
      beam.addColorStop(1, "rgba(148, 163, 184, 0)");
      ctx.fillStyle = beam;
      ctx.globalAlpha = flicker;
      ctx.fill();

      // The dust, clipped to the beam so it is lit only where the light is.
      ctx.clip();
      ctx.fillStyle = "#e2e8f0";
      for (const m of motesRef.current) {
        // Motes rise slowly, wander sideways, and wrap — a still frame of dust
        // is just noise, and dust that falls reads as snow.
        const y = (((m.y - t * m.drift) % h) + h) % h;
        const x = m.x + Math.sin(t * m.rate + m.phase) * 14;
        ctx.globalAlpha = (0.1 + 0.24 * Math.sin(t * m.rate * 1.7 + m.phase) ** 2) * flicker;
        ctx.beginPath();
        ctx.arc(x, y, m.r, 0, 6.2832);
        ctx.fill();
      }
      ctx.restore();

      // The film. One strip in each gutter, running at slightly different rates
      // so they are two reels rather than one image mirrored.
      strip(ctx, w * 0.035, h, t * 34 + scroll * h * 2.4, flicker);
      strip(ctx, w * 0.965, h, t * 31 + scroll * h * 2.1 + FRAME * 0.4, flicker);

      ctx.globalAlpha = 1;
    },
  });

  return (
    <div className="cinema-field" aria-hidden="true">
      <canvas className="cinema-beam" ref={canvasRef} />
    </div>
  );
}

/**
 * One strip of film, centred on `cx` and running the full height of the window.
 *
 * `offset` is how far the film has been pulled down, in pixels; everything on
 * the strip is drawn modulo its own pitch off that, so the transport is
 * continuous and there is no seam to catch.
 */
function strip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  h: number,
  offset: number,
  flicker: number,
) {
  const half = 27;
  ctx.save();
  ctx.translate(cx, 0);

  // The edges of the stock.
  ctx.globalAlpha = 0.16 * flicker;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-half + 0.5, 0);
  ctx.lineTo(-half + 0.5, h);
  ctx.moveTo(half - 0.5, 0);
  ctx.lineTo(half - 0.5, h);
  ctx.stroke();

  // Frame lines, at four perforations to the frame.
  const frame0 = (offset % FRAME) - FRAME;
  ctx.globalAlpha = 0.11 * flicker;
  ctx.beginPath();
  for (let y = frame0; y < h + FRAME; y += FRAME) {
    ctx.moveTo(-half, Math.round(y) + 0.5);
    ctx.lineTo(half, Math.round(y) + 0.5);
  }
  ctx.stroke();

  // Perforations, both edges.
  const perf0 = (offset % PERF) - PERF;
  ctx.globalAlpha = 0.2 * flicker;
  ctx.fillStyle = "#cbd5e1";
  for (let y = perf0; y < h + PERF; y += PERF) {
    ctx.fillRect(-half + 4, y, 7, 9);
    ctx.fillRect(half - 11, y, 7, 9);
  }

  ctx.restore();
}
