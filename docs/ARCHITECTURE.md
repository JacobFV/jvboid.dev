# Architecture

How the pieces fit. Read this before writing code.

## Data flow

```
content/**/*.mdx
        │  (Velite reads frontmatter + body)
        ▼
.velite/                 ← typed JSON: nodes per collection
        │
        │  src/data/edges.ts (hand-curated relationships)
        │
        ▼
src/lib/graph.ts         ← merges nodes + edges → Graph
        │
        ├──► <Constellation/>  (React Flow + force layout)
        ├──► <Timeline/>       (React Flow with x-axis = date, lanes)
        ├──► <NodeDetail/>     (MDX renderer + lineage widget)
        └──► <CmdK/>           (Fuse index over node titles + tags + body)
```

Single source of truth: the merged `Graph`. Every view is a projection.

## Node model

Ten node kinds, all share a base:

```ts
type NodeKind =
  | "post"
  | "project"
  | "paper"
  | "reading"
  | "update"
  | "skill"
  | "friend"
  | "event"
  | "vision"
  | "experience";

type Node = {
  id: string; // stable slug, used in URLs
  kind: NodeKind;
  title: string;
  date: string; // ISO; for projects, the start date
  endDate?: string; // for experience and multi-year projects
  lane: "research" | "building" | "writing" | "personal";
  tags: string[];
  summary: string; // 1–2 sentences, shown in cards & graph hover
  body: string; // MDX-compiled HTML or raw for client MDX
  hero?: { src: string; alt: string };
  influences?: string[]; // ids of nodes this node draws from
  realizes?: string[]; // ids of visions/ideas this node makes real
  critiques?: string[]; // ids this node argues against
};
```

`influences` / `realizes` / `critiques` are inline in frontmatter so writing a post inherently grows the graph. `src/data/edges.ts` adds anything cross-cutting that doesn't belong in any single node's frontmatter (e.g., "this paper inspired this whole research lane").

## Edge model

```ts
type EdgeKind = "influence" | "realization" | "critique" | "collaboration";

type Edge = {
  source: string; // node id
  target: string; // node id
  kind: EdgeKind;
  weight?: number; // 0–1, controls visual prominence
  note?: string; // optional one-liner, shown on hover
};
```

Edges are derived from frontmatter first, then `edges.ts` augments. Duplicates dedupe by `(source,target,kind)`.

## Routing

App Router, no traditional page reloads — every "navigation" is a Framer Motion shared-layout animation.

| Route             | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `/`               | Constellation. Default mode.                             |
| `/t`              | Timeline. Same graph, different projection.              |
| `/[slug]`         | Node detail. Slug = node id. Polymorphic by `node.kind`. |
| `/loop`           | A Beautiful Loop scrollytelling. Standalone layout.      |
| `/loop/[chapter]` | Chapter routes within Loop.                              |
| `/updates`        | Latest durable updates.                                  |
| `/events`         | Conferences, talks, trips, launches, and upcoming plans. |
| `/api/search`     | Client search index endpoint (or static JSON).           |

The `(graph)` route group shares a single layout that mounts the graph canvas once, so switching `/` ↔ `/t` is a state change, not a remount. Opening a node from either view animates _into_ `/[slug]` without unmounting the graph (it slides to a minimap).

## Modes & transitions

Three modes, one URL pattern:

- `mode=constellation` → 2D force graph
- `mode=timeline` → React Flow on a date axis
- `mode=document` → graph minimap + reader

Mode is encoded in the route, not URL params. Cmd-K can switch modes. Back button restores prior mode.

Transitions:

- **Card → document.** Framer Motion `layoutId="node-{id}"` shared between the graph card and the document hero. Click = the card grows; URL changes; graph background fades and shrinks.
- **Constellation → timeline.** All node positions interpolate from force-graph coords to (x = date, y = lane). React Flow doesn't tween node positions natively; we drive position changes through Motion values and feed them into React Flow's controlled `nodes` state.
- **Document → graph.** Reverse. Reader scales down; minimap expands; landed view = the originating mode.

## 3D vision room

Separate r3f scene mounted only on `/visions/[slug]` for nodes with `kind="vision"`. Other nodes render as plain MDX. Scene structure:

```
<Canvas>
  <ScrollControls pages={N}>
    <FocusStatementPanel />     ← textured plane with focus-statement.png
    <FloatingEssayPanels />     ← MDX rendered to textures
    <CTAExit />
  </ScrollControls>
</Canvas>
```

Falls back to a regular MDX layout if WebGL unavailable.

## Loop scrollytelling

`/loop` is its own world. Lenis smooth scroll. Each chapter MDX uses custom components:

- `<Scene>` — pins until scroll progress hits a threshold
- `<Figure animate={...}>` — SVG/canvas figures that interpolate with scroll
- `<Sidetrack to="post-slug" />` — opens a node popover without leaving the chapter

Right rail keeps the constellation alive in miniature so a reader can branch out and snap back.

## Lineage widget

At the top of every `/[slug]` for posts/projects:

```
[← 3 influences]   THIS NODE   [3 things it influenced →]
```

Hovering a chip previews; clicking does the shared-layout transition. Computed from edges on the server, hydrated as a client component.

## Cmd-K

Fuse.js index built at build time from `nodes.title`, `nodes.tags`, `nodes.summary`. Actions beyond search:

- "Switch to constellation / timeline"
- "Toggle dark"
- "Open most recent post"
- "Show me everything about RL" → filtered constellation

## Search & static-first

Site is statically rendered. Search index is a single JSON file fetched on first Cmd-K open. No server needed at runtime.

## Resume generation

`/resume` is not authored; it's projected from `kind=experience` nodes sorted by date, with `?format=pdf` triggering a Puppeteer build step (or `react-pdf` client render) to produce a printable artifact.

## Performance targets

- LCP < 1.5s on the constellation. Graph hydrates after first paint.
- 60fps on the constellation up to ~200 nodes (current content size: ~150).
- 3D scenes lazy-loaded, only on vision routes.
- Total JS for `/` < 200KB gzipped after code-split.

## Non-goals

- No CMS. Content is MDX in this repo, period.
- No comments, no analytics beyond a privacy-respecting tracker.
- No SSR-time database. Build-time only.
