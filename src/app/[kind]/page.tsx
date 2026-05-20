import { notFound, redirect } from "next/navigation";
import { getGraph, KIND_FROM_PREFIX, nodeHref } from "@/lib/graph";

// Level-1 dynamic route shared with /[kind]/[slug]. Two jobs:
//
//   1. Legacy compat — old URLs were flat (/computatrum, /limboid, …).
//      Anything that matches a known node id 308-redirects to the new
//      canonical /{kind-plural}/{slug} home.
//   2. 404 for bare kind indexes — we don't have kind-index pages, so a
//      direct hit on /projects or /posts should 404 (not render
//      something weird).
//
// Static routes (/graph, /list, /loop, /now, /resume, /t, /updates,
// /events, /introduction, /focus-statement, /feed.xml) take precedence
// over this dynamic route, so they keep working.
//
// Naming note: the param is called `kind` to satisfy Next.js's
// "same dynamic name at the same level" rule — /[kind]/[slug] already
// owns the name. The actual value here can be a kind prefix OR a legacy
// slug; we disambiguate in the handler.

type Params = Promise<{ kind: string }>;

export function generateStaticParams() {
  return getGraph().nodes.map((n) => ({ kind: n.id }));
}

export default async function LegacySlugOrKindIndex({ params }: { params: Params }) {
  const { kind } = await params;

  // A known kind prefix (/projects, /posts, …): no index page exists.
  if (KIND_FROM_PREFIX[kind]) notFound();

  // Otherwise treat the segment as a legacy node id.
  const node = getGraph().byId.get(kind);
  if (!node) notFound();
  redirect(nodeHref(node));
}
