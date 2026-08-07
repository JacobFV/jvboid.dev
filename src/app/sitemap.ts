import type { MetadataRoute } from "next";
import { getGraph, isListedNode, KIND_PREFIX, nodeHref } from "@/lib/graph";

const BASE = "https://jacobfv.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const { nodes } = getGraph();

  const staticRoutes = [
    ...Object.values(KIND_PREFIX).map((prefix) => ({
      url: `${BASE}/${prefix}`,
      priority: prefix === "projects" || prefix === "posts" ? 0.8 : 0.6,
      changeFrequency: "weekly" as const,
    })),
    // `/t` (timeline) is unlisted for now: no nav entry, no command-menu
    // action, noindex on the route itself. It stays reachable by URL.
    { url: `${BASE}/resume`, priority: 0.5, changeFrequency: "monthly" as const },
  ];

  const nodeRoutes = nodes.filter(isListedNode).map((n) => ({
    url: `${BASE}${nodeHref(n)}`,
    lastModified: n.endDate ?? n.date,
    priority: 0.6,
    changeFrequency: "yearly" as const,
  }));

  return [...staticRoutes, ...nodeRoutes];
}
