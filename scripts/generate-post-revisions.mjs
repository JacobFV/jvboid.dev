#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const POSTS_DIR = join(REPO_ROOT, "content", "posts");
const OUTPUT_DIR = join(REPO_ROOT, "content", "_generated", "post-revisions");
const MANIFEST_PATH = join(OUTPUT_DIR, "manifest.json");

const POST_PATH_PREFIXES = ["content/posts/", "_posts/"];
const POST_EXTENSIONS = new Set([".md", ".markdown", ".mdx"]);

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 256,
    stdio: ["ignore", "pipe", options.allowFailure ? "ignore" : "pipe"],
    ...options,
  }).trimEnd();
}

function gitMaybe(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function assertGitRepository() {
  if (gitMaybe(["rev-parse", "--is-inside-work-tree"]) !== "true") {
    throw new Error("post revision generation requires a git checkout");
  }
}

function isShallowRepository() {
  return gitMaybe(["rev-parse", "--is-shallow-repository"]) === "true";
}

function normalizeSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTitle(value) {
  return normalizeSlug(value).replace(/^(the)-/, "$1-");
}

function pathSlug(path) {
  const extension = extname(path).toLowerCase();
  if (!POST_EXTENSIONS.has(extension)) return null;

  let stem = basename(path, extension);
  if (path.startsWith("_posts/")) {
    stem = stem.replace(/^\d{4}-\d{1,2}-\d{1,2}-/, "");
  }
  return normalizeSlug(stem);
}

function decodeYamlScalar(raw) {
  const value = raw.trim();
  if (!value) return "";
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    if (value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to a conservative quote strip.
      }
    }
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value.replace(/\s+#.*$/, "").trim();
}

function splitFrontmatter(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    return { frontmatter: "", body: normalized };
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) return { frontmatter: "", body: normalized };
  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + 5),
  };
}

function frontmatterScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "mi"));
  return match ? decodeYamlScalar(match[1]) : null;
}

function validIsoDate(value) {
  if (!value) return null;
  const match = String(value).match(/\d{4}-\d{1,2}-\d{1,2}/);
  if (!match) return null;
  const [year, month, day] = match[0].split("-").map(Number);
  if (!year || !month || !day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function readCurrentPosts() {
  const filenames = readdirSync(POSTS_DIR)
    .filter((filename) => filename.endsWith(".mdx") && !filename.startsWith("."))
    .sort();

  return filenames.map((filename) => {
    const absolutePath = join(POSTS_DIR, filename);
    const source = readFileSync(absolutePath, "utf8");
    const { frontmatter, body } = splitFrontmatter(source);
    const slug = normalizeSlug(filename.slice(0, -4));
    const title = frontmatterScalar(frontmatter, "title") ?? slug;
    const date = validIsoDate(frontmatterScalar(frontmatter, "date")) ?? "1970-01-01";
    const summary =
      frontmatterScalar(frontmatter, "summary") ??
      frontmatterScalar(frontmatter, "description") ??
      "";

    return {
      slug,
      path: relative(REPO_ROOT, absolutePath).replaceAll("\\", "/"),
      source,
      body,
      title,
      date,
      summary,
    };
  });
}

function aliasesForCurrentSlug(slug) {
  const aliases = new Set([slug]);

  aliases.add(slug.replace(/^[0-2](?=[a-z])/, ""));
  aliases.add(slug.replace(/-post$/, ""));
  aliases.add(slug.replace(/^[0-2](?=[a-z])/, "").replace(/-post$/, ""));

  return [...aliases].filter(Boolean);
}

const MANUAL_ALIASES = new Map(
  Object.entries({
    computatrum: "computatrum-post",
    "full-stack-artificial-intelligence": "full-stack-artificial-intelligence-post",
    "the-multi-agent-network": "the-multi-agent-network-post",
    "embodied-and-situated-ai-with-feelings": "0embodied-and-situated-ai-with-feelings",
    "teaching-learning-machines": "1teaching-learning-machines",
    "self-learning-meta-learners-teach-themselves-to-teach":
      "2self-learning-meta-learners-teach-themselves-to-teach",
    "personal-ethical-dilemma": "personal-ethical-delimna",
    "why-arent-pneumatic-hydraulic-artificial-muscle-actuated-humanoid-robots-more-common":
      "why-arent-pneumatic-hydraulic-aritificial-muscle-actuated-humanoid-robots-more-common",
  }).map(([alias, slug]) => [normalizeSlug(alias), normalizeSlug(slug)]),
);

function buildPostLookup(posts) {
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const byAlias = new Map();
  const byTitle = new Map();

  for (const post of posts) {
    for (const alias of aliasesForCurrentSlug(post.slug)) {
      if (!byAlias.has(alias)) byAlias.set(alias, post.slug);
    }
    const titleKey = normalizeTitle(post.title);
    if (!byTitle.has(titleKey)) byTitle.set(titleKey, post.slug);
  }

  for (const [alias, slug] of MANUAL_ALIASES) {
    if (bySlug.has(slug)) byAlias.set(alias, slug);
  }

  return { bySlug, byAlias, byTitle };
}

function listHistoricalPostPaths() {
  const output = git([
    "log",
    "--format=",
    "--name-only",
    "--diff-filter=ACDMRT",
    "HEAD",
    "--",
    "content/posts",
    "_posts",
  ]);

  return [...new Set(output.split("\n").map((line) => line.trim()).filter(Boolean))]
    .filter((path) => POST_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)))
    .filter((path) => POST_EXTENSIONS.has(extname(path).toLowerCase()))
    .sort();
}

