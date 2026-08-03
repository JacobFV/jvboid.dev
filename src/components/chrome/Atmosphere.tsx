"use client";

import { useEffect, useRef } from "react";

// The page backdrop: a procedurally generated stack of parallax layers.
//
// Every layer sits at a depth d ∈ (0, 1] — 0 is infinitely far, 1 is
// right in front of the camera — and *everything* else about the layer
// is a function of that depth:
//
//   parallax(d)  how far it slides per pixel of page scroll
//   blur(d)      focus falls off toward the viewer (focal plane is the
//                far starfield, so foreground haze goes soft)
//   opacity(d)   near layers are thinner so they never fight the text
//
// The container stays `position: fixed` (so it always covers the
// viewport with no giant repainting element), but its layers translate
// with scroll, which is what actually reads as "the background scrolls".
// Tiled layers wrap their offset modulo the tile height, so the parallax
// never runs out of content no matter how long the page is.
//
// Layer contents are generated from a fixed seed, so the server and
// client render byte-identical markup — no hydration mismatch, and the
// field is stable across navigations.

const SEED = 0x5eed_1a2b;

// --- depth → everything --------------------------------------------------

/** px moved per px of scroll. Far layers barely budge, near layers slide. */
const parallaxOf = (d: number) => 0.02 + 0.55 * Math.pow(d, 1.4);
/** Focus is at infinity: sharpness falls off quadratically toward the viewer. */
const blurOf = (d: number) => 74 * d * d;
/** Foreground layers thin out so they stay behind the reading experience. */
const opacityOf = (d: number) => 1 - 0.4 * d;
/** Drift amplitude also grows with nearness (same reason parallax does). */
const driftOf = (d: number) => 16 + 48 * d;

/** How far a non-tiling layer (the horizon) may travel before it settles. */
const HORIZON_TRAVEL = 240;
/** Horizontal slack around each layer so drift never exposes an edge. */
const DRIFT_MARGIN = 80;

// --- deterministic noise -------------------------------------------------

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

const rng = mulberry32(SEED);
const rand = (lo: number, hi: number) => lo + rng() * (hi - lo);

// --- layer generators ----------------------------------------------------

/** Pin-prick specks tiled over `tile`px — the deep field. */
function specks(count: number, tile: number, rMin: number, rMax: number) {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand(0, tile));
    const y = Math.round(rand(0, tile));
    const r = rand(rMin, rMax).toFixed(2);
    const a = Math.round(rand(40, 90));
    const tint = rng() < 0.22 ? "var(--atmo-speck-2)" : "var(--atmo-speck)";
    parts.push(
      `radial-gradient(${r}px ${r}px at ${x}px ${y}px, color-mix(in srgb, ${tint} ${a}%, transparent), transparent)`,
    );
  }
  return parts.join(", ");
}

/** Soft ink blobs — clouds/nebulae. Percentage geometry tiles cleanly. */
function blobs(count: number, minPct: number, maxPct: number) {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const w = Math.round(rand(minPct, maxPct));
    const h = Math.round(rand(minPct * 0.85, maxPct * 0.9));
    const x = Math.round(rand(4, 96));
    const y = Math.round(rand(6, 94));
    const ink = Math.round(rand(8, 15));
    parts.push(
      `radial-gradient(${w}% ${h}% at ${x}% ${y}%, color-mix(in srgb, var(--color-ink) ${ink}%, transparent), transparent 72%)`,
    );
  }
  return parts.join(", ");
}

/** Thin diagonal bands of lane color. */
function streaks() {
  const lanes = ["research", "writing", "personal"] as const;
  return lanes
    .map((lane) => {
      const at = Math.round(rand(14, 66));
      const width = Math.round(rand(7, 11));
      const mix = Math.round(rand(20, 32));
      return `linear-gradient(116deg, transparent ${at}%, color-mix(in srgb, var(--color-lane-${lane}) ${mix}%, transparent) ${at + width / 2}%, transparent ${at + width}%)`;
    })
    .join(", ");
}

type Layer = {
  key: string;
  depth: number;
  /** Vertical repeat period in px; 0 means the layer does not tile. */
  tile: number;
  background: string;
  backgroundSize?: string;
  className?: string;
  /** Twinkle period in seconds, for speck layers. */
  twinkle?: number;
  twinkleReverse?: boolean;
};

