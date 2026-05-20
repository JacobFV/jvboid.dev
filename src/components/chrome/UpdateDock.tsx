"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  id: string;
  title: string;
  summary: string;
  date: string;
};

// Bottom-left corner widget pointing at the newest durable update node.
export function UpdateDock({ id, title, summary, date }: Props) {
  const pathname = usePathname();

  if (pathname === "/" || pathname.startsWith("/loop") || pathname.startsWith("/focus-statement")) {
    return null;
  }

  return (
    <Link
      href={`/${id}`}
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        width: 300,
        background: "rgba(14, 16, 20, 0.78)",
        backdropFilter: "blur(8px)",
        border: "1px solid var(--color-bg-2)",
        borderRadius: 6,
        padding: "12px 14px",
        textDecoration: "none",
        color: "var(--color-ink)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        zIndex: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          color: "var(--color-ink-mute)",
          marginBottom: 6,
        }}
      >
        <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>latest</span>
        <span>{date}</span>
      </div>
      <div style={{ color: "var(--color-ink)", fontSize: 12, lineHeight: 1.4 }}>{title}</div>
      <div
        style={{
          color: "var(--color-ink-mute)",
          fontSize: 11,
          lineHeight: 1.35,
          marginTop: 4,
        }}
      >
        {summary}
      </div>
    </Link>
  );
}
