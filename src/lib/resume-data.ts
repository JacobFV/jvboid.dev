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
  phone: "+1 (469) 968-9490",
  website: "jvboid.dev",
  github: "github.com/JacobFV",
  twitter: "@jvboid",
  location: "San Francisco, CA",
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
      "AI agents", "agent runtime", "tool use", "schemas", "evals",
      "TypeScript", "Next.js", "React", "Python", "FastAPI",
      "iOS", "on-device LLMs", "model quantization", "multimodal pipelines",
      "Postgres", "Redis", "Vercel", "Cloudflare", "Modal",
      "research synthesis", "technical writing", "rapid prototyping",
    ],
    highlights: [
      "Architected production integration surfaces for mobile and web clients at AGI, Inc.",
      "Building VibeStartup, an end-to-end platform for spinning up startups (planning, code, infra, growth) on top of agent workflows.",
      "Authored a wide technical archive (ML systems, agents, multi-agent networks, consciousness, dev platforms) backing each project.",
    ],
  },
  robotics: {
    headline: "Robotics & embodied-AI engineer",
    summary:
      "Embodied intelligence, hydraulic actuation, lab automation, and the agent stack that drives physical systems.",
    strengths: [
      "robotics", "CAD", "hydraulic actuation", "low-level control", "calibration",
      "embodied AI", "world models", "multimodal perception", "sim-to-real",
      "LeRobot", "SO-101", "ROS",
      "CNC", "3D printing", "electronics", "lab automation", "procurement",
      "Python", "PyTorch", "JAX",
      "agent control loops", "telemetry", "rapid prototyping",
    ],
    highlights: [
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
    title: "API / Integration Architect",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "Jan 2026 – Apr 2026",
    summary:
      "Owned the integration surface across API, SDKs, and partner-facing edges — iOS, on-device LLMs, model quantization, agent control plane. Led schema + integration work through fast product pivots.",
    tags: ["agents", "ios", "on-device", "schemas"],
  },
  {
    title: "Software Engineer",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "Oct 2025 – Jan 2026",
    summary:
      "Infrastructure for AGI — agent runtime, mobile glue, eval tooling. Promoted into the integration architect role.",
    tags: ["agents", "infra", "mobile"],
  },
  {
    title: "Software Engineer",
    org: "Breezy",
    range: "Apr 2025 – Oct 2025",
    summary:
      "Voice-AI automation product — agent workflows, conversational interfaces, integration plumbing.",
    tags: ["voice-ai", "agents"],
  },
  {
    title: "Applied ML Engineer (Intern)",
    org: "Deepshard",
    range: "Sep 2024 – Dec 2024",
    summary:
      "The Truffle computer — large-model experimentation, multi-agent research, on-device inference tooling.",
    tags: ["ml", "on-device", "research"],
  },
  {
    title: "Full-Stack Pipeline Engineer",
    org: "FLORA",
    range: "Jun 2024",
    summary:
      "Generative-AI creative pipeline — TypeScript, Python, Modal, fal.ai, ComfyUI, diffusion models, serverless Next.js front end.",
    tags: ["generative-ai", "diffusion", "full-stack"],
  },
  {
    title: "Software Engineer",
    org: "Motio, Inc.",
    range: "Aug 2022 – Jan 2023",
    summary: "Develop Soterre for Qlik Sense.",
    tags: ["java", "hibernate"],
  },
  {
    title: "Software Engineer (Intern)",
    org: "Motio, Inc.",
    range: "Jun 2022 – Aug 2022",
    summary: "Develop Soterre for Qlik Sense.",
    tags: ["java", "hibernate"],
  },
  {
    title: "Software Developer",
    org: "IT Lab · UT Arlington",
    href: "https://uta.edu",
    range: "Jun 2021 – May 2022",
    summary:
      "Evolved and tested CoWiz, a Flask-based statistical visualization tool, and built MLN-Dashboard, a full-stack web server on a Next/React/GraphQL stack.",
    tags: ["react", "next.js", "graphql", "flask"],
  },
  {
    title: "Software Developer",
    org: "College of Social Work · UT Arlington",
    href: "https://uta.edu",
    range: "Jun 2021 – May 2022",
    summary:
      "Maintained and enhanced MyAmble, a multi-platform (iOS + Android) data-collection app, plus its web admin interface, using Flutter and Firebase.",
    tags: ["flutter", "firebase", "mobile"],
  },
  {
    title: "B.S., Computer Science",
    org: "The University of Texas at Arlington",
    href: "https://uta.edu",
    range: "2020 – 2022",
    summary:
      "CS coursework alongside heavy lab work, independent ML/robotics prototypes, and a steady research output. GPA 3.6/4.0.",
    tags: ["education", "cs"],
  },
  {
    title: "A.A.S., Mathematics",
    org: "Navarro College",
    range: "2016 – 2018",
    summary:
      "Math associate degree taken dual-credit during high school. GPA 3.9/4.0.",
    tags: ["education", "math"],
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
    "browser-os",
    "canvas-engineering",
    "tensor-computer",
    "multigraph-nn",
    "multiparadigm-networks",
    "multi-graph-former-project",
    "general-unified-world-modeling",
    "imgpt",
    "brain-model",
    "yt2ctx",
    "node-tree",
    "belief-graph-orchestrator",
    "synthux",
    "standup-ai",
    "lifelogger",
    // Promoted into the software focus list (hand-curated).
    "esp32-usb-webcam",
    "bsbr",
    "mln-dashboard",
    "jnumpy",
    "dash",
    "20q",
    "stanford-open-datathon-group-project",
    "desparados-a-eye",
    "home-internet-factory",
    "workplace-surveillance-system",
    "sqtest",
    "labatron",
    "sale",
    "cookie-cutter-cnc",
    "copyright-calculator",
  ]);
  // Forced OUT of the software focus list into "adjacent work", even if
  // their tags would otherwise match SOFTWARE_TAGS (hand-curated).
  const softwareExcluded = new Set([
    "predictive-general-intelligence",
    "computatrum",
    "polonius-as-a-fool",
    "the-multi-agent-network",
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
    software: !softwareExcluded.has(node.id) && (softwarePinned.has(node.id) || has(SOFTWARE_TAGS)),
    robotics: roboticsPinned.has(node.id) || has(ROBOTICS_TAGS),
  };
}

