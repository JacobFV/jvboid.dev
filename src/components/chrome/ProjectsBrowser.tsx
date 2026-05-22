"use client";

// The "Projects" index section. Renders its own section header (the
// server `Section` component can't host the interactive view toggle),
// switches between a list and a home-screen-style grid, and — for
// projects that carry visual preview material — opens a quick-look
// modal instead of navigating away.
//
// The modal shows the project's full MDX body between a docked header
// and a docked footer; only the middle scrolls. Opening from a grid
// tile, the app icon itself zoom-expands and cross-fades into the
// modal via a FLIP transform + a fading ghost layer.
//
// Modal eligibility (`quickView`) is decided server-side in page.tsx:
// a project earns it when it has a hero image, a demo video, or a live
// orbit embed. Bare stub projects just link straight to their page.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MDXContent } from "@/lib/mdx";
import { readStoredValue, writeStoredValue } from "@/lib/browser-storage";
import { nodeHref, type Lane, type ProjectStatus } from "@/lib/graph-types";
import { InviteCursor } from "@/components/reader/InviteCursor";

// Live embeds and visuals inside the modal carry a hairline border so
// they read as their own surface, distinct from the modal background.
// Mirrors `projectVisualFrame` in reader/Hero.tsx.
const embedFrame =
  "relative w-full overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-[var(--color-bg-1)]";

const PROJECT_ORDER_STORAGE_KEY = "jacobfv:projects:order";
// Hold this long before a press becomes a drag — short taps still open
// the project, and a scroll (moving > MOVE_CANCEL_PX first) aborts it.
// While the timer runs the pressed tile "charges" (scales down over
// exactly this duration) so the hold reads as intentional, not dead.
const LONGPRESS_MS = 280;
const MOVE_CANCEL_PX = 10;
const TILE_SPRING = { type: "spring" as const, stiffness: 620, damping: 46 };

// useLayoutEffect on the client (applies the stored order before paint,
// so there is no shuffle), useEffect on the server (no SSR warning).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Reconcile a stored id order with the live project set: keep stored
// ids that still exist (in stored order), then append any new projects.
function mergeOrder(stored: string[], projects: ProjectItem[]): string[] {
  const valid = new Set(projects.map((p) => p.id));
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const id of stored) {
    if (valid.has(id) && !seen.has(id)) {
      merged.push(id);
      seen.add(id);
    }
  }
  for (const p of projects) {
    if (!seen.has(p.id)) {
      merged.push(p.id);
      seen.add(p.id);
    }
  }
  return merged;
}

export type ProjectItem = {
  id: string;
  kind: "project";
  title: string;
  summary: string;
  status: ProjectStatus;
  date: string;
  lane: Lane;
  tags: string[];
  hero?: { src: string; alt: string; fit?: "cover" | "contain" };
  icon?: { src: string; alt: string };
  video?: string;
  threadImages?: { src: string; alt: string }[];
  orbitEmbed?: string;
  links?: Record<string, string | undefined>;
  quickView: boolean;
  // Compiled MDX module string. Only populated for quickView projects;
  // empty for the rest, which never open the modal.
  body: string;
};

type View = "list" | "grid";
const PROJECT_VIEW_STORAGE_KEY = "jacobfv:projects:view";

const laneBg: Record<Lane, string> = {
  research: "bg-[var(--color-lane-research)]",
  building: "bg-[var(--color-lane-building)]",
  writing: "bg-[var(--color-lane-writing)]",
  personal: "bg-[var(--color-lane-personal)]",
};

const fmtYear = (iso: string) => new Date(iso).getUTCFullYear();

function isView(value: unknown): value is View {
  return value === "list" || value === "grid";
}

function statusColor(status: ProjectStatus): string {
  return status === "active"
    ? "var(--color-accent)"
    : status === "shipped"
      ? "var(--color-ink-dim)"
      : "var(--color-ink-mute)";
}

