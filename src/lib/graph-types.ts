// Pure types + helpers that are safe to import from anywhere, including
// "use client" components. The runtime graph builder lives in graph.ts
// and pulls in node:fs/node:path; importing graph.ts from a client
// component would leak those node-only modules into the browser bundle
// and fail the webpack build. Clients import from here instead.

import type { ManualEdge } from "../../velite.config";

export type NodeKind =
  | "post"
  | "project"
  | "paper"
  | "reading"
  | "update"
  | "skill"
  | "friend"
  | "event"
  | "vision";

export type Lane = "research" | "building" | "writing" | "personal";

export type EdgeKind = ManualEdge["kind"];
export type Edge = ManualEdge;

export type ReadingStatus = "queued" | "reading" | "finished" | "paused" | "reference";
export type ReadingWorkType = "book" | "paper" | "article" | "course" | "other";
export type ReadingTier = "S" | "A" | "B" | "C" | "D" | "F";
export type UpdateType = "note" | "x-post" | "link" | "embed";
export type SkillLevel = "working" | "strong" | "expert";
export type EventType =
  | "conference"
  | "meetup"
  | "talk"
  | "workshop"
  | "hackathon"
  | "travel"
  | "launch"
  | "other";
export type EventStatus = "upcoming" | "attended" | "presented" | "hosted" | "cancelled";
export type UpdateEmbed = {
  kind: "x" | "url" | "html";
  url?: string;
  urls?: string[];
  html?: string;
  alt?: string;
};

export type Node = {
  id: string;
  slug: string;
  kind: NodeKind;
  title: string;
  date: string;
  endDate?: string;
  lane: Lane;
  tags: string[];
  summary: string;
  unlisted: boolean;
  // Redirect: when set, this node has no page of its own — its route
  // sends the reader on. Either the id of another node here (an alias:
  // a second URL for something that already has a page) or an absolute
  // http(s) URL (a link-out: the piece itself lives somewhere else).
  redirect?: string;
  body: string;
  hero?: { src: string; alt: string; fit?: "cover" | "contain" };
  influences: string[];
  realizes: string[];
  critiques: string[];

  // kind-specific (all optional on the union)
  // Resume-only override for `summary` + precision of `date`. See resume-data.
  resumeDescription?: string;
  datePrecision?: "year" | "season" | "month" | "day";
  // Optional demo video URL (project kind). YouTube/Vimeo/embeddable
  // page. Rendered in Hero as a 16:9 iframe when present.
  video?: string;
  pdf?: string;
  icon?: { src: string; alt: string; fit?: "cover" | "contain" };
  threadImages?: { src: string; alt?: string }[];
  links?: Record<string, string | undefined>;
  authors?: string[];
  venue?: string;
  bibKey?: string;
  workType?: ReadingWorkType;
  tier?: ReadingTier;
  readingStatus?: ReadingStatus;
  source?: string;
  url?: string;
  updateType?: UpdateType;
  embed?: UpdateEmbed;
  category?: string;
  level?: SkillLevel;
  tools?: string[];
  evidence?: string[];
  relation?: string;
  eventType?: EventType;
  eventStatus?: EventStatus;
  role?: string;
  location?: string;
  sceneId?: string;

  // Decorative — set server-side by getGraph() from the orbit-overrides
  // manifest + a filesystem check in public/img/orbiters/.
  orbitAsset?: string;
  orbitEmbed?: string;
};

export type Graph = {
  nodes: Node[];
  edges: Edge[];
  byId: Map<string, Node>;
  neighbors: (id: string) => Edge[];
};

// URL prefix per kind. Every node lives at /{prefix}/{id}; the [kind]/[slug]
// route validates the prefix matches the node's actual kind (else 404),
// so a stray /posts/some-project URL doesn't render the project page.
export const KIND_PREFIX: Record<NodeKind, string> = {
  post: "posts",
  project: "projects",
  paper: "papers",
  reading: "readings",
  update: "updates",
  skill: "skills",
  friend: "friends",
  event: "events",
  vision: "visions",
};

export const KIND_FROM_PREFIX: Record<string, NodeKind> = Object.fromEntries(
  Object.entries(KIND_PREFIX).map(([kind, prefix]) => [prefix, kind as NodeKind]),
);

export function nodeHref(node: { kind: NodeKind; id: string }): string {
  return `/${KIND_PREFIX[node.kind]}/${node.id}`;
}

/**
 * Where a paper or reading actually lives.
 *
 * Neither kind has a page of its own here: the artifact *is* the PDF or
 * the publisher's page, and a stub that reprints the abstract only puts
 * a click between the reader and the thing. So every surface that lists
 * one — the home cover rails, `/papers`, `/readings`, the feed — links
 * straight at the source, and `/{papers,readings}/{id}` bounces there
 * too so old links and graph edges still land somewhere real.
 *
 * `undefined` when a node carries no source at all (a note that only
 * ever existed here); those keep their own page.
 */
export function nodeSourceHref(node: {
  kind: NodeKind;
  pdf?: string;
  url?: string;
  redirect?: string;
}): string | undefined {
  if (node.kind !== "paper" && node.kind !== "reading") return undefined;
  if (node.pdf) return node.pdf;
  if (node.url) return node.url;
  return isExternalRedirect(node.redirect) ? node.redirect : undefined;
}

/** The href a link to `node` should use: its source if it has one, else its page. */
export function nodeLinkHref(node: {
  kind: NodeKind;
  id: string;
  pdf?: string;
  url?: string;
  redirect?: string;
}): string {
  return nodeSourceHref(node) ?? nodeHref(node);
}

/**
 * True when `redirect` points off-site rather than at another node here.
 * The two cases behave differently everywhere they are handled, so the
 * test lives in one place: `/^https?:\/\//`.
 */
export function isExternalRedirect(redirect?: string): boolean {
  return !!redirect && /^https?:\/\//i.test(redirect);
}

export function isListedNode(node: { unlisted?: boolean; redirect?: string }): boolean {
  if (node.unlisted) return false;
  // An internal alias is a second URL for something that already has a
  // card — listing it would list the same thing twice. An external
  // redirect is the opposite: the node is this site's only record of a
  // piece published elsewhere, so it stays listed and its card links out.
  return !node.redirect || isExternalRedirect(node.redirect);
}
