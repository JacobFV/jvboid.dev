// Resume content used by both the on-page embed and the PDF renderer.
// Two variants — `software` and `robotics` — share the same header,
// experience block, and full project list; the variant only changes the
// headline summary, the strength bullets, and which projects land in
// the "focus" group vs. the "adjacent work" group.

import type { Node } from "./graph-types";

export type ResumeVariant = "software" | "robotics";

export const contact = {
  name: "Jacob Valdez",
  email: "jacob@humanrobots.ai",
  phone: "+1 (972) 460-6353",
  website: "jacobfv.com",
  github: "github.com/JacobFV",
  twitter: "@jvboid",
  location: "Dallas–Fort Worth, TX",
};

export const variantMeta: Record<ResumeVariant, {
  headline: string;
  summary: string;
  strengths: string[];
  highlights: string[];
}> = {
  software: {
    headline: "AI systems & full-stack engineer",
    summary:
      "Agent infrastructure, full-stack AI products, and the runtime glue that turns research ideas into shipped software.",
    strengths: [
      "AI agents — runtime, tool use, schemas, evaluation",
      "Full-stack TypeScript / Next.js / Python / FastAPI",
      "Mobile & on-device ML; multimodal pipelines",
      "Research synthesis & technical writing",
      "Rapid prototyping across product, infra, and ML",
    ],
    highlights: [
      "Architected production integration surfaces for mobile AI agents — agent runtime ↔ mobile clients ↔ web clients ↔ internal eval tooling — at AGI, Inc.",
      "Building VibeStartup, an end-to-end platform for spinning up startups (planning, code, infra, growth) on top of agent workflows.",
      "Founded Limboid — a long-horizon robotics company; ship the software side end to end (control, sim, agent stack, dashboards).",
      "Authored a wide technical archive (ML systems, agents, multi-agent networks, consciousness, dev platforms) backing each project.",
    ],
  },
  robotics: {
    headline: "Robotics & embodied-AI engineer",
    summary:
      "Embodied intelligence, hydraulic actuation, lab automation, and the agent stack that drives physical systems.",
    strengths: [
      "Robotics prototypes — CAD → control, hydraulic actuation",
      "Embodied AI & multimodal world modeling",
      "Hardware-aware ML; lab automation & procurement",
      "Rapid prototyping (CNC, 3D-print, electronics)",
      "Full-stack glue around physical systems (sim, UI, telemetry)",
    ],
    highlights: [
      "Founded Limboid — hydraulic actuation, embodied intelligence, low-cost physical automation; ran the full prototype lineage (Computatrum → Limboid).",
      "Built the Lunar Rover autonomy stack — LLM-routed planning + low-level control for a hackathon-grade lunar rover.",
      "Shipped lab/hardware tooling: PrecisionBOM (procurement), Labatron (lab automation), Chem-0 (chemistry agents), Cookie-cutter CNC, Cookie-baker 3D printer.",
      "AGI, Inc. integration architect — same agent-runtime skills feed directly into robot agent control loops.",
    ],
  },
};

export const experience: {
  title: string;
  org: string;
  href?: string;
  range: string;
  summary: string;
  tags: string[];
}[] = [
  {
    title: "Founder",
    org: "VibeStartup",
    href: "https://vibestartup.pro",
    range: "2025 – present",
    summary:
      "End-to-end platform for building startups on top of agent workflows. Notion-native, OAuth + Stripe billing, Cloudflare/Vercel deploys.",
    tags: ["agents", "startups", "platform"],
  },
  {
    title: "Founder",
    org: "Limboid",
    href: "/projects/limboid",
    range: "2019 – present",
    summary:
      "Long-horizon robotics company. Hydraulic actuation, embodied intelligence, on-demand physical automation. Computatrum → Limboid prototype lineage.",
    tags: ["robotics", "hardware", "founder"],
  },
  {
    title: "API / Integration Architect",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "2024",
    summary:
      "Owned the contract between agent runtime, mobile clients, web clients, and internal eval tools. Led schema + integration work through fast product pivots.",
    tags: ["agents", "mobile", "schemas"],
  },
  {
    title: "Engineer",
    org: "Breezy",
    range: "2023",
    summary:
      "Voice-AI automation product — agent workflows, conversational interfaces, integration plumbing.",
    tags: ["voice-ai", "agents"],
  },
  {
    title: "ML Engineer",
    org: "Deepshard",
    range: "2022 – 2023",
    summary:
      "Distributed training, large-model experimentation, multi-agent research and tooling.",
    tags: ["ml", "distributed", "research"],
  },
  {
    title: "Engineer",
    org: "Motio",
    range: "2022",
    summary:
      "Full-stack engineering across product surfaces — APIs, web clients, integrations.",
    tags: ["full-stack", "product"],
  },
  {
    title: "Research Assistant",
    org: "UT Arlington research labs",
    range: "2020 – 2022",
    summary:
      "Multi-agent learning, differentiable programming, world models, robotics — early prototypes that became the lineage in the project archive.",
    tags: ["research", "ml", "agents"],
  },
  {
    title: "B.S., Computer Science",
    org: "The University of Texas at Arlington",
    href: "https://uta.edu",
    range: "2018 – 2022",
    summary:
      "CS coursework alongside heavy lab work, independent ML/robotics prototypes, and a steady research output.",
    tags: ["education", "cs"],
  },
];

