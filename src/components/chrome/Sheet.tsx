"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// The shell the contact sheets share: a square, hairline-ruled panel with
// a mono caps title bar, over a blurred page. Deliberately plain — no pill
// buttons, no soft card — so it reads as part of the same print furniture
// as the rest of the site.
//
// Rendered into <body> through a portal. The hero it opens from is a size
// container (`container-type: inline-size`), and a container is the
// containing block for `position: fixed` — so a sheet rendered in place
// was a "fullscreen" overlay the size of the hexagon, and on desktop its
// blur stopped at the hexagon's edges.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] grid place-items-center px-4"
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[color-mix(in_srgb,var(--color-bg-0)_60%,transparent)] backdrop-blur-md"
      />
      <div className="relative w-full max-w-sm border border-[var(--color-rule)] bg-[var(--color-bg-0)] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] py-2.5 pr-2.5 pl-5">
          <span className="font-[family-name:var(--font-mono)] text-[0.68rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center text-[var(--color-ink-mute)] transition-colors hover:text-[var(--color-ink)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" aria-hidden>
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** The sheets' two button styles: inverted ink for the main action, a
 *  hairline box for the rest. Square, mono caps, full width. */
export const sheetPrimary =
  "flex w-full items-center justify-between gap-3 bg-[var(--color-ink)] px-4 py-3 font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.12em] text-[var(--color-bg-0)] uppercase no-underline transition-opacity hover:opacity-85 disabled:opacity-40";
export const sheetSecondary =
  "flex w-full items-center justify-between gap-3 border border-[var(--color-rule)] px-4 py-3 font-[family-name:var(--font-mono)] text-[0.7rem] tracking-[0.12em] text-[var(--color-ink)] uppercase no-underline transition-colors hover:border-[var(--color-ink)]";
/** A contact value inside a button: kept in its own case and spacing. */
export const sheetValue = "truncate normal-case tracking-normal opacity-75";
