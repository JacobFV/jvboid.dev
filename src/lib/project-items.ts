import type { Node } from "@/lib/graph-types";
import type { HexSize } from "@/lib/hex-layout";
import type { ProjectItem } from "@/components/chrome/ProjectsBrowser";
// Per-image mean colours, written by scripts/generate-image-placeholders.ts
// during prebuild. Used to tint the mosaic behind the thumbnail cells.
import imageColors from "../../public/_generated/image-colors.json";

const imageSrcPattern = /src:\s*["']([^"']+\.(?:avif|gif|heic|jpe?g|png|svg|webp))["']/gi;

const meanColorBySrc = imageColors as Record<string, string>;

const initialProjectAdjacency = [
  ["phys-0", "chem-0"],
  ["windows-web-next", "macos-web-next"],
] as const;

const featuredProjectOrder = [
  "sc-wbd",
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

// Honeycomb tile size per project, in multiples of the base hexagon.
// Anything not listed here is 1×; the packer (src/lib/hex-layout.ts)
// fits 0.5× through 4× tiles into the same lattice, and shrinks any tile
// too wide for the viewport. Big tiles cost void — a 4× hexagon blanks
// out a good chunk of comb around it — so spend 3× and 4× on the one or
// two projects that carry the page.
const projectHexSize: Record<string, HexSize> = {
  // The only 3× on the page. It is four public checkpoints, a paper and a site
  // of its own, and its artwork — the connectome with the mark over it — is the
  // one image here that is actually worth a tile this size.
  "sc-wbd": 3,
  "cookie-baker-3d-printer": 2,
  "chem-0": 2,
  "canvas-engineering": 2,
  "space-pong": 2,
  sale: 2,
  synthux: 2,
  "looking-for-princess-suzzane": 2,
  limboid: 2,
  "node-tree": 0.5,
  "summer-break-2021-album": 0.5,
  "the-fertile-crescent": 0.5,
  "the-multi-agent-network": 0.5,
  "multigraph-nn": 0.5,
  "ai-proverbs": 0.5,
  "eggroll-trainer": 0.5,
  tiles: 0.5,
  "standup-ai": 0.5,
  "microscope-viewer": 0.5,
  "esp32-usb-webcam": 0.5,
  "eeg-acquisition-chain": 0.5,
  imgpt: 0.5,
  "full-stack-artificial-intelligence": 0.5,
  theagentsuite: 0.5,
  "notion-vibestartup": 0.5,
  "belief-graph-orchestrator": 0.5,
  "halo-prismatic": 0.5,
};

// Thumbnail mosaic density, in cells across the app-icon face. Default
// is a 2×2 quad; 3 gives a nine-up contact sheet, which only reads well
// on projects with a deep photo set and a tile big enough to show it.
// Any cell the project can't fill stays empty and shows the mosaic tint
// (the mean colour of the images it does have).
const projectMosaicCols: Record<string, number> = {
  "canvas-engineering": 3,
  "chem-0": 3,
  "lunar-rover": 3,
  limboid: 3,
  // The Cookie Baker gantry has exactly one surviving photograph, so a
  // mosaic of it would be a mosaic of one thing. 1 falls through to the
  // plain hero face.
  "cookie-baker-3d-printer": 1,
};

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

function projectThreadImages(n: Node, cells: number): { src: string; alt: string }[] {
  const curated =
    n.threadImages?.map((img) => ({
      src: img.src,
      alt: img.alt ?? n.title,
    })) ?? [];
  // A curated list is a deliberate choice of the four best frames, so it
  // normally wins outright. A nine-up needs more than four, though, so
  // there the body's images top up the tail behind the curated ones.
  const refs =
    curated.length === 0
      ? imageRefsForNode(n)
      : cells > 4
        ? [...curated, ...imageRefsForNode(n)]
        : curated;

  const seen = new Set<string>();
  return refs
    .filter((img) => {
      if (seen.has(img.src)) return false;
      seen.add(img.src);
      return true;
    })
    .slice(0, cells);
}

// An odd mosaic has a true middle cell, and a full one has no holes to
// shuffle around, so the hero takes the centre and everything else keeps
// its reading order around it. Partly-filled mosaics are left alone —
// centring there would strand the hero behind a row of empty cells.
function centerHero<T extends { src: string }>(images: T[], cols: number, hero?: string): T[] {
  const cells = cols * cols;
  if (cols % 2 === 0 || images.length !== cells || !hero) return images;

  const from = images.findIndex((img) => img.src === hero);
  const to = (cells - 1) / 2;
  if (from === -1 || from === to) return images;

  const reordered = [...images];
  const [picked] = reordered.splice(from, 1);
  reordered.splice(to, 0, picked);
  return reordered;
}

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

// Mean of the mean colours of the images actually in the mosaic, so the
// empty cells and seams read as a neutral extension of the artwork
// rather than a hole in it.
function mosaicTint(images: { src: string }[]): string | undefined {
  const rgb = images
    .map((img) => meanColorBySrc[img.src])
    .filter((hex): hex is string => Boolean(hex))
    .map(parseHex)
    .filter((c): c is [number, number, number] => c !== null);
  if (rgb.length === 0) return undefined;

  const mean = [0, 1, 2].map((i) =>
    Math.round(rgb.reduce((sum, c) => sum + c[i], 0) / rgb.length),
  );
  return `#${mean.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
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

// The tile face prefers an explicit `icon` over the mosaic, which is right
// when the icon is the whole story. The OS simulators aren't that: their story
// is the desktop running, so they fold the app icon into a full mosaic
// alongside screen recordings of it. Reading the icon back out of a completed
// mosaic is the signal that the mosaic — not the icon alone — is the face.
function iconIsAMosaicCell(n: Node, images: { src: string }[], cells: number): boolean {
  return images.length === cells && images.some((img) => img.src === n.icon?.src);
}

export function projectItemsFromNodes(projects: Node[]): ProjectItem[] {
  return projects.map((n) => {
    const cols = projectMosaicCols[n.id] ?? 2;
    const cells = cols * cols;
    const threadImages = centerHero(projectThreadImages(n, cells), cols, n.hero?.src);
    return {
      id: n.id,
      kind: "project" as const,
      title: n.title,
      summary: n.summary,
      date: n.date,
      lane: n.lane,
      tags: n.tags,
      hero: n.hero,
      icon: iconIsAMosaicCell(n, threadImages, cells) ? undefined : n.icon,
      video: n.video,
      threadImages,
      mosaic: { cols, tint: mosaicTint(threadImages) },
      orbitEmbed: n.orbitEmbed,
      links: n.links,
      size: projectHexSize[n.id] ?? 1,
    };
  });
}
