// What art goes on a project's hexagon, decided once.
//
// A tile face is one of four things — an explicit icon, a mosaic of
// thread images, the hero image, or a lane-tinted glyph when the project
// has no art at all. That decision used to live inside `IconFace` in
// ProjectsBrowser, where it ran in the browser against whatever images
// the project happened to reference: up to nine full-resolution
// originals per tile, drawn into a hexagon 168px across.
//
// It now runs here, on the server, and `scripts/generate-hex-tiles.ts`
// reads the same plan at build time to composite each face into one
// small WebP (see `TileArt`). The browser gets a single request per
// hexagon instead of up to nine, and the plan survives only as the
// fallback for the handful of faces the compositor can't bake — remote
// refs it couldn't fetch, formats sharp won't decode.
//
// Pure: no `node:fs`, so both the client bundle and the build script can
// import it. The mean-colour table it reads is generated JSON.

import type { Lane, Node } from "@/lib/graph-types";
import type { HexSize } from "@/lib/hex-layout";
// Per-image mean colours, written by scripts/generate-image-placeholders.ts
// during prebuild. Used to tint the mosaic behind the thumbnail cells.
import imageColors from "../../public/_generated/image-colors.json";

const meanColorBySrc = imageColors as Record<string, string>;

const imageSrcPattern = /src:\s*["']([^"']+\.(?:avif|gif|heic|jpe?g|png|svg|webp))["']/gi;

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

