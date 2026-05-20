// Hand-curated cross-cutting relationships between content nodes.
// Most edges live in node frontmatter (`influences`, `realizes`, `critiques`).
// Add an entry here only when the relationship doesn't fit cleanly inside any
// single node's frontmatter — e.g., retroactive observations, or relationships
// that span many nodes at once.
//
// See docs/CONTENT_MODEL.md for the schema.

import type { ManualEdge } from "../../velite.config";

// Hand-curated cross-cutting relationships. Each entry is a directed
// edge: source → target. `note` shows on edge hover. weight ∈ [0, 1]
// controls visual prominence (thickness, opacity).
export const manualEdges: ManualEdge[] = [
  // ---- Computatrum lineage ---------------------------------------------
  {
    source: "computatrum",
    target: "full-stack-artificial-intelligence",
    kind: "realization",
    weight: 0.85,
    note: "Computatrum is the surviving subgoal of the broader FSAI program.",
  },
  {
    source: "the-multi-agent-network",
    target: "full-stack-artificial-intelligence",
    kind: "realization",
    weight: 0.7,
  },
  {
    source: "multiparadigm-networks",
    target: "full-stack-artificial-intelligence",
    kind: "realization",
    weight: 0.6,
  },
  {
    source: "the-fertile-crescent",
    target: "computatrum",
    kind: "influence",
    weight: 0.7,
    note: "Fertile Crescent's ecosystem framing seeds Computatrum's substrate idea.",
  },
  {
    source: "computatrum-post",
    target: "computatrum",
    kind: "realization",
    weight: 0.9,
    note: "The post is the public writeup of the project.",
  },
  {
    source: "full-stack-artificial-intelligence-post",
    target: "full-stack-artificial-intelligence",
    kind: "realization",
    weight: 0.9,
  },

  // ---- Robotics / Limboid ---------------------------------------------
  {
    source: "limboid",
    target: "focus-statement",
    kind: "realization",
    weight: 0.9,
    note: "Limboid is the company shell around the focus-statement vision.",
  },
  {
    source: "limboid-founder",
    target: "limboid",
    kind: "realization",
    weight: 0.8,
  },
  {
    source: "why-arent-pneumatic-hydraulic-aritificial-muscle-actuated-humanoid-robots-more-common",
    target: "limboid",
    kind: "influence",
    weight: 0.7,
    note: "Hardware design rationale that shapes the actuator choices.",
  },
  {
    source: "labatron",
    target: "background",
    kind: "realization",
    weight: 0.5,
    note: "Early hardware-side hands-on, referenced in the bio background essay.",
  },

  // ---- RL / theory threads --------------------------------------------
  {
    source: "broadening-and-building-beyond-classical-reinforcement-learning",
    target: "broadening-rl",
    kind: "realization",
    weight: 0.95,
    note: "The project page that became the survey paper.",
  },
  {
    source: "self-organized-criticality",
    target: "the-fertile-crescent",
    kind: "influence",
    weight: 0.7,
    note: "SOC framing reappears as the dynamics layer.",
  },
  {
    source: "estimating-the-critical-mass",
    target: "self-organized-criticality",
    kind: "influence",
    weight: 0.6,
  },
  {
    source: "what-is-intelligence",
    target: "reaching-for-the-intangible",
    kind: "influence",
    weight: 0.7,
  },

  // ---- Architecture threads -------------------------------------------
  {
    source: "the-node-neural-network",
    target: "multigraph-nn",
    kind: "influence",
    weight: 0.75,
  },
  {
    source: "multigraph-nn",
    target: "multi-graph-former-project",
    kind: "realization",
    weight: 0.85,
  },
  {
    source: "multi-graph-former-project",
    target: "multi-graph-former",
    kind: "realization",
    weight: 0.95,
    note: "Project work distilled into the workshop submission.",
  },
  // llms-are-the-update-rules-of-intelligent-fractals →
  // the-node-neural-network: in frontmatter.

  // ---- Meaning / morality cluster -------------------------------------
  {
    source: "meaning-is-measured-in-bits",
    target: "moral-emergent-from-meaning-selection",
    kind: "realization",
    weight: 0.85,
  },
  {
    source: "implications-of-a-substrate-agnostic-moral-calculus",
    target: "moral-emergent-from-meaning-selection",
    kind: "influence",
    weight: 0.7,
  },
  // is-there-no-balm-in-gilead → meaning-is-measured-in-bits lives in
  // the post's frontmatter (where the prose justifies it).
  {
    source: "aligning-the-spiritual-evolution-of-ai",
    target: "moral-emergent-from-meaning-selection",
    kind: "influence",
    weight: 0.55,
  },

  // ---- Master plan arc ------------------------------------------------
  {
    source: "the-master-plan-part-1",
    target: "the-master-plan-part-0",
    kind: "realization",
    weight: 0.95,
  },
  {
    source: "the-master-plan-part-2",
    target: "the-master-plan-part-1",
    kind: "realization",
    weight: 0.95,
  },
  // looking-ahead-to-future-impact → the-master-plan-part-2: in frontmatter.

  // ---- AI ↔ self threads ---------------------------------------------
  {
    source: "fighting-ai",
    target: "costs-of-agi",
    kind: "critique",
    weight: 0.6,
    note: "Pushes back on the optimism of the costs essay.",
  },
  {
    source: "personal-ethical-delimna",
    target: "costs-of-agi",
    kind: "influence",
    weight: 0.6,
  },
  {
    source: "can-an-echo-become-a-voice-again",
    target: "is-there-no-balm-in-gilead",
    kind: "influence",
    weight: 0.5,
  },
  // whose-dead-get-to-live-again → can-an-echo-become-a-voice-again:
  // in frontmatter.

  // ---- Site meta ------------------------------------------------------
  {
    source: "jacobfv-site",
    target: "jacobfv-github-io",
    kind: "critique",
    weight: 0.6,
    note: "The new site is a deliberate departure from the al-folio Jekyll one.",
  },
];

