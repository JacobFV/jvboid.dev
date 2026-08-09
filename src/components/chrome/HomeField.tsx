"use client";

import { useEffect, useRef } from "react";

// A monochrome cloud field, home page only.
//
// This is the one place the backdrop rule in docs/DESIGN.md — nothing
// chromatic or moving inside the content measure — is relaxed, and the
// terms of the relaxation are the whole design:
//
//   monochrome   the field carries no hue at all. It is painted white and
//                inverted to black under the light theme, so what lands on
//                the page is a change in *value* and nothing else. The old
//                parallax backdrop was deleted because a reading column's
//                ground shifted hue every couple hundred pixels; a field
//                with one channel cannot do that.
//   2%           peak opacity. Against `--color-bg-0` that is a swing of
//                ~5/255 in either theme — under the threshold where text
//                contrast moves at all (19:1 → 18.5:1 on dark), and near
//                the limit of what the eye resolves as structure.
//   slow         particles drift a few px/s and the buffer is redrawn 20
//                times a second. Anything faster reads as a screensaver.
//
// The mechanism is the one from the halo-prismatic demo, minus the colour:
// a low-resolution accumulation buffer that is faded a few percent per
// frame and re-lit by ~50 soft blobs, which are advected by a time-varying
// curl-ish flow. Because the buffer persists, each blob leaves a streak
// that decays rather than a dot that moves, and the streaks fold into each
// other — that is what makes it read as weather rather than as particles.
//
// The canvas is genuinely 240×150-ish and stretched to the viewport by
// CSS. There is no detail to lose at 2% opacity, and it keeps the whole
// effect inside one small backing store and ~50 arcs per frame.

/** Viewport px per buffer px. The field has no detail finer than this. */
const RES = 6;
const PARTICLES = 50;
/** Redraw budget. The drift is slow enough that 20fps is invisible. */
const FRAME_MS = 50;
/** Alpha removed from the buffer each frame — the tail length of a streak. */
const DECAY = 0.055;
/** Enough passes to accumulate a rich still, for the reduced-motion path. */
const STILL_FRAMES = 90;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
};

export function HomeField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let painted = 0;
    let last = 0;

    function seed() {
      particles = [];
      for (let i = 0; i < PARTICLES; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          // the blob radius is in buffer px, so it scales with the viewport
          r: (w * 0.06 + Math.random() * w * 0.09) | 0,
          vx: (Math.random() - 0.5) * 0.12,
          vy: (Math.random() - 0.5) * 0.12,
          a: 0.05 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function resize() {
      w = Math.max(80, Math.ceil(window.innerWidth / RES));
      h = Math.max(60, Math.ceil(window.innerHeight / RES));
      canvas!.width = w;
      canvas!.height = h;
      seed();
      painted = 0;
      // the still path has already parked itself by now; give it a fresh
      // budget so a resized window doesn't keep the old image's geometry
      if (still) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(tick);
      }
    }

    // A time-varying divergence-light flow. Three sines whose arguments
    // are themselves sines: enough interference that the field never
    // visibly repeats, cheap enough to evaluate per particle per frame.
    function flow(x: number, y: number, t: number) {
      const nx = x / w;
      const ny = y / h;
      const a = Math.sin(ny * 7.4 + Math.sin(nx * 4.3 + t * 0.17) * 1.6 - t * 0.1);
      const b = Math.sin(nx * 6.5 - Math.sin(ny * 5.1 - t * 0.14) * 1.4 + t * 0.12);
      const c = Math.sin((nx + ny) * 5.2 + t * 0.08);
      return { x: (a * 0.6 + c * 0.2) * 0.16, y: (b * 0.6 - c * 0.2) * 0.16 };
    }

    function paint(now: number) {
      const t = now / 1000;

      // Fade the buffer rather than clearing it. destination-out is what
      // lets a transparent canvas decay in place — a fillRect in the
      // background colour would make the field opaque and paint over the
      // page's own ground.
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = `rgba(0,0,0,${DECAY})`;
      ctx!.fillRect(0, 0, w, h);

      ctx!.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const f = flow(p.x, p.y, t + p.phase);
        p.vx = (p.vx + f.x * 0.05) * 0.995;
        p.vy = (p.vy + f.y * 0.05) * 0.995;
        p.x += p.vx;
        p.y += p.vy;
        // wrap generously, so a blob never pops at an edge
        if (p.x < -p.r) p.x = w + p.r;
        if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        if (p.y > h + p.r) p.y = -p.r;

        const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,255,255,${p.a})`);
        g.addColorStop(0.5, `rgba(255,255,255,${p.a * 0.45})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      painted++;
    }

    function tick(now: number) {
      if (still) {
        // no motion: run the accumulation as fast as it will go, then stop
        // for good with whatever still image it built
        paint(now);
        if (painted < STILL_FRAMES) frame = requestAnimationFrame(tick);
        return;
      }
      if (now - last >= FRAME_MS) {
        last = now;
        paint(now);
      }
      frame = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="home-field" aria-hidden />;
}
