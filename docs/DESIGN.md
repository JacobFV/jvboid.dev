# Design

Visual and motion language. Source of truth for the look.

## Mood

Cinematic, quiet, instrument-grade. Think _Linear's marketing site_ meets _Distill articles_ meets a planetarium. Not playful, not corporate. Confident negative space. Type does the heavy lifting; motion is the seasoning.

## Color

One palette, dark-first. Light mode is a derived inversion, not a separate design.

```
--bg-0      #08090B   page
--bg-1      #0E1014   panels
--bg-2      #15181E   cards
--ink       #F2F4F8   primary text
--ink-dim   #9097A3   secondary text
--ink-mute  #5A6070   tertiary, axis labels
--accent    #FF6B35   single accent, used sparingly: hover, active edges, CTA
--lane-research  #6FA8DC
--lane-building  #93C47D
--lane-writing   #C27BA0
--lane-personal  #F1C232
```

The lane colors are the only way nodes vary chromatically. Status (idea/active/shipped/shelved) modulates opacity and stroke, not hue.

## Typography

- **Display / hero** — `Fraunces` (variable, opsz). Tight tracking. Used for node titles in detail mode and chapter headers in `/loop`.
- **Body** — `Inter` (variable). 17px / 1.6 on desktop. Generous measure (~70ch).
- **Mono** — `JetBrains Mono`. Code, captions in figures, the latest update dock.

Self-host all three via `next/font`. No CDN fonts.

## Grid & spacing

8px base. Container max 1280px on the document view; constellation and timeline are full-bleed.

## Motion

Three primitives, used everywhere:

1. **Shared layout** — Framer Motion `layoutId`. Every transition between graph and document uses it. Spring: `{ stiffness: 220, damping: 30 }`.
2. **Camera moves** — when the constellation reflows around an opened node, all unrelated nodes ease out to the dim periphery (`opacity: 1 → 0.18`, `scale: 1 → 0.85`). 700ms, `easeOut`.
3. **Scrub** — for `/loop` and the 3D vision room, scroll progress drives values directly. No discrete states.

Rules:

- Nothing under 120ms (looks broken) or over 900ms (feels sluggish).
- Reduced-motion users get cross-fades only. Test with `prefers-reduced-motion: reduce`.
- No bouncy springs except on Cmd-K open.

## The constellation visual

- WebGL via React Flow's edge renderer + a custom node renderer for performance at ~150 nodes.
- Nodes = 64×40 cards with title, lane stripe (4px left), and a tiny status dot.
- Force layout: charge -340, link distance based on edge weight (60 + 100 \* (1 - weight)), gravity 0.04. Re-runs once on load, then nodes are static unless filtered.
- Edges are thin curved lines, opacity tied to weight. Influence = solid, realization = dashed, critique = dotted.
- Hovering a node fades all non-neighbor edges and nodes to 0.18 opacity.
- Background: very subtle radial gradient from `--bg-0` to `#04050A`. No grid.

## The timeline visual

- React Flow with `panOnDrag` constrained to the x-axis.
- Year labels at the top in `--ink-mute` mono.
- Four lane bands (research / building / writing / personal) separated by 1px hairlines in `--bg-2`.
- Same node cards as the constellation, anchored at `(date, lane)`.
- Influence arrows curve between lanes; arrows pointing forward in time are solid, retrocausal references (a new post pointing back to an old one) are dashed.

## The 3D vision room

- Volumetric, dark, foggy. `<Fog color="#08090B" near={6} far={28} />`.
- Camera dollies along a Bezier path defined per scene.
- Panels are floating frosted-glass planes (`MeshTransmissionMaterial` from drei) with MDX rendered to texture.
- One audio cue on enter (low ambient pad), respects mute.

## /loop visual

- Light by default — inverted from the rest of the site. The book is meant to read like a document.
- Wide measure for the chapter intro, then narrows to a body column.
- Figures occupy the full container width; sticky chapter title when scrolling.
- Dark mode toggle still available; the right-rail mini-constellation stays dark in both.

## Cmd-K

- Centered modal, 640px wide, glassy backdrop blur.
- Sections: _Search results_, _Actions_, _Recent_. Arrow-key navigable.
- Open: spring up from 96% scale + fade. Close: fade only.

## Latest Update Dock

- Bottom-left, fixed, 300px × auto. Frosted-glass panel.
- Three lines max: label/date, title, compact summary.
- Click opens the newest `update` node.
- Hides on `/loop` reading mode and during 3D scenes.

## Iconography

Minimal. Lucide icons at 16px in chrome only. The graph uses no icons — title text and lane color are enough.

## Accessibility

- All graph interactions have a keyboard equivalent (tab through nodes, enter to open, escape to close).
- 3D scenes detect `prefers-reduced-motion` and offer a "skip to text" link.
- Color contrast 4.5:1 minimum on body text against any background.
- Cmd-K is the screen-reader-friendly nav: every page reachable from there.

## Sound

Off by default. Optional ambient pad in `/loop` and the vision room only. A single audio toggle in chrome.

## What we don't do

- Skeuomorphic anything.
- Parallax on regular pages — only inside `/loop` chapters where it earns its keep.
- Auto-playing video.
- Decorative illustrations. Every visual element either _is_ content or guides attention to content.
