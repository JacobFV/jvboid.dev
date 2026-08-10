import { getGraph, isListedNode, nodeLinkHref } from "@/lib/graph";

const BASE = "https://jacobfv.com";

// Papers and readings link at their source, which is often already an
// absolute URL; everything else is a path on this site.
const absolute = (href: string) => (/^https?:/i.test(href) ? href : `${BASE}${href}`);

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const rfc822 = (iso: string) => new Date(iso).toUTCString();

// Static RSS 2.0 feed of every writing-adjacent node, newest first.
// Projects and visions get announced through posts when they're worth announcing.
export function GET() {
  const { nodes } = getGraph();
  const items = nodes
    .filter((n) => n.kind === "post" || n.kind === "paper" || n.kind === "reading")
    .filter(isListedNode)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 50);

  const itemsXml = items
    .map((n) => {
      const link = escape(absolute(nodeLinkHref(n)));
      return `
    <item>
      <title>${escape(n.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(n.date)}</pubDate>
      <description>${escape(n.summary)}</description>
      ${n.tags.map((t) => `<category>${escape(t)}</category>`).join("")}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jacob Valdez</title>
    <link>${BASE}/</link>
    <description>Posts, papers, and readings from jacobfv.com.</description>
    <language>en</language>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${rfc822(new Date().toISOString())}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
