"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { nodeHref, type Lane } from "@/lib/graph-types";

// Heavily tilted orbits (tiltX near π/2) make the ellipse appear flat, so
// the icons swing wide horizontally while staying near the pfp vertically
// — leaving room for the name below — and the Z component drives a strong
// front/back corkscrew when projected to scale + opacity + z-index.
type OrbiterKind = "friend" | "skill" | "project" | "post" | "event";

export type OrbiterItem = {
  id: string;
  title: string;
  lane: Lane;
  kind: OrbiterKind;
  asset?: string;
  embed?: string;
};

type Slot = {
  kind: OrbiterKind;
  rank: number; // which sampled item from that kind (0 = top)
  radius: number;
  speed: number; // rad/sec
  phase: number; // initial angle, rad
  tiltX: number; // rad — flatness
  tiltZ: number; // rad — in-screen lean
};

// Eight slots with hand-picked orbit params. Each slot picks the Nth
// (rank) item from its category. If a category has fewer items than the
// slot wants, the slot is skipped silently. Radii span 115–245 for more
// visual variety; speeds bumped ~1.5x to give the system a bit more life.
const SLOTS: Slot[] = [
  { kind: "project", rank: 0, radius: 118, speed: 0.27, phase: 0.0, tiltX: 1.20, tiltZ: -0.20 },
  { kind: "friend",  rank: 0, radius: 152, speed: 0.20, phase: 0.8, tiltX: 1.32, tiltZ:  0.42 },
  { kind: "post",    rank: 0, radius: 178, speed: 0.16, phase: 1.7, tiltX: 1.05, tiltZ: -0.55 },
  { kind: "skill",   rank: 0, radius: 208, speed: 0.13, phase: 2.6, tiltX: 1.40, tiltZ:  0.10 },
  { kind: "event",   rank: 0, radius: 136, speed: 0.23, phase: 3.5, tiltX: 1.22, tiltZ: -0.75 },
  { kind: "project", rank: 1, radius: 244, speed: 0.11, phase: 4.4, tiltX: 1.15, tiltZ:  0.55 },
  { kind: "post",    rank: 1, radius: 163, speed: 0.19, phase: 5.3, tiltX: 1.28, tiltZ: -0.10 },
  { kind: "friend",  rank: 1, radius: 192, speed: 0.14, phase: 5.9, tiltX: 1.10, tiltZ:  0.65 },
];

function project(slot: Slot, angle: number) {
  const lx = slot.radius * Math.cos(angle);
  const ly = slot.radius * Math.sin(angle);
  const y1 = ly * Math.cos(slot.tiltX);
  const z1 = ly * Math.sin(slot.tiltX);
  const cz = Math.cos(slot.tiltZ);
  const sz = Math.sin(slot.tiltZ);
  return { x: lx * cz - y1 * sz, y: lx * sz + y1 * cz, z: z1 };
}

function styleFor(slot: Slot, angle: number) {
  const { x, y, z } = project(slot, angle);
  const depth = (z + slot.radius) / (2 * slot.radius); // 0..1
  const scale = 0.55 + 0.5 * depth;
  const opacity = 0.4 + 0.6 * depth;
  return {
    transform: `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`,
    opacity: opacity.toFixed(3),
    zIndex: z > 0 ? 20 : 0,
  };
}

const laneText: Record<Lane, string> = {
  research: "text-[var(--color-lane-research)]",
  building: "text-[var(--color-lane-building)]",
  writing: "text-[var(--color-lane-writing)]",
  personal: "text-[var(--color-lane-personal)]",
};

