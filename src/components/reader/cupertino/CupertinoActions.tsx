"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The two links under an Apple product headline: "Watch the film" and the
 * one that would say "Buy". Here the thing to buy is the source, so the
 * second link goes to GitHub.
 *
 * The film opens in a dark modal rather than scrolling the reader somewhere:
 * the hero stays where it was, and a tap on the backdrop or Escape puts it
 * back. No autoplay until asked.
 */
export function CupertinoActions({
  video,
  poster,
  github,
  filmLabel = "Watch the film",
  codeLabel = "View on GitHub",
}: {
  video: string;
  poster?: string;
  github: string;
  filmLabel?: string;
  codeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <div className="cup-actions">
      <button type="button" className="cup-link" onClick={() => setOpen(true)}>
        {filmLabel}
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M3 1.5v9l7-4.5z" fill="currentColor" />
        </svg>
      </button>
      <a className="cup-link" href={github} target="_blank" rel="noreferrer">
        {codeLabel}
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
          <path d="M4 1.5 8.5 6 4 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>

      {open && (
        <div className="cup-film" role="dialog" aria-modal="true" aria-label={filmLabel} onClick={close}>
          <div className="cup-film__frame" onClick={(e) => e.stopPropagation()}>
            <video src={video} poster={poster} controls autoPlay playsInline />
          </div>
          <button type="button" className="cup-film__close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
