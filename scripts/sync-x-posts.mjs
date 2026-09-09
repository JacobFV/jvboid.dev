/**
 * Resolve every X post referenced from content into src/data/x-posts.json.
 *
 * The site renders tweets itself rather than loading X's widget (see
 * reader/XPost.tsx for why), so it needs the text. X's oEmbed endpoint
 * gives it away without auth: author, handle, date, and the tweet body.
 *
 * The result is committed. Builds must not depend on X being up or on
 * whatever rate limit we are under that day, and a deploy that silently
 * dropped the text of sixteen embeds would be worse than a stale one.
 * So this is a thing you run by hand when you add a tweet:
 *
 *     pnpm x:sync            # fetch anything not already cached
 *     pnpm x:sync --refresh  # re-fetch everything, even cached entries
 *
 * Deleted tweets keep their cached entry. That is deliberate — the
 * quote in the essay should not evaporate because the account pruned
 * its timeline. `--prune` drops entries no longer referenced anywhere.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "src", "data", "x-posts.json");

const REFRESH = process.argv.includes("--refresh");
const PRUNE = process.argv.includes("--prune");

const STATUS_RE = /https:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/g;

/** Every tweet id referenced from content, in first-seen order. */
async function collectIds() {
  const found = new Map(); // id -> handle
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "_generated") continue; // snapshots of old prose
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!/\.mdx?$/.test(entry.name)) continue;
      const text = await readFile(full, "utf8");
      for (const m of text.matchAll(STATUS_RE)) {
        if (!found.has(m[2])) found.set(m[2], m[1]);
      }
    }
  };
  await walk(CONTENT);
  return found;
}

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m);
}

/**
 * t.co hides where a link actually goes, and we render the text as
 * prose — "https://t.co/RvCQwlDFuU" mid-sentence tells the reader
 * nothing. One redirect hop gets the real destination. Failures fall
 * back to the shortlink, which still works.
 */
async function expandShortlinks(text) {
  const links = [...new Set(text.match(/https:\/\/t\.co\/\w+/g) ?? [])];
  let out = text;
  for (const short of links) {
    try {
      const res = await fetch(short, { redirect: "manual" });
      const target = res.headers.get("location");
      // A t.co pointing back at a tweet is the "quoted/self" link X
      // appends; it adds nothing next to the text it is attached to.
      if (target) out = out.replaceAll(short, target.split("?")[0]);
    } catch {
      /* keep the shortlink */
    }
  }
  return out;
}

/**
 * Pull the parts we render out of oEmbed's blob of markup.
 *
 * The payload is a <blockquote> holding one <p> of tweet text followed
 * by "— Author (@handle) <a>date</a>". We want the text with its line
 * breaks intact and the date as X displayed it; everything else in
 * there is widget scaffolding.
 */
function parseOembed(payload) {
  const html = payload.html ?? "";

  const body = html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
  const text = body
    ? decode(
        body[1]
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/ /g, " "),
      )
        // X appends a pic.twitter.com stub for every attached photo or
        // video. We do not render X's media, so the stub is a dead
        // token — the MDX places the image itself when it matters.
        .replace(/\s*pic\.twitter\.com\/\w+/g, "")
        .trim()
    : "";

  const dateMatch = html.match(/<a[^>]*>([^<]*\d{4})<\/a>/);
  const handleMatch = (payload.author_url ?? "").match(/x\.com\/([A-Za-z0-9_]+)/);

  return {
    authorName: payload.author_name ?? undefined,
    authorHandle: handleMatch ? `@${handleMatch[1]}` : undefined,
    date: dateMatch ? decode(dateMatch[1]).trim() : undefined,
    text,
  };
}

async function fetchPost(id, handle) {
  const url = `https://x.com/${handle}/status/${id}`;
  const endpoint =
    "https://publish.x.com/oembed?" +
    new URLSearchParams({ url, omit_script: "1", dnt: "1" }).toString();

  const res = await fetch(endpoint, {
    headers: {
      // The endpoint 404s on some default agents.
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const parsed = parseOembed(await res.json());
  // A tweet that is only a photo or a link has no text once the stub is
  // stripped. That is a real state, not a failure — the component
  // renders it as a plain attributed link.
  return { url, ...parsed, text: await expandShortlinks(parsed.text) };
}

async function main() {
  const referenced = await collectIds();
  const cache = existsSync(OUT) ? JSON.parse(await readFile(OUT, "utf8")) : {};

  const todo = [...referenced].filter(([id]) => REFRESH || !cache[id]);
  console.log(
    `${referenced.size} tweet${referenced.size === 1 ? "" : "s"} referenced, ` +
      `${Object.keys(cache).length} cached, ${todo.length} to fetch`,
  );

  let ok = 0;
  const failed = [];
  for (const [id, handle] of todo) {
    try {
      cache[id] = await fetchPost(id, handle);
      ok++;
      const preview = cache[id].text.slice(0, 60).replace(/\n/g, " ");
      console.log(`  ✓ ${id}  ${preview ? preview + "…" : "(no text — media or link only)"}`);
    } catch (e) {
      failed.push([id, e.message]);
      console.log(`  ✖ ${id}  ${e.message}`);
    }
    // Be a good citizen; this runs by hand and is never on the hot path.
    await new Promise((r) => setTimeout(r, 400));
  }

  if (PRUNE) {
    for (const id of Object.keys(cache)) {
      if (!referenced.has(id)) {
        delete cache[id];
        console.log(`  - pruned ${id}`);
      }
    }
  }

  // Sorted by id so the committed file diffs cleanly.
  const sorted = Object.fromEntries(Object.keys(cache).sort().map((k) => [k, cache[k]]));
  await writeFile(OUT, JSON.stringify(sorted, null, 2) + "\n");

  const missing = [...referenced.keys()].filter((id) => !cache[id]);
  console.log(`\nwrote ${path.relative(ROOT, OUT)} — ${Object.keys(sorted).length} posts (${ok} new)`);
  if (missing.length) {
    console.log(
      `\n${missing.length} referenced tweet${missing.length === 1 ? "" : "s"} still unresolved:\n` +
        missing.map((id) => `  ${id}`).join("\n") +
        `\nThese render as a bare link until they resolve. Deleted or ` +
        `protected tweets never will — give them text inline via the ` +
        `\`posts\` prop instead.`,
    );
    if (failed.length) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
