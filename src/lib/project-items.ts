import type { Node } from "@/lib/graph-types";
import type { ProjectItem } from "@/components/chrome/ProjectsBrowser";
import {
  faceGroundFor,
  facePlanImages,
  imageRefsForNode,
  projectFacePlan,
  projectHexSize,
  projectTileShape,
  tileIconKey,
  type FacePlan,
  type TileArt,
} from "@/lib/project-face";
// Baked hexagon faces, written by scripts/generate-hex-tiles.ts after
// velite. One small WebP per project, at the size its tile renders — see
// the header of that script for why the compositing left the browser.
import hexTiles from "../../public/_generated/hex-tiles.json";

const tileArtById = hexTiles as Record<string, TileArt>;

const initialProjectAdjacency = [
  ["ibm-1", "sc-wbd"],
  ["phys-0", "chem-0"],
  ["windows-web-next", "macos-web-next"],
] as const;

const featuredProjectOrder = [
  "ibm-1",
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

// How many slides the list view fans out behind a hexagon, at most.
const DECK_MAX = 5;
const DECK_IMAGE = /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i;

const youtubeId = (url: string) =>
  /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/.exec(url)?.[1];

// The list view's deck: the project's other media, as slides stacked
// behind its hexagon. Pictures the face doesn't show come first, then the
// demo video's poster, then the face's own art — a mosaic cell or a lone
// hero is a crop on the hexagon, and a slide shows the whole frame. Most
// projects have one picture or none, so their decks run short and the
// browser pads them out with blank slides.
function deckFor(n: Node, plan: FacePlan): string[] {
  const onFace = new Set(facePlanImages(plan).map((img) => img.src));
  const seen = new Set<string>();
  const srcs = [...(n.threadImages ?? []), ...imageRefsForNode(n)]
    .map((img) => img.src)
    .filter((src) => {
      if (seen.has(src) || !DECK_IMAGE.test(src)) return false;
      seen.add(src);
      return true;
    });
  const video = n.video ? youtubeId(n.video) : undefined;
  return [
    ...srcs.filter((s) => !onFace.has(s)),
    ...(video ? [`https://i.ytimg.com/vi/${video}/hqdefault.jpg`] : []),
    ...srcs.filter((s) => onFace.has(s)),
  ].slice(0, DECK_MAX);
}

/**
 * The client-side shape of a project tile. Everything the honeycomb draws
 * is resolved here, on the server: the face art (down to one baked image
 * where the compositor could produce it), the caption glyph, the tile
 * size. What crosses to the browser is the finished tile, not the
 * project — which is what keeps the flight payload for 72 projects in the
 * low tens of kilobytes instead of the high fifties.
 *
 * `summaries` is the one thing the two call sites disagree about: the
 * honeycomb never shows a summary or a deck, and the home page has no
 * list view to switch to, so it leaves both behind. `/projects` does have
 * one and asks for them.
 */
export function projectItemsFromNodes(
  projects: Node[],
  { summaries = true }: { summaries?: boolean } = {},
): ProjectItem[] {
  return projects.map((n) => {
    const plan = projectFacePlan(n);
    const baked = tileArtById[n.id];
    return {
      id: n.id,
      kind: "project" as const,
      title: n.title,
      date: n.date,
      lane: n.lane,
      ...(summaries ? { summary: n.summary, deck: deckFor(n, plan) } : {}),
      glyph: tileIconKey(n),
      ...(faceGroundFor(plan) ? { ground: faceGroundFor(plan) } : {}),
      // The plan only crosses to the browser when there is no baked tile
      // to draw instead — otherwise it is a list of source URLs nothing
      // will ever request, and there are 72 of them.
      ...(baked
        ? { tile: { src: baked.src, src2x: baked.src2x, w: baked.w, h: baked.h, tint: baked.tint } }
        : { face: plan }),
      size: projectHexSize(n.id),
      ...(() => {
        const shape = projectTileShape(n.id);
        return shape === "hex" ? {} : { shape };
      })(),
    };
  });
}
