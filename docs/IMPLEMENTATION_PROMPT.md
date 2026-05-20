# Implementation prompt

Open a fresh Claude Code session in `~/Code` (so it can see both `jacobfv-site/` and `jacobfv.github.io/`) and paste the prompt below.

The prompt is self-contained: it tells Claude what the goal is, where the existing site lives, where the new repo lives, what to read first, and how to work in phases.

---

## PROMPT START

I want you to implement the Next.js rewrite of my personal site.

**Context.** Two sibling directories matter:

- `~/Code/jacobfv.github.io/` — the archived Jekyll/al-folio site. Historical source material only. Do not modify it.
- `~/Code/jacobfv-site/` — the new repo. Currently empty of code but fully scaffolded with directory structure, configs, and design docs. This is where you will work.

**Read these first, in order.** They are not boilerplate; they encode the design.

1. `~/Code/jacobfv-site/README.md` — north star and stack.
2. `~/Code/jacobfv-site/docs/ARCHITECTURE.md` — data flow, node/edge model, routing, transitions.
3. `~/Code/jacobfv-site/docs/CONTENT_MODEL.md` — frontmatter schemas per node kind.
4. `~/Code/jacobfv-site/docs/DESIGN.md` — color, typography, motion language. Follow it.
5. `~/Code/jacobfv-site/docs/ROADMAP.md` — the phases. Work them in order. Do not skip ahead.

Also skim:

- `~/Code/jacobfv-site/package.json` — declared dependencies. Use these versions; add to them only if necessary.
- `~/Code/jacobfv-site/velite.config.ts` — the content schema, already wired.
- `~/Code/jacobfv.github.io/_pages/`, `_posts/`, `_projects/`, `_bio/`, `_bibliography/` — historical source material if you need to check an old page.

**How to work.**

- Implement Phase 1 (walking skeleton) end-to-end before touching Phase 2.
- After each phase, stop and run `pnpm typecheck && pnpm build`. Both must pass before moving on.
- Commit at phase boundaries with messages like `feat(phase-1): walking skeleton — content pipeline + plain detail pages`.
- Use `pnpm` (declared in `packageManager`). Do not switch to npm or yarn.
- The site is static-first. Avoid SSR features unless a phase explicitly calls for them.
- Match the design doc's color tokens, typography, and motion specs exactly. The 200ms-spring shared-layout transition between graph card and document hero is the single most important interaction; do not ship Phase 4 without it feeling right.
- Do not auto-generate `influences`/`realizes`/`critiques` edges during migration — those are hand work, left empty by the migration script.
- Do not create new top-level documentation files. If you need to capture a decision, add it as a section in the relevant existing doc.

**Phase 1 specifics — start here.**

Goal: `pnpm dev` boots the app, reads MDX from `content/`, lists nodes at `/`, renders any node at `/[slug]`. No graph, no animation. Three sample MDX files in each `content/` subfolder so the layout has things to render — write them yourself, brief and plausible.

Concretely for Phase 1:

1. Initialize `pnpm install`.
2. Wire Velite into `next dev` (postbuild script or the `velite/next` plugin).
3. Create `src/lib/graph.ts` exporting the `Node` and `Edge` types per ARCHITECTURE.md, and a `getGraph()` function that merges Velite collections + `src/data/edges.ts` into a typed `Graph`.
4. Create `src/app/layout.tsx`, `src/app/globals.css` (Tailwind v4 with the design tokens from DESIGN.md as `@theme` CSS variables), and the Fraunces / Inter / JetBrains Mono fonts via `next/font`.
5. `src/app/page.tsx` — plain `<ul>` of every node, sorted by date desc, linking to `/[slug]`.
6. `src/app/[slug]/page.tsx` — looks up the node by id, renders title + summary + MDX body. Polymorphic on `kind` is fine to leave for Phase 4; for now any kind renders the same template.
7. Three sample MDX files in each of `content/posts/`, `content/projects/`, `content/papers/`, `content/visions/`, `content/experience/`, plus durable update nodes in `content/updates/`.
8. `pnpm typecheck && pnpm build` both pass.

Stop after Phase 1, summarize what you built, and ask before starting Phase 2.

**When you hit ambiguity** (a design choice not covered in the docs), make the smallest reasonable decision, note it in your phase summary, and keep moving. Don't ask me to clarify trivial things; do ask before diverging from the docs in a way that would require redoing work later.

Work from `~/Code/jacobfv-site/`. Don't `cd` into the old site. When you need to reference content, read it directly from `~/Code/jacobfv.github.io/...`.

Begin with Phase 1.

## PROMPT END

---

## Notes for the human running this

- A fresh session is recommended because the design docs are long and you want them to enter the new session's context cleanly, not as the tail end of a planning conversation.
- Claude will need network access to install npm packages on first run. If the sandbox blocks `pnpm install`, run it yourself once and then resume the session.
- After Phase 1 lands, you can choose to keep the same session for Phase 2+ or open another fresh one. Phases are designed to be picked up from a cold start: each phase's "Deliverables" + the docs are enough context.
- The migration script (Phase 2) reads from `../jacobfv.github.io/` via a relative path. Keep the two repos as siblings under `~/Code/`.
