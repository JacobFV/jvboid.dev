/**
 * Resolve every X post referenced from content into src/data/x-posts.json.
 *
 * The site renders tweets itself rather than loading X's widget (see
 * reader/XPost.tsx for why), so it needs the words. X's syndication
 * endpoint — the one its own embed script calls — hands them over
 * without auth, along with the author, an ISO date, the photos, and
 * the real destination behind every t.co.
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

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "src", "data", "x-posts.json");
// Photos are copied in rather than hotlinked: pbs.twimg.com is not a CDN
// we control, and a tweet's image disappearing would silently gut a
// project page. Same reason the text is committed.
const MEDIA_DIR = path.join(ROOT, "public", "assets", "media", "x");
const MEDIA_HREF = "/assets/media/x";
const AVATAR_DIR = path.join(MEDIA_DIR, "avatars");
const AVATAR_HREF = `${MEDIA_HREF}/avatars`;

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

/**
 * X's syndication endpoint — the one its own embed script talks to.
 * Public, no auth, and it hands back more than oEmbed does: the media,
 * the real destination of every t.co, an ISO timestamp, and the author.
 *
 * The token is a checksum of the id, computed the same way the embed
 * script computes it.
 */
function syndicationUrl(id) {
  const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
  return `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token}&lang=en`;
}

/**
 * Swap every t.co for where it actually goes, using the entity table
 * rather than a redirect hop. Media stubs come out entirely: we render
 * the photos ourselves, so the stub is a dead token in the prose.
 */
function detokenize(text, entities = {}) {
  let out = text;
  for (const u of entities.urls ?? []) {
    if (u.url && u.expanded_url) out = out.replaceAll(u.url, u.expanded_url);
  }
  for (const m of entities.media ?? []) {
    if (m.url) out = out.replaceAll(m.url, "");
  }
  return out.replace(/\s*https:\/\/t\.co\/\w+\s*$/, "").trim();
}

/**
 * Pull a tweet's photos into public/ and hand back site-relative paths.
 * Already-downloaded files are left alone, so re-running is cheap.
 */
async function savePhotos(id, urls) {
  if (!urls.length) return [];
  await mkdir(MEDIA_DIR, { recursive: true });

  const saved = [];
  for (const [i, url] of urls.entries()) {
    const ext = (url.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] ?? "jpg").toLowerCase();
    const name = `${id}-${i + 1}.${ext}`;
    const file = path.join(MEDIA_DIR, name);
    if (!existsSync(file)) {
      // `name=large` is the biggest rendition X will serve unauthenticated.
      const res = await fetch(`${url}?format=${ext}&name=large`);
      if (!res.ok) {
        console.log(`    ! photo ${name}: HTTP ${res.status}`);
        continue;
      }
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    }
    saved.push(`${MEDIA_HREF}/${name}`);
  }
  return saved;
}

/**
 * Avatars are copied in for the same reason as the photos, and keyed by
 * account rather than by post — one file serves every tweet by that
 * person. `_normal` is the 48px rendition X links; `_400x400` is the
 * one worth rendering on a retina display.
 */
async function saveAvatar(handle, url) {
  if (!handle || !url) return undefined;
  await mkdir(AVATAR_DIR, { recursive: true });
  const name = `${handle}.jpg`;
  const file = path.join(AVATAR_DIR, name);
  if (!existsSync(file)) {
    const res = await fetch(url.replace(/_normal\.(jpg|png|webp)$/i, "_400x400.$1"));
    if (!res.ok) {
      console.log(`    ! avatar ${name}: HTTP ${res.status}`);
      return undefined;
    }
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return `${AVATAR_HREF}/${name}`;
}

async function fetchPost(id) {
  const res = await fetch(syndicationUrl(id), {
    headers: {
      // The endpoint is picky about looking like a browser.
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const t = await res.json();
  if (!t?.id_str) throw new Error("no tweet in payload");

  const handle = t.user?.screen_name;
  const text = detokenize(t.text ?? "", t.entities);

  // A long-form post ("note tweet") comes back capped at ~275
  // characters, and the payload carries only an id for the full
  // version — the rest needs credentials we do not have. Recording the
  // cut honestly beats a dangling ellipsis: the component sends the
  // reader to X for the rest.
  const truncated = Boolean(t.note_tweet) || /[…]$/.test(text);

  const photos = await savePhotos(
    id,
    (t.mediaDetails ?? [])
      .filter((m) => m.type === "photo" && m.media_url_https)
      .map((m) => m.media_url_https),
  );

  const avatar = await saveAvatar(handle, t.user?.profile_image_url_https);

  return {
    url: `https://x.com/${handle ?? "i"}/status/${id}`,
    authorName: t.user?.name ?? undefined,
    authorHandle: handle ? `@${handle}` : undefined,
    ...(avatar ? { avatar } : {}),
    ...(t.user?.is_blue_verified || t.user?.verified ? { verified: true } : {}),
    date: t.created_at ? t.created_at.slice(0, 10) : undefined,
    text,
    ...(truncated ? { truncated: true } : {}),
    ...(photos.length ? { photos } : {}),
    ...(t.favorite_count ? { likes: t.favorite_count } : {}),
    ...(t.conversation_count ? { replies: t.conversation_count } : {}),
    ...(t.quoted_tweet?.id_str ? { quotes: t.quoted_tweet.id_str } : {}),
  };
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
  for (const [id] of todo) {
    try {
      cache[id] = await fetchPost(id);
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
