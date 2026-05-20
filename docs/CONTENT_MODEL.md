# Content model

What every node looks like and how to write one.

> **Before writing a new project**, read [PORTFOLIO_PRINCIPLES.md](./PORTFOLIO_PRINCIPLES.md)
> — it sets the 6-section MDX body template (Problem / Solution / How /
> Tests / Results / Lessons) and the rules for when a project earns a
> spotlight slot on the home page.

## Node kinds

| Kind         | Source folder         | Example                                                                  |
| ------------ | --------------------- | ------------------------------------------------------------------------ |
| `post`       | `content/posts/`      | A dated essay or note                                                    |
| `project`    | `content/projects/`   | A built thing — code, hardware, paper-grade research                     |
| `paper`      | `content/papers/`     | Academic-style writeups; cites the bib                                   |
| `reading`    | `content/readings/`   | Books, papers, courses, and articles being read or annotated             |
| `update`     | `content/updates/`    | Durable status notes, X posts, links, and embedded updates               |
| `skill`      | `content/skills/`     | Evidence-backed professional capabilities                                |
| `friend`     | `content/friends/`    | Public friend/collaborator pages                                         |
| `event`      | `content/events/`     | Conferences, talks, trips, launches, and upcoming plans                  |
| `vision`     | `content/visions/`    | Bio-level statements: focus, 5-year outlook, "what makes AI interesting" |
| `experience` | `content/experience/` | A role, residency, education entry                                       |

Slugs are filenames minus extension. Treat them as permanent — they're the URL and the graph id.

## Frontmatter

Every MDX file starts with frontmatter. Required fields per kind:

### post

```yaml
---
title: Reaching for the intangible
date: 2021-09-12
lane: writing # research | building | writing | personal
tags: [philosophy, AI]
summary: One or two sentences, shown in graph hover and cards.
hero: { src: /img/posts/intangible.jpg, alt: "..." }
influences: [the-api, the-node-neural-network]
realizes: []
critiques: []
---
```

### project

```yaml
---
title: Computatrum
date: 2021-10-19 # start date
endDate: 2022-06-01 # optional, for completed projects
lane: building
status: shipped # idea | active | shipped | shelved
tags: [agents, infra]
summary: ...
hero: { src: /img/projects/computatrum.png, alt: "..." }
# Optional. YouTube / Vimeo / self-hosted demo. Renders as a 16:9
# embed at the top of the project page.
video: https://www.youtube.com/watch?v=...
links:
  github: https://github.com/...
  demo: https://...
influences: [full-stack-artificial-intelligence]
realizes: [vision-agent-os]
---
```