// Compact YouTube/Vimeo → embed-URL resolver. Mirrors Hero.tsx; kept
// local so this client bundle doesn't pull the server reader module.
function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
    }
    if (u.hostname.endsWith("vimeo.com")) {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    if (u.pathname.includes("/embed/") || u.hostname === "player.vimeo.com") return raw;
    return null;
  } catch {
    return null;
  }
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

function ThreadImageGrid({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <span className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-[var(--color-bg-2)]">
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

// The square "app icon" face — hero image or a lane-tinted gradient.
// Shared by the grid tile and the modal's cross-fade ghost so the morph
// starts from a pixel-identical picture.
function IconFace({
  project,
  preferThread = false,
  preferIcon = false,
}: {
  project: ProjectItem;
  preferThread?: boolean;
  preferIcon?: boolean;
}) {
  if (preferIcon && project.icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.icon.src}
        alt=""
        loading="lazy"
        draggable={false}
        // Icons are designed at a fixed aspect (usually 1:1) — letterbox
        // them inside the card so the inner content never gets squished
        // when the card slot isn't perfectly square. Hero photos below
        // still use object-cover.
        className="h-full w-full object-contain"
        aria-hidden
      />
    );
  }

  if (
    preferThread &&
    project.status === "active" &&
    project.threadImages &&
    project.threadImages.length >= 2
  ) {
    return <ThreadImageGrid images={project.threadImages} />;
  }

  if (project.hero) {
    // "contain" letterboxes the logo on a lane-tinted backdrop so square
    // tiles never crop a wordmark; "cover" (default) fills the tile.
    const contain = project.hero.fit === "contain";
    return (
      <span
        className="grid h-full w-full place-items-center"
        style={
          contain
            ? {
                background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--color-lane-${project.lane}) 38%, transparent) 0%, var(--color-bg-1) 82%)`,
              }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.hero.src}
          alt=""
          loading="lazy"
          draggable={false}
          className={
            contain
              ? "h-full w-full object-contain p-[14%]"
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
      style={{
        background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, var(--color-lane-${project.lane}) 55%, transparent) 0%, var(--color-bg-1) 80%)`,
      }}
    >
      <ProjectGlyph />
    </span>
  );
}

type OpenFn = (p: ProjectItem, origin?: DOMRect | null) => void;

