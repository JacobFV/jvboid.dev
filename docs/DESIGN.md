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

## Backdrop

A bioluminescent mesh in the page margins
(`components/chrome/Bioluminescence.tsx`), over flat `--color-bg-0`.

**The rule it exists to satisfy: nothing chromatic or moving inside the
content measure.** The previous backdrop — a depth-sorted stack of
parallax planes, CSS gas plus canvas fluid tracers — was deleted for
breaking exactly that. It painted tinted moving texture across the full
viewport, so a reading column's ground shifted hue and value every
couple hundred pixels. Whatever lives back here has to stay in the
gutters.

The field is generated in **document space**: a node at document
`y = 8400` stays at 8400, so scrolling reveals successive parts of one
long organism rather than replaying a viewport-local loop. The canvas
stays `fixed` and viewport-sized and folds scroll into its draw
transform — a canvas literally as tall as the document would exceed the
browser's per-side limit on long pages, for a backing store that is
~99% off screen.

Density peaks at the viewport edge and Gaussian-decays inward:

```
band  = max(gutter, 74)            # gutter = (width - 1024) / 2, floored at 0
d     = min(x, width - x)          # distance in from the nearer edge
alpha = exp(-(d / (band * 0.62))²) * encroach
```

The falloff is normalised against the **band**, not the viewport — so it
reaches ~0.07 at the band's inner limit rather than 0.4.

On wide viewports the band *is* the gutter, so the mesh dies before the
content column. Narrow viewports (phones, split windows, zoomed-in
desktops) have no gutter at all, and the band falls back to a 74px
minimum that is partly borrowed from the column. `encroach` pays for
that: it scales from 1 down to 0.3 as the real gutter disappears, so
what lands on a phone is a faint fringe in the container's own `px-6`
padding rather than a network behind the words. Below 260px the
component draws nothing.

Node sampling uses a band shortened by the maximum drift excursion, so
the guarantee survives the motion — a node cannot wander past the
boundary its alpha was computed for.

Placement is rejection-sampled against smooth 2D value noise, which is
what stops it reading as a CSS gradient with dots on it: the mesh grows
patches that reach further inward and patches that are nearly empty.

Three spatial scales are drawn, largest first:

| scale | what | size |
| --- | --- | --- |
| membrane | bezier folds walking down the gutter, 3–5 near-parallel strands | ~400–700px |
| filament | the network proper — sparse geometric graph, ≤3 curved edges per node | ~40–120px |
| node | point plus a two-circle halo | ~1–4px |

Geometry is seeded per 700px block (`mulberry32(chunkIndex)`), so block
17 is always block 17 — resizing doesn't reshuffle the page, and only
the visible ±1 blocks are ever built. Membrane alpha runs a
sine envelope across its own block, so strands dissolve rather than
terminating on the generation grid.

Dark mode composites `lighter` (emissive points on a night field); light
mode composites `source-over` in ink, since paper doesn't glow and
additive blending over near-white erases itself.

Motion is two superposed terms. Each node wanders independently
(amplitude scaled to the band, periods of 40–160s), and on top of that a
slow standing wave keyed to position moves neighbours *together*, so
whole patches of mesh breathe instead of every point jittering alone.
Membranes sway on their own long periods. The field should look
noticeably different if you glance back a minute later, without ever
catching the eye as animation.

Excitation pulses travel along ~2% of edges at any moment. Redraw is
capped at 25fps — everything moves slowly enough that nobody can tell,
and it keeps the whole thing off the critical path. Reduced-motion gets
one static frame of the topology.

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
- Nodes = 64×40 cards with title and a lane stripe (4px left).
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
- Parallax on *content* — the backdrop parallaxes site-wide (see above), but nothing carrying text or a target does. Foreground scrub effects stay inside `/loop` chapters.
- Auto-playing video.
- Decorative illustrations. Every visual element either _is_ content or guides attention to content.
