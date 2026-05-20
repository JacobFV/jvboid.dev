"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMG_SIZE_OPEN = 280; // px diameter when the card is centered
const LABEL_RADIUS = 220; // px from image center to label anchor
const FLIP_DURATION = 700; // ms — keep in sync with the @keyframes

// The seven facets that map to the kinds of nodes on this site: founder
// (vision), engineer (skills/experience), researcher (papers/readings),
// writer (posts), builder (projects), teacher (loop / book notes),
// friend (friends graph). Angles read clockwise from straight up.
const LABELS: { text: string; angleDeg: number }[] = [
  { text: "founder", angleDeg: -90 },
  { text: "engineer", angleDeg: -90 + 360 / 7 },
  { text: "researcher", angleDeg: -90 + (2 * 360) / 7 },
  { text: "writer", angleDeg: -90 + (3 * 360) / 7 },
  { text: "builder", angleDeg: -90 + (4 * 360) / 7 },
  { text: "teacher", angleDeg: -90 + (5 * 360) / 7 },
  { text: "friend", angleDeg: -90 + (6 * 360) / 7 },
];

export function PfpReveal() {
  const [open, setOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowLabels(false);
      return;
    }
    const id = window.setTimeout(() => setShowLabels(true), FLIP_DURATION - 100);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Reveal the other side"
        className="relative cursor-pointer overflow-hidden rounded-full border border-[var(--color-bg-2)] transition-transform duration-200 hover:scale-105"
        style={{ width: 200, height: 200, zIndex: 10 }}
      >
        <Image
          src="/img/prof_pic.jpg"
          alt="Jacob Valdez"
          width={200}
          height={200}
          priority
          className="grayscale-[15%]"
          style={{ width: 200, height: 200, objectFit: "cover" }}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Jacob, labeled"
          className="fixed inset-0 z-50 grid place-items-center"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-md"
            style={{ animation: "pfp-backdrop-in 320ms ease forwards" }}
          />

          {/* Flip card. perspective on the wrapper, preserve-3d on the
              inner so both faces share the rotation. */}
          <div
            className="relative"
            style={{ perspective: 1200, width: IMG_SIZE_OPEN, height: IMG_SIZE_OPEN }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transformStyle: "preserve-3d",
                animation: `pfp-flip-in ${FLIP_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--color-bg-2)",
                }}
              >
                <Image
                  src="/img/prof_pic.jpg"
                  alt=""
                  width={IMG_SIZE_OPEN}
                  height={IMG_SIZE_OPEN}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              {/* Back face — an older portrait pulled from the Jekyll
                  migration so the flip reveals a visibly different "you". */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid var(--color-bg-2)",
                }}
              >
                <Image
                  src="/img/migrated/old_prof_pic.jpg"
                  alt=""
                  width={IMG_SIZE_OPEN}
                  height={IMG_SIZE_OPEN}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            {showLabels && <Labels />}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-6 right-6 grid h-9 w-9 place-items-center rounded-full bg-[var(--color-bg-1)] text-[var(--color-ink-dim)] shadow-[var(--ring-soft)] hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function Labels() {
  // SVG plane spans IMG + 2*LABEL_RADIUS on each side so lines can reach
  // out past the image. Image center sits at (svgCenter, svgCenter).
  const svgPad = LABEL_RADIUS;
  const svgSize = IMG_SIZE_OPEN + 2 * svgPad;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const lineR1 = IMG_SIZE_OPEN / 2 + 6;
  const lineR2 = LABEL_RADIUS - 18;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: -svgPad,
        top: -svgPad,
        width: svgSize,
        height: svgSize,
      }}
    >
      <svg width={svgSize} height={svgSize} style={{ position: "absolute", inset: 0 }}>
        {LABELS.map((l, i) => {
          const rad = (l.angleDeg * Math.PI) / 180;
          const x1 = cx + Math.cos(rad) * lineR1;
          const y1 = cy + Math.sin(rad) * lineR1;
          const x2 = cx + Math.cos(rad) * lineR2;
          const y2 = cy + Math.sin(rad) * lineR2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-ink-mute)"
              strokeWidth={1}
              style={{
                opacity: 0,
                animation: `pfp-label-in 340ms ease ${i * 70}ms forwards`,
              }}
            />
          );
        })}
      </svg>
      {LABELS.map((l, i) => {
        const rad = (l.angleDeg * Math.PI) / 180;
        const x = Math.cos(rad) * LABEL_RADIUS;
        const y = Math.sin(rad) * LABEL_RADIUS;
        // Anchor text away from the image so it reads outward.
        const alignLeft = x < -1;
        return (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 font-[family-name:var(--font-mono)] text-xs whitespace-nowrap text-[var(--color-ink)]"
            style={{
              transform: `translate(${x}px, ${y}px) translate(${alignLeft ? "-100%" : "0"}, -50%) translateX(${alignLeft ? "-10px" : "10px"})`,
              opacity: 0,
              animation: `pfp-label-in 340ms ease ${i * 70 + 80}ms forwards`,
            }}
          >
            {l.text}
          </div>
        );
      })}
    </div>
  );
}
