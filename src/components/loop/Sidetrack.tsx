import type { ReactNode } from "react";
import { getGraph } from "@/lib/graph";
import { SidetrackPopover } from "./SidetrackPopover";

// Resolves the target node on the server (so the popover has the title
// and summary preloaded), then hands off to the client component for
// the open/close interaction. Scroll position survives because the
// panel is inline.
export function Sidetrack({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  const node = getGraph().byId.get(to);

  if (!node) {
    // Stub for an id that doesn't exist yet — the chapter author can
    // forward-reference work in progress.
    return (
      <aside
        style={{
          maxWidth: 640,
          margin: "8vh auto",
          padding: "20px 24px",
          borderLeft: "3px solid #aaa",
          background: "rgba(0, 0, 0, 0.025)",
          borderRadius: 4,
          fontStyle: "italic",
          color: "var(--color-ink-mute)",
        }}
      >
        {children} (link target <code>/{to}</code> doesn&rsquo;t exist yet.)
      </aside>
    );
  }

  return (
    <SidetrackPopover
      to={to}
      title={node.title}
      summary={node.summary}
      lane={node.lane}
    >
      {children}
    </SidetrackPopover>
  );
}