function latestBlobForPath(path) {
  const commit = gitMaybe(["log", "-1", "--format=%H", "HEAD", "--", path]);
  if (!commit) return null;
  const source = gitMaybe(["show", `${commit}:${path}`]);
  return source == null ? null : { commit, source };
}

function mapHistoricalPaths(paths, lookup) {
  const mapped = new Map();
  const unmatched = [];

  for (const path of paths) {
    const slugCandidate = pathSlug(path);
    let currentSlug = slugCandidate ? lookup.byAlias.get(slugCandidate) : null;
    let latest = null;

    if (!currentSlug) {
      latest = latestBlobForPath(path);
      if (latest) {
        const { frontmatter } = splitFrontmatter(latest.source);
        const title = frontmatterScalar(frontmatter, "title");
        if (title) currentSlug = lookup.byTitle.get(normalizeTitle(title));
      }
    }

    if (currentSlug && lookup.bySlug.has(currentSlug)) {
      const current = mapped.get(currentSlug) ?? [];
      current.push(path);
      mapped.set(currentSlug, current);
    } else {
      unmatched.push(path);
    }
  }

  for (const post of lookup.bySlug.values()) {
    const current = mapped.get(post.slug) ?? [];
    if (!current.includes(post.path)) current.push(post.path);
    mapped.set(post.slug, [...new Set(current)].sort());
  }

  return { mapped, unmatched };
}

function commitsForPath(path) {
  const output = gitMaybe([
    "log",
    "--follow",
    "--format=%H",
    "--diff-filter=ACMRT",
    "HEAD",
    "--",
    path,
  ]);
  return output ? output.split("\n").map((line) => line.trim()).filter(Boolean) : [];
}

function commitMetadata(commit) {
  const separator = "\u001f";
  const output = git([
    "show",
    "-s",
    `--format=%H${separator}%P${separator}%an${separator}%ae${separator}%aI${separator}%cn${separator}%ce${separator}%cI${separator}%s${separator}%B`,
    commit,
  ]);
  const [
    sha,
    parents,
    authorName,
    authorEmail,
    authoredAt,
    committerName,
    committerEmail,
    committedAt,
    subject,
    ...messageParts
  ] = output.split(separator);
  const message = messageParts.join(separator);

  return {
    commit: sha,
    parents: parents ? parents.split(" ").filter(Boolean) : [],
    authorName,
    authorEmail,
    authoredAt,
    committerName,
    committerEmail,
    committedAt,
    subject,
    message,
  };
}

function shouldIndexCommit(metadata) {
  return !/(^|\n)Revision-Index:\s*ignore\s*($|\n)/i.test(metadata.message);
}

function blobExists(commit, path) {
  return gitMaybe(["cat-file", "-e", `${commit}:${path}`]) != null;
}

function sourceAtCommit(commit, preferredPath, candidatePaths) {
  const ordered = [preferredPath, ...candidatePaths].filter(Boolean);
  for (const path of [...new Set(ordered)]) {
    if (!blobExists(commit, path)) continue;
    const source = gitMaybe(["show", `${commit}:${path}`]);
    if (source != null) return { path, source };
  }
  return null;
}

