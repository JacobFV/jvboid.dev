"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";

// A fanned deck of cards: the current card in the middle, its neighbours
// staggered out to either side, each one smaller and further back, each
// overlapping the next. Where the page has room the deck breaks out of the
// prose column to the viewport's width, so the neighbours fill what would
// otherwise be empty margin. Drag the deck (or press ← / →, or click a
// neighbour) to move along it; the deck wraps. All cards stay in the DOM —
// the neighbours are aria-hidden, not unmounted — so the content is in the
// page for search and for the lightbox, which gathers every reader image.
//
// A card's place is its signed distance k from the current card, folded
// so the deck is centred: half the cards sit left, half right. A card that
// wraps from one end to the other skips its transition instead of sliding
// across the middle. A drag that moves more than a few pixels swallows the
// click that ends it, so releasing a swipe does not also open the lightbox.

const SWIPE = 60; // px past which a release commits
const MOVED = 6; // px past which a press is a drag, not a click
const SPREAD = 0.5; // each neighbour's offset, in card widths at its scale
const SHRINK = 0.07; // scale lost per step out
const SHOWN = 6; // steps out after which a card fades away

const scaleAt = (d: number) => Math.max(0.55, 1 - SHRINK * d);

// Horizontal offset of the card k steps out, in % of a card's width: the
// sum of the widths of the (shrinking) cards between it and the middle.
function offsetAt(k: number) {
  let x = 0;
  for (let d = 1; d <= Math.abs(k); d++) x += SPREAD * 100 * scaleAt(d - 0.5);
  return Math.sign(k) * x;
}

export function CardStack({ children, label }: { children: ReactNode; label: string }) {
  const cards = Children.toArray(children);
  const n = cards.length;
  const half = Math.floor(n / 2);
  const [top, setTop] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);
  const lastTop = useRef(top);
  useEffect(() => {
    lastTop.current = top;
  }, [top]);

  const go = (step: number) => setTop((t) => (t + step + n) % n);
  const place = (i: number, from: number) => ((i - from + n + half) % n) - half;

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
          const k = place(i, top);
          const d = Math.abs(k);
          const wrapped = Math.abs(k - place(i, lastTop.current)) > 1;
          return (
            <div
              key={i}
              className="card-stack-card"
              data-current={k === 0 ? "" : undefined}
              aria-hidden={k !== 0}
              onClickCapture={
                k === 0
                  ? undefined
                  : (e) => {
                      // A neighbour is a way to get there, not a card to open.
                      e.preventDefault();
                      e.stopPropagation();
                      if (!moved.current) go(k);
                    }
              }
              style={{
                transform: `translateX(calc(${offsetAt(k)}% + ${dx}px)) scale(${scaleAt(d)})`,
                zIndex: n - d,
                opacity: d > SHOWN ? 0 : 1,
                transition: wrapped ? "none" : undefined,
                ["--card-dim" as string]: Math.min(0.75, d * 0.16),
              }}
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
