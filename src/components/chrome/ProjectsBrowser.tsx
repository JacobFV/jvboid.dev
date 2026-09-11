"use client";

// The "Projects" index section. Renders its own section header (the
// server `Section` component can't host the interactive view toggle)
// and switches between a text list and a honeycomb of hexagonal app
// icons.
//
// Clicking a project goes to that project's page — there is no
// quick-look modal any more. The navigation is dressed by
// `hexExpandNavigate` (src/lib/hex-transition.ts): the clicked hexagon
// grows until it fills the viewport, the destination page shows through
// it (zoomed in at first, settling to 1× as the mask opens), and the
// tile artwork cross-fades out on top.

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HeroHex, HeroStack, HERO_SIZE, type HeroContent } from "@/components/chrome/HeroHex";
import { readStoredValue, writeStoredValue } from "@/lib/browser-storage";
import { nodeHref, type Lane } from "@/lib/graph-types";
import {
  APP_CLIP,
  APP_ICON_RADIUS,
  APP_ICON_SIDE,
  type FacePlan,
  type IconKey,
  type TileArt,
  type TileGround,
} from "@/lib/project-face";
import {
  HEX_CLIP,
  HEX_RATIO,
  hexColumnsFor,
  hexPushOut,
  hexSeparation,
  hexWidthForColumns,
  packHoneycomb,
  settleComb,
  type HexCell,
  type HexSize,
} from "@/lib/hex-layout";
import { hexExpandNavigate, isPlainClick } from "@/lib/hex-transition";

export type ProjectItem = {
  id: string;
  kind: "project";
  title: string;
  date: string;
  lane: Lane;
  /** List view only — the honeycomb never shows one, so it omits them. */
  summary?: string;
  /** List view only: the project's other images, fanned behind its hexagon. */
  deck?: string[];
  /** Caption glyph, resolved from tags server-side. */
  glyph: IconKey;
  /**
   * The theme-dependent ground painted behind the art, for the faces
   * whose art doesn't fill the hexagon: a project with no art at all
   * ("glyph"), or a logo letterboxed inside it ("letterbox"). Everything
   * else covers its box and needs no ground.
   */
  ground?: TileGround;
  /**
   * The face, already composited into one image at build time by
   * scripts/generate-hex-tiles.ts, at the size this tile renders.
   */
  tile?: TileArt;
  /**
   * Only for the handful of projects with no baked tile — no art, or
   * sources the compositor couldn't decode. `IconFace` draws the plan in
   * the browser out of the originals, the way the whole comb used to.
   */
  face?: FacePlan;
  // Honeycomb tile size, in multiples of the base hexagon. Defaults to 1.
  size?: HexSize;
  /** "app": an app icon's rounded square inside the hexagon cell. */
  shape?: "app";
};

// What the packer lays out: the hero is a tile like any other, it just
// renders copy instead of app-icon art.
type HeroItem = { kind: "hero"; id: "__hero" };
type CombItem = HeroItem | ProjectItem;
const HERO_ITEM: HeroItem = { kind: "hero", id: "__hero" };
const combId = (item: CombItem) => item.id;
const combSize = (item: CombItem): HexSize => (item.kind === "hero" ? HERO_SIZE : (item.size ?? 1));

type View = "list" | "grid";
const PROJECT_VIEW_STORAGE_KEY = "jacobfv:projects:view";

// ---- Hexagon geometry -------------------------------------------------
// Flat-top hexagons — diagonals down the sides — packed into interlocking
// columns by `packHoneycomb` (src/lib/hex-layout.ts), which also owns
// HEX_RATIO and the clip. HEX_GAP is the "slight margin": it is carried by
// the collision shape, not the drawn one, so the packing stays a true
// honeycomb.
const HEX_GAP = 10;
const HEX_TARGET_W = 168;
// List-view icons are hexagons too, at a fixed size. Flat-top, so the
// fixed dimension is the width and the height follows.
const LIST_HEX_W = 104;
// The deck behind a list-view hexagon: the box it is drawn in, the size
// of one slide, and where each slide sits relative to the hexagon's
// centre (px, px, degrees) before a per-project jitter. The first four
// peek out of the hexagon's cut corners; the fifth rides up the top.
const DECK_BOX_W = 136;
const DECK_BOX_H = 116;
const DECK_CARD_W = 64;
const DECK_CARD_H = 48;
const DECK_MIN = 3;
const DECK_SLOTS = [
  { x: -30, y: -24, r: -14 },
  { x: 33, y: -20, r: 11 },
  { x: -29, y: 26, r: 9 },
  { x: 31, y: 27, r: -7 },
  { x: 3, y: -35, r: 4 },
] as const;