// Tag → variant classifier. Returns which variant a project is a "focus"
// fit for. A project can be a focus for both (or neither). When a project
// isn't a focus for the active variant it falls into the adjacent-work
// bucket on that resume.
const SOFTWARE_TAGS = new Set([
  "agents",
  "multi-agent",
  "ai",
  "ml",
  "deep-learning",
  "framework",
  "python",
  "cli",
  "tooling",
  "infra",
  "web",
  "meta",
  "ui",
  "graphics",
  "mcp",
  "oauth",
  "stripe",
  "cloudflare",
  "vercel",
  "notion",
  "productivity",
  "synthetic-data",
  "fine-tuning",
  "world-modeling",
  "computer-use",
  "attention",
  "multimodal-learning",
  "voice-ai",
  "automation",
  "program-synthesis",
  "differentiable-programming",
  "jax",
  "tensorflow",
  "unsupervised-learning",
  "visualization",
  "hackathon",
  "desktop-pet",
  "electron",
  "ai-coach",
  "ascii",
  "grammars",
  "cognition",
]);

const ROBOTICS_TAGS = new Set([
  "robotics",
  "embodied-ai",
  "lerobot",
  "lunar-rover",
  "autonomy",
  "llm-routing",
  "hardware",
  "procurement",
  "digikey",
  "chemistry",
  "rocketry",
  "sim",
]);

export function projectFocus(node: Node): { software: boolean; robotics: boolean } {
  const tags = node.tags.map((t) => t.toLowerCase());
  const has = (set: Set<string>) => tags.some((t) => set.has(t));
  // A handful of hand-pinned ids guarantee placement no matter how tags drift.
  const softwarePinned = new Set([
    "vibestartup",
    "notion-vibestartup",
    "theagentsuite",
    "tensacode",
    "jacobfv-site",
    "macos-web-next",
    "windows-web-next",
    "computatrum",
    "browser-os",
    "canvas-engineering",
    "tensor-computer",
    "the-multi-agent-network",
    "multigraph-nn",
    "multiparadigm-networks",
    "multi-graph-former-project",
    "predictive-general-intelligence",
    "general-unified-world-modeling",
    "imgpt",
    "brain-model",
    "yt2ctx",
    "node-tree",
    "belief-graph-orchestrator",
    "polonius-as-a-fool",
    "synthux",
    "standup-ai",
    "lifelogger",
  ]);
  const roboticsPinned = new Set([
    "limboid",
    "lunar-rover",
    "computatrum",
    "labatron",
    "chem-0",
    "precisionbom",
    "cookie-baker-3d-printer",
    "cookie-cutter-cnc",
    "trash-sorter",
    "dolphin-rocket",
    "tensor-computer",
    "the-right-night-light",
    "home-internet-factory",
    "workplace-surveillance-system",
    "the-fertile-crescent",
    "recursive-omnimodal-video-action-model",
  ]);
  return {
    software: softwarePinned.has(node.id) || has(SOFTWARE_TAGS),
    robotics: roboticsPinned.has(node.id) || has(ROBOTICS_TAGS),
  };
}

export function variantHref(v: ResumeVariant): string {
  return `/resume/${v}`;
}

export function variantPdfHref(v: ResumeVariant): string {
  return `/resume/${v}/pdf`;
}
