import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const OUT_DIR = path.join(PUBLIC_DIR, "_generated", "lowres");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "_generated", "image-manifest.json");
const COLORS_PATH = path.join(PUBLIC_DIR, "_generated", "image-colors.json");

const RASTER_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const REMOTE_FETCH_TIMEOUT_MS = 10_000;

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function publicPathToFs(src: string): string | null {
  if (!src.startsWith("/") || src.startsWith("//")) return null;
  const clean = src.split(/[?#]/, 1)[0];
  const ext = path.extname(clean).toLowerCase();
  if (!RASTER_EXTS.has(ext)) return null;
  const fsPath = path.normalize(path.join(PUBLIC_DIR, clean));
  if (!fsPath.startsWith(PUBLIC_DIR + path.sep)) return null;
  return fsPath;
}

function placeholderPathFor(src: string): string {
  const clean = src.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  const parsed = path.parse(clean);
  const safeDir = parsed.dir.replace(/[\\/]/g, "__");
  const safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `/_generated/lowres/${safeDir ? `${safeDir}__` : ""}${safeBase}.webp`;
}

function remoteImageUrl(src: string): string | null {
  if (!/^https?:\/\//i.test(src)) return null;
  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return null;
  }
  if (!RASTER_EXTS.has(path.extname(parsed.pathname).toLowerCase())) return null;
  return src;
}

// Average colour of the whole image, as `#rrggbb`. Downscaling to a
// single pixel is a box filter over every pixel, so this is the true
// mean rather than a dominant-colour guess. Transparent regions are
// flattened onto white first — otherwise a diagram on an alpha
// background averages out to whatever sharp leaves in the unused
// channels.
async function meanColor(input: string | Buffer): Promise<string | null> {
  try {
    const { data } = await sharp(input)
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize(1, 1, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (data.length < 3) return null;
    return `#${[data[0], data[1], data[2]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return null;
  }
}

// Remote refs (GitHub raw asset URLs, mostly) have no local file to
// measure, so they are fetched once per build. A miss is not fatal —
// the consumer falls back to a lane tint.
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function extractImageRefs(text: string): Set<string> {
  const refs = new Set<string>();
  const patterns = [
    /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    /\bsrc:\s*["']?([^"'\n\r]+)["']?/g,
    /\bsrc=["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1]?.trim();
      if (raw) refs.add(raw);
    }
  }
  return refs;
}

async function main() {
  const contentFiles = (await walk(CONTENT_DIR)).filter((file) => file.endsWith(".mdx"));
  const refs = new Set<string>();
  for (const file of contentFiles) {
    const text = await readFile(file, "utf8");
    for (const ref of extractImageRefs(text)) refs.add(ref);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const manifest: Record<string, string> = {};
  const colors: Record<string, string> = {};
  const remote: string[] = [];
  for (const src of [...refs].sort()) {
    const fsPath = publicPathToFs(src);
    if (!fsPath || !existsSync(fsPath)) {
      const url = remoteImageUrl(src);
      if (url) remote.push(url);
      continue;
    }

    const sourceStat = await stat(fsPath);
    if (!sourceStat.isFile()) continue;

    const lowSrc = placeholderPathFor(src);
    const outPath = path.join(PUBLIC_DIR, lowSrc);
    await mkdir(path.dirname(outPath), { recursive: true });
    await sharp(fsPath)
      .rotate()
      .resize({ width: 64, withoutEnlargement: true })
      .webp({ quality: 45 })
      .toFile(outPath);
    manifest[src] = lowSrc;

    const mean = await meanColor(fsPath);
    if (mean) colors[src] = mean;
  }

  const fetched = await Promise.all(
    remote.map(async (url) => {
      const buffer = await fetchImage(url);
      return [url, buffer ? await meanColor(buffer) : null] as const;
    }),
  );
  for (const [url, mean] of fetched) {
    if (mean) colors[url] = mean;
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(COLORS_PATH, `${JSON.stringify(colors, null, 2)}\n`);
  console.log(
    `[images] generated ${Object.keys(manifest).length} low-res placeholders, ` +
      `${Object.keys(colors).length} mean colours (${remote.length} remote refs)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
