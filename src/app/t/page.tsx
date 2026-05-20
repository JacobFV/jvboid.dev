import { Timeline } from "@/components/graph/Timeline";
import { getGraph } from "@/lib/graph";

export const metadata = {
  title: "Timeline · Jacob Valdez",
};

export default function TimelinePage() {
  const { nodes, edges } = getGraph();
  const nodesLite = nodes.map(({ body, ...rest }) => rest);

  return <Timeline nodes={nodesLite as never} edges={edges} />;
}
