"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { EdgeKind } from "@/lib/graph";

export type EdgeStyleData = {
  kind: EdgeKind;
  weight: number;
  dim?: boolean;
};

const dashFor: Record<EdgeKind, string | undefined> = {
  influence: undefined, // solid
  realization: "6 4",
  critique: "2 3",
  collaboration: undefined,
};

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const d = data as unknown as EdgeStyleData;
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const baseOpacity = 0.18 + 0.55 * d.weight;
  const opacity = d.dim ? 0.05 : baseOpacity;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke: "var(--color-ink-mute)",
        strokeWidth: 0.8 + d.weight * 0.8,
        strokeDasharray: dashFor[d.kind],
        opacity,
        transition: "opacity 220ms ease",
        fill: "none",
      }}
    />
  );
}
