"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Lane, NodeKind, ProjectStatus } from "@/lib/graph";

export type NodeCardData = {
  id: string;
  title: string;
  lane: Lane;
  kind: NodeKind;
  status?: ProjectStatus;
  dim?: boolean;
};

const laneColor: Record<Lane, string> = {
  research: "var(--color-lane-research)",
  building: "var(--color-lane-building)",
  writing: "var(--color-lane-writing)",
  personal: "var(--color-lane-personal)",
};

const statusOpacity: Record<ProjectStatus, number> = {
  idea: 0.55,
  active: 1,
  shipped: 0.85,
  shelved: 0.4,
};

// 64×40 cards per docs/DESIGN.md. Title truncates to a single line; the
// full title surfaces on hover (native title attr) and via Cmd-K search.
export function NodeCard({ data, selected }: NodeProps) {
  const d = data as unknown as NodeCardData;
  const opacity =
    (d.dim ? 0.18 : 1) * (d.status ? statusOpacity[d.status] : 1);

  return (
    <div
      title={d.title}
      style={{
        width: 64,
        height: 40,
        opacity,
        background: "var(--color-bg-2)",
        borderRadius: 4,
        position: "relative",
        outline: selected
          ? "1px solid var(--color-accent)"
          : "1px solid transparent",
        transition: "opacity 220ms ease, outline-color 160ms ease",
        cursor: "pointer",
        // Matched by `node-{id}` on the detail hero — the browser FLIP
        // animates the card into the title block on navigation.
        viewTransitionName: `node-${d.id}`,
      }}
    >
      {/* Lane stripe */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 4,
          height: "100%",
          background: laneColor[d.lane],
          borderTopLeftRadius: 4,
          borderBottomLeftRadius: 4,
        }}
      />
      <div
        style={{
          paddingLeft: 8,
          paddingRight: 6,
          paddingTop: 4,
          paddingBottom: 4,
          fontSize: 9,
          lineHeight: 1.15,
          color: "var(--color-ink)",
          fontFamily: "var(--font-sans)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          textOverflow: "ellipsis",
        }}
      >
        {d.title}
      </div>
      {/* Status dot — only meaningful for projects */}
      {d.status && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 4,
            height: 4,
            borderRadius: 999,
            background:
              d.status === "active"
                ? "var(--color-accent)"
                : "var(--color-ink-mute)",
          }}
        />
      )}

      {/* React Flow needs handles for edges to connect — kept invisible */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}
