# Portfolio principles

> Source: [Ricardo Tellez, "The Best Way to Create Your Robotics Portfolio,"
> The Construct blog, 2025-12-15][src]. Robotics is the framing, but the
> advice is general — recruiters in any technical field are pattern-matching
> on the same signals. This site is built to make those signals legible.

[src]: https://www.theconstruct.ai/blog/

These are the five principles we audit against. Every section below states
the principle, how this codebase implements it today, and the convention to
keep future changes aligned.

---

## 1. Quality over quantity

> "Focus your efforts on 3 to 5 truly impressive, well-documented projects
> that show a wide range of skills."

**How this site implements it.** The home page has two project surfaces:

- **Active Threads** — `pickFeatured()` in `src/app/page.tsx` returns at most 6
  curated projects (a pinned list + the most recent shipped/active). This is
  the 3-to-5 spotlight. Keep this list tight; if it grows past 6 the
  "curated" signal dilutes.
- **Projects (index)** — the comprehensive list of every project, sorted by
  status then date. Reference material, not the spotlight.

The hero **orbiters** carry the top 2 featured projects right next to the
pfp; the **planetoids** carry the next 4 as drifting bodies with moons.
Together they showcase up to 6 projects without forcing a wall of cards.

**Convention.**
- Cap the pinned array in `pickFeatured` at 5 (one extra slot is fine; more is dilution).
- A project enters the spotlight only when it has a real summary, a hero
  asset, and at least one external link.

## 2. Document everything

> "A portfolio project isn't just a GitHub link. It's a comprehensive story
> that answers: the Problem, the Solution, the Technical Details, optional
> Testing, the Results, the Lessons Learned."

**How this site implements it.** Every project lives in
`content/projects/{slug}.mdx`. The frontmatter shape is documented in
[CONTENT_MODEL.md](./CONTENT_MODEL.md#project). The body is MDX — free-form
— but every spotlight-eligible project should follow the template below.

### Project page body template

```mdx
## Problem
What real-world challenge was I trying to solve? One short paragraph.

## Solution
What did I build? Describe the shape of the answer in one paragraph.

## How
Tools, languages, frameworks, sensors, scale. Be specific:
- **Language / runtime:** TypeScript, Python 3.12, ROS 2 Humble, …
- **Libraries / infra:** FastAPI, OpenCV, Docker, …
- **Hardware / data:** specific sensors, datasets, deployment targets, …

## Tests
Optional. If there are unit/integration/sim tests, name the frameworks
and link to a CI run or coverage badge.

## Results
What was the outcome? Numbers, screenshots, a video. **Embed a 30–60s
demo video where possible** (YouTube, Vimeo, or a self-hosted clip).

## Lessons
What went wrong? What would I do differently? One short paragraph.
```

**Convention.**
- New spotlight projects use the six-section structure above. Older ones
  can be migrated incrementally; the cap on Active Threads enforces
  prioritization.
- Reuse `realizes` / `influences` / `critiques` frontmatter to wire the
  project into the graph — these become the moons in the home hero and
  the local-graph neighborhood on the project page.

## 3. Visuals are a must

> "A working demo is 10x better than a static image."

**How this site implements it.**

- **Per-project hero image** — set `hero: { src, alt }` in frontmatter.
  Renders at the top of `/projects/{slug}` via `src/components/reader/Hero.tsx`.
- **Orbiter assets** — `src/data/orbit-overrides.ts` maps node ids to image
  URLs; `getGraph()` also auto-discovers anything at
  `/public/img/orbiters/{slug}.{png,jpg,webp,svg}`. The home hero orbits
  render real graphics, never bare letters.
- **Iframe embeds** — `orbit-overrides.ts` supports `embed: "https://…"`.
  Used by `windows-web` to surface its live deploy as a tiny moving
  thumbnail in the orbit.
- **Per-project video** — `video` field in frontmatter (added 2026-05-19,
  see [CONTENT_MODEL.md](./CONTENT_MODEL.md#project)). The Hero component
  renders it as a 16:9 embed when present.

**Convention.**
- Every spotlight project either embeds a video **or** carries a real hero
  image (not a placeholder).
- README links live in `links.github`. Keep them current.

## 4. Soft-skills evidence

> "Documentation work, multi-cultural collaboration, oral presentations —
> include them."

**How this site implements it.**

- **Skills** — `content/skills/*.mdx` and the `/skills/{slug}` reader pages
  surface non-project capabilities with `evidence: []` pointing at concrete
  artifacts.
- **Experience** — `content/experience/*.mdx` and `/resume` project the
  same evidence as a date-ranged CV.
- **Friends / collaborators** — `content/friends/*.mdx` documents the
  network. Project MDX bodies should call out collaborators by linking to
  these pages.
- **Events** — `content/events/*.mdx` and `/events` capture talks,
  conferences, hackathons. Embed a recording link if one exists.

**Convention.**
- Talks with a recording: put the URL in the event's `links` or in the MDX
  body. Recorded > unrecorded.
- For group projects, name your role inside the MDX body. Don't bury the
  attribution.

## 5. CV link + contact

> "Never forget: a link to your full CV, and a contact method."

**How this site implements it.**

- **CV** — `/resume` is in the home nav pills, generated from
  `content/experience/*.mdx`.
- **Contact** — the home `AskInput` pill is always reachable. The green
  phone button opens `CallSheet`, the orange arrow opens `TextSheet`. Both
  gate on a math captcha and reveal the phone (`CONTACT_PHONE`) or email
  (`CONTACT_EMAIL`) only after verification. The number and email never
  enter the client bundle. See `src/lib/contact-actions.ts`.
- **Email** — `jacobfv123@gmail.com`, configured via the `CONTACT_EMAIL`
  env var on Vercel. The TextSheet falls back to `mailto:` when SMS isn't
  available (i.e. desktop).

**Convention.**
- Don't expose the phone or email in static markup. Always behind the
  server action.
- If the contact channels change, update `.env.local` AND the Vercel
  project env (Production + Development at minimum).

---

## Quick audit checklist

When adding a new project or reviewing site changes, ask:

- [ ] Does Active Threads still hold 3–6 curated projects?
- [ ] Does this project's MDX cover Problem / Solution / How / Results / Lessons?
- [ ] Does it have a hero image **or** a `video` URL?
- [ ] Are GitHub / demo / paper links current in `links`?
- [ ] Are collaborators credited (link to `/friends/...`)?
- [ ] Are talks / conferences linked from `/events/...`?
- [ ] Is `/resume` reflecting the latest experience?
- [ ] Does the contact flow still go through `revealContact()` (not static)?

---

## When to revisit

Re-read this doc and re-audit when:

- The number of pinned projects in `pickFeatured` would exceed 6.
- A new node kind is added that should surface on the home hero.
- The contact-reveal flow changes shape (e.g. swapping the captcha).
- A new visual layer (planetoids, orbits, …) is introduced — make sure it
  also follows the "real graphics, no letters" rule baked into
  `OrbitDecor.tsx` / `Planetoids.tsx`.
