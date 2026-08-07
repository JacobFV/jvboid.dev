import { Timeline } from "@/components/graph/Timeline";
import { getGraph, isListedNode } from "@/lib/graph";

// Unlisted for now: reachable by URL, but kept out of the nav, the
// command menu, the sitemap, and search indexes.
export const metadata = {
  title: "Timeline · Jacob Valdez",
  robots: { index: false, follow: false },
};

export default function TimelinePage() {
  const { nodes, edges } = getGraph();
  const listedIds = new Set(nodes.filter(isListedNode).map((n) => n.id));
  const nodesLite = nodes.filter(isListedNode).map(({ body, ...rest }) => rest);
  const listedEdges = edges.filter((e) => listedIds.has(e.source) && listedIds.has(e.target));

  return <Timeline nodes={nodesLite as never} edges={listedEdges} />;
}
