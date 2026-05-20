// Force-directed positions for the constellation. Computed once per
// graph; the nodes are static after that. Settings from docs/DESIGN.md.

import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { Edge, Node } from "@/lib/graph";

type LayoutNode = SimulationNodeDatum & { id: string };
type LayoutLink = SimulationLinkDatum<LayoutNode> & {
  source: string;
  target: string;
  weight: number;
};

export type Position = { id: string; x: number; y: number };

export function computeForceLayout(
  nodes: Node[],
  edges: Edge[],
  opts?: { width?: number; height?: number; ticks?: number },
): Position[] {
  const width = opts?.width ?? 1600;
  const height = opts?.height ?? 1000;
  const ticks = opts?.ticks ?? 320;

  const nodeIds = new Set(nodes.map((n) => n.id));
  const simNodes: LayoutNode[] = nodes.map((n) => ({ id: n.id }));
  const simLinks: LayoutLink[] = edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight ?? 0.6,
    }));

  const sim = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<LayoutNode, LayoutLink>(simLinks)
        .id((d) => d.id)
        .distance((l) => 60 + 100 * (1 - l.weight))
        .strength(0.6),
    )
    .force("charge", forceManyBody().strength(-340))
    .force("center", forceCenter(width / 2, height / 2))
    // Gravity, per design — a soft pull toward center on each axis.
    .force("x", forceX(width / 2).strength(0.04))
    .force("y", forceY(height / 2).strength(0.04))
    .stop();

  for (let i = 0; i < ticks; i++) sim.tick();

  return simNodes.map((n) => ({
    id: n.id,
    x: n.x ?? width / 2,
    y: n.y ?? height / 2,
  }));
}