const laneBg: Record<Lane, string> = {
  research: "bg-[var(--color-lane-research)]",
  building: "bg-[var(--color-lane-building)]",
  writing: "bg-[var(--color-lane-writing)]",
  personal: "bg-[var(--color-lane-personal)]",
};

const fmtYear = (iso: string) => new Date(iso).getUTCFullYear();

// The caption glyph. Which glyph a project gets is decided server-side
// by `tileIconKey` (src/lib/project-face.ts) and shipped as one short
// string; these are the hairline Lucide-derived paths it names. Inline
// so they inherit currentColor and stay crisp at 11px with no icon
// library in the bundle.
function TileIcon({ kind, px = 11 }: { kind: IconKey; px?: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {kind === "video" && (
        <>
          <rect x="3" y="6" width="13" height="12" rx="2" />
          <path d="M16 10l5-3v10l-5-3z" />
        </>
      )}
      {kind === "music" && (
        <>
          <path d="M9 18V6l11-2v12" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="17" cy="16" r="2.5" />
        </>
      )}
      {kind === "palette" && (
        <>
          <path d="M12 3a9 9 0 100 18 2 2 0 001.5-3.3c-.6-.7-.2-1.7.7-1.7H17a4 4 0 004-4c0-5-4-9-9-9z" />
          <circle cx="7.5" cy="10.5" r="1" />
          <circle cx="12" cy="7.5" r="1" />
          <circle cx="16.5" cy="10.5" r="1" />
        </>
      )}
      {kind === "gamepad" && (
        <>
          <path d="M6 12h4M8 10v4" />
          <circle cx="15" cy="11" r="0.8" fill="currentColor" />
          <circle cx="17" cy="13" r="0.8" fill="currentColor" />
          <rect x="2" y="7" width="20" height="11" rx="5.5" />
        </>
      )}
      {kind === "rocket" && (
        <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.9.7-2.2-.1-3-.8-.8-2.1-.8-2.9 0zM12 15l-3-3m6-9c2 0 5 1 7 3-2 .7-3.5 2-4 4l-4 5-5-5 5-4c2-.5 3.3-2 4-4z" />
      )}
      {kind === "bot" && (
        <>
          <rect x="4" y="8" width="16" height="12" rx="2.5" />
          <path d="M12 8V4M9 4h6" />
          <circle cx="9" cy="14" r="1" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
          <path d="M2 13v3M22 13v3" />
        </>
      )}
      {kind === "flask" && (
        <path d="M9 3h6M10 3v6L4.5 19a2 2 0 001.8 3h11.4a2 2 0 001.8-3L14 9V3M7 15h10" />
      )}
      {kind === "image" && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M21 16l-5-5-9 9" />
        </>
      )}
      {kind === "mic" && (
        <>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8" />
        </>
      )}
      {kind === "brain" && (
        <path d="M9.5 3A3 3 0 006.5 6c-1.5.5-2.5 2-2.5 3.5 0 1 .5 2 1.2 2.7-.7.7-1.2 1.7-1.2 2.8 0 2 1.7 3.5 3.5 3.5h2A3 3 0 0012 21V3a3 3 0 00-2.5 0zm5 0A3 3 0 0117.5 6c1.5.5 2.5 2 2.5 3.5 0 1-.5 2-1.2 2.7.7.7 1.2 1.7 1.2 2.8 0 2-1.7 3.5-3.5 3.5h-2A3 3 0 0112 21" />
      )}
      {kind === "microscope" && (
        <path d="M6 21h12M7 21l1-4h5l1 4M9 11l3-1 1-3-3-2-3 3 2 3zm5 0a4 4 0 014 4M10 17a6 6 0 008-5.7" />
      )}
      {kind === "cap" && (
        <path d="M2 9l10-4 10 4-10 4L2 9zm4 2v5c0 1.5 3 3 6 3s6-1.5 6-3v-5m2-1v5" />
      )}
      {kind === "sprout" && (
        <path d="M12 21v-9M12 12c0-3 2-6 6-6 0 3-2 6-6 6zM12 13c0-2-1.5-4-4-4 0 2 1.5 4 4 4z" />
      )}
      {kind === "code" && <path d="M16 7l5 5-5 5M8 17l-5-5 5-5M14 5l-4 14" />}
      {kind === "wrench" && (
        <path d="M14.7 6.3a4 4 0 015.5 5.5l-3-3-2.5 2.5 3 3a4 4 0 01-5.5-5.5l-7 7a2 2 0 102.8 2.8l7-7" />
      )}
    </svg>
  );
}

