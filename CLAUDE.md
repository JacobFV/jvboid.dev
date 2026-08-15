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
  `CONTACT_EMAIL` go through `revealContact()` server action behind a
  math captcha. Don't hard-code or expose them in client bundles.
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
  no separate deploy step. Env vars are managed in the Vercel dashboard.
- **Commit your own work. Don't ask.** When a piece of work is finished
  and validated, commit it — you do not need permission, and you should
  not end a turn leaving the tree dirty for someone else to find. Two
  sessions' worth of uncommitted worlds once piled up here because each
  one stopped to ask. Split into a few honest commits, write the repo's
  kind of message (lowercase subject, a body that says *why*), and make
  sure **every commit builds on its own**: the atmospheres, their entry
  in `worlds.ts`, their registration in `reader/components.tsx` and the
  MDX that places them are one unit, and a commit carrying only half of
  it fails on a missing module. Pushing is the deploy, so that is still
  the one step worth naming out loud before you take it.

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
