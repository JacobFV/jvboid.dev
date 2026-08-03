"use client";

import { useEffect, useRef } from "react";
import {
  opacityOf,
  parallaxOf,
  resolutionOf,
  zIndexOf,
} from "@/lib/atmosphere-depth";

// Tracer particles drifting in a 2D incompressible flow — the "sharp"
// half of the backdrop, layered into the same depth stack as the soft
// gas planes in Atmosphere.tsx.
//
// The velocity field is built the way 2D incompressible flow actually
// works, so the motion is fluid rather than merely wobbly:
//
//   1. A streamfunction ψ(x, y, t) made of a few sinusoidal octaves.
//      Velocity is its curl — u = ∂ψ/∂y, v = -∂ψ/∂x — which is
//      divergence-free by construction (∇·(∇×ψ) ≡ 0), so tracers never
//      pile into sinks or blow out of sources. Derivatives are analytic,
//      so this costs a handful of sin/cos per sample.
//      Octave frequencies are integer multiples of 2π/W and 2π/H, which
//      makes the field exactly periodic on the canvas — the flow tiles
//      seamlessly across the toroidal wrap.
//
//   2. Lamb–Oseen vortices: v_θ = Γ/(2πr) · (1 − e^(−r²/r_c²)). The
//      viscous core factor removes the 1/r singularity at the centre.
//      Each vortex is advected by the field *minus its own* induced
//      velocity — textbook point-vortex dynamics — so the swirl pattern
//      slowly reorganizes itself instead of looping on a fixed cycle.
//
//   3. A pointer stir: dragging the cursor injects a Gaussian-weighted
//      impulse along the pointer's motion, like pulling a stick through
//      water.
//
// Depth drives everything (see lib/atmosphere-depth.ts). Sharpness is
// resolution, not blur: deep planes rasterize at ~0.35× and get upscaled
// to a soft smear, the front plane rasterizes at full device resolution
// and draws sub-pixel hairlines.

const PLANE_DEPTHS = [0.3, 0.62, 1] as const;

/** Vortices per plane, and how strong they are relative to plane size. */
const VORTEX_COUNT = 5;
/** Streamfunction octaves. */
const OCTAVES = 3;
/** Flow speed at depth 1, in CSS px/s. Scales down with depth. */
const BASE_SPEED = 62;
/** Pointer stir radius (CSS px) and strength. */
const STIR_RADIUS = 170;
const STIR_STRENGTH = 0.55;
/** Fraction of the trail that survives each frame is 1 − fade. */
const FADE = 0.04;
/** Seconds before a tracer is recycled somewhere else. */
const LIFE_MIN = 6;
const LIFE_MAX = 16;

type Vortex = {
  x: number;
  y: number;
  gamma: number; // circulation, signed
  core2: number; // squared core radius
};

type Octave = {
  amp: number;
  fx: number;
  fy: number;
  wx: number; // temporal drift of the x phase
  wy: number;
  px: number;
  py: number;
};

type Tracer = {
  x: number;
  y: number;
  // Previous *screen* position; the drawn segment is prev → current.
  ox: number;
  oy: number;
  life: number;
  hidden: boolean; // just wrapped/respawned — skip one segment
  bucket: number; // colour bucket index
};

type Plane = {
  depth: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number; // backing-store size, px
  h: number;
  scale: number; // backing px per CSS px
  parallax: number;
  speed: number; // backing px/s
  lineWidth: number;
  alpha: number;
  shift: number; // accumulated scroll offset, backing px
  vortices: Vortex[];
  octaves: Octave[];
  tracers: Tracer[];
};

const TAU = Math.PI * 2;
const wrap = (v: number, n: number) => ((v % n) + n) % n;

/** Small deterministic PRNG so planes differ but reloads don't. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** #rrggbb → "r,g,b", for cheap rgba() strings. */
function rgbTriplet(hex: string, fallback: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const ink = rgbTriplet(cs.getPropertyValue("--color-ink"), "242,244,248");
  const lanes = ["research", "building", "writing", "personal"].map((l) =>
    rgbTriplet(cs.getPropertyValue(`--color-lane-${l}`), ink),
  );
  // Ink dominates; lane colour is an accent, so it gets one slot each.
  const colors = [ink, ink, ...lanes];
  // Screen blending on a dark sky reads much hotter than multiply on a
  // pale one, so the theme carries a gain to even the two out.
  const gain = parseFloat(cs.getPropertyValue("--atmo-fluid-gain")) || 1;
  return { colors, gain };
}