function repositoryUrl() {
  const override = process.env.POST_REVISION_REPOSITORY_URL?.trim();
  if (override) return override.replace(/\/$/, "").replace(/\.git$/, "");

  const remote = gitMaybe(["remote", "get-url", "origin"]);
  if (!remote) return "https://github.com/JacobFV/jvboid.dev";

  const scp = remote.match(/^git@github\.com:(.+?)(?:\.git)?$/);
  if (scp) return `https://github.com/${scp[1].replace(/\.git$/, "")}`;
  const https = remote.match(/^https?:\/\/github\.com\/(.+?)(?:\.git)?$/);
  if (https) return `https://github.com/${https[1].replace(/\.git$/, "")}`;
  return remote.replace(/\.git$/, "").replace(/\/$/, "");
}

function escapeMdxText(value) {
  return value.replace(/[<>]/g, (character) => (character === "<" ? "&lt;" : "&gt;"));
}

function sanitizeLegacyBody(body) {
  let result = body.replace(/\r\n/g, "\n");

  // Resolve the most common old al-folio/Jekyll URL expression directly.
  result = result.replace(
    /\{\{\s*(['"])(\/[^'"]+)\1\s*\|\s*relative_url\s*\}\}/g,
    "$2",
  );

  result = result.replace(/\{%\s*jupyter_notebook\s+(.+?)\s*%\}/g, (_match, notebook) => {
    return `> notebook embedded in the original publication: \`${escapeMdxText(notebook.trim())}\``;
  });
  result = result.replace(/\{%\s*twitter\s+(\S+?)\s*%\}/g, (_match, url) => {
    return `[view the embedded post](${url})`;
  });
  result = result.replace(/\{%\s*pdf\s+(\S+?)\s*%\}/g, (_match, url) => {
    return `[open the original PDF](${url})`;
  });
  result = result.replace(/\{%\s*cite\s+(.+?)\s*%\}/g, (_match, keys) => {
    return `(citation: ${escapeMdxText(keys.trim())})`;
  });
  result = result.replace(/\{%\s*quote(?:\s+.*?)?\s*%\}/g, "");
  result = result.replace(/\{%\s*endquote\s*%\}/g, "");
  result = result.replace(/\{%\s*bibliography(?:\s+.*?)?\s*%\}/g, "_bibliography in original publication_\n");
  result = result.replace(/^\s*\{%\s*assign\s+.+?%\}\s*$/gm, "");
  result = result.replace(
    /\{\{\s*content\.content\s*\|\s*markdownify\s*\}\}/g,
    "_dynamic biography excerpt in original publication_",
  );

  // Any remaining Liquid directive is historical template syntax, not MDX.
  result = result.replace(/\{%\s*(.+?)\s*%\}/gs, (_match, directive) => {
    return `\`historical template directive: ${escapeMdxText(directive.trim())}\``;
  });
  result = result.replace(/\{\{\s*(.+?)\s*\}\}/gs, (_match, expression) => {
    return `\`historical template expression: ${escapeMdxText(expression.trim())}\``;
  });

  // Remove active script/style blocks from historical source. The commit link
  // still exposes the exact bytes; the public reader never executes them.
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");

  // React/MDX accepts className, not class. Inline HTML style strings are not
  // valid JSX objects, so omit them rather than making old posts unbuildable.
  result = result.replace(/\sclass=(['"])(.*?)\1/gi, (_match, quote, value) => {
    return ` className=${quote}${value}${quote}`;
  });
  result = result.replace(/\sstyle=(['"])(.*?)\1/gi, "");
  result = result.replace(/<(br|hr)(\s*?)>/gi, "<$1$2 />");
  result = result.replace(/<img\b([^>]*?)(?<!\/)\s*>/gi, "<img$1 />");

  return result.trim() || "_this revision contained no post body._";
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function generatedRevisionSource(revision) {
  const fields = [
    ["postId", yamlString(revision.postId)],
    ["sequence", String(revision.sequence)],
    ["commit", yamlString(revision.commit)],
    ["shortCommit", yamlString(revision.commit.slice(0, 7))],
    ["authoredAt", yamlString(revision.authoredAt)],
    ["committedAt", yamlString(revision.committedAt)],
    ["authorName", yamlString(revision.authorName)],
    ["authorEmail", yamlString(revision.authorEmail)],
    ["committerName", yamlString(revision.committerName)],
    ["committerEmail", yamlString(revision.committerEmail)],
    ["subject", yamlString(revision.subject)],
    ["sourcePath", yamlString(revision.sourcePath)],
    ["repositoryUrl", yamlString(revision.repositoryUrl)],
    ["sourceBase64", yamlString(Buffer.from(revision.source, "utf8").toString("base64"))],
    ["title", yamlString(revision.title)],
    ["publishedDate", yamlString(revision.publishedDate)],
    ["summary", yamlString(revision.summary)],
    ["legacy", revision.legacy ? "true" : "false"],
  ];

  return `---\n${fields.map(([key, value]) => `${key}: ${value}`).join("\n")}\n---\n\n${revision.renderBody}\n`;
}

function collectRevisions(posts, mappedPaths) {
  const repoUrl = repositoryUrl();
  const metadataCache = new Map();
  const revisionsByPost = new Map();

  for (const post of posts) {
    const paths = mappedPaths.get(post.slug) ?? [post.path];
    const commitPath = new Map();

    for (const path of paths) {
      for (const commit of commitsForPath(path)) {
        if (!commitPath.has(commit)) commitPath.set(commit, path);
      }
    }

    const revisions = [];
    for (const [commit, preferredPath] of commitPath) {
      const metadata = metadataCache.get(commit) ?? commitMetadata(commit);
      metadataCache.set(commit, metadata);
      if (!shouldIndexCommit(metadata)) continue;

      const blob = sourceAtCommit(commit, preferredPath, paths);
      if (!blob) continue;

      const { frontmatter, body } = splitFrontmatter(blob.source);
      const title = frontmatterScalar(frontmatter, "title") ?? post.title;
      const publishedDate = validIsoDate(frontmatterScalar(frontmatter, "date")) ?? post.date;
      const summary =
        frontmatterScalar(frontmatter, "summary") ??
        frontmatterScalar(frontmatter, "description") ??
        post.summary;
      const legacy = blob.path.startsWith("_posts/");

      revisions.push({
        ...metadata,
        postId: post.slug,
        sourcePath: blob.path,
        repositoryUrl: repoUrl,
        title,
        publishedDate,
        summary,
        source: blob.source.replace(/\r\n/g, "\n").trimEnd(),
        body: body.replace(/\r\n/g, "\n").trimEnd(),
        renderBody: legacy ? sanitizeLegacyBody(body) : body.trim() || "_this revision contained no post body._",
        legacy,
      });
    }

    revisions.sort((left, right) => {
      const time = left.committedAt.localeCompare(right.committedAt);
      return time || left.commit.localeCompare(right.commit);
    });

    revisionsByPost.set(
      post.slug,
      revisions.map((revision, sequence) => ({ ...revision, sequence })),
    );
  }

  return revisionsByPost;
}

function writeRevisions(posts, revisionsByPost, unmatchedPaths) {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    head: git(["rev-parse", "HEAD"]),
    shallow: isShallowRepository(),
    posts: {},
    unmatchedPaths,
  };

  let revisionCount = 0;
  for (const post of posts) {
    const revisions = revisionsByPost.get(post.slug) ?? [];
    const postDir = join(OUTPUT_DIR, post.slug);
    mkdirSync(postDir, { recursive: true });

    for (const revision of revisions) {
      const filename = `${String(revision.sequence).padStart(3, "0")}-${revision.commit.slice(0, 12)}.mdx`;
      writeFileSync(join(postDir, filename), generatedRevisionSource(revision), "utf8");
      revisionCount += 1;
    }

    manifest.posts[post.slug] = {
      paths: [...new Set(revisions.map((revision) => revision.sourcePath))],
      revisions: revisions.map((revision) => ({
        commit: revision.commit,
        committedAt: revision.committedAt,
        sourcePath: revision.sourcePath,
      })),
    };
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return revisionCount;
}

function main() {
  assertGitRepository();
  if (isShallowRepository() && process.env.POST_REVISIONS_REQUIRE_FULL_HISTORY === "1") {
    throw new Error(
      "post revision generation requires full git history; configure checkout with fetch-depth: 0",
    );
  }
  const posts = readCurrentPosts();
  const lookup = buildPostLookup(posts);
  const historicalPaths = listHistoricalPostPaths();
  const { mapped, unmatched } = mapHistoricalPaths(historicalPaths, lookup);
  const revisionsByPost = collectRevisions(posts, mapped);
  const revisionCount = writeRevisions(posts, revisionsByPost, unmatched);

  const updatedPosts = [...revisionsByPost.values()].filter((revisions) => revisions.length > 1).length;
  const shallowNotice = isShallowRepository()
    ? " (warning: shallow checkout; historical revisions may be incomplete)"
    : "";
  console.log(
    `generated ${revisionCount} revisions for ${posts.length} posts; ${updatedPosts} posts have updates${shallowNotice}`,
  );
  if (unmatched.length > 0) {
    console.log(`left ${unmatched.length} historical post paths unmatched; see ${relative(REPO_ROOT, MANIFEST_PATH)}`);
  }
}

main();
