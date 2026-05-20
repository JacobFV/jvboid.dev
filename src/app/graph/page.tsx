import { Hypersphere } from "@/components/graph/Hypersphere";
import { getGraph } from "@/lib/graph";

export const metadata = {
  title: "Constellation · Jacob Valdez",
  description:
    "A slow-rotating sphere of every node — projects, posts, papers, readings, updates, skills, friends, events, visions. Drag to rotate, scroll to zoom, tap a node to read.",
};

export default function GraphPage() {
  const { nodes, edges } = getGraph();
  const nodesLite = nodes.map(({ body, ...rest }) => rest);

  return <Hypersphere nodes={nodesLite as never} edges={edges} />;
}
