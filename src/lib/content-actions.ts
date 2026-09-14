"use server";

import { chapterContentPath, getChapter } from "./bio";
import type { EditScope } from "./edit-types";
import { getGraph, nodeContentPath } from "./graph";
import { requireSession } from "./session";

// Reading and writing the MDX behind a page, for the in-browser editor.
//
// Two rules hold this together:
//
// 1. The browser sends a *kind and an id*, never a path. The path is derived
//    here from the compiled content registry, so there is no traversal to
//    defend against and nothing outside content/ is reachable by asking.
// 2. Only the body is editable. The frontmatter is split off on the way out
//    and re-attached from a fresh read on the way in, so no amount of typing
//    in the textarea can produce a file velite refuses — which, on a site
//    that rebuilds on every push, would mean a failed deploy rather than a
//    bad paragraph.
//
// Source of truth is GitHub, not the filesystem: a running deployment's copy
// of content/ is as old as its build, and the write needs the current blob
// sha anyway.

export type LoadResult =
  | { ok: true; body: string; sha: string; path: string }
  | { ok: false; error: string };

export type SaveResult = { ok: true; commit: string; path: string } | { ok: false; error: string };

const API = "https://api.github.com";

function repo(): { slug: string; branch: string; token: string } {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");
  return {
    slug: process.env.GITHUB_REPO ?? "JacobFV/jvboid.dev",
    branch: process.env.GITHUB_BRANCH ?? "main",
    token,
  };
}

/** id → file path, via the content registry. The only path source there is. */
function resolvePath(scope: EditScope, id: string): string | null {
  if (scope === "bio") {
    const chapter = getChapter(id);
    return chapter ? chapterContentPath(chapter) : null;
  }
  const node = getGraph().byId.get(id);
  return node ? nodeContentPath(node) : null;
}

/**
 * Split a `---` frontmatter block off the front of a file.
 *
 * Kept deliberately literal — it matches only a block that opens on the very
 * first line, which is the only shape velite accepts anyway. A file without
 * one (a bio chapter that is still empty, say) comes back as all body.
 */
function splitFrontmatter(source: string): { frontmatter: string; body: string } {
  const match = /^(---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n?)([\s\S]*)$/.exec(source);
  return match
    ? { frontmatter: match[1], body: match[2] }
    : { frontmatter: "", body: source };
}

type Blob = { content: string; sha: string };

async function readBlob(path: string): Promise<Blob> {
  const { slug, branch, token } = repo();
  const url = `${API}/repos/${slug}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub said ${response.status} reading ${path}.`);
  const json = (await response.json()) as { content?: string; sha?: string; encoding?: string };
  if (!json.content || !json.sha) throw new Error(`${path} is not a file.`);
  return { content: Buffer.from(json.content, "base64").toString("utf8"), sha: json.sha };
}

/** The current body of an entry, ready to drop into a textarea. */
export async function loadSource(scope: EditScope, id: string): Promise<LoadResult> {
  try {
    await requireSession();
    const path = resolvePath(scope, id);
    if (!path) return { ok: false, error: "No such entry." };
    const blob = await readBlob(path);
    const { body } = splitFrontmatter(blob.content);
    return { ok: true, body, sha: blob.sha, path };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/**
 * Commit an edited body back to `main`, which is what triggers the rebuild.
 *
 * `sha` is the blob the editor opened. If the file has moved on since, the
 * save is refused rather than merged — the alternative is silently throwing
 * away whatever the other edit said.
 */
export async function saveSource(
  scope: EditScope,
  id: string,
  body: string,
  sha: string,
): Promise<SaveResult> {
  try {
    await requireSession();
    const path = resolvePath(scope, id);
    if (!path) return { ok: false, error: "No such entry." };

    const fresh = await readBlob(path);
    if (fresh.sha !== sha) {
      return { ok: false, error: "This file changed elsewhere. Reload and edit again." };
    }

    // Frontmatter comes from the read we just did, never from the browser.
    const { frontmatter } = splitFrontmatter(fresh.content);
    const next = frontmatter + body.replace(/\s*$/, "") + "\n";
    if (next === fresh.content) return { ok: false, error: "Nothing changed." };

    const title = titleFor(scope, id) ?? path;
    const { slug, branch, token } = repo();
    const response = await fetch(`${API}/repos/${slug}/contents/${encodeURI(path)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        branch,
        sha,
        message: `edit ${title} from the site\n\nEdited in the browser; frontmatter untouched.`,
        content: Buffer.from(next, "utf8").toString("base64"),
        ...(process.env.GITHUB_AUTHOR_EMAIL
          ? {
              author: {
                name: process.env.GITHUB_AUTHOR_NAME ?? "Jacob Valdez",
                email: process.env.GITHUB_AUTHOR_EMAIL,
              },
            }
          : {}),
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`GitHub said ${response.status} writing ${path}.`);
    const json = (await response.json()) as { commit?: { sha?: string } };
    return { ok: true, commit: (json.commit?.sha ?? "").slice(0, 7), path };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

function titleFor(scope: EditScope, id: string): string | undefined {
  return scope === "bio" ? getChapter(id)?.title : getGraph().byId.get(id)?.title;
}

function message(err: unknown): string {
  // "Not signed in." and the GitHub status lines are both safe to show — the
  // only reader is Jacob, and a vague error here costs him a debugging round.
  return err instanceof Error ? err.message : "Something went wrong.";
}
