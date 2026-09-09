// Bake the home page's artwork — every project's hexagon face, every
// paper and reading cover — into small WebPs at the size each one
// actually renders.
//
// The honeycomb draws ~72 tiles, none of them wider than 168 CSS px, and
// until this script existed each one was assembled in the browser out of
// the project's *original* artwork: an explicit icon, or a two- to
// nine-cell mosaic of thread images, or the hero. That came to 153 image
// requests and ~49 MB of source pixels for a page whose tiles occupy
// about a megapixel in total — one 8 MB rig GIF was being downloaded to
// fill a 56 px mosaic cell.
//
// So the compositing moves to build time. `projectFacePlan` (shared with
// the runtime, src/lib/project-face.ts) says what a face is made of; this
// script draws it with sharp at exactly the size the hexagon renders,
// plus a 2× variant for retina, and writes a manifest the server reads
// when it builds each `ProjectItem`. The browser then makes one request
// per hexagon, of a file measured in kilobytes.
//
// ---- What is *not* baked ---------------------------------------------
// Anything whose backdrop is theme-dependent stays in CSS. A contained
// logo sits on a lane-tinted radial gradient that differs between light
// and dark, so those faces are baked with alpha and composited over that
// gradient at runtime; the tile is the artwork alone. Cover and mosaic
// faces have no theme dependency and are baked opaque, with the mean
// colour of the art recorded as `tint` so the hexagon fills instantly
// while its image is still in flight.
//
// A face the compositor can't produce — a remote ref that wouldn't
// fetch, a format libvips won't decode — is simply absent from the
// manifest, and `IconFace` falls back to drawing the plan in the browser
// the way it always did.
//
// ---- Covers -----------------------------------------------------------
// The shelves below the comb had the same disease in a simpler form: 13
// first-page PDF exports, ~5.4 MB of them, drawn into a 112px-wide
// plate. Those are a plain 2:3 crop with no theme dependency, so they
// are just resized — including the two that came off openlibrary.org,
// which stops the shelf depending on a third party being up.
//
// ---- Incremental ------------------------------------------------------
// This runs on every `pnpm dev` as well as every build, and re-encoding
// 49 MB of source images each time would make starting the dev server
// unpleasant. Each entry carries a key over its plan, its output
// geometry and the size+mtime of every source file, and a tile whose key
// still matches (and whose files are still on disk) is left alone.

import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { HEX_RATIO, hexWidth } from "../src/lib/hex-layout";
import {
  facePlanImages,
  meanTint,
  projectFacePlan,
  projectHexSize,
  type FaceImage,
  type FacePlan,
  type TileArt,
} from "../src/lib/project-face";
import type { CoverArtSrc } from "../src/lib/cover-art";
import { getGraph, isListedNode } from "../src/lib/graph";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const TILE_DIR = path.join(PUBLIC_DIR, "_generated", "tiles");
const COVER_DIR = path.join(PUBLIC_DIR, "_generated", "covers");
const TILE_MANIFEST = path.join(PUBLIC_DIR, "_generated", "hex-tiles.json");
const COVER_MANIFEST = path.join(PUBLIC_DIR, "_generated", "covers.json");

// The widest a 1× hexagon ever gets: the comb divides a 976px content
// column into 7 interlocking columns (see `hexColumnsFor`), which lands
// at 168px, and this leaves a little headroom over that. Below `lg` the
// comb drops to 3 columns and the tiles get *smaller*, so this is the
// worst case in both directions.
const HEX_UNIT_W = 176;
const HEX_GAP = 10;
// Contained heroes keep `p-[16%]` in CSS — 16% of the tile's *width* on
// every side, because percentage padding resolves against width.
const HERO_INSET = 0.16;

// Quality is generous because the files are tiny either way: a 352×305
// photo lands around 20 kB at 78, and the tiles are the page's whole
// visual argument.
const WEBP = { quality: 78, alphaQuality: 80, effort: 5 } as const;

// The shelf draws covers at w-28/sm:w-32 and the indexes at 80-96px, so
// 128 is the widest any of them gets; they are a fixed 2:3 plate.
const COVER_W = 128;
const COVER_H = COVER_W * 1.5;

const REMOTE_FETCH_TIMEOUT_MS = 10_000;
const CONCURRENCY = 6;