For the body, follow the six-section template in
[PORTFOLIO_PRINCIPLES.md](./PORTFOLIO_PRINCIPLES.md#project-page-body-template):
Problem · Solution · How · Tests · Results · Lessons.

### paper

```yaml
---
title: ...
date: 2024-03-01
lane: research
tags: [...]
summary: ...
authors: [Jacob Valdez, ...]
venue: arXiv
bibKey: valdez2024foo # matches an entry in content/papers/refs.bib
pdf: /papers/foo.pdf
influences: [...]
---
```

### reading

```yaml
---
title: A Beautiful Loop
date: 2026-05-02 # date added or last substantially updated
lane: writing
tags: [consciousness, active-inference]
summary: Reading notes on the active-inference account of consciousness.
authors: [Ruben Laukkonen, Karl Friston, Shamil Chandaria]
workType: book # book | paper | article | course | other
status: reading # queued | reading | finished | paused | reference
source: ch. 4 # optional chapter, edition, publication, or venue
url: https://... # optional source link
influences: [vision-navigable-mind]
realizes: []
critiques: []
---
```

### update

```yaml
---
title: Reworking the site around durable updates
date: 2026-05-19
lane: building
tags: [site, updates]
summary: One-sentence summary of the update.
updateType: x-post # note | x-post | link | embed
url: https://x.com/...
embed:
  kind: x # x | url | html
  url: https://x.com/...
  alt: Accessible description of the embedded post or media.
influences: [jacobfv-site]
realizes: []
critiques: []
---
```

Embeds should preferably include `alt`, even when the embedded source also
renders visually. Prefer `embed.kind: x` for X posts so the detail page can show
the embedded-post form, with the alt text as a fallback.

### skill

```yaml
---
title: AI systems engineering
date: 2026-05-19
lane: building
tags: [ai, systems]
summary: Evidence-backed description of the capability.
category: AI engineering
level: expert # working | strong | expert
tools: [Python, TypeScript, PyTorch]
evidence: [computatrum, theagentsuite]
influences: [computatrum, theagentsuite]
realizes: []
critiques: []
---
```

### friend

```yaml
---
title: Sample Friend
date: 2026-05-19
lane: personal
tags: [friend]
summary: Public description of the person or relationship.
relation: collaborator
location: Internet
links:
  website: https://example.com
  github: https://github.com/...
influences: []
realizes: []
critiques: []
---
```

### event

```yaml
---
title: Broaden and Build Conference 2021
date: 2021-09-24
lane: research
tags: [conference, reinforcement-learning]
summary: Presented my poster on affective psychology and multi-agent reinforcement learning.
eventType: conference # conference | meetup | talk | workshop | hackathon | travel | launch | other
status: presented # upcoming | attended | presented | hosted | cancelled
role: poster presenter
venue: University of Texas at Arlington
location: Arlington, Texas
url: /assets/pdf/Broadening_and_Building_Beyond_Classical_Reinforcement_Learning.pdf
influences: [broadening-and-building-beyond-classical-reinforcement-learning]
realizes: []
critiques: []
---
```

### vision

```yaml
---
title: Where I see myself in 5 years
date: 2025-01-01 # date written; revise the date when you revise the doc
lane: personal
tags: [vision]
summary: ...
hero: { src: /img/visions/focus.png, alt: "..." }
sceneId: focus-statement # which r3f scene to mount; null = plain MDX
realizes: []
---
```

### experience

```yaml
---
title: API/Integration Architect
org: AGI, Inc.
date: 2024-01-01
endDate: 2024-12-01 # omit for current
lane: building
tags: [agents, mobile]
summary: One-sentence role description.
links:
  org: https://agi.app
---
```

## Edges file

`src/data/edges.ts` adds relationships that don't fit naturally inside any single node's frontmatter — usually retroactive observations.

```ts
import type { Edge } from "@/lib/graph";

export const manualEdges: Edge[] = [
  {
    source: "self-organized-criticality",
    target: "the-fertile-crescent",
    kind: "influence",
    weight: 0.8,
    note: "SOC framing reappears as the dynamics layer.",
  },
  // ...
];
```

Rules:

- Source and target must be valid node ids. Build fails otherwise.
- Don't duplicate frontmatter relationships here.
- Add `note` whenever the edge isn't self-explanatory — it shows on hover.

## Latest update

The homepage and floating dock point at the newest `content/updates/*.mdx`
node by `date`.

## Lanes

Lanes are the timeline's horizontal swimlanes. Pick exactly one per node:

- `research` — papers, theory, deep notes
- `building` — projects, products, infra, hardware
- `writing` — posts, essays, readings, the book
- `personal` — visions, life, experience entries, friends, personal events

Don't add new lanes without a design discussion — they shape the timeline.

## Status (projects only)

- `idea` — written down, not started
- `active` — currently working on
- `shipped` — released, in use
- `shelved` — paused or abandoned, kept for the record

Visualized as the project node's color/opacity in both views.

## Authoring rules

- Every new node gets at least one `influences` entry. Empty influence lists are a red flag.
- `summary` is required; if you can't write one, the node isn't ready.
- Hero images are optional but heavily preferred — the graph cards look thin without them.