function isView(value: unknown): value is View {
  return value === "list" || value === "grid";
}

function ProjectGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 7l9-5 9 5-9 5-9-5z" />
      <path d="M3 7v10l9 5 9-5V7" />
      <path d="M12 12v10" />
    </svg>
  );
}

function ThreadImageGrid({
  images,
  cols,
  tint,
}: {
  images: { src: string; alt: string }[];
  cols: number;
  tint?: string;
}) {
  return (
    <span
      className="grid h-full w-full gap-px"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${cols}, minmax(0, 1fr))`,
        background: tint ?? "var(--color-bg-2)",
      }}
    >
      {images.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.src}
          src={img.src}
          alt=""
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover"
          aria-hidden
        />
      ))}
    </span>
  );
}

// The theme-dependent ground under a face, when it has one. A contained
// image is letterboxed, so something has to fill the margins, and the
// lane tint is what fills them — which is also why a contained face can
// never be baked flat: the gradient resolves differently in each theme,
// and `--color-bg-1` moves under it. Cover and mosaic faces fill their
// box and need no ground at all.
function faceGround(ground: TileGround | undefined, lane: Lane): string | undefined {
  if (ground === "glyph") {
    return `radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--color-lane-${lane}) 55%, transparent) 0%, var(--color-bg-1) 80%)`;
  }
  if (ground === "letterbox") {
    return `radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--color-lane-${lane}) 38%, transparent) 0%, var(--color-bg-1) 82%)`;
  }
  return undefined;
}

// The app-icon face. Always fills its box; the hexagon clip lives on the
// wrapper.
//
// The fast path is one `<img>`: `tile` is the whole face, composited at
// build time at the size this hexagon actually renders (see
// scripts/generate-hex-tiles.ts), so a nine-cell mosaic of 3 MB
// photographs costs a single ~25 kB request. `tint` — the mean colour of
// that art — paints under it, so a tile still scrolling into view is a
// coloured hexagon rather than a hole.
//
// Everything below the `tile` branch is the fallback for the few
// projects the compositor couldn't bake, and draws the same plan in the
// browser out of the original artwork.
function IconFace({
  project,
  eager = false,
}: {
  project: ProjectItem;
  /** Above the fold: fetch immediately instead of waiting on the scroller. */
  eager?: boolean;
}) {
  const { face, tile } = project;
  const ground = faceGround(project.ground, project.lane);

  if (tile) {
    return (
      <span className="block h-full w-full" style={{ background: ground ?? tile.tint }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tile.src}
          srcSet={`${tile.src} 1x, ${tile.src2x} 2x`}
          width={tile.w}
          height={tile.h}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          draggable={false}
          className="h-full w-full object-cover"
          aria-hidden
        />
      </span>
    );
  }

  if (face?.face === "icon") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={face.image.src}
        alt=""
        loading="lazy"
        draggable={false}
        // Most explicit icons are logos and diagrams that should stay
        // intact; thumbnail-derived icons can opt into cover cropping.
        className={
          face.fit === "cover" ? "h-full w-full object-cover" : "h-full w-full object-contain"
        }
        aria-hidden
      />
    );
  }

  if (face?.face === "mosaic") {
    return <ThreadImageGrid images={face.images} cols={face.cols} tint={face.tint} />;
  }

  if (face?.face === "hero") {
    // "contain" letterboxes the logo on a lane-tinted backdrop so the
    // hexagon never crops a wordmark; "cover" (default) fills it.
    return (
      <span className="grid h-full w-full place-items-center" style={{ background: ground }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={face.image.src}
          alt=""
          loading="lazy"
          draggable={false}
          className={
            face.fit === "contain"
              ? "h-full w-full object-contain p-[16%]"
              : "h-full w-full object-cover"
          }
          aria-hidden
        />
      </span>
    );
  }

  return (
    <span
      className="grid h-full w-full place-items-center text-[var(--color-ink-mute)]"
      style={{ background: ground }}
    >
      <ProjectGlyph />
    </span>
  );
}

// Shared click handling: plain left-clicks are intercepted and dressed
// with the hexagon expand; everything else (⌘-click, middle-click) falls
// through to the browser.
function useHexNav(href: string) {
  const router = useRouter();
  return useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!isPlainClick(e)) return;
      e.preventDefault();
      const face = e.currentTarget.querySelector<HTMLElement>("[data-hex-face]");
      hexExpandNavigate({ face, href, push: () => router.push(href) });
    },
    [href, router],
  );
}

export function ProjectsBrowser({
  id,
  projects,
  hero,
}: {
  id?: string;
  projects: ProjectItem[];
  // The landing hero, as a tile of the same comb. Given one, this section
  // drops the list/grid picker: the hero only exists in the honeycomb, so
  // a text list would have nowhere to put it.
  hero?: HeroContent;
}) {
  const [view, setView] = useState<View>("grid");
  // The hexagon needs a wide comb before its interior can hold the bio at
  // a readable size, so below `lg` the hero stacks above the comb instead
  // and drops out of the packing. Matching Tailwind's breakpoint exactly
  // keeps the two from ever both showing.
  const [packHero, setPackHero] = useState(true);

  useEffect(() => {
    setView(readStoredValue(PROJECT_VIEW_STORAGE_KEY, "grid", isView));
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");
    const sync = () => setPackHero(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const pickView = useCallback((next: View) => {
    writeStoredValue(PROJECT_VIEW_STORAGE_KEY, next);
    setView(next);
  }, []);

  if (hero) {
    return (
      <section id={id} className="mt-6 scroll-mt-20">
        {!packHero && <HeroStack {...hero} />}
        <ProjectHoneycomb projects={projects} hero={packHero ? hero : undefined} />
      </section>
    );
  }

  return (
    <section id={id} className="mt-6 scroll-mt-20">
      <div className="mb-6 flex justify-end">
        <div role="group" aria-label="Projects view" className="flex gap-1.5">
          <ViewButton label="List view" active={view === "list"} onClick={() => pickView("list")}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M8 6h12M8 12h12M8 18h12" />
              <circle cx="3.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="3.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </ViewButton>
          <ViewButton label="Grid view" active={view === "grid"} onClick={() => pickView("grid")}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
              aria-hidden
            >
              {/* tessellated honeycomb: 2 hexes over 3, sharing edges */}
              <path d="M8.8 5.5 12 7.35 12 11.05 8.8 12.9 5.6 11.05 5.6 7.35Z" />
              <path d="M15.2 5.5 18.4 7.35 18.4 11.05 15.2 12.9 12 11.05 12 7.35Z" />
              <path d="M5.6 11.05 8.8 12.9 8.8 16.6 5.6 18.45 2.4 16.6 2.4 12.9Z" />
              <path d="M12 11.05 15.2 12.9 15.2 16.6 12 18.45 8.8 16.6 8.8 12.9Z" />
              <path d="M18.4 11.05 21.6 12.9 21.6 16.6 18.4 18.45 15.2 16.6 15.2 12.9Z" />
            </svg>
          </ViewButton>
        </div>
      </div>

      {view === "list" ? (
        <ul className="flex flex-col">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectRow project={p} />
            </li>
          ))}
        </ul>
      ) : (
        <ProjectHoneycomb projects={projects} />
      )}
    </section>
  );
}

function ViewButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`grid place-items-center p-1.5 transition-colors ${
        active
          ? "text-[var(--color-ink)]"
          : "text-[var(--color-ink-mute)] hover:text-[var(--color-ink-dim)]"
      }`}
    >
      {children}
    </button>
  );
}

function ProjectRow({ project }: { project: ProjectItem }) {
  const onClick = useHexNav(nodeHref(project));

  return (
    <Link
      href={nodeHref(project)}
      onClick={onClick}
      className="group block px-3 py-4 no-underline transition-colors"
    >
      <span className="flex gap-4">
        <span
          className="relative block shrink-0"
          style={{ width: DECK_BOX_W, height: DECK_BOX_H }}
        >
          <ProjectDeck project={project} />
          <span
            data-hex-face
            data-tile-shape={project.shape}
            className="absolute block overflow-hidden bg-[var(--color-bg-1)] transition-transform duration-200 ease-out group-hover:scale-[1.04]"
            style={{
              left: (DECK_BOX_W - LIST_HEX_W) / 2,
              top: (DECK_BOX_H - LIST_HEX_W * HEX_RATIO) / 2,
              width: LIST_HEX_W,
              height: LIST_HEX_W * HEX_RATIO,
              clipPath: faceClip(project),
              filter: "drop-shadow(0 1px 3px color-mix(in srgb, var(--color-ink) 18%, transparent))",
            }}
          >
            <IconFace project={project} />
            <HexEdge shape={project.shape} />
          </span>
        </span>
        {/* Positioned so it paints over any slide a hovered deck fans
            into the text column. */}
        <span className="relative min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="flex items-baseline gap-3">
              <span
                className={`h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full ${laneBg[project.lane]}`}
                aria-hidden
              />
              <span className="text-lg text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
                {project.title}
              </span>
            </span>
            <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-[var(--color-ink-mute)] uppercase">
              <span>{fmtYear(project.date)}</span>
            </span>
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-ink-dim)]">
            {project.summary}
          </span>
        </span>
      </span>
    </Link>
  );
}

// A small, stable number per project in [-1, 1), so each deck is
// scattered its own way and stays that way across renders.
function jitter(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return ((h ^ (h >>> 13)) >>> 0) / 2 ** 31 - 1;
}

// The slides under a list-view hexagon, so the row reads as a stack of
// material still to be unpacked. A project with too few pictures still
// gets DECK_MIN slides: the missing ones are blank, lane-tinted stock.
function ProjectDeck({ project }: { project: ProjectItem }) {
  const srcs = project.deck ?? [];
  const count = Math.min(DECK_SLOTS.length, Math.max(DECK_MIN, srcs.length));
  return (
    <>
      {DECK_SLOTS.slice(0, count).map((slot, i) => {
        const src = srcs[i];
        const x = slot.x + jitter(project.id, i * 3) * 4;
        const y = slot.y + jitter(project.id, i * 3 + 1) * 4;
        const r = slot.r + jitter(project.id, i * 3 + 2) * 4;
        return (
          <span
            key={i}
            aria-hidden
            className="deck-card absolute top-1/2 left-1/2 block rounded-[2px] bg-[var(--color-bg-1)] p-[2px]"
            style={
              {
                width: DECK_CARD_W,
                height: DECK_CARD_H,
                "--dx": `${x.toFixed(1)}px`,
                "--dy": `${y.toFixed(1)}px`,
                "--r": `${r.toFixed(1)}deg`,
                boxShadow:
                  "0 1px 2px color-mix(in srgb, var(--color-ink) 16%, transparent), 0 3px 8px color-mix(in srgb, var(--color-ink) 10%, transparent)",
              } as React.CSSProperties
            }
          >
            <span
              className="relative block h-full w-full overflow-hidden"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, var(--color-lane-${project.lane}) 22%, var(--color-bg-2)), var(--color-bg-2))`,
              }}
            >
              {src && (
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes={`${DECK_CARD_W}px`}
                  // The optimizer only takes local rasters; anything else
                  // is fetched as-is.
                  unoptimized={!src.startsWith("/") || /\.(?:svg|gif)(?:[?#]|$)/i.test(src)}
                  draggable={false}
                  className="object-cover"
                />
              )}
            </span>
          </span>
        );
      })}
    </>
  );
}