type ManifestEntry = TileArt & { key: string };
type Manifest = Record<string, ManifestEntry>;
type CoverEntry = CoverArtSrc & { key: string };
type CoverManifest = Record<string, CoverEntry>;

// ---- sources ----------------------------------------------------------

function publicPathToFs(src: string): string | null {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  const clean = src.split(/[?#]/, 1)[0];
  const fsPath = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(clean)));
  if (!fsPath.startsWith(PUBLIC_DIR + path.sep)) return null;
  return fsPath;
}

const remoteCache = new Map<string, Promise<Buffer | null>>();

function fetchRemote(url: string): Promise<Buffer | null> {
  const hit = remoteCache.get(url);
  if (hit) return hit;
  const pending = (async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS) });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  })();
  remoteCache.set(url, pending);
  return pending;
}

/** A stable fingerprint of a source, without reading its bytes. */
async function sourceStamp(src: string): Promise<string | null> {
  if (/^https?:\/\//i.test(src)) return `remote:${src}`;
  const fsPath = publicPathToFs(src);
  if (!fsPath) return null;
  try {
    const info = await stat(fsPath);
    if (!info.isFile()) return null;
    return `${src}:${info.size}:${Math.round(info.mtimeMs)}`;
  } catch {
    return null;
  }
}

async function loadSource(src: string): Promise<Buffer | null> {
  if (/^https?:\/\//i.test(src)) return fetchRemote(src);
  const fsPath = publicPathToFs(src);
  if (!fsPath || !existsSync(fsPath)) return null;
  try {
    return await readFile(fsPath);
  } catch {
    return null;
  }
}

// ---- drawing ----------------------------------------------------------

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/**
 * `object-fit: cover` — fill the box, cropping whatever overflows. sharp's
 * `cover` centres the crop, which is what the CSS default does too.
 */
function coverInto(input: Buffer, w: number, h: number) {
  return sharp(input, { animated: false })
    .rotate()
    .resize(w, h, { fit: "cover", position: "centre" });
}

/**
 * `object-fit: contain` inside an optional inset — letterbox the artwork
 * on a transparent ground, so whatever the runtime paints behind it (a
 * lane gradient, the page) shows through the margins.
 */
function containInto(input: Buffer, w: number, h: number, inset: number) {
  // `contain` pads to exactly the box asked for, so the inset that gets
  // it back up to w×h is exact and the tile lands on its intended grid.
  const pad = Math.max(0, Math.min(Math.round(inset), Math.floor((Math.min(w, h) - 1) / 2)));
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const contained = sharp(input, { animated: false })
    .rotate()
    .resize(innerW, innerH, { fit: "contain", background: TRANSPARENT });
  return pad === 0
    ? contained
    : contained.extend({ top: pad, bottom: pad, left: pad, right: pad, background: TRANSPARENT });
}

/**
 * The mosaic, drawn the way `grid-template-columns: repeat(n, 1fr)` lays
 * it out: cell boundaries rounded off the exact fractions, so the cells
 * tile the box with no seam and no overhang. Cells the project has no
 * image for keep the tint.
 */
async function drawMosaic(
  images: FaceImage[],
  cols: number,
  w: number,
  h: number,
  tint: string | undefined,
): Promise<sharp.Sharp | null> {
  const bound = (i: number, total: number) => Math.round((i * total) / cols);
  const composites: sharp.OverlayOptions[] = [];

  for (const [index, image] of images.entries()) {
    const buffer = await loadSource(image.src);
    if (!buffer) continue;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = bound(col, w);
    const top = bound(row, h);
    const cellW = bound(col + 1, w) - left;
    const cellH = bound(row + 1, h) - top;
    if (cellW < 1 || cellH < 1) continue;
    try {
      composites.push({
        input: await coverInto(buffer, cellW, cellH).png().toBuffer(),
        left,
        top,
      });
    } catch {
      // one unreadable cell shouldn't cost the whole mosaic
    }
  }

  if (composites.length === 0) return null;
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: tint ? { ...hexToRgb(tint), alpha: 1 } : TRANSPARENT,
    },
  }).composite(composites);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

