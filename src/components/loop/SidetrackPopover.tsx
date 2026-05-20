"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { Lane } from "@/lib/graph";

type Props = {
  to: string;
  title: string;
  summary: string;
  lane: Lane;
  children: ReactNode;
};

const laneColor: Record<Lane, string> = {
  research: "#6FA8DC",
  building: "#93C47D",
  writing: "#C27BA0",
  personal: "#F1C232",
};

// Click reveals a small panel with the target node's title and summary.
// Click again to collapse. Scroll position is preserved because the
// panel renders inline.
export function SidetrackPopover({ to, title, summary, lane, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      style={{
        maxWidth: 640,
        margin: "8vh auto",
        padding: "20px 24px",
        borderLeft: `3px solid ${laneColor[lane]}`,
        background: "rgba(0, 0, 0, 0.025)",
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--color-ink-mute)",
          marginBottom: 8,
        }}
      >
        Sidetrack
      </div>
      <div style={{ fontSize: 16, lineHeight: 1.6 }}>{children}</div>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          marginTop: 12,
          background: "transparent",
          border: 0,
          padding: 0,
          color: laneColor[lane],
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        {open ? "↓ collapse" : "→ peek at /"}
        {to}
      </button>

      {open && (
        <div
          style={{
            marginTop: 14,
            padding: "14px 16px",
            background: "rgba(0, 0, 0, 0.04)",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "var(--color-ink)",
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--color-ink-dim)",
              margin: 0,
              marginBottom: 10,
            }}
          >
            {summary}
          </p>
          <Link
            href={`/${to}`}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: laneColor[lane],
              textDecoration: "none",
            }}
          >
            open the full node →
          </Link>
        </div>
      )}
    </aside>
  );
}
