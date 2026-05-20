// The merged graph: every Velite collection plus hand-curated edges.
// One source of truth; every view (constellation, timeline, document) is a
// projection of this. See docs/ARCHITECTURE.md.

import rawExperience from "../../.velite/experience.json";
import rawPapers from "../../.velite/papers.json";
import rawPosts from "../../.velite/posts.json";
import rawProjects from "../../.velite/projects.json";
import rawReadings from "../../.velite/readings.json";
import rawUpdates from "../../.velite/updates.json";
import rawSkills from "../../.velite/skills.json";
import rawFriends from "../../.velite/friends.json";
import rawEvents from "../../.velite/events.json";
import rawVisions from "../../.velite/visions.json";
import { manualEdges } from "@/data/edges";
import { ORBIT_OVERRIDES } from "@/data/orbit-overrides";
import { existsSync } from "node:fs";
import { join } from "node:path";

export * from "./graph-types";
import type {
  Edge,
  EventStatus,
  EventType,
  Graph,
  Lane,
  Node,
  NodeKind,
  ProjectStatus,
  ReadingStatus,
  ReadingWorkType,
  SkillLevel,
  UpdateEmbed,
  UpdateType,
} from "./graph-types";

const ORBIT_IMG_DIR = "public/img/orbiters";
const ORBIT_EXTS = ["png", "jpg", "jpeg", "webp", "svg"] as const;

function resolveOrbitFsAsset(id: string): string | undefined {
  for (const ext of ORBIT_EXTS) {
    const rel = `${ORBIT_IMG_DIR}/${id}.${ext}`;
    if (existsSync(join(process.cwd(), rel))) return `/img/orbiters/${id}.${ext}`;
  }
  return undefined;
}

const slugBase = (p: string) => p.split("/").pop() ?? p;

type RawCollectionItem = {
  slug: string;
  title: string;
  date: string;
  lane: Lane;
  summary: string;
  body: string;
  tags?: string[];
  endDate?: string;
  hero?: { src: string; alt: string };
  influences?: string[];
  realizes?: string[];
  critiques?: string[];
};

const asCollection = (items: unknown): RawCollectionItem[] => items as RawCollectionItem[];

const toNode =
  (kind: NodeKind) =>
  (raw: RawCollectionItem): Node => {
    const id = slugBase(raw.slug);
    const extra = raw as Record<string, unknown>;
    return {
      id,
      slug: raw.slug,
      kind,
      title: raw.title,
      date: raw.date,
      endDate: raw.endDate,
      lane: raw.lane,
      tags: raw.tags ?? [],
      summary: raw.summary,
      body: raw.body,
      hero: raw.hero,
      influences: raw.influences ?? [],
      realizes: raw.realizes ?? [],
      critiques: raw.critiques ?? [],
      status: kind === "project" ? (extra.status as ProjectStatus | undefined) : undefined,
      video: kind === "project" ? (extra.video as string | undefined) : undefined,
      links: extra.links as Node["links"],
      authors: extra.authors as string[] | undefined,
      venue: extra.venue as string | undefined,
      bibKey: extra.bibKey as string | undefined,
      pdf: extra.pdf as string | undefined,
      workType: extra.workType as ReadingWorkType | undefined,
      readingStatus: kind === "reading" ? (extra.status as ReadingStatus | undefined) : undefined,
      source: extra.source as string | undefined,
      url: extra.url as string | undefined,
      updateType: extra.updateType as UpdateType | undefined,
      embed: extra.embed as UpdateEmbed | undefined,
      category: extra.category as string | undefined,
      level: extra.level as SkillLevel | undefined,
      tools: extra.tools as string[] | undefined,
      evidence: extra.evidence as string[] | undefined,
      relation: extra.relation as string | undefined,
      eventType: extra.eventType as EventType | undefined,
      eventStatus: kind === "event" ? (extra.status as EventStatus | undefined) : undefined,
      role: extra.role as string | undefined,
      location: extra.location as string | undefined,
      sceneId: extra.sceneId as string | undefined,
      org: extra.org as string | undefined,
    };
  };

let cached: Graph | null = null;

export function getGraph(): Graph {
  if (cached) return cached;

  const nodes: Node[] = [
    ...asCollection(rawPosts).map(toNode("post")),
    ...asCollection(rawProjects).map(toNode("project")),
    ...asCollection(rawPapers).map(toNode("paper")),
    ...asCollection(rawReadings).map(toNode("reading")),
    ...asCollection(rawUpdates).map(toNode("update")),
    ...asCollection(rawSkills).map(toNode("skill")),
    ...asCollection(rawFriends).map(toNode("friend")),
    ...asCollection(rawEvents).map(toNode("event")),
    ...asCollection(rawVisions).map(toNode("vision")),
    ...asCollection(rawExperience).map(toNode("experience")),
  ];

  const byId = new Map<string, Node>();
  for (const n of nodes) {
    if (byId.has(n.id)) {
      throw new Error(
        `Duplicate node id "${n.id}" — slugs must be unique across all content folders.`,
      );
    }
    // Manifest override > filesystem asset > nothing. Embeds are
    // manifest-only since they involve trusting an external URL.
    const override = ORBIT_OVERRIDES[n.id];
    n.orbitAsset = override?.asset ?? resolveOrbitFsAsset(n.id);
    n.orbitEmbed = override?.embed;
    byId.set(n.id, n);
  }

  // Derive edges from frontmatter, then merge manualEdges. Dedupe by
  // (source, target, kind). Frontmatter wins on first-seen.
  const edgeMap = new Map<string, Edge>();
  const addEdge = (e: Edge) => {
    const key = `${e.source}->${e.target}:${e.kind}`;
    if (!edgeMap.has(key)) edgeMap.set(key, e);
  };

  for (const n of nodes) {
    for (const t of n.influences) addEdge({ source: n.id, target: t, kind: "influence" });
    for (const t of n.realizes) addEdge({ source: n.id, target: t, kind: "realization" });
    for (const t of n.critiques) addEdge({ source: n.id, target: t, kind: "critique" });
  }
  for (const e of manualEdges) addEdge(e);

  const edges = Array.from(edgeMap.values());

  // Edges may reference nodes that don't exist yet (work in progress).
  // Phase 1 logs a warning rather than throwing — strict validation moves to
  // Phase 3 once the graph view depends on edge integrity.
  if (process.env.NODE_ENV !== "production") {
    for (const e of edges) {
      if (!byId.has(e.source) || !byId.has(e.target)) {
        console.warn(
          `[graph] edge references missing node: ${e.source} -> ${e.target} (${e.kind})`,
        );
      }
    }
  }

  const adjacency = new Map<string, Edge[]>();
  for (const e of edges) {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source)!.push(e);
    adjacency.get(e.target)!.push(e);
  }

  cached = {
    nodes,
    edges,
    byId,
    neighbors: (id) => adjacency.get(id) ?? [],
  };
  return cached;
}

export function getLatestUpdate(nodes = getGraph().nodes): Node | null {
  return (
    nodes.filter((n) => n.kind === "update").sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null
  );
}