// A tile's mask: the hexagon, or for projects that were apps, an app
// icon's rounded square inside the same cell.
const faceClip = (project: ProjectItem) => (project.shape === "app" ? APP_CLIP : HEX_CLIP);

// The hairline around a tile. A clip-path has no border, so the edge is
// drawn as a shape on top of the artwork — the same shape the clip cuts,
// in the same hairline colour the rest of the site frames things with
// (HeroHex draws its own version of this around the hero).
//
// The stroke straddles the path, and the outer half is cut away by the
// clip on the parent, so it is set to twice the line we want. Non-scaling,
// so the line stays a hairline while a hovered tile scales up.
function HexEdge({ shape }: { shape?: "app" }) {
  const h = 100 * HEX_RATIO;
  const side = APP_ICON_SIDE * 100;
  return (
    <svg
      viewBox={`0 0 100 ${h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      focusable="false"
    >
      {shape === "app" ? (
        <rect
          x={(100 - side) / 2}
          y={(h - side) / 2}
          width={side}
          height={side}
          rx={APP_ICON_RADIUS * 100}
          fill="none"
          stroke="var(--color-bg-2)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <polygon
          points={`25,0 75,0 100,${h / 2} 75,${h} 25,${h} 0,${h / 2}`}
          fill="none"
          stroke="var(--color-bg-2)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

// Caption type tracks the tile, but only linearly up to 2×. Past that a
// literal 4× caption is a headline shouting out of the comb, so the extra
// sizes get half the growth — big tiles read as bigger *artwork*, not
// bigger words.
const captionScale = (size: HexSize) => (size <= 2 ? size : 2 + (size - 2) / 2);

// One hexagon. The label lives *inside* the hexagon (a honeycomb has no
// room between cells for a caption). Flat-top, so the bottom edge is only
// half the tile's width and the caption has to sit up off it and keep
// generous side padding to stay inside the diagonals.
function HexTile({
  cell,
  offset,
  popped,
  eager,
  onPoint,
}: {
  cell: HexCell<ProjectItem>;
  /** One of the tiles that lands above the fold — see EAGER_TILES. */
  eager?: boolean;
  // Shove from whichever neighbor is currently hovered, if any — or, on
  // the hovered tile itself, the room a fixed neighbor refused to give it.
  offset?: { x: number; y: number };
  popped?: boolean;
  onPoint: (id: string | null) => void;
}) {
  const { item: project, size, left, top, width, height } = cell;
  const href = nodeHref(project);
  const onClick = useHexNav(href);
  const type = captionScale(size);
  const nudge = offset ?? { x: 0, y: 0 };
  // A sub-1× tile is half a caption wide, so scaling type with it would
  // land under 6px. Half tiles get a floor instead, and pay for it by
  // dropping the meta row and sitting higher up the hexagon, where the
  // diagonals have not yet closed in on the text.
  const mini = size < 1;

  return (
    <Link
      href={href}
      onClick={onClick}
      title={project.title}
      onPointerEnter={() => onPoint(project.id)}
      onPointerLeave={() => onPoint(null)}
      // Keyboard focus jostles too, so the comb reacts the same either way.
      onFocus={() => onPoint(project.id)}
      onBlur={() => onPoint(null)}
      // z-index so a hovered hexagon lifts above the row nested under it.
      // The link's own box is the hexagon's bounding rectangle, and in a
      // comb those corners lie over the neighbors — so the link takes no
      // pointer itself and only the hexagon-clipped face below does
      // (clip-path clips hit-testing too). Hover, click and the jostle
      // still arrive here, bubbled up from the face.
      className="group pointer-events-none absolute z-0 block no-underline hover:z-10"
      style={{
        left,
        top,
        width,
        height,
        transform: `translate3d(${nudge.x.toFixed(2)}px, ${nudge.y.toFixed(2)}px, 0)`,
        // Neighbors settle slower than they shove, so the comb springs
        // back gently. The popped tile's own slide instead runs on the
        // pop's clock — it is the contact response to that growth, and
        // lagging it would let the tile lap into the hero on the way out.
        transition: popped
          ? "transform 200ms cubic-bezier(0, 0, 0.2, 1)"
          : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <span
        data-hex-face
        data-tile-shape={project.shape}
        className="pointer-events-auto relative block h-full w-full overflow-hidden transition-transform duration-200 ease-out group-hover:scale-[1.05] group-active:scale-[0.97]"
        style={{
          clipPath: faceClip(project),
          filter: "drop-shadow(0 2px 5px color-mix(in srgb, var(--color-ink) 20%, transparent))",
        }}
      >
        <IconFace project={project} eager={eager} />

        {/* Caption scrim — keeps the title legible over any artwork. The
            mini caption sits higher, so its scrim has to reach higher too. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 ${mini ? "h-full" : "h-[62%]"}`}
          style={{
            background: mini
              ? "linear-gradient(to top, color-mix(in srgb, var(--color-bg-0) 92%, transparent) 40%, color-mix(in srgb, var(--color-bg-0) 55%, transparent) 74%, transparent 96%)"
              : "linear-gradient(to top, color-mix(in srgb, var(--color-bg-0) 94%, transparent) 26%, color-mix(in srgb, var(--color-bg-0) 60%, transparent) 58%, transparent 92%)",
          }}
        />
        <span
          className={`pointer-events-none absolute inset-x-0 flex flex-col items-center gap-0.5 text-center ${
            mini ? "bottom-[20%] px-[12%]" : "bottom-[14%] px-[19%]"
          }`}
        >
          <span
            className="line-clamp-2 leading-tight text-[var(--color-ink)] group-hover:text-[var(--color-accent)]"
            style={{ fontSize: mini ? 9 : 11 * type }}
          >
            {project.title}
          </span>
          {!mini && (
            <span
              className="flex items-center justify-center gap-1 font-[family-name:var(--font-mono)] leading-none tracking-wider text-[var(--color-ink-mute)] uppercase"
              style={{ fontSize: 9 * type }}
            >
              <TileIcon kind={project.glyph} px={11 * type} />
              <span>{fmtYear(project.date)}</span>
            </span>
          )}
        </span>

        <HexEdge shape={project.shape} />
      </span>
    </Link>
  );
}