/** Draws one plan at one size. Null when nothing could be decoded. */
async function drawFace(plan: FacePlan, w: number, h: number): Promise<sharp.Sharp | null> {
  switch (plan.face) {
    case "glyph":
      return null;
    case "mosaic":
      return drawMosaic(plan.images, plan.cols, w, h, plan.tint);
    case "icon":
    case "hero": {
      const buffer = await loadSource(plan.image.src);
      if (!buffer) return null;
      if (plan.fit === "cover") return coverInto(buffer, w, h);
      // A contained hero is inset; a contained icon fills its box edge to
      // edge, the way `object-contain` alone does.
      return containInto(buffer, w, h, plan.face === "hero" ? HERO_INSET * w : 0);
    }
  }
}

// ---- one project ------------------------------------------------------

function outputName(dir: string, id: string, density: 1 | 2): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `/_generated/${dir}/${safe}${density === 2 ? "@2x" : ""}.webp`;
}

async function bakeTile(
  id: string,
  plan: FacePlan,
  w: number,
  h: number,
  previous: ManifestEntry | undefined,
): Promise<{ entry: ManifestEntry; wrote: boolean } | null> {
  const images = facePlanImages(plan);
  if (images.length === 0) return null;

  const stamps = await Promise.all(images.map((img) => sourceStamp(img.src)));
  if (stamps.every((s) => s === null)) return null;

  const key = createHash("sha1")
    .update(JSON.stringify({ plan, w, h, webp: WEBP, stamps }))
    .digest("hex")
    .slice(0, 16);

  const src = outputName("tiles", id, 1);
  const src2x = outputName("tiles", id, 2);

  if (
    previous?.key === key &&
    existsSync(path.join(PUBLIC_DIR, src)) &&
    existsSync(path.join(PUBLIC_DIR, src2x))
  ) {
    return { entry: previous, wrote: false };
  }

  const written: string[] = [];
  for (const [density, outSrc] of [
    [1, src],
    [2, src2x],
  ] as const) {
    const face = await drawFace(plan, w * density, h * density);
    if (!face) return null;
    const outPath = path.join(PUBLIC_DIR, outSrc);
    await mkdir(path.dirname(outPath), { recursive: true });
    await face.webp(WEBP).toFile(outPath);
    written.push(outSrc);
  }
  if (written.length < 2) return null;

  // Only opaque faces get a tint. A contained logo is baked with alpha
  // precisely so the theme's own backdrop shows through it; painting the
  // logo's mean colour behind it would fill the hexagon with a slab.
  const opaque =
    plan.face === "mosaic" ||
    ((plan.face === "icon" || plan.face === "hero") && plan.fit === "cover");
  const tint =
    plan.face === "mosaic" ? plan.tint : opaque ? meanTint(facePlanImages(plan)) : undefined;

  return { entry: { src, src2x, w, h, ...(tint ? { tint } : {}), key }, wrote: true };
}

// ---- main -------------------------------------------------------------

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function readManifest<T>(at: string): Promise<Record<string, T>> {
  try {
    return JSON.parse(await readFile(at, "utf8")) as Record<string, T>;
  } catch {
    return {};
  }
}

async function writeManifest(at: string, manifest: object) {
  await mkdir(path.dirname(at), { recursive: true });
  await writeFile(
    at,
    `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 2)}\n`,
  );
}

/**
 * Delete the outputs of entries that are no longer in the manifest, so a
 * renamed or unlisted node doesn't leave megabytes of orphans in
 * `public/`.
 */
async function sweep(previous: Record<string, { src: string; src2x: string }>, live: Set<string>) {
  for (const entry of Object.values(previous)) {
    for (const src of [entry.src, entry.src2x]) {
      if (live.has(src)) continue;
      await rm(path.join(PUBLIC_DIR, src), { force: true });
    }
  }
}

// ---- covers -----------------------------------------------------------

/**
 * A paper or reading cover: a flat 2:3 crop of the first page, with no
 * theme dependency and nothing to composite. Remote refs are baked too —
 * two of the readings pull their jacket off openlibrary.org, and a shelf
 * that renders from `public/` doesn't care whether that host is up.
 */
