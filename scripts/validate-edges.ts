/**
 * Standalone graph validator. Faster than `pnpm build` for the
 * connections-filling agent — reads `.velite/*.json` and `src/data/edges.ts`
 * directly, prints a report on:
 *   - edges that reference a node id that doesn't exist
 *   - duplicate edges (same source, target, kind)
 *   - per-node out-degree (helps spot "I added 14 influences" anti-patterns)
 *   - weight outliers in manualEdges (0 / >1 / very-low / unset)
 *
 * Run after every batch:  pnpm validate
 *
 * Exits non-zero if there are missing-node errors so a caller can gate on it.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { manualEdges } from "../src/data/edges";

const NEW = process.cwd();
const VELITE = path.join(NEW, ".velite");

const COLLECTIONS = [
  "posts",
  "projects",
  "papers",
  "readings",
  "updates",
  "skills",
  "friends",
  "events",
  "visions",
  "experience",
] as const;

type Edge = {
  source: string;
  target: string;
  kind: "influence" | "realization" | "critique" | "collaboration";
  weight?: number;
  note?: string;
  origin: string; // file or "edges.ts"
};

const slugBase = (p: string) => p.split("/").pop() ?? p;

async function loadNodes(): Promise<{
  ids: Set<string>;
  outgoingByKind: Map<string, Record<string, number>>;
}> {
  const ids = new Set<string>();
  const outgoingByKind = new Map<string, Record<string, number>>();
  for (const c of COLLECTIONS) {
    const file = path.join(VELITE, `${c}.json`);
    if (!existsSync(file)) continue;
    const data = JSON.parse(await readFile(file, "utf8")) as Array<{
      slug: string;
      influences?: string[];
      realizes?: string[];
      critiques?: string[];
    }>;
    for (const n of data) {
      const id = slugBase(n.slug);
      ids.add(id);
      outgoingByKind.set(id, {
        influences: n.influences?.length ?? 0,
        realizes: n.realizes?.length ?? 0,
        critiques: n.critiques?.length ?? 0,
      });
    }
  }
  return { ids, outgoingByKind };
}

async function loadFrontmatterEdges(): Promise<Edge[]> {
  const edges: Edge[] = [];
  for (const c of COLLECTIONS) {
    const file = path.join(VELITE, `${c}.json`);
    if (!existsSync(file)) continue;
    const data = JSON.parse(await readFile(file, "utf8")) as Array<{
      slug: string;
      influences?: string[];
      realizes?: string[];
      critiques?: string[];
    }>;
    for (const n of data) {
      const id = slugBase(n.slug);
      for (const t of n.influences ?? [])
        edges.push({ source: id, target: t, kind: "influence", origin: `${c}/${id}.mdx` });
      for (const t of n.realizes ?? [])
        edges.push({ source: id, target: t, kind: "realization", origin: `${c}/${id}.mdx` });
      for (const t of n.critiques ?? [])
        edges.push({ source: id, target: t, kind: "critique", origin: `${c}/${id}.mdx` });
    }
  }
  return edges;
}

function color(s: string, code: number) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
}
const red = (s: string) => color(s, 31);
const yellow = (s: string) => color(s, 33);
const green = (s: string) => color(s, 32);
const dim = (s: string) => color(s, 2);

async function main() {
  if (!existsSync(VELITE)) {
    console.error(red("✖") + " no .velite — run `pnpm build` (or `velite build`) once first.");
    process.exit(1);
  }

  const { ids, outgoingByKind } = await loadNodes();
  const fmEdges = await loadFrontmatterEdges();
  const manual: Edge[] = manualEdges.map((e) => ({
    ...e,
    origin: "src/data/edges.ts",
  }));
  const allEdges = [...fmEdges, ...manual];

  // ---- Missing nodes -------------------------------------------------
  const missing: { edge: Edge; which: "source" | "target" }[] = [];
  for (const e of allEdges) {
    if (!ids.has(e.source)) missing.push({ edge: e, which: "source" });
    if (!ids.has(e.target)) missing.push({ edge: e, which: "target" });
  }

  // ---- Duplicates (same source, target, kind) ------------------------
  const seen = new Map<string, Edge[]>();
  for (const e of allEdges) {
    const key = `${e.source}->${e.target}:${e.kind}`;
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(e);
  }
  const duplicates = Array.from(seen.values()).filter((arr) => arr.length > 1);

  // ---- Self-edges ----------------------------------------------------
  const selfEdges = allEdges.filter((e) => e.source === e.target);

  // ---- Weight sanity (manualEdges only — frontmatter has no weight) -
  const badWeights = manual.filter((e) => {
    if (e.weight === undefined) return false; // ok to omit
    return e.weight < 0 || e.weight > 1;
  });
  const unweightedManual = manual.filter((e) => e.weight === undefined);

  // ---- Per-node out-degree ------------------------------------------
  const outDegree: Record<string, number> = {};
  for (const e of allEdges) {
    outDegree[e.source] = (outDegree[e.source] ?? 0) + 1;
  }
  const top = Object.entries(outDegree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const overloaded = Object.entries(outDegree).filter(([, n]) => n > 6);

  // ---- Orphans (no in-degree, no out-degree) ------------------------
  const inDegree: Record<string, number> = {};
  for (const e of allEdges) {
    inDegree[e.target] = (inDegree[e.target] ?? 0) + 1;
  }
  const orphans = Array.from(ids).filter((id) => !outDegree[id] && !inDegree[id]);

  // ---- Report --------------------------------------------------------
  console.log("");
  console.log(`${dim("nodes:")} ${ids.size}`);
  console.log(
    `${dim("edges:")} ${allEdges.length} (${fmEdges.length} from frontmatter, ${manual.length} manual)`,
  );
  console.log("");

  if (missing.length === 0) console.log(green("✓") + " all edges resolve to a real node id");
  else {
    console.log(
      red(
        `✖ ${missing.length} edge${missing.length === 1 ? "" : "s"} reference a missing node id:`,
      ),
    );
    for (const m of missing) {
      const e = m.edge;
      console.log(
        `  ${red(e[m.which])}  ${dim("←")} ${e.kind}  ${dim("from")} ${e.origin}  ${dim(`(${e.source} → ${e.target})`)}`,
      );
    }
  }

  if (duplicates.length === 0) console.log(green("✓") + " no duplicate edges");
  else {
    console.log(
      yellow(`! ${duplicates.length} duplicated edge${duplicates.length === 1 ? "" : "s"}:`),
    );
    for (const dups of duplicates) {
      const head = dups[0];
      console.log(
        `  ${head.source} -> ${head.target} (${head.kind})  ${dim("declared in:")} ${dups.map((d) => d.origin).join(", ")}`,
      );
    }
  }

  if (selfEdges.length === 0) console.log(green("✓") + " no self-edges");
  else {
    console.log(
      red(
        `✖ ${selfEdges.length} self-edge${selfEdges.length === 1 ? "" : "s"} (a node points to itself):`,
      ),
    );
    for (const e of selfEdges)
      console.log(`  ${e.source} -> ${e.target} (${e.kind})  ${dim("from")} ${e.origin}`);
  }

  if (badWeights.length > 0) {
    console.log(yellow(`! ${badWeights.length} weight outside [0, 1]:`));
    for (const e of badWeights) console.log(`  ${e.source} -> ${e.target}  weight=${e.weight}`);
  }
  if (unweightedManual.length > 0) {
    console.log(
      dim(
        `i ${unweightedManual.length} manual edge${unweightedManual.length === 1 ? "" : "s"} omit \`weight\` (default 0.6 will apply at render time)`,
      ),
    );
  }

  if (overloaded.length === 0) {
    console.log(green("✓") + " no over-connected nodes (>6 outgoing)");
  } else {
    console.log(
      yellow(
        `! ${overloaded.length} node${overloaded.length === 1 ? "" : "s"} declare more than 6 outgoing edges (consider trimming):`,
      ),
    );
    for (const [id, n] of overloaded.sort((a, b) => b[1] - a[1])) {
      const k = outgoingByKind.get(id) ?? {};
      const detail = Object.entries(k)
        .filter(([, v]) => v)
        .map(([kk, v]) => `${kk}:${v}`)
        .join(" ");
      console.log(`  ${id}  ${dim(`(${n} total — ${detail})`)}`);
    }
  }

  console.log("");
  console.log(dim("top out-degree:"));
  for (const [id, n] of top) console.log(`  ${String(n).padStart(3)}  ${id}`);

  console.log("");
  console.log(dim(`orphans (no edges in or out): ${orphans.length} of ${ids.size} nodes`));
  if (orphans.length > 0 && orphans.length <= 30) {
    for (const id of orphans.sort()) console.log(`  ${dim("·")} ${id}`);
  }

  console.log("");
  if (missing.length > 0 || selfEdges.length > 0) {
    console.log(red("validation failed"));
    process.exit(1);
  }
  console.log(green("validation passed"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
