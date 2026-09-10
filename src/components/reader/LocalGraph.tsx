// 2nd-degree neighborhood for a node.
//
// Includes: the focus node, every direct neighbor (1°), every neighbor of
// those (2°), and all edges connecting any pair within that set. This file
// is the server half — it pulls the subgraph out of the graph and hands a
// client-safe slice to NeighborhoodOrbit, which draws it as a starfield
// behind the glass of a CRT (see components/reader/NeighborhoodOrbit.tsx).

import { getGraph, isListedNode, nodeHref, type Edge, type Node } from "@/lib/graph";
import {
  NeighborhoodOrbit,
  type OrbitEdge,
  type OrbitNode,
} from "@/components/reader/NeighborhoodOrbit";

function neighborhood(focusId: string): {
  nodes: Node[];
  edges: Edge[];
  rings: Map<string, 0 | 1 | 2>;
} {
  const { byId, edges } = getGraph();
  const focus = byId.get(focusId);
  if (!focus) return { nodes: [], edges: [], rings: new Map() };
  const visibleEdges = edges.filter((e) => {
    const source = byId.get(e.source);
    const target = byId.get(e.target);
    return (
      source &&
      target &&
      (e.source === focusId || isListedNode(source)) &&
      (e.target === focusId || isListedNode(target))
    );
  });

  const rings = new Map<string, 0 | 1 | 2>();
  rings.set(focusId, 0);

  // 1° neighbors
  for (const e of visibleEdges) {
    if (e.source === focusId) rings.set(e.target, 1);
    else if (e.target === focusId) rings.set(e.source, 1);
  }
  // 2° neighbors (any node adjacent to a 1° neighbor that isn't already
  // in the set)
  const oneRing = Array.from(rings.entries())
    .filter(([, r]) => r === 1)
    .map(([id]) => id);
  for (const e of visibleEdges) {
    if (oneRing.includes(e.source) && !rings.has(e.target)) rings.set(e.target, 2);
    if (oneRing.includes(e.target) && !rings.has(e.source)) rings.set(e.source, 2);
  }

  const ids = new Set(rings.keys());
  const nodes = Array.from(ids)
    .map((id) => byId.get(id))
    .filter((n): n is Node => Boolean(n));
  const subEdges = visibleEdges.filter((e) => ids.has(e.source) && ids.has(e.target));

  return { nodes, edges: subEdges, rings };
}

export function LocalGraph({ focusId }: { focusId: string }) {
  const { nodes, edges, rings } = neighborhood(focusId);
  if (nodes.length <= 1) return null; // no neighbors → nothing to draw

  const orbitNodes: OrbitNode[] = nodes.map((n) => ({
    id: n.id,
    title: n.title,
    lane: n.lane,
    href: nodeHref(n),
    ring: rings.get(n.id) ?? 2,
  }));

  const orbitEdges: OrbitEdge[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
    kind: e.kind,
    onFocus: e.source === focusId || e.target === focusId,
  }));

  return (
    <section className="mt-16">
      <h2 className="rule-label mb-6">Related</h2>

      <div className="-mx-2 sm:mx-0">
        <NeighborhoodOrbit
          nodes={orbitNodes}
          edges={orbitEdges}
          focusId={focusId}
          label="Related: this page, the pages it links to, and theirs. Drag to orbit, scroll or pinch to zoom."
        />
      </div>
    </section>
  );
}
