import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/loop/SmoothScroll";

// Loop is light-by-default — the book wants to read like a document, not
// a constellation. Tokens are inverted just for this subtree by setting
// the page-level CSS custom properties on the wrapper.
export default function LoopLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={
        {
          // Inverted palette — see docs/DESIGN.md > /loop visual.
          "--color-bg-0": "#FBFAF6",
          "--color-bg-1": "#F2EFE6",
          "--color-bg-2": "#E5E1D5",
          "--color-ink": "#1A1814",
          "--color-ink-dim": "#5A5650",
          "--color-ink-mute": "#8A8580",
          background: "var(--color-bg-0)",
          color: "var(--color-ink)",
          minHeight: "100vh",
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
    >
      <SmoothScroll />
      {children}
    </div>
  );
}
