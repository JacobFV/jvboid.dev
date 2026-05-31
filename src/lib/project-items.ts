import type { Node } from "@/lib/graph-types";
import type { ProjectItem } from "@/components/chrome/ProjectsBrowser";

const imageSrcPattern = /src:\s*["']([^"']+\.(?:avif|gif|heic|jpe?g|png|svg|webp))["']/gi;

const initialProjectAdjacency = [
  ["phys-0", "chem-0"],
  ["windows-web-next", "macos-web-next"],
] as const;

const featuredProjectOrder = [
  "chem-0",
  "trash-sorter",
  "lunar-rover",
  "limboid",
  "cookie-baker-3d-printer",
  "cookie-cutter-cnc",
  "home-internet-factory",
  "workplace-surveillance-system",
  "canvas-engineering",
  "recursive-omnimodal-video-action-model",
  "tensor-computer",
  "brain-model",
  "windows-web-next",
  "macos-web-next",
  "browser-os",
  "yt2ctx",
  "jnumpy",
  "bsbr",
  "bonk",
  "ai-proverbs",
  "imgpt",
  "desparados-a-eye",
  "20q",
  "space-pong",
  "sqtest",
  "sale",
  "labatron",
] as const;

const featuredProjectRank = new Map<string, number>(
  featuredProjectOrder.map((id, index) => [id, index]),
);

function byDateDesc(a: Node, b: Node) {
  return a.date < b.date ? 1 : -1;
}

export function byProjectRank(a: Node, b: Node) {
  const featuredA = featuredProjectRank.get(a.id);
  const featuredB = featuredProjectRank.get(b.id);
  if (featuredA !== undefined || featuredB !== undefined) {
    return (featuredA ?? Number.POSITIVE_INFINITY) - (featuredB ?? Number.POSITIVE_INFINITY);
  }

  return byDateDesc(a, b);
}

function imageRefsForNode(n: Node): { src: string; alt: string }[] {
  const refs: { src: string; alt: string }[] = [];
  if (n.hero?.src) refs.push({ src: n.hero.src, alt: n.hero.alt });

  for (const match of n.body.matchAll(imageSrcPattern)) {
    refs.push({ src: match[1], alt: n.title });
  }

  return refs;
}

function projectThreadImages(n: Node): { src: string; alt: string }[] {
  const curated =
    n.threadImages?.map((img) => ({
      src: img.src,
      alt: img.alt ?? n.title,
    })) ?? [];
  const refs = curated.length > 0 ? curated : imageRefsForNode(n);

  const seen = new Set<string>();
  return refs
    .filter((img) => {
      if (seen.has(img.src)) return false;
      seen.add(img.src);
      return true;
    })
    .slice(0, 4);
}

export function withAdjacentProjects(projects: Node[]): Node[] {
  const ordered = [...projects];

  for (const [leftId, rightId] of initialProjectAdjacency) {
    const leftIndex = ordered.findIndex((p) => p.id === leftId);
    const rightIndex = ordered.findIndex((p) => p.id === rightId);
    if (leftIndex === -1 || rightIndex === -1 || rightIndex === leftIndex + 1) continue;

    const [right] = ordered.splice(rightIndex, 1);
    const nextLeftIndex = ordered.findIndex((p) => p.id === leftId);
    ordered.splice(nextLeftIndex + 1, 0, right);
  }

  return ordered;
}

export function projectItemsFromNodes(projects: Node[]): ProjectItem[] {
  return projects.map((n) => ({
    id: n.id,
    kind: "project",
    title: n.title,
    summary: n.summary,
    body: n.body,
    date: n.date,
    lane: n.lane,
    tags: n.tags,
    hero: n.hero,
    icon: n.icon,
    video: n.video,
    threadImages: projectThreadImages(n),
    orbitEmbed: n.orbitEmbed,
    links: n.links,
    quickView: Boolean(n.body),
  }));
}
