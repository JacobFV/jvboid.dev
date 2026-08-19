// Resume content used by both the on-page embed and the PDF renderer.
// Two variants — `software` and `robotics` — share the same header,
// experience block, and full project list; the variant only changes the
// strength bullets, the highlights, and which projects land in the
// "focus" group vs. the "adjacent work" group. The headline is one line
// of titles and carries no separate summary under it — `summary` stays
// optional so a variant can add one back without a schema change.

import type { Node } from "./graph-types";

export type ResumeVariant = "software" | "robotics";

export const contact = {
  name: "Jacob Valdez",
  email: "jacob@commandagi.com",
  phone: "+1 (469) 968-9490",
  website: "jvboid.dev",
  github: "github.com/JacobFV",
  twitter: "@jvboid",
  location: "San Francisco, CA",
};

export const variantMeta: Record<ResumeVariant, {
  headline: string;
  summary?: string;
  strengths: string[];
  highlights: string[];
}> = {
  software: {
    headline: "AI systems, full-stack, data/ml engineering, architect",
    strengths: [
      "AI agents", "schemas", "evals",
      "TypeScript", "Next.js", "React", "Python", "FastAPI",
      "iOS", "on-device LLMs", "model quantization", "multimodal pipelines",
      "Postgres", "Redis", "Vercel", "Cloudflare", "Modal",
      "PyTorch", "JAX", "model training",
      "rapid prototyping",
    ],
    highlights: [
      "Training the SC-WBD-00X model series — the world's first whole-brain multi-dynamics foundation model (electrophysiology, hemodynamics, meso-scale activation dynamics, inner monologue + imagination).",
      "Architected and implemented production integration surfaces for mobile and web clients at AGI, Inc.",
      "Building CommandAGI.com, an end-to-end agentic social platform for creators to build their vibestartups — computer + browser + mobile device control, robotics, sim, code/CAD/EDA and more eng automation, 43+ integrations, and more.",
    ],
  },
  robotics: {
    headline: "AI systems, full-stack, data/ml engineering, architect",
    strengths: [
      "robotics", "CAD", "hydraulic actuation", "low-level control", "calibration",
      "embodied AI", "world models", "multimodal perception", "sim-to-real",
      "LeRobot", "SO-101", "ROS",
      "CNC", "3D printing", "electronics", "lab automation", "procurement",
      "Python", "PyTorch", "JAX",
      "model training", "ablation design",
      "agent control loops", "rapid prototyping",
    ],
    highlights: [
      "Training the SC-WBD-00X model series — the world's first whole-brain multi-dynamics foundation model (electrophysiology, hemodynamics, meso-scale activation dynamics, inner monologue + imagination).",
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

// Which resume a project belongs on — curated per project, not inferred.
// The tag vocabulary was written for the site graph, not for a hiring
// reader: "school", "work" and "personal" say nothing about whether a
// piece of work belongs on a resume, and the old tag classifier answered
// "not this variant" for a fifth of the software list and two thirds of
// the robotics one. Those all landed in an "adjacent work" group that had
// become a dumpster, so the group is gone and the classification has to
// be right on its own.
//
// Every published project is named exactly once below: on the software
// resume, the robotics resume, both, or NOT_ON_RESUME for creative and
// personal work a hiring reader has no use for. A project named in none
// of the three falls through to the tag heuristic at the bottom, so newly
// added work still surfaces somewhere instead of silently vanishing.

const SOFTWARE_RESUME = new Set([
  // AI systems, agents, world models, ML research
  "sc-wbd", "general-unified-world-modeling", "canvas-engineering",
  "recursive-omnimodal-video-action-model", "brain-model", "tensor-computer",
  "tensacode", "the-multi-agent-network", "the-fertile-crescent", "computatrum",
  "belief-graph-orchestrator", "predictive-general-intelligence",
  "full-stack-artificial-intelligence", "multigraph-nn", "multi-graph-former-project",
  "multiparadigm-networks", "bsbr", "tf-som", "eggroll-trainer", "rl-lab",
  "broadening-and-building-beyond-classical-reinforcement-learning",
  "synthux", "node-tree", "langcurriculum", "jplotlib", "jnumpy",
  // Agent products, tooling, platforms
  "notion-vibestartup", "theagentsuite", "standup-ai", "yt2ctx", "lifelogger",
  "imgpt", "bonk", "fieldratchet", "precisionbom", "racksavant",
  // Full-stack, front-end, systems
  "jacobfv-site", "browser-os", "macos-web-next", "windows-web-next",
  "living-with-intelligence", "jterm", "ascii-art", "halo-prismatic",
  "microscope-viewer", "esp32-usb-webcam", "mln-dashboard", "dash",
  // Coursework and early work that still shows range
  "labatron", "desparados-a-eye", "20q", "sqtest", "sale", "copyright-calculator",
  "stanford-open-datathon-group-project", "home-internet-factory",
  "workplace-surveillance-system", "cookie-cutter-cnc",
]);

const ROBOTICS_RESUME = new Set([
  // Robots, hardware, physical builds
  "limboid", "lunar-rover", "trash-sorter", "chem-0", "labatron",
  "cookie-baker-3d-printer", "cookie-cutter-cnc", "home-internet-factory",
  "precisionbom", "fieldratchet", "esp32-usb-webcam", "microscope-viewer",
  "workplace-surveillance-system", "dolphin-rocket",
  // The models and control research that drive embodiment
  "sc-wbd", "canvas-engineering", "recursive-omnimodal-video-action-model",
  "general-unified-world-modeling", "rl-lab", "computatrum",
  "full-stack-artificial-intelligence",
  "broadening-and-building-beyond-classical-reinforcement-learning",
]);

// Real work, but a hiring reader gets nothing from it: music, animation,
// games made as a teenager, the superseded portfolio site, the fund.
const NOT_ON_RESUME = new Set([
  "ai-proverbs", "jacobs-hits-2023", "summer-break-2021-album", "tiles",
  "space-pong", "looking-for-princess-suzzane", "polonius-as-a-fool",
  "the-right-night-light", "jacobfv-github-io", "gohuman-fund",
]);

// Fallback for projects added after this file was last curated. Deliberately
// loose — showing new work on the wrong resume beats hiding it on both.
const SOFTWARE_TAGS = new Set([
  "agents", "multi-agent", "ai", "ml", "deep-learning", "framework", "python",
  "cli", "tooling", "infra", "web", "meta", "ui", "graphics", "mcp",
  "synthetic-data", "fine-tuning", "world-modeling", "computer-use", "attention",
  "multimodal-learning", "voice-ai", "automation", "program-synthesis",
  "differentiable-programming", "jax", "tensorflow", "unsupervised-learning",
  "reinforcement-learning", "visualization", "research", "cognition",
]);

const ROBOTICS_TAGS = new Set([
  "robotics", "embodied-ai", "lerobot", "lunar-rover", "autonomy", "llm-routing",
  "hardware", "embedded", "procurement", "chemistry", "sim", "simulation",
  "physics", "hydraulics", "cad",
]);

export function projectFocus(node: Node): { software: boolean; robotics: boolean } {
  const id = node.id;
  if (SOFTWARE_RESUME.has(id) || ROBOTICS_RESUME.has(id) || NOT_ON_RESUME.has(id)) {
    return { software: SOFTWARE_RESUME.has(id), robotics: ROBOTICS_RESUME.has(id) };
  }
  const tags = node.tags.map((t) => t.toLowerCase());
  const has = (set: Set<string>) => tags.some((t) => set.has(t));
  return { software: has(SOFTWARE_TAGS), robotics: has(ROBOTICS_TAGS) };
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