// ---- Hover jostle -----------------------------------------------------
// When a tile pops on hover its neighbors give way, the way a pressed
// hexagon would shove the comb around it. Between tiles this is *staged*,
// not simulated: the pop is 5% of an apothem (~4px), which HEX_GAP
// swallows whole, so an honest collision response would move nothing at
// all. The shove is the exaggeration that makes the pop read as physical.
//
// The hero is the exception, and there the contact is real. It never
// moves — it holds the page's copy, and text that slides when a neighbor
// is hovered reads as a bug rather than as weight — so a tile that grows
// or is shoved against it takes the whole displacement itself, and slides
// along the edge it is resting on.
// The packer fills bottom-left in editorial order, so the head of the
// list is the top of the comb. These tiles are on screen before anything
// is scrolled, and waiting for the lazy-load scroller to notice them is
// the difference between a page that arrives complete and one that
// develops. Everything past this stays lazy.
const EAGER_TILES = 8;

const JOSTLE_PUSH = 7;
// How far the ripple carries, in 1× hexagon widths. Wide enough that the
// second ring drifts a pixel or two behind the first.
const JOSTLE_RANGE = 2.2;
// Must match the hover scale on the tile face below: what the popped
// hexagon actually asks its neighbors for.
const JOSTLE_POP = 1.05;

