/**
 * Sync static assets from the legacy Jekyll site.
 *
 * The new Next app serves files from `public/`. This keeps both the legacy
 * public paths (`/assets/...`, `/notebooks/...`) and the migration helper
 * image paths (`/img/migrated/...`) populated from ../jacobfv.github.io.
 */

import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const OLD = path.resolve(process.cwd(), "../jacobfv.github.io");
const NEW = process.cwd();

const STATIC_ASSET_EXTENSIONS = new Set([
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mp3",
  ".pdf",
  ".png",
  ".svg",
  ".xcf",
]);

type SyncStats = {
  copied: number;
  updated: number;
  skipped: number;
};

const totals: SyncStats = {
  copied: 0,
  updated: 0,
  skipped: 0,
};

async function hashFile(file: string): Promise<string> {
  const data = await readFile(file);
  return createHash("sha256").update(data).digest("hex");
}

async function copyIfChanged(src: string, dst: string) {
  await mkdir(path.dirname(dst), { recursive: true });

  if (!existsSync(dst)) {
    await copyFile(src, dst);
    totals.copied++;
    return;
  }

  const [srcHash, dstHash] = await Promise.all([hashFile(src), hashFile(dst)]);
  if (srcHash === dstHash) {
    totals.skipped++;
    return;
  }

  await copyFile(src, dst);
  totals.updated++;
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walkFiles(fullPath);
      if (entry.isFile()) return [fullPath];
      return [];
    }),
  );
  return files.flat();
}

async function syncTree(srcRoot: string, dstRoot: string) {
  if (!existsSync(srcRoot)) return;

  for (const src of await walkFiles(srcRoot)) {
    const rel = path.relative(srcRoot, src);
    await copyIfChanged(src, path.join(dstRoot, rel));
  }
}

async function syncBioAssets() {
  const bioRoot = path.join(OLD, "_bio");
  if (!existsSync(bioRoot)) return;

  for (const src of await walkFiles(bioRoot)) {
    const ext = path.extname(src).toLowerCase();
    if (!STATIC_ASSET_EXTENSIONS.has(ext)) continue;
    await copyIfChanged(src, path.join(NEW, "public/img/migrated", path.basename(src)));
  }
}

async function main() {
  await stat(OLD);

  await syncTree(path.join(OLD, "assets"), path.join(NEW, "public/assets"));
  await syncTree(path.join(OLD, "assets/img"), path.join(NEW, "public/img/migrated"));
  await syncTree(path.join(OLD, "notebooks"), path.join(NEW, "public/notebooks"));
  await syncBioAssets();

  console.log(
    `Synced legacy assets: ${totals.copied} copied, ${totals.updated} updated, ${totals.skipped} unchanged.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