async function bakeCover(
  id: string,
  src: string,
  previous: CoverEntry | undefined,
): Promise<{ entry: CoverEntry; wrote: boolean } | null> {
  const stamp = await sourceStamp(src);
  if (!stamp) return null;

  const key = createHash("sha1")
    .update(JSON.stringify({ src, w: COVER_W, webp: WEBP, stamp }))
    .digest("hex")
    .slice(0, 16);

  const out = outputName("covers", id, 1);
  const out2x = outputName("covers", id, 2);
  if (
    previous?.key === key &&
    existsSync(path.join(PUBLIC_DIR, out)) &&
    existsSync(path.join(PUBLIC_DIR, out2x))
  ) {
    return { entry: previous, wrote: false };
  }

  const buffer = await loadSource(src);
  if (!buffer) return null;

  for (const [density, outSrc] of [
    [1, out],
    [2, out2x],
  ] as const) {
    const outPath = path.join(PUBLIC_DIR, outSrc);
    await mkdir(path.dirname(outPath), { recursive: true });
    await coverInto(buffer, COVER_W * density, Math.round(COVER_H * density))
      .webp(WEBP)
      .toFile(outPath);
  }

  return {
    entry: { src: out, src2x: out2x, w: COVER_W, h: Math.round(COVER_H), key },
    wrote: true,
  };
}

// ---- main -------------------------------------------------------------

async function bakeHexTiles(): Promise<string> {
  const previous = await readManifest<ManifestEntry>(TILE_MANIFEST);
  const projects = getGraph().nodes.filter((n) => n.kind === "project" && isListedNode(n));

  await mkdir(TILE_DIR, { recursive: true });

  const results = await mapWithConcurrency(projects, CONCURRENCY, async (node) => {
    const size = projectHexSize(node.id);
    const w = Math.round(hexWidth(size, HEX_UNIT_W, HEX_GAP));
    const h = Math.round(w * HEX_RATIO);
    const plan = projectFacePlan(node);
    try {
      const baked = await bakeTile(node.id, plan, w, h, previous[node.id]);
      return baked ? ([node.id, baked] as const) : null;
    } catch (error) {
      console.warn(`[thumbs] tile ${node.id}: ${(error as Error).message}`);
      return null;
    }
  });

  const manifest: Manifest = {};
  let wrote = 0;
  for (const result of results) {
    if (!result) continue;
    const [id, { entry, wrote: fresh }] = result;
    manifest[id] = entry;
    if (fresh) wrote++;
  }

  await sweep(previous, new Set(Object.values(manifest).flatMap((e) => [e.src, e.src2x])));
  await writeManifest(TILE_MANIFEST, manifest);

  const baked = Object.keys(manifest).length;
  const skipped = projects.length - baked;
  return (
    `${baked} hexagon tiles (${wrote} rebuilt, ${baked - wrote} cached)` +
    (skipped ? `, ${skipped} drawn at runtime` : "")
  );
}

async function bakeCovers(): Promise<string> {
  const previous = await readManifest<CoverEntry>(COVER_MANIFEST);
  const covers = getGraph().nodes.filter(
    (n) => (n.kind === "paper" || n.kind === "reading") && Boolean(n.hero?.src),
  );

  await mkdir(COVER_DIR, { recursive: true });

  const results = await mapWithConcurrency(covers, CONCURRENCY, async (node) => {
    try {
      const baked = await bakeCover(node.id, node.hero!.src, previous[node.id]);
      return baked ? ([node.id, baked] as const) : null;
    } catch (error) {
      console.warn(`[thumbs] cover ${node.id}: ${(error as Error).message}`);
      return null;
    }
  });

  const manifest: CoverManifest = {};
  let wrote = 0;
  for (const result of results) {
    if (!result) continue;
    const [id, { entry, wrote: fresh }] = result;
    manifest[id] = entry;
    if (fresh) wrote++;
  }

  await sweep(previous, new Set(Object.values(manifest).flatMap((e) => [e.src, e.src2x])));
  await writeManifest(COVER_MANIFEST, manifest);

  const baked = Object.keys(manifest).length;
  const skipped = covers.length - baked;
  return (
    `${baked} covers (${wrote} rebuilt, ${baked - wrote} cached)` +
    (skipped ? `, ${skipped} served from source` : "")
  );
}

async function main() {
  // Sequential: both passes saturate libvips' own thread pool, and
  // interleaving them only makes the log harder to read.
  const tiles = await bakeHexTiles();
  const covers = await bakeCovers();
  console.log(`[thumbs] ${tiles}; ${covers}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
