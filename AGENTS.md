# Agent notes — jacobfv-site

[CLAUDE.md](CLAUDE.md) holds this repo's agent rules for every agent, not just
Claude. Read it first; it wins where this file is shorter.

The rule that keeps getting broken:

- **Projects need diagrams, not just screenshots.** Agents across Jacob's
  projects keep filling entries with UI screenshots in place of
  explanation. Every project page that describes a system needs
  hand-authored SVG diagrams of its architecture, data or control flow
  and core mechanism, in `public/assets/img/projects/{slug}-*.svg`, checked
  against the source and rendered once to check for overlap. Screenshots
  are supporting evidence of the UI — one or two, never the main figures.
- Don't run `pnpm dev` / `pnpm build`; type-check instead. Commit and push
  finished work to `main` without asking (pushing deploys).