function buildPlane(
  depth: number,
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number,
  rand: () => number,
  lite: boolean,
): Plane | null {
  const scale = resolutionOf(depth, lite ? 1 : dpr);
  const w = Math.max(2, Math.round(cssW * scale));
  const h = Math.max(2, Math.round(cssH * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Streamfunction octaves. Integer wavenumbers ⇒ exactly periodic on
  // the canvas, so the toroidal wrap is seamless.
  const octaves: Octave[] = [];
  for (let k = 0; k < OCTAVES; k++) {
    const m = 1 + Math.floor(rand() * 2) + k; // 1..4-ish, rising
    const n = 1 + Math.floor(rand() * 2) + k;
    octaves.push({
      // Higher octaves contribute less — a rough −1 energy slope, so the
      // large eddies carry the motion and the small ones add texture.
      amp: (1 / (k + 1)) * (0.75 + rand() * 0.5),
      fx: (TAU * m) / w,
      fy: (TAU * n) / h,
      wx: (rand() - 0.5) * 0.12,
      wy: (rand() - 0.5) * 0.12,
      px: rand() * TAU,
      py: rand() * TAU,
    });
  }

  const core = Math.min(w, h) * 0.17;
  const vortices: Vortex[] = [];
  for (let i = 0; i < VORTEX_COUNT; i++) {
    vortices.push({
      x: rand() * w,
      y: rand() * h,
      gamma: (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.65),
      core2: core * core * (0.6 + rand() * 0.8),
    });
  }

  const density = 0.00016 * (0.55 + depth) * (lite ? 0.6 : 1); // per backing px²
  const count = Math.round(Math.min(320, Math.max(60, w * h * density)));
  const tracers: Tracer[] = [];
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    tracers.push({
      x,
      y,
      ox: x,
      oy: y,
      life: LIFE_MIN + rand() * (LIFE_MAX - LIFE_MIN),
      hidden: true,
      bucket: Math.floor(rand() * 6),
    });
  }

  return {
    depth,
    canvas,
    ctx,
    w,
    h,
    scale,
    parallax: parallaxOf(depth),
    speed: BASE_SPEED * (0.3 + 0.7 * depth) * scale,
    // Front plane draws true hairlines; deep planes are wide in their own
    // (coarse) pixels, which the upscale turns into a soft smear.
    lineWidth: 0.75 + 0.5 * (1 - depth),
    // Presence rises steeply with nearness: deep flow is a rumour, the
    // front plane is legible line work.
    alpha: opacityOf(depth) * (0.12 + 0.6 * depth * depth),
    shift: 0,
    vortices,
    octaves,
    tracers,
  };
}

/**
 * Velocity of the flow at (x, y), written into `out`.
 * `skip` excludes one vortex — a point vortex does not advect itself.
 */
function velocityAt(
  p: Plane,
  x: number,
  y: number,
  t: number,
  out: { x: number; y: number },
  skip = -1,
) {
  let u = 0;
  let v = 0;

  // curl of the streamfunction: u = ∂ψ/∂y, v = −∂ψ/∂x.
  for (let i = 0; i < p.octaves.length; i++) {
    const o = p.octaves[i];
    const ax = o.fx * x + o.wx * t + o.px;
    const ay = o.fy * y + o.wy * t + o.py;
    const sx = Math.sin(ax);
    const cx = Math.cos(ax);
    const sy = Math.sin(ay);
    const cy = Math.cos(ay);
    u += o.amp * o.fy * sx * cy;
    v -= o.amp * o.fx * cx * sy;
  }
  // Octave velocities scale with frequency; normalize to ~unit speed.
  const norm = Math.min(p.w, p.h) / TAU;
  u *= norm;
  v *= norm;

  // Lamb–Oseen vortices, nearest-image across the wrap.
  for (let i = 0; i < p.vortices.length; i++) {
    if (i === skip) continue;
    const vo = p.vortices[i];
    let dx = x - vo.x;
    let dy = y - vo.y;
    if (dx > p.w / 2) dx -= p.w;
    else if (dx < -p.w / 2) dx += p.w;
    if (dy > p.h / 2) dy -= p.h;
    else if (dy < -p.h / 2) dy += p.h;
    const r2 = dx * dx + dy * dy + 1;
    const r = Math.sqrt(r2);
    // Γ/(2πr) with the viscous core factor, ×r cancels into the
    // tangential unit vector (−dy, dx)/r below.
    const mag = ((vo.gamma * norm) / r2) * (1 - Math.exp(-r2 / vo.core2));
    u += -dy * mag;
    v += dx * mag;
  }

  out.x = u;
  out.y = v;
}

export function FluidField() {
  const hostRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = window.devicePixelRatio || 1;
    let planes: Plane[] = [];
    let palette = readPalette();
    let raf = 0;

    const build = () => {
      const rand = mulberry32(0x0f10_1d5b);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      // Phones and low-core machines get the two extreme planes only, at
      // reduced density — the depth story survives, the fill rate drops.
      const lite = cssW < 700 || (navigator.hardwareConcurrency || 8) <= 4;
      planes = PLANE_DEPTHS.map((depth, i) => {
        const canvas = hostRefs.current[i];
        if (!canvas) return null;
        if (lite && i === 1) {
          // Drop the middle plane, and empty its backing store so a
          // stale frame can't stay frozen on screen after a resize.
          canvas.width = 0;
          canvas.height = 0;
          return null;
        }
        return buildPlane(depth, canvas, cssW, cssH, dpr, rand, lite);
      }).filter((p): p is Plane => p !== null);
    };
    build();

    // Pointer stir, in CSS px (converted per plane by its scale).
    let pointerX = -1e9;
    let pointerY = -1e9;
    let stirX = 0;
    let stirY = 0;
    const onPointer = (e: PointerEvent) => {
      if (pointerX > -1e8) {
        stirX = e.clientX - pointerX;
        stirY = e.clientY - pointerY;
      }
      pointerX = e.clientX;
      pointerY = e.clientY;
    };
    const onLeave = () => {
      pointerX = -1e9;
      pointerY = -1e9;
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 200);
    };
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    window.addEventListener("resize", onResize);
    if (!reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    const vel = { x: 0, y: 0 };

    /** Advance one plane by dt seconds and paint the new trail segments. */
    const step = (p: Plane, t: number, dt: number, scrollTarget: number) => {
      const { ctx } = p;

      // Scroll enters as a rigid translation of the whole plane: the
      // fluid is a sheet the page slides past.
      const nextShift = scrollTarget * p.parallax * p.scale;
      const dShift = nextShift - p.shift;
      p.shift = nextShift;
      // A fling moves the sheet further in one frame than a tracer swims
      // in a second. Past that, draw no segment — the flow relocates
      // silently instead of ruling the screen with long scratches.
      const smearing = Math.abs(dShift) > 18 * p.scale;

      // Trails decay exponentially — punch alpha out of what's there.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${FADE})`;
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.globalCompositeOperation = "source-over";

      // Point-vortex dynamics: each vortex rides the field the others make.
      for (let i = 0; i < p.vortices.length; i++) {
        const vo = p.vortices[i];
        velocityAt(p, vo.x, vo.y, t, vel, i);
        vo.x = wrap(vo.x + vel.x * p.speed * dt * 0.35, p.w);
        vo.y = wrap(vo.y + vel.y * p.speed * dt * 0.35 - dShift, p.h);
      }

      const stirR = STIR_RADIUS * p.scale;
      const stirR2 = stirR * stirR;
      const stirPX = pointerX * p.scale;
      const stirPY = pointerY * p.scale;
      const stirVX = stirX * p.scale * STIR_STRENGTH * p.depth;
      const stirVY = stirY * p.scale * STIR_STRENGTH * p.depth;

      for (let i = 0; i < p.tracers.length; i++) {
        const tr = p.tracers[i];
        tr.ox = tr.x;
        tr.oy = tr.y;
        velocityAt(p, tr.x, tr.y, t, vel);
        let dx = vel.x * p.speed * dt;
        let dy = vel.y * p.speed * dt;

        // Pointer stir: Gaussian falloff around the cursor.
        const sdx = tr.x - stirPX;
        const sdy = tr.y - stirPY;
        const sd2 = sdx * sdx + sdy * sdy;
        if (sd2 < stirR2 * 4) {
          const g = Math.exp(-sd2 / stirR2);
          dx += stirVX * g;
          dy += stirVY * g;
        }

        const nx = tr.x + dx;
        const ny = tr.y + dy - dShift;
        tr.x = wrap(nx, p.w);
        tr.y = wrap(ny, p.h);
        // Skip the segment on the frame a tracer crosses the seam.
        const wrapped = tr.x !== nx || tr.y !== ny;

        tr.life -= dt;
        if (tr.life <= 0) {
          tr.x = Math.random() * p.w;
          tr.y = Math.random() * p.h;
          tr.life = LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN);
          tr.hidden = true;
        } else {
          tr.hidden = wrapped || smearing;
        }
      }

      // One stroke per colour bucket rather than per tracer.
      ctx.lineWidth = p.lineWidth;
      const alpha = Math.min(0.9, p.alpha * palette.gain);
      for (let b = 0; b < palette.colors.length; b++) {
        ctx.strokeStyle = `rgba(${palette.colors[b]},${alpha})`;
        ctx.beginPath();
        let any = false;
        for (let i = 0; i < p.tracers.length; i++) {
          const tr = p.tracers[i];
          if (tr.bucket !== b || tr.hidden) continue;
          ctx.moveTo(tr.ox, tr.oy);
          ctx.lineTo(tr.x, tr.y);
          any = true;
        }
        if (any) ctx.stroke();
      }
    };

    if (reduced) {
      // Static streamlines: integrate a while with no scroll, then stop.
      for (let i = 0; i < 90; i++) {
        for (const p of planes) step(p, i / 30, 1 / 30, 0);
      }
      return () => {
        themeObserver.disconnect();
        window.removeEventListener("resize", onResize);
      };
    }

    let last = performance.now();
    const t0 = last;
    let eased = window.scrollY;
    const tick = (now: number) => {
      // Clamp dt so a backgrounded tab doesn't teleport the field.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      eased += (window.scrollY - eased) * 0.14;
      for (let i = 0; i < planes.length; i++) step(planes[i], t, dt, eased);
      // The stir is a per-frame kick from pointer motion; let it die away.
      stirX *= 0.82;
      stirY *= 0.82;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      themeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      {PLANE_DEPTHS.map((depth, i) => (
        <canvas
          key={`fluid-${depth}`}
          ref={(el) => {
            hostRefs.current[i] = el;
          }}
          className="atmo-fluid"
          style={{ zIndex: zIndexOf(depth) }}
          aria-hidden
        />
      ))}
    </>
  );
}
