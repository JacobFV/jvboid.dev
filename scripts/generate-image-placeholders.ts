import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const OUT_DIR = path.join(PUBLIC_DIR, "_generated", "lowres");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "_generated", "image-manifest.json");

const RASTER_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

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
  for (const src of [...refs].sort()) {
    const fsPath = publicPathToFs(src);
    if (!fsPath || !existsSync(fsPath)) continue;

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
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[images] generated ${Object.keys(manifest).length} low-res placeholders`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