// Honeycomb tile size per project, in multiples of the base hexagon.
// Anything not listed here is 1×; the packer (src/lib/hex-layout.ts)
// fits 0.5× through 4× tiles into the same lattice, and shrinks any tile
// too wide for the viewport. Big tiles cost void — a 4× hexagon blanks
// out a good chunk of comb around it — so spend 3× and 4× on the one or
// two projects that carry the page.
//
// It lives beside the face rather than beside the ordering because it is
// what decides how many pixels a face is baked at: see HEX_UNIT_W in
// scripts/generate-hex-tiles.ts.
const hexSizeById: Record<string, HexSize> = {
  // The only 3× on the page. It is four public checkpoints, a paper and a site
  // of its own, and its artwork — the connectome with the mark over it — is the
  // one image here that is actually worth a tile this size.
  "sc-wbd": 3,
  // Its sibling: the implicit brain model, the other half of the brain work.
  "ibm-1": 2,
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

export function projectHexSize(id: string): HexSize {
  return hexSizeById[id] ?? 1;
}

// Projects that were apps — things you installed or opened and used, the
// kind with a home-screen icon — wear an app icon's rounded square on the
// comb instead of a hexagon.
const appIconIds = new Set([
  "sale",
  "sqtest",
  "20q",
  "desparados-a-eye",
  "copyright-calculator",
  "labatron",
  "tiles",
  "space-pong",
  "bonk",
  "jterm",
  "microscope-viewer",
  "standup-ai",
  "ascii-art",
  "racksavant",
  "precisionbom",
  "yt2ctx",
  "dash",
  "mln-dashboard",
  // The OS simulations are apps in the dock's sense too.
  "macos-web-next",
  "browser-os",
  "windows-web-next",
]);

// Papers and libraries that read better as a plain square page.
const squareIds = new Set(["bsbr", "jnumpy", "tensor-computer", "tensacode"]);

export type TileShape = "hex" | "app" | "square";
export type SquareShape = Exclude<TileShape, "hex">;

export function projectTileShape(id: string): TileShape {
  return appIconIds.has(id) ? "app" : squareIds.has(id) ? "square" : "hex";
}

// The two square faces, as fractions of the cell's width W (the cell is the
// flat-top hexagon's box, W × W·√3/2). Each is the largest of its kind the
// hexagon holds, so the packing is unchanged and neither reaches into a
// neighbour's cell:
//   app    — side 0.72W, corner radius 0.158W; the corner arcs just touch
//            the hexagon's diagonals.
//   square — side 0.634W, corners barely softened; its sharp corners sit
//            on the diagonals, which is why it is smaller than the app icon.
export const SQUARE_GEOMETRY: Record<SquareShape, { side: number; radius: number }> = {
  app: { side: 0.72, radius: 0.158 },
  square: { side: 0.634, radius: 0.012 },
};
export const APP_ICON_SIDE = SQUARE_GEOMETRY.app.side;
export const APP_ICON_RADIUS = SQUARE_GEOMETRY.app.radius;
const CELL_H = Math.sqrt(3) / 2;
const pctOf = (v: number) => `${(v * 100).toFixed(2)}%`;
const squareClip = ({ side, radius }: { side: number; radius: number }) =>
  `inset(${pctOf((CELL_H - side) / 2 / CELL_H)} ${pctOf((1 - side) / 2)} round ${pctOf(
    radius,
  )} / ${pctOf(radius / CELL_H)})`;
/** Each square face as a clip-path on the cell — clips hit-testing too. */
export const SQUARE_CLIP: Record<SquareShape, string> = {
  app: squareClip(SQUARE_GEOMETRY.app),
  square: squareClip(SQUARE_GEOMETRY.square),
};

export type FaceImage = { src: string; alt: string };

/**
 * The art on a tile, described without reference to how it is drawn, so
 * the browser and the build-time compositor can each render it their own
 * way and land on the same picture.
 *
 * `fit` carries the CSS meaning: "cover" fills the hexagon's bounding
 * box, "contain" letterboxes the artwork inside it. A contained *hero*
 * additionally sits on a lane-tinted radial gradient and keeps a 16%
 * inset, so a wordmark is never cropped or flush to the diagonals.
 */
export type FacePlan =
  | { face: "icon"; image: FaceImage; fit: "cover" | "contain" }
  | { face: "mosaic"; images: FaceImage[]; cols: number; tint?: string }
  | { face: "hero"; image: FaceImage; fit: "cover" | "contain" }
  | { face: "glyph" };

/**
 * What gets painted behind a face whose art doesn't fill the hexagon —
 * a project with no art at all, or a logo letterboxed inside its box.
 * Both are lane-tinted radial gradients that resolve differently in each
 * theme, which is exactly why they can't be baked into the tile: the
 * compositor bakes those faces with alpha and this is drawn under them.
 */
export type TileGround = "glyph" | "letterbox";

export function faceGroundFor(plan: FacePlan): TileGround | undefined {
  if (plan.face === "glyph") return "glyph";
  if (plan.face === "hero" && plan.fit === "contain") return "letterbox";
  return undefined;
}

/**
 * A baked face: one image per hexagon, at the hexagon's own aspect ratio,
 * written by scripts/generate-hex-tiles.ts.
 *
 * Faces that sit on a theme-dependent backdrop (a contained logo, the
 * lane gradient behind it) are baked with alpha and keep that backdrop in
 * CSS — the tile is only the artwork, so both themes still work.
 */
export type TileArt = {
  src: string;
  /** Same face at twice the density, for `srcset`. */
  src2x: string;
  /** Intrinsic size of `src`, so the tile reserves its box before load. */
  w: number;
  h: number;
  /** Mean colour of the art, painted under it so the tile fills instantly. */
  tint?: string;
};

// Hand-tuned, hairline-stroke glyph per project. Walks tags in rough
// specificity order, falls back to lane, then to a generic wrench.
// Resolved here rather than in the browser so a tile ships one short
// string instead of its whole tag array.
export type IconKey =
  | "video"
  | "music"
  | "palette"
  | "gamepad"
  | "rocket"
  | "bot"
  | "flask"
  | "image"
  | "mic"
  | "brain"
  | "microscope"
  | "cap"
  | "sprout"
  | "code"
  | "wrench";

export function tileIconKey(project: { tags: string[]; lane: Lane; video?: string }): IconKey {
  const tags = new Set(project.tags.map((t) => t.toLowerCase()));
  const has = (...t: string[]) => t.some((x) => tags.has(x));
  if (project.video || has("video", "video-diffusion", "cinematic", "documentary")) return "video";
  if (has("music", "audio")) return "music";
  if (has("animation", "blender")) return "palette";
  if (has("game")) return "gamepad";
  if (has("rocketry")) return "rocket";
  if (has("robotics", "embodied-ai", "lunar-rover", "hardware", "lerobot")) return "bot";
  if (has("chemistry")) return "flask";
  if (has("graphics", "ui")) return "image";
  if (has("voice-ai")) return "mic";
  if (has("agents", "multi-agent")) return "brain";
  if (has("research", "ml", "deep-learning", "unsupervised-learning", "attention"))
    return "microscope";
  if (has("school", "hamlet", "spanish")) return "cap";
  if (has("community")) return "sprout";
  if (has("cli", "tooling", "python", "web", "infra", "framework", "meta")) return "code";
  if (project.lane === "research") return "microscope";
  if (project.lane === "personal") return "sprout";
  return "wrench";
}

/** Every image a node references: its hero first, then the body's, in order. */
export function imageRefsForNode(n: Node): FaceImage[] {
  const refs: FaceImage[] = [];
  if (n.hero?.src) refs.push({ src: n.hero.src, alt: n.hero.alt });

  for (const match of n.body.matchAll(imageSrcPattern)) {
    refs.push({ src: match[1], alt: n.title });
  }

  return refs;
}

function projectThreadImages(n: Node, cells: number): FaceImage[] {
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
function centerHero(images: FaceImage[], cols: number, hero?: string): FaceImage[] {
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
export function meanTint(images: { src: string }[]): string | undefined {
  const rgb = images
    .map((img) => meanColorBySrc[img.src])
    .filter((hex): hex is string => Boolean(hex))
    .map(parseHex)
    .filter((c): c is [number, number, number] => c !== null);
  if (rgb.length === 0) return undefined;

  const mean = [0, 1, 2].map((i) => Math.round(rgb.reduce((sum, c) => sum + c[i], 0) / rgb.length));
  return `#${mean.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// The tile face prefers an explicit `icon` over the mosaic, which is right
// when the icon is the whole story. The OS simulators aren't that: their story
// is the desktop running, so they fold the app icon into a full mosaic
// alongside screen recordings of it. Reading the icon back out of a completed
// mosaic is the signal that the mosaic — not the icon alone — is the face.
function iconIsAMosaicCell(n: Node, images: FaceImage[], cells: number): boolean {
  return images.length === cells && images.some((img) => img.src === n.icon?.src);
}

/**
 * What a project's hexagon shows. The order is the one `IconFace` used to
 * apply inline: explicit icon, then a mosaic of two or more thread
 * images, then the hero, then the lane glyph.
 */
export function projectFacePlan(n: Node): FacePlan {
  const cols = projectMosaicCols[n.id] ?? 2;
  const cells = cols * cols;
  const images = centerHero(projectThreadImages(n, cells), cols, n.hero?.src);

  if (n.icon && !iconIsAMosaicCell(n, images, cells)) {
    // Most explicit icons are logos and diagrams that should stay
    // intact; thumbnail-derived icons can opt into cover cropping.
    return {
      face: "icon",
      image: { src: n.icon.src, alt: n.icon.alt },
      fit: n.icon.fit === "cover" ? "cover" : "contain",
    };
  }

  if (images.length >= 2) {
    return { face: "mosaic", images, cols, tint: meanTint(images) };
  }

  if (n.hero) {
    return {
      face: "hero",
      image: { src: n.hero.src, alt: n.hero.alt },
      fit: n.hero.fit === "contain" ? "contain" : "cover",
    };
  }

  return { face: "glyph" };
}

/** Every image a plan draws, in the order it draws them. */
export function facePlanImages(plan: FacePlan): FaceImage[] {
  switch (plan.face) {
    case "icon":
    case "hero":
      return [plan.image];
    case "mosaic":
      return plan.images;
    case "glyph":
      return [];
  }
}