const SPEC: Layer[] = [
  // Deep field — three speck shells, each a little nearer than the last.
  { key: "specks-0", depth: 0.05, tile: 340, background: specks(9, 340, 0.9, 1.7), backgroundSize: "340px 340px", className: "atmo-specks", twinkle: 8 },
  { key: "specks-1", depth: 0.12, tile: 480, background: specks(8, 480, 1.0, 1.8), backgroundSize: "480px 480px", className: "atmo-specks", twinkle: 6, twinkleReverse: true },
  { key: "specks-2", depth: 0.22, tile: 620, background: specks(7, 620, 1.4, 2.4), backgroundSize: "620px 620px", className: "atmo-specks", twinkle: 10 },
  // Horizon (light theme only) — background comes from CSS, and it does
  // not tile, so it eases to a stop instead of wrapping.
  { key: "horizon", depth: 0.09, tile: 0, background: "", className: "atmo-horizon" },
  // Cloud deck, far → near.
  { key: "clouds-far", depth: 0.42, tile: 760, background: blobs(4, 22, 38), backgroundSize: "1040px 760px" },
  { key: "streaks", depth: 0.55, tile: 900, background: streaks(), backgroundSize: "1200px 900px" },
  { key: "clouds-mid", depth: 0.7, tile: 660, background: blobs(4, 26, 44), backgroundSize: "900px 660px" },
  { key: "clouds-near", depth: 1, tile: 540, background: blobs(3, 34, 54), backgroundSize: "760px 540px" },
];

// Drift params (Lissajous, like Planetoids) derived from the same stream.
const LAYERS = SPEC.map((l) => {
  const amp = driftOf(l.depth);
  return {
    ...l,
    parallax: parallaxOf(l.depth),
    blur: blurOf(l.depth),
    opacity: opacityOf(l.depth),
    ax: amp,
    ay: amp * 0.55,
    wx: rand(0.015, 0.05),
    wy: rand(0.012, 0.045),
    px: rand(0, Math.PI * 2),
    py: rand(0, Math.PI * 2),
  };
});

export function Atmosphere() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Parallax is motion: reduced-motion users get the static stack.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const t0 = performance.now();
    let eased = window.scrollY;

    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      // Sampled each frame rather than from a scroll listener, so
      // programmatic scrolls (Lenis on the loop reader, anchor jumps,
      // view transitions) move the sky too.
      const target = window.scrollY;
      // Exponential follow, so the layers lag the page a touch.
      eased += (target - eased) * 0.14;
      for (let i = 0; i < LAYERS.length; i++) {
        const l = LAYERS[i];
        const el = refs.current[i];
        if (!el) continue;
        const dx = l.ax * Math.sin(l.wx * t + l.px);
        const dy = l.ay * Math.cos(l.wy * t + l.py);
        let y: number;
        if (l.tile) {
          // Wrap into (-tile, 0] — invisible because the layer tiles.
          y = -eased * l.parallax + dy;
          y = ((y % l.tile) - l.tile) % l.tile;
        } else {
          // Non-tiling: asymptotically approach a travel limit.
          y = -HORIZON_TRAVEL * Math.tanh((eased * l.parallax) / HORIZON_TRAVEL) + dy;
        }
        el.style.transform = `translate3d(${dx.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="atmosphere" aria-hidden>
      {LAYERS.map((l, i) => (
        <div
          key={l.key}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="atmo-layer"
          style={{
            // Tall enough that a full tile of wrap never exposes an edge.
            height: `calc(100% + ${(l.tile || HORIZON_TRAVEL + DRIFT_MARGIN) + l.ay}px)`,
            left: -(l.ax + DRIFT_MARGIN),
            right: -(l.ax + DRIFT_MARGIN),
            opacity: l.opacity,
            zIndex: i,
          }}
        >
          <div
            className={`atmo-fill${l.className ? ` ${l.className}` : ""}`}
            style={{
              backgroundImage: l.background || undefined,
              backgroundSize: l.backgroundSize,
              filter: l.blur > 0.3 ? `blur(${l.blur.toFixed(1)}px)` : undefined,
              animation: l.twinkle
                ? `atmo-twinkle ${l.twinkle}s ease-in-out infinite ${l.twinkleReverse ? "alternate-reverse" : "alternate"}`
                : undefined,
            }}
          />
        </div>
      ))}
    </div>
  );
}
