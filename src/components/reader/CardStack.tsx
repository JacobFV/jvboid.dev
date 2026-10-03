"use client";

import { Children, useRef, useState, type ReactNode } from "react";

// A deck of cards, one on top and two peeking out behind it. Drag the top
// card left (or press →) to send it to the bottom of the deck; drag right
// (or press ←) to bring the bottom card back on top. The deck wraps. All
// cards stay in the DOM — the ones behind are inert, not unmounted — so
// the content is in the page for search and for the lightbox, which
// gathers every reader image on the page.
//
// The cards share one grid cell, so the deck is as tall as its tallest
// card and nothing jumps as the top card changes. A drag that moves more
// than a few pixels swallows the click that ends it, so releasing a swipe
// over an image does not also open the lightbox.

const SWIPE = 70; // px past which a release commits
const MOVED = 6; // px past which a press is a drag, not a click

export function CardStack({ children, label }: { children: ReactNode; label: string }) {
  const cards = Children.toArray(children);
  const n = cards.length;
  const [top, setTop] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const go = (step: number) => setTop((t) => (t + step + n) % n);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const x = e.clientX - s.x;
    if (!dragging) {
      // Mostly vertical: the reader is scrolling, not swiping.
      if (Math.abs(e.clientY - s.y) > Math.abs(x) && Math.abs(e.clientY - s.y) > MOVED) {
        start.current = null;
        return;
      }
      if (Math.abs(x) < MOVED) return;
      moved.current = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setDx(x);
  };
  const end = () => {
    if (dragging && n > 1) {
      if (dx < -SWIPE) go(1);
      else if (dx > SWIPE) go(-1);
    }
    start.current = null;
    setDragging(false);
    setDx(0);
  };

  return (
    <div
      className="card-stack"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") (e.preventDefault(), go(1));
        else if (e.key === "ArrowLeft") (e.preventDefault(), go(-1));
      }}
    >
      <div
        className="card-stack-deck"
        data-dragging={dragging ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
      >
        {cards.map((card, i) => {
          // 0 is the top card, 1 and 2 peek out behind it, n − 1 is the one
          // just sent away (parked off to the left, so bringing it back
          // flies it in from there). Everything else waits, hidden, behind.
          const pos = (i - top + n) % n;
          const slot = pos === 0 ? "top" : pos <= 2 ? `behind-${pos}` : pos === n - 1 ? "gone" : "hidden";
          return (
            <div
              key={i}
              className="card-stack-card"
              data-slot={slot}
              inert={pos !== 0}
              aria-hidden={pos !== 0}
              style={
                pos === 0 && dx
                  ? { transform: `translateX(${dx}px) rotate(${dx / 40}deg)` }
                  : undefined
              }
            >
              {card}
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="card-stack-controls">
          <button type="button" onClick={() => go(-1)} aria-label="Previous card">
            ←
          </button>
          <span aria-live="polite">
            {top + 1} / {n}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Next card">
            →
          </button>
        </div>
      )}
    </div>
  );
}
