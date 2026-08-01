# Post revisions

Every post page exposes the git history of its source document. The feature is
fully static at runtime: the build turns reachable git commits into Velite MDX
records, and the browser receives only the revisions for the post being viewed.
No GitHub API request is made by the deployed site.

## Build pipeline

1. `scripts/generate-post-revisions.mjs` enumerates current
   `content/posts/*.mdx` posts.
2. It discovers every reachable commit that touched either the current MDX path
   or the corresponding legacy Jekyll `_posts/YYYY-M-D-slug.md` path. Known
   migration aliases such as `computatrum` → `computatrum-post` are resolved.
3. Commit author, committer, timestamps, subject, source path, raw body, and
   repository URL are written to ignored
   `content/_generated/post-revisions/**/*.mdx` files.
4. Velite compiles those files into `.velite/postRevisions.json` together with
   the rest of the content graph.
5. `PostRevisionExperience` renders the selected compiled body. Its optional
   line diff compares the selected source body with its immediately preceding
   indexed revision; removals are red and additions are blue.

The deploy workflow checks out with `fetch-depth: 0`. It also sets
`POST_REVISIONS_REQUIRE_FULL_HISTORY=1`, which makes a shallow build fail rather
than silently publish an incomplete revision menu.

## Repository URL

Commit links normally come from `git remote get-url origin`. Set
`POST_REVISION_REPOSITORY_URL` when building from a local bundle or a temporary
remote; for example:

```sh
POST_REVISION_REPOSITORY_URL=https://github.com/JacobFV/example pnpm build
```

## Historical rendering

Legacy Jekyll bodies are converted conservatively at build time. Passive
Markdown and HTML are retained. Liquid includes are rendered as explicit
historical placeholders or links, and old script/style blocks are never
executed. The exact source remains available through the commit link.

A deliberately synthetic history-junction commit can opt out of the public
revision index with this commit-message trailer:

```text
Revision-Index: ignore
```
