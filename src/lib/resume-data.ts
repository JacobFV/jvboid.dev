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

// One media item attached to a job: the caption and (optional) description
// are Jacob's own, copied verbatim from the LinkedIn entry the photo was
// published under. `thumb` is a height-180 downscale used for the on-page
// strip and the PDF strip alike (~5-13 KB each, so a dozen of them add ~110 KB
// to the PDF instead of ~760 KB); `src` is the full-size file the on-page
// thumbnail links out to. `w`/`h` are the *thumb* pixel dimensions, carried
// here so the PDF can lay a row out without measuring the file at render time.
export type ExperienceMedia = {
  src: string;
  thumb: string;
  caption: string;
  description?: string;
  w: number;
  h: number;
};

const IMG = "/assets/img/experience";

function media(
  file: string,
  w: number,
  h: number,
  caption: string,
  description?: string,
): ExperienceMedia {
  return { src: `${IMG}/${file}`, thumb: `${IMG}/thumbs/${file}`, caption, description, w, h };
}

// Job descriptions below are Jacob's own words, copied verbatim from LinkedIn
// rather than rewritten — the voice is the point. Don't "improve" them without
// asking; a previous pass paraphrased Breezy and AGI into something blander and
// had to be reverted.
export const experience: {
  title: string;
  org: string;
  href?: string;
  range: string;
  bullets: string[];
  tags: string[];
  media?: ExperienceMedia[];
}[] = [
  {
    title: "API / Integration Architect",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "Jan 2026 – Apr 2026",
    bullets: [
      "Interfaces and integration across our API, SDKs, and other partner-facing surfaces. iOS, on-device llms, model quantization, agents, control plane, etc.",
      "Owned api.agi.tech. First-responder to API infra / full-stack backend issues (Team across 3 countries/timezones, constant pushes directly to production)",
    ],
    tags: ["agents", "ios", "on-device", "schemas", "api"],
    media: [
      media(
        "burning-the-midnight-oil.jpg", 201, 180,
        "Burning the midnight oil",
        "After all the original founding engineers moved onto their own startup, I was the only engineer left who actually stayed past midnight to work. It took me some time to readjust to the new culture that was forming in the company.",
      ),
      media(
        "ios-computer-use.jpg", 83, 180,
        "iOS computer use 😃",
        "The agent controls a virtual cursor on the screen to complete the task “Book an Uber from here to SFO” using a BLE accessibility relay",
      ),
    ],
  },
  {
    title: "Software Engineer",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "Oct 2025 – Jan 2026",
    bullets: [
      "WE ARE BUILDING THE INFRASTRUCTURE FOR ARTIFICIAL GENERAL INTELLIGENCE",
      "full-stack + infrastructure engineering across agentic systems: typescript, python, react/next.js, node.js, apis, distributed systems, cloud infrastructure, aws, gcp, s3, data engineering, containers, drizzle, pg/psql, databases, queues, browser/computer use, agent runtimes, tool use, model inference, llm integrations, multimodal models, evals, automation, control planes, observability, debugging, deployment, ci/cd, production operations. shipped rapidly across the stack in a high-velocity, production-first environment.",
    ],
    tags: ["agents", "infra", "full-stack", "evals"],
    // The "AGI" thumbnail from this LinkedIn entry was the one image missing
    // from the handoff — the file that arrived under it was a duplicate of the
    // Human Robots prototype photo. Add it here when the real file turns up.
  },
  {
    title: "Software Engineer",
    org: "Breezy",
    range: "Apr 2025 – Oct 2025",
    bullets: [
      "Full-stack product engineering across a rails/next.js monorepo for a prosumer (single-person business) AI receptionist platform.",
      "Independently owned features end-to-end from product requirements and implementation through integration, debugging, and production delivery.",
      "Worked across frontend, backend, ai integrations, and application infrastructure; Left for infra role at AGI Inc",
    ],
    tags: ["voice-ai", "agents", "rails", "next.js"],
    media: [
      media("breezy-scheduling-appointments.jpg", 161, 180, "Using Breezy to Schedule Appointments"),
      media("breezy-ai-assistant.jpg", 156, 180, "Breezy AI assistant"),
    ],
  },
  {
    title: "Applied Machine Learning Engineer",
    org: "Deepshard",
    range: "Sep 2024 – Dec 2024",
    bullets: ["the truffle computer"],
    tags: ["ml", "on-device", "research"],
  },
  {
    title: "Humanoid Robot Prototyping",
    org: "Human Robots",
    range: "Jan 2023 – Sep 2024",
    bullets: [
      'Prototyped hydraulically actuated, endoskeletal humanoid robot: KiCAD, FreeCAD, Blender, Python, 3D printing, mdf board CNC routing, 3/16" A16 plasma cutting, 100um + 300um trace PCB fabrication and SMT assembly (LCSC), also 3018 diy milling if that counts. Ordered from 2 direct factory contacts in China and negotiated with several others. Did all the math in my notebook and brain before ChatGPT was useful for this!',
    ],
    tags: ["robotics", "hydraulics", "cad", "hardware", "pcb"],
    media: [
      media(
        "endoskeletal-hydraulic-prototype.jpg", 83, 180,
        "Whole body endoskeletal + hydraulic system (no actuator) prototype assembly",
      ),
      media("lobe-pump-early-iteration.jpg", 135, 180, "Early iteration of positive displacement lobe pump"),
    ],
  },
  {
    title: "Full Stack Pipeline Engineer",
    org: "FLORA",
    range: "Jun 2024",
    bullets: [
      "typescript, python, modal, fal.ai, generative ai, difusion models, computer art, confy ui, react, serverless architecture",
    ],
    tags: ["generative-ai", "diffusion", "full-stack"],
  },
  {
    title: "Software Engineer",
    org: "Motio, Inc.",
    range: "Aug 2022 – Jan 2023",
    bullets: ["Develop Soterre for Qlik Sense"],
    tags: ["java", "hibernate"],
  },
  {
    title: "Software Engineer (Intern)",
    org: "Motio, Inc.",
    range: "Jun 2022 – Aug 2022",
    bullets: ["Develop Soterre for Qlik Sense"],
    tags: ["java", "hibernate"],
  },
  {
    title: "Software Developer",
    org: "IT Lab · UT Arlington",
    href: "https://uta.edu",
    range: "Jun 2021 – May 2022",
    bullets: [
      "Collaborated with research group to evolve and test a flask-based statistical visualization tool CoWiz",
      "Currently developing a full stack web server MLN-Dashboard using Next-React-GraphQL stack",
    ],
    tags: ["react", "next.js", "graphql", "flask"],
    media: [
      media(
        "mln-dashboard.jpg", 288, 180,
        "MLN Dashboard",
        "The Multi-layer Network Visualization Dashboard: a web app I started while working at the IT Lab",
      ),
      media(
        "dash-cowiz.jpg", 320, 180,
        "Dash",
        "Cowiz visualization dashboard: a web app I enhanced while working at the IT Lab",
      ),
    ],
  },
  {
    title: "Software Developer",
    org: "College of Social Work · UT Arlington",
    href: "https://uta.edu",
    range: "Jun 2021 – May 2022",
    bullets: [
      "Maintain and enhance multi-platform (iOS and Android) data collecting application MyAmble using flutter and firebase and web administrator interface",
    ],
    tags: ["flutter", "firebase", "mobile"],
    media: [
      media("myamble-application.jpg", 234, 180, "MyAmble Application", "This was taken from the user guide"),
    ],
  },
  {
    title: "Career break",
    org: "Professional development",
    range: "Apr 2020 – Jun 2021",
    bullets: ["Pandemic + First year at University of Texas at Arlington"],
    tags: ["career-break"],
  },
  {
    title: "Crew Trainer",
    org: "McDonald's",
    range: "May 2016 – Mar 2020",
    bullets: [
      "Led safety committee and addressed employees during 30-minute monthly safety meeting",
      "Train employees on-the-job and formally",
      "In addition to 4 years of formal education, actively used Spanish on-the-job",
    ],
    tags: ["training", "team-leadership", "safety", "spanish"],
    media: [
      media(
        "fire-safety-poster.jpg", 255, 180,
        "Fire Safety Poster",
        "This poster was designed to emphasize the importance of not leaving trash in the fire exit",
      ),
      media("employee-of-the-month.jpg", 135, 180, "Employee of the Month"),
      media("working-together.jpg", 135, 180, "Working togethor"),
    ],
  },
  {
    title: "B.S., Computer Science",
    org: "The University of Texas at Arlington",
    href: "https://uta.edu",
    range: "2020 – 2022",
    bullets: [
      "CS coursework alongside heavy lab work, independent ML/robotics prototypes, and a steady research output. GPA 3.6/4.0.",
    ],
    tags: ["education", "cs"],
  },
  {
    title: "A.A.S., Mathematics",
    org: "Navarro College",
    range: "2016 – 2018",
    bullets: ["Math associate degree taken dual-credit during high school. GPA 3.9/4.0."],
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
