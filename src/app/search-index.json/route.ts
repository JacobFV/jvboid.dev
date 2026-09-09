import { getGraph, isListedNode } from "@/lib/graph";

// The ⌘K search index, as a static file rather than a prop.
//
// It is ~55 kB of titles, summaries and tags for every listed node, and
// it used to be serialized into the flight payload of *every page* by
// the root layout — paid for on the first byte of the home page, and
// again on every article, so that a palette most readers never open
// would have something to search. Nothing else needs it.
//
// So it lives here instead: prerendered once at build time, fetched by
// `CmdK` the first time the palette is opened, and cached by the browser
// from then on. The breadcrumb, which is the only other thing that
// wanted node data in the layout, gets a titles-only map instead.
export const dynamic = "force-static";

export function GET() {
  const nodes = getGraph()
    .nodes.filter(isListedNode)
    .map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary,
      tags: n.tags,
      lane: n.lane,
      kind: n.kind,
      date: n.date,
    }));

  return Response.json(nodes, {
    headers: {
      // Content-addressed by build, not by URL, so revalidate on navigation
      // but let a warm tab reuse it for the session.
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