type Offset = { x: number; y: number };

function jostleOffsets(
  cells: HexCell<CombItem>[],
  hoveredId: string | null,
  unitWidth: number,
  // Off under prefers-reduced-motion. The contact response below still
  // runs: the pop is a CSS hover transform that reduced motion does not
  // switch off, so the hexagon it grows into still has to be answered.
  shove: boolean,
): Map<string, Offset> {
  const out = new Map<string, Offset>();
  const source = hoveredId && cells.find((c) => combId(c.item) === hoveredId);
  if (!source) return out;

  const cx = source.left + source.width / 2;
  const cy = source.top + source.height / 2;
  // Flat-top, so the apothem — the radius `hexSeparation` is measured in —
  // is half the height.
  const apothem = source.height / 2;
  const range = JOSTLE_RANGE * unitWidth;

  for (const cell of shove ? cells : []) {
    if (cell.item.kind === "hero") continue;
    if (combId(cell.item) === hoveredId) continue;
    const dx = cell.left + cell.width / 2 - cx;
    const dy = cell.top + cell.height / 2 - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) continue;
    // Gap between the two flat sides — 0 for tiles actually in contact.
    const clearance = hexSeparation(dx, dy) - (apothem + cell.height / 2);
    if (clearance > range) continue;
    const fade = (1 - clearance / range) ** 2;
    // Small tiles are lighter, so they give way further.
    const mass = Math.min(1.8, Math.max(0.6, Math.sqrt(apothem / (cell.height / 2))));
    // Everything is shoved radially outward, so two tiles only close on
    // each other by the *difference* of their pushes. Capping any single
    // push below HEX_GAP therefore keeps the comb from ever self-overlapping.
    const push = Math.min(JOSTLE_PUSH * fade * mass, HEX_GAP * 0.9);
    out.set(combId(cell.item), { x: (dx * push) / dist, y: (dy * push) / dist });
  }

  // Now settle everything against the fixed bodies. The hovered tile is in
  // here too: it is the one that grew, so if it was resting on the hero it
  // is the one that has to give way.
  const fixed = cells.filter((c) => c.item.kind === "hero");
  if (fixed.length === 0) return out;

  for (const cell of cells) {
    if (cell.item.kind === "hero") continue;
    const id = combId(cell.item);
    const shoved = out.get(id) ?? { x: 0, y: 0 };
    // At rest a seated tile is exactly its two apothems plus HEX_GAP from
    // its neighbor, so a tile that has not grown or moved owes nothing and
    // this resolves to no push at all.
    const owed = (id === hoveredId ? JOSTLE_POP : 1) * (cell.height / 2) + HEX_GAP;
    let { x, y } = shoved;
    for (const block of fixed) {
      const relief = hexPushOut(
        cell.left + cell.width / 2 + x - (block.left + block.width / 2),
        cell.top + cell.height / 2 + y - (block.top + block.height / 2),
        block.height / 2 + owed,
      );
      if (relief) {
        x += relief.x;
        y += relief.y;
      }
    }
    if (x !== shoved.x || y !== shoved.y) out.set(id, { x, y });
  }
  return out;
}

