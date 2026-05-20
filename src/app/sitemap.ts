import type { MetadataRoute } from "next";
import { getGraph, nodeHref } from "@/lib/graph";
import chapters from "../../.velite/loop.json";

const BASE = "https://jacobfv.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const { nodes } = getGraph();

  const staticRoutes = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: "weekly" as const },
    { url: `${BASE}/t`, priority: 0.7, changeFrequency: "weekly" as const },
    { url: `${BASE}/list`, priority: 0.5, changeFrequency: "weekly" as const },
    { url: `${BASE}/loop`, priority: 0.7, changeFrequency: "monthly" as const },
    { url: `${BASE}/updates`, priority: 0.6, changeFrequency: "weekly" as const },
    { url: `${BASE}/events`, priority: 0.6, changeFrequency: "weekly" as const },
    { url: `${BASE}/resume`, priority: 0.5, changeFrequency: "monthly" as const },
  ];

  const nodeRoutes = nodes.map((n) => ({
    url: `${BASE}${nodeHref(n)}`,
    lastModified: n.endDate ?? n.date,
    priority: 0.6,
    changeFrequency: "yearly" as const,
  }));

  const chapterRoutes = chapters.map((c) => ({
    url: `${BASE}/loop/${c.slug.replace(/^loop\//, "").replace(/\.mdx?$/, "")}`,
    priority: 0.6,
    changeFrequency: "monthly" as const,
  }));

  return [...staticRoutes, ...nodeRoutes, ...chapterRoutes];
}
