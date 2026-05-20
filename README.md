# jacobfv-site

Personal site for Jacob Valdez — a navigable map of projects, writing, and visions, not a list of pages.

Replaces the current Jekyll/al-folio site at `../jacobfv.github.io` with a Next.js app where every artifact is a node in a graph and the navigation _is_ the relationship between them.

## Status

**Skeleton only.** Directory layout, configs, and docs are in place. No application code yet. The implementation prompt for a fresh Claude session is in [`docs/IMPLEMENTATION_PROMPT.md`](docs/IMPLEMENTATION_PROMPT.md).

## North star

> _The mind of Jacob, navigable._

Three viewing modes over one URL space, no full page reloads:

1. **Constellation** (`/`) — force-directed graph in WebGL. Nodes = projects, posts, papers, readings, updates, skills, friends, events, visions, experience. Edges = influence, realization, critique.
2. **Timeline** (`/t`) — same graph projected onto a horizontal time axis, lanes for research / building / writing / personal, curved influence arrows between lanes.
3. **Document** (`/[slug]`) — polymorphic detail view. The opened node fills the screen; the graph slides to a sidebar minimap.

Plus:

- **`/loop`** — _A Beautiful Loop_ book draft as a scrollytelling experience.
- **3D vision room** — `_bio/focus-statement` and 5-year-vision essays rendered as a Three.js scene the visitor walks through.
- **Cmd-K palette** — replaces nav. Jump to any node, switch modes, search.
- **latest update dock** — persistent corner widget pointing at the newest durable update node.

## Stack

- Next.js 15 (App Router) + TypeScript + React 19
- MDX content via Velite (typed at build time)
- Tailwind CSS v4 + shadcn/ui chrome
- Framer Motion (shared-layout transitions, view-transitions API)
- React Flow (constellation 2D + timeline lanes)
- react-three-fiber + drei (3D vision room, select project showcases)
- Lenis (smooth scroll for `/loop`)
- Pagefind or Fuse.js (client-side search powering Cmd-K)
- citation-js (renders the existing `.bib` inline)
- Hosted on Cloudflare Pages or Vercel; static-first

## Repo layout

```
jacobfv-site/
├── content/                  # MDX, one folder per node type
│   ├── posts/                # blog posts
│   ├── projects/             # projects
│   ├── papers/               # papers + .bib references
│   ├── readings/             # books, papers, courses, articles being read
│   ├── updates/              # durable status notes, links, X posts, embeds
│   ├── skills/               # evidence-backed professional capabilities
│   ├── friends/              # public friend/collaborator pages
│   ├── events/               # conferences, talks, trips, launches, upcoming plans
│   ├── visions/              # bio essays, focus statement, 5-year vision
│   └── experience/           # roles, education
├── src/
│   ├── app/                  # Next App Router
│   │   ├── (graph)/          # / and /t share the graph layout
│   │   ├── [slug]/           # polymorphic node detail
│   │   ├── loop/             # scrollytelling book
│   │   └── api/              # search index, etc.
│   ├── components/
│   │   ├── graph/            # React Flow nodes, edges, force layout
│   │   ├── three/            # r3f scenes
│   │   ├── reader/           # MDX renderer, lineage widget
│   │   ├── chrome/           # dock, Cmd-K, transitions
│   │   └── ui/               # shadcn primitives
│   ├── lib/
│   │   ├── graph.ts          # node/edge types, layout helpers
│   │   ├── mdx.ts            # MDX components map
│   │   └── search.ts         # client search
│   └── data/
│       └── edges.ts          # hand-curated relationships (see ARCHITECTURE.md)
├── public/
├── docs/
│   ├── ARCHITECTURE.md       # how the graph + modes fit together
│   ├── CONTENT_MODEL.md      # node types, frontmatter, edges schema
│   ├── DESIGN.md             # motion, typography, color, sound
│   ├── PORTFOLIO_PRINCIPLES.md  # what makes a portfolio worth visiting
│   ├── ROADMAP.md            # phased plan: skeleton → cutover
│   └── IMPLEMENTATION_PROMPT.md  # paste into a fresh Claude session
├── CLAUDE.md                 # agent-facing notes; read before edits
├── velite.config.ts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Migration approach

Two phases — no big-bang rewrite:

1. **Greenfield.** Build here, ship to `v2.jacobfv.com`. Old Jekyll keeps serving the live site.
2. **Cutover.** When parity is reached for the top-traffic pages (home, ~10 projects, ~10 posts, bio, papers), 301 old URLs to new slugs. Long-tail posts ship in waves.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased breakdown.

## Honest tradeoff

The graph is only as good as the edges. Hand-curated `data/edges.ts` plus per-frontmatter `influences:` arrays is the operating cost of this design. Authoring the graph as a side-effect of writing keeps it cheap; treating it as a separate maintenance chore will let it go stale.

## Local dev (after implementation)

```bash
pnpm install
pnpm dev          # next dev with velite watcher
pnpm build        # static export to .next/
```