// Date formatting for the resume project list. The graph stores a single
// ISO `date` per node; `datePrecision` records how much of it is real.
// Default ("month"/"day") → "Jun 2024"; "season" → "Summer 2024"; "year" →
// "2024" (only the year is documented). Parsed by string slice, not Date(),
// so there's no timezone drift on the month boundary.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seasonOf(month: number): string {
  if (month === 12 || month <= 2) return "Winter";
  if (month <= 5) return "Spring";
  if (month <= 8) return "Summer";
  return "Fall";
}

export function formatResumeDate(node: Pick<Node, "date" | "datePrecision">): string {
  const iso = node.date;
  if (!iso) return "";
  const year = iso.slice(0, 4);
  const month = Number.parseInt(iso.slice(5, 7), 10);
  const precision = node.datePrecision;
  if (precision === "year") return year;
  if (!month || Number.isNaN(month)) return year;
  if (precision === "season") return `${seasonOf(month)} ${year}`;
  return `${MONTHS[month - 1]} ${year}`;
}

// The blurb the resume shows for a project: the tight resume_description
// when authored, otherwise the longer narrative summary.
export function resumeBlurb(node: Pick<Node, "summary" | "resumeDescription">): string {
  return node.resumeDescription ?? node.summary;
}

export function variantHref(v: ResumeVariant): string {
  return `/resume/${v}`;
}

export function variantPdfHref(v: ResumeVariant): string {
  return `/resume/${v}/pdf`;
}
