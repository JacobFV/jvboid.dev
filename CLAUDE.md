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
- **Contact details live in env, never in code.** `CONTACT_PHONE` and
  `CONTACT_EMAIL` go through `revealContact()` server action behind a
  math captcha. Don't hard-code or expose them in client bundles.
- **Client-safe imports.** `src/lib/graph-types.ts` holds the pure types
  + `nodeHref`. `src/lib/graph.ts` holds `getGraph()` and pulls in
  `node:fs`. Client components import from `graph-types`. Don't merge
  them — webpack will fail the build.
- **Canonical URLs.** Every node lives at `/{kind-plural}/{slug}`. Use
  `nodeHref(node)` to compute links. Bare kind paths such as `/projects`
  are collection pages; old flat `/{slug}` routes should 404.
- **Auto-deploy.** Pushing to `main` triggers a Vercel build. There is
  no separate deploy step. Env vars are managed in the Vercel dashboard.

## Quick sanity checks before committing

```bash
pnpm exec tsc --noEmit         # types
pnpm dev                       # spot-check the page you changed
```

If a change touches a visual route or interactive component, open the page
in a browser — TypeScript can't catch z-stack regressions or animation
jank.
