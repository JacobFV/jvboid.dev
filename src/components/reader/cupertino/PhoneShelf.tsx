"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CoverGallery } from "@/components/chrome/CoverGallery";
import { iphoneOnLinuxClips } from "@/lib/phone-gallery/iphone-on-linux";
import type { PhoneClip } from "../PhoneGallery";

/**
 * Every recording of the phone on one draggable shelf, the same 3D rail the
 * home page uses for book covers (`CoverGallery`): phones at the middle face
 * the reader, phones toward the edges swing back into the page. Each phone
 * plays, muted, while it is on screen, carries a one-line caption under it,
 * and opens larger with controls on tap.
 *
 * The pills above it are Apple's gallery tabs. They regroup the clip data's
 * six provenance categories into the four distinctions a visitor cares
 * about; changing one remounts the rail so it re-measures from the start.
 */

const SETS: Record<string, PhoneClip[]> = {
  "iphone-on-linux": iphoneOnLinuxClips,
};

type Tab = { key: string; label: string; match: (c: PhoneClip) => boolean };

const TABS: Tab[] = [
  { key: "all", label: "All", match: () => true },
  { key: "apple", label: "Apple's apps", match: (c) => c.category === "built-in" },
  { key: "online", label: "Online", match: (c) => c.category === "network" },
  {
    key: "linux",
    label: "Built on Linux",
    match: (c) => c.category === "linux-built" || c.category === "mac-free" || c.category === "xcode-built",
  },
  { key: "open", label: "Open source", match: (c) => c.category === "corpus" },
];

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

function Phone({ clip, reduced, onOpen }: { clip: PhoneClip; reduced: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // The rail clips its overflow, so "intersecting the viewport" already
    // means "inside the visible part of the shelf" as well as on screen.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!loaded) setLoaded(true);
          if (!reduced) v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [loaded, reduced]);

  return (
    <li className="cup-shelf__item">
      <button type="button" className="cup-phone" onClick={onOpen} aria-label={`${clip.app}: open larger`}>
        <span className="cup-phone__screen">
          <video
            ref={ref}
            src={loaded ? clip.src : undefined}
            poster={clip.poster}
            muted
            loop
            playsInline
            preload="none"
          />
        </span>
        <span className="cup-phone__name">{clip.app}</span>
        <span className="cup-phone__note">{clip.caption}</span>
        <span className="cup-phone__meta">
          {clip.speedup === 1 ? "Real time" : `${clip.speedup}× speed`} · {Math.round(clip.seconds)}s
        </span>
      </button>
    </li>
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
    <div role="dialog" aria-modal="true" aria-label={clip.app} onClick={onClose} className="cup-film cup-film--phone">
      <div className="cup-film__phone" onClick={(e) => e.stopPropagation()}>
        <video src={clip.src} poster={clip.poster} controls autoPlay muted loop playsInline />
        <div className="cup-film__caption">
          <div className="cup-film__title">{clip.app}</div>
          <p>{clip.caption}</p>
          <div className="cup-film__meta">
            {clip.builtWith} · real capture · {clip.speedup === 1 ? "real time" : `${clip.speedup}× speed`}
          </div>
        </div>
      </div>
      <button type="button" className="cup-film__close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function PhoneShelf({ set, caption }: { set: string; caption?: string }) {
  const clips = SETS[set] ?? [];
  const reduced = useReducedMotion();
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState<PhoneClip | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const tabs = useMemo(
    () => TABS.map((t) => ({ ...t, n: clips.filter(t.match).length })).filter((t) => t.n > 0),
    [clips],
  );
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];
  const shown = active ? clips.filter(active.match) : clips;

  return (
    <figure className="cup-shelf">
      <div className="cup-tabs" role="tablist" aria-label="Which recordings to show">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active?.key === t.key}
            className="cup-tab"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Keyed on the tab: a fresh rail measures its new children from
          scrollLeft 0 instead of inheriting a stale offset and layout. */}
      <CoverGallery key={active?.key ?? "all"} className="cup-shelf__rail">
        {shown.map((c) => (
          <Phone key={c.src} clip={c} reduced={reduced} onOpen={() => setOpen(c)} />
        ))}
      </CoverGallery>
      {caption && <figcaption className="cup-shelf__caption">{caption}</figcaption>}
      {open && <Viewer clip={open} onClose={close} />}
    </figure>
  );
}
