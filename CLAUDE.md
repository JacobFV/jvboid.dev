# Agent notes — jacobfv-site

Things future agents (Claude, Codex, whatever) should keep in mind when
editing this repo.

## Read before touching routes or projects

- **[docs/PORTFOLIO_PRINCIPLES.md](docs/PORTFOLIO_PRINCIPLES.md)** — the
  five portfolio rules (quality over quantity, document everything,
  visuals are a must, soft-skills evidence, CV+contact) and how this
  codebase implements each. The audit checklist at the bottom is the
  short version.
- **[docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md)** — frontmatter shape
  per kind, plus the six-section MDX body template for projects.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — overall system shape.
- **[docs/DESIGN.md](docs/DESIGN.md)** — token system, light/dark theme.

## House rules

- **No `/list` or standalone `/graph` page.** Broad browsing should happen
  through dedicated kind indexes like `/projects`, `/posts`, and
  `/readings`. Graph context belongs at the bottom of content pages.
- **The update stream is delisted.** `update` nodes are unlisted
  site-wide via `DELISTED_KINDS` in `src/lib/graph.ts` — no home-page
  section, no dock, no nav entry, no feed/sitemap/search presence. The
  `/updates` archive and the individual pages still resolve by URL so old
  links don't break. Don't re-surface them; see
  [CONTENT_MODEL.md](docs/CONTENT_MODEL.md#updates-are-delisted).
- **Contact details live in env, never in code.** `CONTACT_PHONE` and
  `CONTACT_EMAIL` reach the browser only through the `getCallNumber()` /
  `getContact()` server actions, when someone opens the call or message
  sheet. There is no captcha in front of them any more — Jacob removed it
  on purpose — but don't hard-code them or put them in client bundles.
- **The ask bar sends through a Cloudflare Worker.** `workers/contact` is a
  Worker plus a per-IP Durable Object (the rate limit) that emails each
  message, attachments included, from `contact@jvboid.dev` via Email
  Routing's `send_email` binding. It is deployed separately — `npx wrangler
  deploy` from `workers/contact`, on Jacob's Cloudflare account — never by
  Vercel, and its destination is the `TO_ADDRESS` secret, not config. It
  only accepts the origins in its `ALLOWED_ORIGINS` var, so a Vercel
  preview URL cannot send. It is excluded from the site's `tsc`.
- **`/login` is Jacob's way in, and nothing links to it.** One password,
  no username. Nothing surfaces it: no nav entry, no ⌘K action, not in
  the sitemap, `Disallow: /login` in `robots.ts`. It is a public URL like
  every other — don't pretend otherwise, and don't "fix" its obscurity by
  adding a link to it. The thing actually protecting it is
  `workers/auth`, a second Cloudflare Worker that owns the password,
  emails Jacob about every attempt, and writes `login:enabled = off` in
  KV after five failures in a UTC day. Nothing on the site can undo that
  lockout; Jacob flips the key back by hand in the Cloudflare dashboard.
  Deployed separately, like `workers/contact` — see
  [workers/auth/README.md](workers/auth/README.md).
- **The pencil edits bodies, never frontmatter.** When Jacob is signed in
  the header grows a ✎ beside the theme toggle on any page that rendered
  an `<EditableBody>`; it swaps the prose for a textarea and commits to
  `main` through the GitHub API, which triggers the usual Vercel
  rebuild. `src/lib/content-actions.ts` splits the `---` block off on the
  way out and re-attaches it from a fresh read on the way in, so no
  amount of typing can produce a file velite refuses — on a site that
  rebuilds on every push, a bad frontmatter field is a failed deploy, not
  a bad paragraph. The browser sends a *kind and an id*, never a path;
  the path is derived server-side from the content registry
  (`nodeContentPath` / `chapterContentPath`), so there is nothing to
  traverse out of.
- **Client-safe imports.** `src/lib/graph-types.ts` holds the pure types
  + `nodeHref`. `src/lib/graph.ts` holds `getGraph()` and pulls in
  `node:fs`. Client components import from `graph-types`. Don't merge
  them — webpack will fail the build.
- **Projects own their own media.** Nothing is hoisted above a project
  page from frontmatter — `hero`, `video`, `pdf`, and `links.demo` are
  card art and metadata. A project page shows an image, deck, clip, or
  live app only because its MDX body places one (`![]()`, `<Pdf>`,
  `<Video>`, `<LiveDemo>`). Read the body first: the artifact is often
  already there, and adding it again just repeats it. See
  [CONTENT_MODEL.md](docs/CONTENT_MODEL.md#project-media).
- **Canonical URLs.** Every node lives at `/{kind-plural}/{slug}`. Use
  `nodeHref(node)` to compute links. Bare kind paths such as `/projects`
  are collection pages; old flat `/{slug}` routes should 404.
- **Papers and readings link out.** Neither kind has a page here — a
  cover or title opens the PDF/publisher page itself, and
  `/papers/{id}` · `/readings/{id}` redirect there. Link them with
  `nodeLinkHref(node)`, not `nodeHref(node)`. See
  [CONTENT_MODEL.md](docs/CONTENT_MODEL.md#paper).
- **Auto-deploy.** Pushing to `main` triggers a Vercel build. There is
  no separate deploy step. Env vars are managed in the Vercel dashboard. The
  editor needs six of them there: `SESSION_SECRET` (signs the session
  cookie), `AUTH_WORKER_URL` + `AUTH_SHARED_KEY` (must match the auth
  Worker's `SHARED_KEY`), `GITHUB_TOKEN` (fine-grained PAT, Contents:
  read/write), and optionally `GITHUB_REPO` / `GITHUB_BRANCH`, which
  default to `JacobFV/jvboid.dev` and `main`.
- **Commit *and push* your own work. Don't ask.** When a piece of work
  is finished and validated, commit it and push it — you do not need
  permission for either, and you should not end a turn leaving the tree
  dirty, or leaving commits sitting unpushed on `main`. Two sessions'
  worth of uncommitted worlds once piled up here because each one
  stopped to ask. Split into a few honest commits, write the repo's kind
  of message (lowercase subject, a body that says *why*), and make sure
  **every commit builds on its own**: the atmospheres, their entry in
  `worlds.ts`, their registration in `reader/components.tsx` and the MDX
  that places them are one unit, and a commit carrying only half of it
  fails on a missing module.

  Push because the push *is* the feedback. Jacob works here in small
  single changes and then looks at jvboid.dev to see them — a change
  parked on a local commit is a change he cannot see, and asking "want
  me to push?" just adds a round trip to something the answer is always
  yes to. So: finish, type-check, commit, push, and say what landed.
  The only reason to stop and ask first is a genuinely destructive or
  hard-to-undo git operation — a force-push, a history rewrite, a branch
  deletion — not an ordinary push of new commits.

## Quick sanity checks before committing

```bash
pnpm exec tsc --noEmit         # types — cheap, run this freely
```

**Don't start `pnpm dev` or `pnpm build` unless asked.** Several agents
work in this repo at once, so a build competes for the dev port and for
CPU, and `predev` rewrites shared generated output (`.velite/`,
`content/_generated/`) underneath whoever else is running — a half-written
`.velite/postRevisions.json` takes down every other dev server with a JSON
parse error. Type-check instead, and describe what should be spot-checked
visually rather than spinning up a server to look yourself.

If a change touches a visual route or interactive component it does still
need eyes in a browser — TypeScript can't catch z-stack regressions or
animation jank. Ask the user to look, or use the dev server they already
have running; don't launch a second one.
