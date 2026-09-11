// 3rd-degree neighborhood for a node.
//
// Includes: the focus node, every direct neighbor (1°), every neighbor of
// those (2°), the closest of theirs (3°), and all edges connecting any pair
// within that set. This file
// is the server half — it pulls the subgraph out of the graph and hands a
// client-safe slice to NeighborhoodOrbit, which draws it as a starfield
// behind the glass of a CRT (see components/reader/NeighborhoodOrbit.tsx).

import { getGraph, isListedNode, nodeHref, type Edge, type Node } from "@/lib/graph";
import {
  NeighborhoodOrbit,
  type OrbitEdge,
  type OrbitNode,
} from "@/components/reader/NeighborhoodOrbit";

// How many links out from the page the view reaches.
const MAX_DEPTH = 3;
// From a well-connected page the third ring can take in much of the
// graph, so it keeps only the nodes with the most ties back into the
// second — the ones that are actually near, not merely reachable.
const MAX_OUTER = 40;

function neighborhood(focusId: string): {
  nodes: Node[];
  edges: Edge[];
  rings: Map<string, 0 | 1 | 2 | 3>;
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

  const rings = new Map<string, 0 | 1 | 2 | 3>();
  rings.set(focusId, 0);

  // Breadth-first, one ring at a time: each ring is every node adjacent to
  // the ring before it that isn't already in the set, counted by how many
  // ties it has into that ring.
  let frontier = new Set([focusId]);
  for (let depth = 1; depth <= MAX_DEPTH; depth++) {
    const ties = new Map<string, number>();
    for (const e of visibleEdges) {
      if (frontier.has(e.source) && !rings.has(e.target)) ties.set(e.target, (ties.get(e.target) ?? 0) + 1);
      if (frontier.has(e.target) && !rings.has(e.source)) ties.set(e.source, (ties.get(e.source) ?? 0) + 1);
    }
    let ids = [...ties.keys()];
    if (depth === MAX_DEPTH && ids.length > MAX_OUTER) {
      ids = ids
        .sort((a, b) => (ties.get(b) ?? 0) - (ties.get(a) ?? 0) || a.localeCompare(b))
        .slice(0, MAX_OUTER);
    }
    for (const id of ids) rings.set(id, depth as 1 | 2 | 3);
    frontier = new Set(ids);
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