export function ProjectsBrowser({ id, projects }: { id?: string; projects: ProjectItem[] }) {
  const [view, setView] = useState<View>("grid");
  const [active, setActive] = useState<{ project: ProjectItem; origin: DOMRect | null } | null>(
    null,
  );

  // Custom drag-to-rearrange order (project ids). Starts as the
  // server-provided order; `hydrated` gates the layout animation so
  // applying the stored order on load doesn't visibly shuffle.
  const [order, setOrder] = useState<string[]>(() => projects.map((p) => p.id));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setView(readStoredValue(PROJECT_VIEW_STORAGE_KEY, "grid", isView));
  }, []);

  useIsoLayoutEffect(() => {
    const stored = readStoredValue(PROJECT_ORDER_STORAGE_KEY, [] as string[], isStringArray);
    setOrder(mergeOrder(stored, projects));
    const raf = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(raf);
  }, [projects]);

  const pickView = useCallback((next: View) => {
    writeStoredValue(PROJECT_VIEW_STORAGE_KEY, next);
    setView(next);
  }, []);

  const orderedProjects = useMemo(() => {
    const byId = new Map(projects.map((p) => [p.id, p]));
    return order.map((id) => byId.get(id)).filter((p): p is ProjectItem => Boolean(p));
  }, [order, projects]);

  const handleReorder = useCallback((ids: string[]) => {
    setOrder(ids);
    writeStoredValue(PROJECT_ORDER_STORAGE_KEY, ids);
  }, []);

  const quickViewById = useMemo(
    () => new Map(projects.filter((p) => p.quickView).map((p) => [p.id, p])),
    [projects],
  );

  // Opening the modal pushes `?project=<id>` so the open state is a
  // shareable URL; closing unwinds it. The query param — not React
  // state — is the source of truth, so Back/Forward and a freshly
  // loaded shared link all land in the right state.
  const open = useCallback<OpenFn>((p, origin = null) => {
    setActive({ project: p, origin });
    const url = new URL(window.location.href);
    url.searchParams.set("project", p.id);
    window.history.pushState({ projectModal: p.id }, "", url);
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.projectModal) {
      // Our open() added a history entry — step back over it so the URL
      // and the Back button stay consistent (popstate then clears state).
      window.history.back();
    } else {
      // Opened from a shared link: no entry to pop, just drop the param.
      setActive(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("project");
      window.history.replaceState(null, "", url);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(window.location.search).get("project");
      const p = id ? quickViewById.get(id) : undefined;
      setActive((prev) => {
        if (p) return prev?.project.id === p.id ? prev : { project: p, origin: null };
        return prev ? null : prev;
      });
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [quickViewById]);

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
              strokeWidth={1.8}
              aria-hidden
            >
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </svg>
          </ViewButton>
        </div>
      </div>

      {view === "list" ? (
        <ul className="flex flex-col">
          {orderedProjects.map((p) => (
            <li key={p.id}>
              <ProjectRow project={p} onOpen={open} />
            </li>
          ))}
        </ul>
      ) : (
        <ProjectGrid
          projects={orderedProjects}
          hydrated={hydrated}
          onReorder={handleReorder}
          onOpen={open}
        />
      )}

      {active && <QuickView project={active.project} origin={active.origin} onClose={close} />}
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

function ProjectRow({ project, onOpen }: { project: ProjectItem; onOpen: OpenFn }) {
  const className = "group block px-3 py-4 no-underline transition-colors";
  const inner = (
    <span className="flex gap-4">
      <span className="relative mt-1 block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-bg-1)] shadow-[var(--ring-soft)] sm:h-24 sm:w-24">
        <IconFace project={project} preferThread />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex items-baseline gap-3">
            <span
              className={`h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full ${laneBg[project.lane]}`}
              aria-hidden
            />
            <span className="text-lg text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
              {project.title}
            </span>
            {project.quickView && (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="translate-y-[-1px] text-[var(--color-ink-mute)] opacity-0 transition-opacity group-hover:opacity-100"
              >
                <path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5" />
              </svg>
            )}
          </span>
          <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-[var(--color-ink-mute)] uppercase">
            <span>{project.status}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{fmtYear(project.date)}</span>
          </span>
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {project.summary}
        </span>
      </span>
    </span>
  );

  if (project.quickView) {
    return (
      <button
        type="button"
        onClick={() => onOpen(project)}
        className={`w-full text-left ${className}`}
      >
        {inner}
      </button>
    );
  }
  return (
    <Link href={nodeHref(project)} className={className}>
      {inner}
    </Link>
  );
}

// The icon + label visual of a grid tile. Shared by the interactive
// tile and the floating drag overlay so the lifted copy is pixel-exact.
// `lifted` drops the hover transforms (the overlay isn't hovered).
function TileVisual({
  project,
  iconRef,
  lifted = false,
  pressing = false,
}: {
  project: ProjectItem;
  iconRef?: React.Ref<HTMLSpanElement>;
  lifted?: boolean;
  // `pressing` charges the icon down while the long-press timer runs,
  // so a hold reads as intentional rather than dead.
  pressing?: boolean;
}) {
  return (
    <>
      <span
        ref={iconRef}
        className={`relative block aspect-square w-full overflow-hidden rounded-[26%] shadow-[var(--shadow-soft)] ${
          lifted
            ? ""
            : "transition-transform duration-200 ease-out group-hover:scale-[1.03] group-active:scale-95"
        }`}
        style={
          pressing
            ? { transform: "scale(0.85)", transitionDuration: `${LONGPRESS_MS}ms` }
            : undefined
        }
      >
        <IconFace project={project} preferIcon preferThread />
      </span>
      <span className="line-clamp-2 text-center text-xs leading-snug text-[var(--color-ink-dim)] group-hover:text-[var(--color-accent)]">
        {project.title}
      </span>
    </>
  );
}

// The home-screen grid. Tiles rearrange on long-press + drag. The press
// "charges" the held tile (scales it down for the hold duration) so the
// gesture announces itself; on activation the lifted tile pops into a
// fixed overlay that follows the pointer while the rest reflow with a
// spring `layout` animation (wrapping across rows included). A short
// tap still opens the project; the new order persists to localStorage.
function ProjectGrid({
  projects,
  hydrated,
  onReorder,
  onOpen,
}: {
  projects: ProjectItem[];
  hydrated: boolean;
  onReorder: (ids: string[]) => void;
  onOpen: OpenFn;
}) {
  const router = useRouter();
  const tiles = useRef(new Map<string, HTMLElement>());
  const icons = useRef(new Map<string, HTMLSpanElement>());
  const [dragId, setDragId] = useState<string | null>(null);
  // The tile whose long-press timer is currently running (pre-drag) —
  // drives the "charging" shrink so a hold gives instant feedback.
  const [pressId, setPressId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{ x: number; y: number; w: number } | null>(null);
  // True between a drag's pointerup and the click it would spawn — used
  // to swallow that click so a drop doesn't also open the project.
  const justDragged = useRef(false);

  const gesture = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    grabX: number;
    grabY: number;
    w: number;
    timer: number | null;
    active: boolean;
  } | null>(null);

  // Block native touch-scroll only while a drag is actually live.
  useEffect(() => {
    if (!dragId) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [dragId]);

  const tileAt = (x: number, y: number): string | null => {
    for (const [id, el] of tiles.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  };

  const activate = () => {
    const g = gesture.current;
    if (!g) return;
    g.active = true;
    setPressId(null);
    setDragId(g.id);
    setOverlay({ x: g.lastX - g.grabX, y: g.lastY - g.grabY, w: g.w });
    navigator.vibrate?.(12);
  };

  const endGesture = () => {
    const g = gesture.current;
    if (g?.timer) clearTimeout(g.timer);
    if (g?.active) {
      justDragged.current = true;
      // The click fires synchronously after pointerup; clear on the next
      // task so the very next real tap still works.
      setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }
    gesture.current = null;
    setPressId(null);
    setDragId(null);
    setOverlay(null);
  };

  const onPointerDown = (e: React.PointerEvent, project: ProjectItem) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.setPointerCapture(e.pointerId);
    gesture.current = {
      id: project.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      w: rect.width,
      timer: window.setTimeout(activate, LONGPRESS_MS),
      active: false,
    };
    setPressId(project.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointerId) return;
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    if (!g.active) {
      // Moved before the long-press fired → treat as a scroll, abort.
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > MOVE_CANCEL_PX) {
        if (g.timer) clearTimeout(g.timer);
        gesture.current = null;
        setPressId(null);
      }
      return;
    }
    setOverlay({ x: e.clientX - g.grabX, y: e.clientY - g.grabY, w: g.w });
    const overId = tileAt(e.clientX, e.clientY);
    if (overId && overId !== g.id) {
      const ids = projects.map((p) => p.id);
      const from = ids.indexOf(g.id);
      const to = ids.indexOf(overId);
      if (from !== -1 && to !== -1 && from !== to) {
        onReorder(arrayMove(ids, from, to));
      }
    }
  };

  const dragged = dragId ? projects.find((p) => p.id === dragId) : null;

  const openTile = (project: ProjectItem) => {
    if (justDragged.current) return;
    if (project.quickView) {
      onOpen(project, icons.current.get(project.id)?.getBoundingClientRect() ?? null);
    } else {
      router.push(nodeHref(project));
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4 md:grid-cols-5">
        {projects.map((project) => (
          <motion.button
            key={project.id}
            type="button"
            layout={hydrated}
            transition={TILE_SPRING}
            ref={(el) => {
              if (el) tiles.current.set(project.id, el);
              else tiles.current.delete(project.id);
            }}
            onPointerDown={(e) => onPointerDown(e, project)}
            onPointerMove={onPointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onClick={(e) => {
              if (justDragged.current) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              openTile(project);
            }}
            className={`group flex w-full flex-col items-center gap-2 px-[7.5%] no-underline select-none ${
              project.status === "idea" || project.status === "shelved" ? "opacity-60" : ""
            }`}
            style={{
              opacity: dragId === project.id ? 0 : 1,
              touchAction: "manipulation",
            }}
          >
            <TileVisual
              project={project}
              pressing={pressId === project.id}
              iconRef={(el) => {
                if (el) icons.current.set(project.id, el);
                else icons.current.delete(project.id);
              }}
            />
          </motion.button>
        ))}
      </div>

      {overlay &&
        dragged &&
        createPortal(
          <div
            aria-hidden
            className="pointer-events-none fixed z-[60]"
            style={{ left: overlay.x, top: overlay.y, width: overlay.w }}
          >
            <div
              className="flex flex-col items-center gap-2 px-[7.5%] [filter:drop-shadow(0_16px_26px_rgba(0,0,0,0.4))]"
              style={{ animation: "tile-lift-in 200ms cubic-bezier(0.34, 1.5, 0.5, 1) both" }}
            >
              <TileVisual project={dragged} lifted />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function QuickView({
  project,
  origin,
  onClose,
}: {
  project: ProjectItem;
  origin: DOMRect | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // The cross-fade ghost (a copy of the grid icon) starts opaque and
  // fades out as the panel grows. Only used for grid-origin opens.
  const [ghostFaded, setGhostFaded] = useState(false);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // FLIP morph: place the panel over the clicked icon, then animate the
  // transform back to identity so the icon appears to zoom-expand into
  // the modal. Reduced-motion users get the near-instant duration from
  // the global media query, which overrides the inline transition.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !origin) return;
    const final = panel.getBoundingClientRect();
    if (final.width === 0) return;
    const scale = origin.width / final.width;
    const dx = origin.left + origin.width / 2 - (final.left + final.width / 2);
    const dy = origin.top + origin.height / 2 - (final.top + final.height / 2);
    panel.style.transformOrigin = "center center";
    panel.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    panel.getBoundingClientRect(); // flush the start frame
    panel.style.transition = "transform 360ms cubic-bezier(0.32, 1.08, 0.4, 1)";
    panel.style.transform = "none";
    const raf = requestAnimationFrame(() => setGhostFaded(true));
    const clear = () => {
      panel.style.transition = "";
      panel.style.transformOrigin = "";
    };
    panel.addEventListener("transitionend", clear, { once: true });
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("transitionend", clear);
    };
  }, [origin]);

  const videoEmbed = project.video ? toEmbedUrl(project.video) : null;
  const liveUrl = project.orbitEmbed ?? project.links?.demo;
  const links = project.links
    ? Object.entries(project.links).filter((e): e is [string, string] => Boolean(e[1]))
    : [];
  const href = nodeHref(project);
  const titleId = `quickview-${project.id}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        style={{ animation: "quickview-backdrop-in 200ms ease-out" }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[var(--color-bg-0)] shadow-[var(--shadow-soft),var(--ring-soft)] outline-none"
        style={{
          // List opens (no origin) use the plain center zoom; grid opens
          // are driven by the FLIP transform in the layout effect.
          animation: origin
            ? undefined
            : "quickview-zoom-in 240ms cubic-bezier(0.32, 1.4, 0.42, 1)",
        }}
      >
        {/* ---- Docked header — project name + link out ---- */}
        <header
          className="z-20 flex shrink-0 items-center justify-between gap-4 border-b border-[var(--color-bg-2)]/60 px-3.5 py-3.5 backdrop-blur-xl"
          style={{ background: "color-mix(in srgb, var(--color-bg-0) 74%, transparent)" }}
        >
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span
              className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${laneBg[project.lane]}`}
              aria-hidden
            />
            <h3
              id={titleId}
              className="truncate font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]"
            >
              {project.title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={href}
              className="rounded-full bg-[var(--color-bg-1)] px-2.5 py-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] no-underline transition-colors hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              open ↗
            </Link>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-full text-[var(--color-ink-mute)] transition-colors hover:bg-[var(--color-bg-1)] hover:text-[var(--color-ink)]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </header>

        {/* ---- Scrolling body — visual, meta, and the full project ---- */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5">
          {videoEmbed ? (
            <div className={embedFrame} style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={videoEmbed}
                title={`${project.title} — demo video`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
              />
            </div>
          ) : liveUrl ? (
            <div className={embedFrame} style={{ aspectRatio: "16 / 10" }}>
              <iframe
                src={liveUrl}
                title={`${project.title} — live demo`}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                className="absolute inset-0 h-full w-full"
                style={{ border: 0 }}
              />
              <TryItOutButton url={liveUrl} />
            </div>
          ) : project.hero ? (
            <div className={embedFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.hero.src}
                alt={project.hero.alt}
                className={
                  project.hero.fit === "contain"
                    ? "max-h-[360px] w-full bg-[var(--color-bg-1)] object-contain p-6"
                    : "max-h-[360px] w-full object-cover"
                }
              />
              {project.links?.demo && <TryItOutButton url={project.links.demo} center />}
            </div>
          ) : null}

          <div className="mt-4 font-[family-name:var(--font-mono)] text-[11px] tracking-wider text-[var(--color-ink-mute)] uppercase">
            <span style={{ color: statusColor(project.status) }}>{project.status}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{fmtYear(project.date)}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{project.lane}</span>
          </div>

          <p className="mt-3 text-base leading-relaxed text-[var(--color-ink-dim)]">
            {project.summary}
          </p>

          {project.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 font-[family-name:var(--font-mono)] text-[11px] text-[var(--color-ink-mute)]">
              {project.tags.map((t) => (
                <span key={t} className="rounded-full bg-[var(--color-bg-1)] px-2.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}

          {project.body && (
            <div className="prose-mdx mt-2 border-t border-[var(--color-bg-2)]/50 pt-2">
              <MDXContent code={project.body} />
            </div>
          )}
        </div>

        {/* ---- Docked footer — outbound links + read-more ---- */}
        <footer
          className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-bg-2)]/60 px-3.5 py-3.5 backdrop-blur-xl"
          style={{ background: "color-mix(in srgb, var(--color-bg-0) 74%, transparent)" }}
        >
          <div className="flex flex-wrap gap-2 font-[family-name:var(--font-mono)] text-xs">
            {links.map(([k, v]) => (
              <a
                key={k}
                href={v}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[var(--color-bg-1)] px-2.5 py-1 text-[var(--color-ink-dim)] no-underline transition-colors hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
              >
                {k} ↗
              </a>
            ))}
          </div>
          <Link
            href={href}
            className="shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1.5 font-[family-name:var(--font-mono)] text-xs text-white no-underline transition-opacity hover:opacity-90"
          >
            read the full project →
          </Link>
        </footer>

        {/* ---- Cross-fade ghost — the grid icon, fading as the panel grows ---- */}
        {origin && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl"
            style={{ opacity: ghostFaded ? 0 : 1, transition: "opacity 300ms ease-out" }}
          >
            <IconFace project={project} preferIcon preferThread />
          </div>
        )}
      </div>
    </div>
  );
}

function TryItOutButton({ url, center = false }: { url: string; center?: boolean }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`embed-cta absolute z-10 rounded-full bg-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-white no-underline shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 ${
        center ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "top-3 right-3"
      }`}
    >
      try it out ↗
      <InviteCursor />
    </a>
  );
}
