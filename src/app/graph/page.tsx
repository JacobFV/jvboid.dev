import { Hypersphere } from "@/components/graph/Hypersphere";
import { getGraph, isListedNode } from "@/lib/graph";

export const metadata = {
  title: "Constellation · Jacob Valdez",
  description:
    "A slow-rotating sphere of every node — projects, posts, papers, readings, updates, skills, friends, events, visions. Drag to rotate, scroll to zoom, tap a node to read.",
};

export default function GraphPage() {
  const { nodes, edges } = getGraph();
  const listedIds = new Set(nodes.filter(isListedNode).map((n) => n.id));
  const nodesLite = nodes.filter(isListedNode).map(({ body, ...rest }) => rest);
  const listedEdges = edges.filter((e) => listedIds.has(e.source) && listedIds.has(e.target));

  return <Hypersphere nodes={nodesLite as never} edges={listedEdges} />;
}
