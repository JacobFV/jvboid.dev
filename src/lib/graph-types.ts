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
  | "vision"
  | "experience";

export type Lane = "research" | "building" | "writing" | "personal";

export type EdgeKind = ManualEdge["kind"];
export type Edge = ManualEdge;

export type ProjectStatus = "idea" | "active" | "shipped" | "shelved";
export type ReadingStatus = "queued" | "reading" | "finished" | "paused" | "reference";
export type ReadingWorkType = "book" | "paper" | "article" | "course" | "other";
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
  body: string;
  hero?: { src: string; alt: string };
  influences: string[];
  realizes: string[];
  critiques: string[];

  // kind-specific (all optional on the union)
  status?: ProjectStatus;
  // Optional demo video URL (project kind). YouTube/Vimeo/embeddable
  // page. Rendered in Hero as a 16:9 iframe when present.
  video?: string;
  links?: Record<string, string | undefined>;
  authors?: string[];
  venue?: string;
  bibKey?: string;
  pdf?: string;
  workType?: ReadingWorkType;
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
  org?: string;

  // Decorative — set server-side by getGraph() from the orbit-overrides
  // manifest + a filesystem check in public/img/orbiters/. Consumed by
  // the home hero OrbitDecor; ignored elsewhere.
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
  experience: "experiences",
};

export const KIND_FROM_PREFIX: Record<string, NodeKind> = Object.fromEntries(
  Object.entries(KIND_PREFIX).map(([kind, prefix]) => [prefix, kind as NodeKind]),
);

export function nodeHref(node: { kind: NodeKind; id: string }): string {
  return `/${KIND_PREFIX[node.kind]}/${node.id}`;
}
