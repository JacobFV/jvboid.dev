import type { MetadataRoute } from "next";
import { getGraph, isListedNode, KIND_PREFIX, nodeHref } from "@/lib/graph";

const BASE = "https://jacobfv.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const { nodes } = getGraph();

  const staticRoutes = [
    // `/updates` is delisted along with the update nodes themselves: the
    // archive stays reachable by URL, but it is not advertised here.
    ...Object.values(KIND_PREFIX)
      .filter((prefix) => prefix !== KIND_PREFIX.update)
      .map((prefix) => ({
        url: `${BASE}/${prefix}`,
        priority: prefix === "projects" || prefix === "posts" ? 0.8 : 0.6,
        changeFrequency: "weekly" as const,
      })),
    // `/t` (timeline) is unlisted for now: no nav entry, no command-menu
    // action, noindex on the route itself. It stays reachable by URL.
    { url: `${BASE}/resume`, priority: 0.5, changeFrequency: "monthly" as const },
  ];

  // `isListedNode` keeps external link-outs in the site's own listings —
  // they are the only record here of a piece published elsewhere. A
  // sitemap is a different promise, though: every URL in it should serve
  // a page, not bounce. So redirects of either sort stay out.
  const nodeRoutes = nodes
    .filter((n) => isListedNode(n) && !n.redirect)
    .map((n) => ({
      url: `${BASE}${nodeHref(n)}`,
      lastModified: n.endDate ?? n.date,
      priority: 0.6,
      changeFrequency: "yearly" as const,
    }));

  return [...staticRoutes, ...nodeRoutes];
}
