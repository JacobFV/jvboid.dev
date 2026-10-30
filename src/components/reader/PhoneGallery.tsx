"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { iphoneOnLinuxClips } from "@/lib/phone-gallery/iphone-on-linux";

// A grid of portrait phone recordings. Each tile loads lazily, plays muted
// and looped while it is on screen (unless the reader prefers reduced
// motion), and opens larger with controls on click. Category chips filter
// the grid. Clip data lives in src/lib/phone-gallery/<id>.ts.

export type PhoneClip = {
  src: string;
  poster: string;
  app: string;
  category: string;
  builtWith: string;
  caption: string;
  speedup: number;
  seconds: number;
};

const SETS: Record<string, PhoneClip[]> = {
  "iphone-on-linux": iphoneOnLinuxClips,
};

const LABELS: Record<string, string> = {
  "built-in": "Apple apps",
  network: "Networked",
  "linux-built": "Built on Linux",
  "mac-free": "No Mac",
  corpus: "Open-source corpus",
  "xcode-built": "Xcode-built",
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

function Tile({ clip, reduced, onOpen }: { clip: PhoneClip; reduced: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!loaded) setLoaded(true);
          if (!reduced) v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.4 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [loaded, reduced]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-1.5 text-left"
      aria-label={`${clip.app}: open larger`}
    >
      <div className="relative w-full overflow-hidden rounded-[18px] bg-[var(--color-bg-2)] ring-1 ring-[var(--color-rule)] transition group-hover:ring-[var(--color-accent)]" style={{ aspectRatio: "9 / 19.5" }}>
        <video
          ref={ref}
          src={loaded ? clip.src : undefined}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-white">
          {clip.speedup === 1 ? "1x" : `${clip.speedup}x`}
        </span>
      </div>
      <span className="truncate text-[13px] leading-tight text-[var(--color-ink)]">{clip.app}</span>
      <span className="truncate font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wide text-[var(--color-ink-mute)]">
        {LABELS[clip.category] ?? clip.category}
      </span>
    </button>
  );
}

function Viewer({ clip, onClose }: { clip: PhoneClip; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={clip.app}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-full w-full max-w-[min(420px,100%)] flex-col gap-3">
        <video
          src={clip.src}
          poster={clip.poster}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="mx-auto max-h-[78vh] w-auto max-w-full rounded-[22px] bg-black"
          style={{ aspectRatio: "9 / 19.5" }}
        />
        <div className="text-white">
          <div className="text-base">{clip.app}</div>
          <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-white/60">
            {LABELS[clip.category] ?? clip.category} · {clip.builtWith} · real capture, {clip.speedup}x
          </div>
          {clip.caption && <p className="mt-1 text-sm text-white/80">{clip.caption}</p>}
        </div>
        <button type="button" onClick={onClose} className="self-end rounded-full bg-white/15 px-3 py-1 text-sm text-white hover:bg-white/25">
          close
        </button>
      </div>
    </div>
  );
}

export function PhoneGallery({ set, caption }: { set: string; caption?: string }) {
  const clips = SETS[set] ?? [];
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<PhoneClip | null>(null);

  const cats = useMemo(() => {
    const c = new Map<string, number>();
    clips.forEach((x) => c.set(x.category, (c.get(x.category) ?? 0) + 1));
    return [...c.entries()];
  }, [clips]);
  const shown = filter === "all" ? clips : clips.filter((c) => c.category === filter);

  const chip = (key: string, label: string, n: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`rounded-full px-3 py-1 font-[family-name:var(--font-mono)] text-[11px] transition ${
        filter === key
          ? "bg-[var(--color-accent)] text-[var(--color-bg-0)]"
          : "bg-[var(--color-bg-1)] text-[var(--color-ink-dim)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label} <span className="opacity-70">{n}</span>
    </button>
  );

  return (
    <figure className="my-8">
      <div className="mb-4 flex flex-wrap gap-2">
        {chip("all", "All", clips.length)}
        {cats.map(([k, n]) => chip(k, LABELS[k] ?? k, n))}
      </div>
      <div className="grid gap-x-3 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(124px, 100%), 1fr))" }}>
        {shown.map((c) => (
          <Tile key={c.src} clip={c} reduced={reduced} onOpen={() => setOpen(c)} />
        ))}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">{caption}</figcaption>
      )}
      {open && <Viewer clip={open} onClose={() => setOpen(null)} />}
    </figure>
  );
}