// The honeycomb. Order is editorial — it comes from the server
// (`byProjectRank`) and stays put. Column count is measured rather than
// set by breakpoints so the tiles always divide the available width
// exactly; `packHoneycomb` then seats each one against its neighbors.
// With every project at 1× that reproduces the textbook flat-top comb:
// interlocking columns, each offset half a row from the last.
//
// The hero, when there is one, is simply the first item: a 4× tile in the
// same packing, dropped bottom-left like everything else. That is what
// makes the projects hug it — they are not laid out around a reserved
// hole, they fall against its edges because nothing else is free.
function ProjectHoneycomb({ projects, hero }: { projects: ProjectItem[]; hero?: HeroContent }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    // The settle is a hundred-odd milliseconds of physics, so a window
    // being dragged wider re-packs once it comes to rest rather than on
    // every frame of the drag. The first measurement above still lands
    // before paint.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      clearTimeout(timer);
      timer = setTimeout(() => setWidth(next), 140);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  // Pre-measurement (SSR and the first client render) assume a desktop
  // width, so the markup — and the project links in it — are identical
  // on both sides. The real width lands in a layout effect, before paint.
  const measured = width || 960;
  // Flat-top columns interlock, so a column costs three quarters of a tile
  // — `hexColumnsFor` accounts for that, and its inverse gives the width
  // that makes those columns divide the container exactly.
  const cols = Math.max(3, Math.min(8, hexColumnsFor(measured, HEX_TARGET_W, HEX_GAP)));
  const hexW = hexWidthForColumns(measured, cols, HEX_GAP);

  const items: CombItem[] = useMemo(
    () => (hero ? [HERO_ITEM, ...projects] : projects),
    [hero, projects],
  );

  // Bottom-left fill for a starting position, then a physical settle:
  // gravity toward the top, rigid tiles shaped like what they draw, and a
  // springy margin between them — see `settleComb`.
  const layout = useMemo(
    () =>
      settleComb(
        packHoneycomb({
          items,
          sizeOf: combSize,
          containerWidth: measured,
          unitWidth: hexW,
          gap: HEX_GAP,
        }),
        {
          containerWidth: measured,
          unitWidth: hexW,
          gap: HEX_GAP,
          shapeOf: (item) => (item.kind !== "hero" && item.shape === "app" ? "app" : "hex"),
          isFixed: (item) => item.kind === "hero",
          appIcon: { side: APP_ICON_SIDE, radius: APP_ICON_RADIUS },
        },
      ),
    [items, measured, hexW],
  );

  const offsets = useMemo(
    () => jostleOffsets(layout.cells, hovered, hexW, !still),
    [layout.cells, hovered, hexW, still],
  );

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: layout.height }}>
      {layout.cells.map((cell, index) =>
        cell.item.kind === "hero" ? (
          <div
            key="hero"
            className="absolute"
            style={{ left: cell.left, top: cell.top, width: cell.width, height: cell.height }}
          >
            {hero && <HeroHex {...hero} />}
          </div>
        ) : (
          <HexTile
            key={cell.item.id}
            cell={cell as HexCell<ProjectItem>}
            offset={offsets.get(cell.item.id)}
            popped={hovered === cell.item.id}
            eager={index < EAGER_TILES}
            onPoint={setHovered}
          />
        ),
      )}
    </div>
  );
}