// Rendering precedence: iframe embed → asset image → kind-icon + lane
// gradient fallback. Never a bare letter — the gradient + icon reads as
// a tiny "planet" even when there's no asset.
//
// The iframe is scaled down hard so an entire deployed app reads as a
// tiny moving thumbnail and stays interaction-inert (pointer-events on
// the iframe are disabled; the wrapping Link handles the click).
function OrbiterContent({ item }: { item: OrbiterItem }) {
  if (item.embed) {
    return (
      <span className="relative block h-full w-full">
        <iframe
          src={item.embed}
          title={item.title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          // Scale a 480x300 viewport into a 36x36 circle.
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 480,
            height: 300,
            transformOrigin: "0 0",
            transform: "translate(-50%, -50%) scale(0.075)",
            border: 0,
            pointerEvents: "none",
          }}
        />
      </span>
    );
  }
  if (item.asset) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.asset}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover"
        aria-hidden
      />
    );
  }
  // Fallback: lane-tinted radial gradient + a kind-specific icon. The
  // color-mix() fades the lane color toward transparent so the gradient
  // sits softly over bg-1 in both light and dark themes.
  return (
    <span
      className="grid h-full w-full place-items-center"
      style={{
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--color-lane-${item.lane}) 55%, transparent) 0%, var(--color-bg-1) 78%)`,
      }}
    >
      <KindGlyph kind={item.kind} />
    </span>
  );
}

function KindGlyph({ kind }: { kind: OrbiterKind }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (kind) {
    case "friend":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M2.5 20c.5-3.6 3.3-5.6 6.5-5.6S15 16.4 15.5 20" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M14.8 14.4c2.6.2 4.6 2 5 4.6" />
        </svg>
      );
    case "skill":
      return (
        <svg {...common}>
          <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
        </svg>
      );
    case "project":
      return (
        <svg {...common}>
          <path d="M3 7l9-5 9 5-9 5-9-5z" />
          <path d="M3 7v10l9 5 9-5V7" />
          <path d="M12 12v10" />
        </svg>
      );
    case "post":
      return (
        <svg {...common}>
          <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" />
          <path d="M13.5 6.5l3 3" />
        </svg>
      );
    case "event":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 3v4M16 3v4" />
        </svg>
      );
  }
}

export function OrbitDecor({
  friends,
  skills,
  projects,
  posts,
  events,
}: {
  friends: OrbiterItem[];
  skills: OrbiterItem[];
  projects: OrbiterItem[];
  posts: OrbiterItem[];
  events: OrbiterItem[];
}) {
  const byKind: Record<OrbiterKind, OrbiterItem[]> = {
    friend: friends,
    skill: skills,
    project: projects,
    post: posts,
    event: events,
  };

  const live = SLOTS.flatMap((slot) => {
    const item = byKind[slot.kind]?.[slot.rank];
    return item ? [{ slot, item }] : [];
  });

  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      for (let i = 0; i < live.length; i++) {
        const el = refs.current[i];
        if (!el) continue;
        const { slot } = live[i];
        const s = styleFor(slot, slot.phase + slot.speed * t);
        el.style.transform = s.transform;
        el.style.opacity = s.opacity;
        el.style.zIndex = String(s.zIndex);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [live]);

  // No wrapper div: a translated wrapper creates its own stacking context,
  // which would lock every orbiter below the pfp regardless of inline
  // z-index. Returning a fragment lets each orbiter share the pfp's
  // stacking context, so z>0 orbiters actually layer in front of it.
  return (
    <>
      {live.map(({ slot, item }, i) => {
        const initial = styleFor(slot, slot.phase);
        return (
          <Link
            key={`${slot.kind}-${slot.rank}-${item.id}`}
            href={nodeHref(item)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={item.title}
            title={item.title}
            className={`pointer-events-auto absolute top-1/2 left-1/2 grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--color-bg-1)] font-[family-name:var(--font-mono)] text-sm font-semibold no-underline shadow-[var(--ring-soft)] transition-colors hover:bg-[var(--color-bg-2)] ${laneText[item.lane]}`}
            style={{
              transform: initial.transform,
              opacity: initial.opacity,
              zIndex: initial.zIndex,
            }}
          >
            <OrbiterContent item={item} />
          </Link>
        );
      })}
    </>
  );
}
