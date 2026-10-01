// Resume content used by both the on-page embed and the PDF renderer.
// There is one resume. It used to come in `software` and `robotics`
// variants; they were merged, so the skills, highlights and project list
// below cover both. The headline is one line of titles and carries no
// separate summary under it — `summary` stays optional so one can be added
// back without a schema change.

import type { Node } from "./graph-types";

export const contact = {
  name: "Jacob Valdez",
  email: "jacob@commandagi.com",
  phone: "+1 (469) 968-9490",
  website: "jvboid.dev",
  github: "github.com/JacobFV",
  twitter: "@jvboid",
  location: "San Francisco, CA",
};

// A highlight is a run of plain text and links, so a bullet can link the
// thing it names without the whole line becoming one anchor.
export type HighlightPart = string | { text: string; href: string };

export const resumeMeta: {
  headline: string;
  summary?: string;
  skills: { label: string; items: string[] }[];
  highlights: HighlightPart[][];
} = {
  headline: "Data/ML Engineering, Robotics, Full-Stack",
  // Grouped plain-text keywords for applicant tracking systems, which
  // match on exact terms. Everything here is backed by the experience or
  // projects on the resume — keep it that way rather than padding it.
  skills: [
    {
      label: "Languages",
      items: [
        "Python", "TypeScript", "JavaScript", "SQL", "Rust", "Java", "Kotlin", "C", "C#",
        "Ruby", "Dart", "HTML", "CSS",
      ],
    },
    {
      label: "AI / ML",
      items: [
        "PyTorch", "JAX", "TensorFlow", "Keras", "NumPy", "pandas", "Jupyter", "Hugging Face",
        "transformers", "foundation models", "multimodal models", "diffusion models",
        "world models", "reinforcement learning", "evolution strategies", "model training",
        "fine-tuning", "model quantization", "on-device inference", "TensorFlow Lite",
        "computer vision", "OpenCV", "YOLO", "LLM integration", "OpenAI API", "Anthropic API",
        "Gemini API", "AI agents", "multi-agent systems", "tool use", "computer use",
        "Model Context Protocol (MCP)", "evals", "signal processing", "EEG", "MNE-Python",
      ],
    },
    {
      label: "Robotics & hardware",
      items: [
        "robot control policies", "embodied AI", "sim-to-real", "LeRobot", "SO-101",
        "MuJoCo", "OpenSim", "Arduino", "ESP32", "ESP-IDF", "PlatformIO", "Raspberry Pi",
        "embedded firmware", "stepper motors", "CAD", "FreeCAD", "KiCAD", "Blender",
        "PCB design", "CNC routing", "3D printing (SLA, FDM, SLS)", "rapid prototyping",
      ],
    },
    {
      label: "Web & backend",
      items: [
        "React", "Next.js", "Node.js", "Svelte", "Vite", "Three.js", "Electron", "Tauri",
        "WebAssembly", "FastAPI", "Flask", "Ruby on Rails", "GraphQL", "REST APIs", "OAuth",
        "Stripe", "Pydantic", "SQLModel", "Prisma", "Hibernate", "SDKs",
      ],
    },
    {
      label: "Data & infrastructure",
      items: [
        "PostgreSQL", "SQLite", "Supabase", "Drizzle ORM", "Redis", "AWS", "GCP", "S3",
        "Cloudflare Workers", "Durable Objects", "Cloudflare R2", "Cloudflare D1", "Vercel",
        "Modal", "fal.ai", "containers", "distributed systems", "queues", "event sourcing",
        "data engineering", "FFmpeg", "CI/CD", "observability", "Git",
      ],
    },
    {
      label: "Mobile",
      items: ["iOS", "Android", "React Native", "Expo", "Flutter", "Firebase"],
    },
  ],
  highlights: [
    [
      "Currently developing ",
      {
        text: "morphology-agnostic, contact-centric encoder-diffusion robotics control policy",
        href: "https://github.com/JacobFV/structured-psi0-latent-diffusion-dynamics",
      },
      " in collaboration with ",
      { text: "TalOS Robotics", href: "https://talosrobotics.ai/" },
    ],
    [
      "Developed/trained ",
      { text: "IBM-1", href: "https://super-cognition-labs.github.io/IBM-1/" },
      " topologically-constrained transformer foundation model for ",
      { text: "SuperCognition Labs", href: "https://supercognitionlabs.com/" },
    ],
    [
      "Owned ",
      { text: "api.agi.tech", href: "https://api.agi.tech" },
      ", integrations architect, web and android/ios SwE for AGI Inc",
    ],
  ],
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
// `title` and `org` are optional: an entry with neither (the career break)
// renders as its date range and text alone. `href` is the org's own site;
// the org name links to it.
export const experience: {
  title?: string;
  org?: string;
  href?: string;
  range: string;
  bullets: string[];
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
      "full-stack + infrastructure engineering across agentic systems: typescript, python, react/next.js, node.js, apis, distributed systems, cloud infrastructure, aws, gcp, s3, data engineering, containers, drizzle, pg/psql, databases, queues, browser/computer use, agent runtimes, tool use, model inference, llm integrations, multimodal models, evals, automation, control planes, observability, debugging, deployment, ci/cd, production operations. shipped rapidly across the stack in a high-velocity, production-first environment.",
    ],
    // The "AGI" thumbnail from this LinkedIn entry was the one image missing
    // from the handoff — the file that arrived under it was a duplicate of the
    // Human Robots prototype photo. Add it here when the real file turns up.
  },
  {
    title: "Software Engineer",
    org: "Breezy",
    href: "https://www.getbreezy.app",
    range: "Apr 2025 – Oct 2025",
    bullets: [
      "Full-stack product engineering across a rails/next.js monorepo for a prosumer (single-person business) AI receptionist platform.",
      "Independently owned features end-to-end from product requirements and implementation through integration, debugging, and production delivery.",
      "Worked across frontend, backend, ai integrations, and application infrastructure; Left for infra role at AGI Inc",
    ],
    media: [
      media("breezy-scheduling-appointments.jpg", 161, 180, "Using Breezy to Schedule Appointments"),
      media("breezy-ai-assistant.jpg", 156, 180, "Breezy AI assistant"),
    ],
  },
  {
    title: "Applied Machine Learning Engineer",
    org: "Deepshard",
    href: "https://itsalltruffles.com",
    range: "Sep 2024 – Dec 2024",
    bullets: [
      "Hardware and software for Truffle-1, a personal AI computer running models on-device: enclosure iteration across SLA, FDM and SLS printing against thermal constraints, alongside on-device ML work.",
    ],
  },
  {
    title: "Full Stack Pipeline Engineer",
    org: "FLORA",
    href: "https://flora.ai",
    range: "Jun 2024 – Jun 2024",
    bullets: [
      "typescript, python, modal, fal.ai, generative ai, difusion models, computer art, confy ui, react, serverless architecture",
    ],
  },
  {
    title: "Humanoid Robot Prototyping",
    org: "Human Robots",
    href: "https://x.com/HumanRobotsAI",
    range: "Jan 2023 – Sep 2024",
    bullets: [
      'Prototyped hydraulically actuated, endoskeletal humanoid robot: KiCAD, FreeCAD, Blender, Python, 3D printing, mdf board CNC routing, 3/16" A16 plasma cutting, 100um + 300um trace PCB fabrication and SMT assembly (LCSC), 3018 mdf milling. Supplier outreach; worked with Dakings Rapid. Did all the math in my notebook and brain before ChatGPT was useful for this!',
    ],
    media: [
      media(
        "endoskeletal-hydraulic-prototype.jpg", 83, 180,
        "Whole body endoskeletal + hydraulic system (no actuator) prototype assembly",
      ),
      media("lobe-pump-early-iteration.jpg", 135, 180, "Early iteration of positive displacement lobe pump"),
    ],
  },
  {
    title: "Software Engineer",
    org: "Motio, Inc.",
    href: "https://motio.com",
    range: "Aug 2022 – Jan 2023",
    bullets: ["Developed Soterre for Qlik Sense"],
  },
  {
    title: "Software Engineer (Intern)",
    org: "Motio, Inc.",
    href: "https://motio.com",
    range: "Jun 2022 – Aug 2022",
    bullets: ["Developed Soterre for Qlik Sense"],
  },
  {
    title: "Software Developer",
    org: "IT Lab · UT Arlington",
    href: "https://itlab.uta.edu",
    range: "Jun 2021 – May 2022",
    bullets: [
      "Flask-based statistical visualization tool CoWiz; research group collaboration",
      "Full stack Next-React-GraphQL stack: MLN Dashboard",
    ],
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
    href: "https://www.uta.edu/academics/schools-colleges/social-work",
    range: "Jun 2021 – May 2022",
    bullets: [
      "Maintain and enhance multi-platform (iOS and Android) data collecting application MyAmble using flutter and firebase and web administrator interface",
    ],
    media: [
      media("myamble-application.jpg", 234, 180, "MyAmble Application", "This was taken from the user guide"),
    ],
  },
  {
    range: "Apr 2020 – Jun 2021",
    bullets: ["Pandemic + first year at the University of Texas at Arlington"],
  },
  {
    title: "Crew Trainer",
    org: "McDonald's",
    href: "https://www.mcdonalds.com",
    range: "May 2016 – Mar 2020",
    bullets: [
      "Led 30-minute monthly safety meetings",
      "English and Spanish",
    ],
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
    href: "https://www.uta.edu",
    range: "2020 – 2022",
    bullets: [
      "CS coursework alongside heavy lab work, independent ML/robotics prototypes, and a steady research output. GPA 3.6/4.0.",
    ],
  },
  {
    title: "A.A.S., Mathematics",
    org: "Navarro College",
    href: "https://www.navarrocollege.edu",
    range: "2016 – 2018",
    bullets: ["Math associate degree taken dual-credit during high school. GPA 3.9/4.0."],
  },
];

// Whether a project belongs on the resume — curated per project, not inferred.
// The tag vocabulary was written for the site graph, not for a hiring
// reader: "school", "work" and "personal" say nothing about whether a
// piece of work belongs on a resume, and the old tag classifier answered
// "not this variant" for a fifth of the software list and two thirds of
// the robotics one. Those all landed in an "adjacent work" group that had
// become a dumpster, so the group is gone and the classification has to
// be right on its own.
//
// Every published project is named below: in one of the two groups that
// make up the resume (they were separate software and robotics resumes
// once, and are kept apart here only to stay readable), or in NOT_ON_RESUME
// for creative and personal work a hiring reader has no use for. A project
// named nowhere falls through to the tag heuristic at the bottom, so newly
// added work still surfaces instead of silently vanishing.

const SOFTWARE_RESUME = new Set([
  // AI systems, agents, world models, ML research
  "ibm-1", "sc-wbd", "general-unified-world-modeling", "canvas-engineering",
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
  "browser-os", "macos-web-next", "windows-web-next",
  "living-with-intelligence", "jterm", "ascii-art",
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
  "ibm-1", "sc-wbd", "canvas-engineering", "recursive-omnimodal-video-action-model",
  "general-unified-world-modeling", "rl-lab", "computatrum",
  "full-stack-artificial-intelligence",
  "broadening-and-building-beyond-classical-reinforcement-learning",
]);

// Real work, but a hiring reader gets nothing from it: music, animation,
// games made as a teenager, this site and the portfolio it replaced, the fund,
// and demos too slight to stand beside the rest.
const NOT_ON_RESUME = new Set([
  "ai-proverbs", "jacobs-hits-2023", "summer-break-2021-album", "tiles",
  "space-pong", "looking-for-princess-suzzane", "polonius-as-a-fool",
  "the-right-night-light", "jacobfv-site", "jacobfv-github-io", "gohuman-fund",
  "halo-prismatic",
]);

// Fallback for projects added after this file was last curated. Deliberately
// loose — showing new work that doesn't belong beats hiding work that does.
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

export function onResume(node: Node): boolean {
  const id = node.id;
  if (SOFTWARE_RESUME.has(id) || ROBOTICS_RESUME.has(id)) return true;
  if (NOT_ON_RESUME.has(id)) return false;
  const tags = node.tags.map((t) => t.toLowerCase());
  return tags.some((t) => SOFTWARE_TAGS.has(t) || ROBOTICS_TAGS.has(t));
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

function formatOne(iso: string, precision: Node["datePrecision"]): string {
  const year = iso.slice(0, 4);
  const month = Number.parseInt(iso.slice(5, 7), 10);
  if (precision === "year") return year;
  if (!month || Number.isNaN(month)) return year;
  if (precision === "season") return `${seasonOf(month)} ${year}`;
  return `${MONTHS[month - 1]} ${year}`;
}

// A project's date, or its span when `endDate` falls in a later month —
// a weekend hackathon stays one date, work that ran on shows its range.
export function formatResumeDate(node: Pick<Node, "date" | "endDate" | "datePrecision">): string {
  if (!node.date) return "";
  const start = formatOne(node.date, node.datePrecision);
  if (!node.endDate) return start;
  const end = formatOne(node.endDate, undefined);
  return end === start || node.endDate.slice(0, 7) === node.date.slice(0, 7) ? start : `${start} – ${end}`;
}

// Newest work first, by when it was last active: a project that started
// years ago but was worked on this month sorts with this month's work.
export function compareResumeProjects(
  a: Pick<Node, "date" | "endDate">,
  b: Pick<Node, "date" | "endDate">,
): number {
  const ka = a.endDate ?? a.date;
  const kb = b.endDate ?? b.date;
  return ka < kb ? 1 : ka > kb ? -1 : 0;
}

// The blurb the resume shows for a project: the tight resume_description
// when authored, otherwise the longer narrative summary.
export function resumeBlurb(node: Pick<Node, "summary" | "resumeDescription">): string {
  return node.resumeDescription ?? node.summary;
}

// One run of a project's resume line. A resume_description is plain text
// with a little inline markup, and nothing else of markdown:
//   [text](url)   a link
//   **text**      bold — reserved for measured results and the like
// Its last sentence, when it is a comma list ("python, pytorch, …"), is the
// tech stack: `tech` runs render muted, so the prose reads first while the
// keywords stay in the text for ATS parsers.
export type BlurbPart = {
  text: string;
  href?: string;
  strong?: boolean;
  tech?: boolean;
};

export function resumeBlurbParts(node: Pick<Node, "summary" | "resumeDescription">): BlurbPart[] {
  const blurb = resumeBlurb(node);
  // The tech tail follows the last ". " that has no markup after it.
  const cut = blurb.lastIndexOf(". ");
  const tail = cut === -1 ? "" : blurb.slice(cut + 2);
  const hasTail = tail.includes(",") && !/[[*]/.test(tail);
  const body = hasTail ? blurb.slice(0, cut + 1) : blurb;

  const parts: BlurbPart[] = [];
  let last = 0;
  for (const m of body.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*/g)) {
    if (m.index > last) parts.push({ text: body.slice(last, m.index) });
    if (m[1] !== undefined) parts.push({ text: m[1], href: m[2] });
    else parts.push({ text: m[3], strong: true });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  if (hasTail) parts.push({ text: " " }, { text: tail, tech: true });
  return parts;
}

// Projects the resume lists as one: the browser desktops are a shell and two
// simulations built on it, and read better as one entry than three. The
// entry keeps the first project's page and id, spans all of their dates,
// and links every member's repo and demo.
const RESUME_MERGES: { into: string; members: string[]; title: string; resumeDescription: string }[] = [
  {
    into: "browser-os",
    members: ["windows-web-next", "macos-web-next"],
    title: "browser-os · windows-web-next · macos-web-next",
    resumeDescription:
      "browser-native desktop shell (window manager, virtual filesystem, app lifecycle) with windows 11 and macOS simulations built on it, as instrumentable environments for human annotation and computer-use agent training. typescript, svelte, vercel, html2canvas, computer-use agents.",
  },
];

export type ResumeProject = Node & { members?: Node[] };

// The projects on the resume, merged where RESUME_MERGES says, newest
// activity first.
export function resumeProjects(nodes: Node[]): ResumeProject[] {
  const listed: ResumeProject[] = nodes.filter((n) => n.kind === "project" && onResume(n));
  const byId = new Map(listed.map((n) => [n.id, n]));
  const absorbed = new Set<string>();
  for (const m of RESUME_MERGES) {
    const base = byId.get(m.into);
    if (!base) continue;
    const members = m.members.map((id) => byId.get(id)).filter((n): n is Node => !!n);
    const all = [base, ...members];
    const date = all.map((n) => n.date).sort()[0];
    const endDate = all.map((n) => n.endDate ?? n.date).sort().at(-1);
    byId.set(m.into, { ...base, title: m.title, resumeDescription: m.resumeDescription, date, endDate, members });
    members.forEach((n) => absorbed.add(n.id));
  }
  return listed
    .filter((n) => !absorbed.has(n.id))
    .map((n) => byId.get(n.id)!)
    .sort(compareResumeProjects);
}

// Every repo and every demo/site of a project, members included.
export function projectRepos(n: ResumeProject) {
  return [n, ...(n.members ?? [])].map(githubRepo).filter((r) => r !== null);
}

export function projectShowcases(n: ResumeProject) {
  return [n, ...(n.members ?? [])].map(showcaseLink).filter((s) => s !== null);
}

// Prizes a project won, shown after its resume line. Resume-only, so they
// live here rather than in the project's frontmatter.
const RESUME_AWARDS: Record<string, { text: string; href: string }[]> = {
  precisionbom: [
    {
      text: "First place ($1000) at AI Agents & MCP Hardware Hackathon",
      href: "https://luma.com/7lww915n?tk=L6nfGG",
    },
  ],
  fieldratchet: [
    {
      text: "Finalist in AI Engineer World's Fair Hackathon 2026",
      href: "https://cerebralvalley.ai/e/aiewf-hackathon-2026",
    },
  ],
};

export function resumeAwards(node: Pick<Node, "id">): { text: string; href: string }[] {
  return RESUME_AWARDS[node.id] ?? [];
}

// Social posts about a project, linked after its repo. Resume-only, like
// the awards.
export type PostNetwork = "linkedin" | "x";
const RESUME_POSTS: Record<string, { network: PostNetwork; href: string }[]> = {
  "chem-0": [
    {
      network: "linkedin",
      href: "https://www.linkedin.com/posts/jacob-f-valdez_a-lot-of-embodied-ai-discourse-treats-reasoning-activity-7462650692445585408-E-pv?utm_source=share&utm_medium=member_desktop&rcm=ACoAADBbAAMBz1bWduOstTVqglQ1jVnVDaRkE9Q",
    },
  ],
  bsbr: [{ network: "x", href: "https://x.com/jvboid/status/1905931398961127820?s=20" }],
};

export function resumePosts(node: Pick<Node, "id">): { network: PostNetwork; href: string }[] {
  return RESUME_POSTS[node.id] ?? [];
}

// The project's GitHub repo as `owner/repo`, for the link at the end of its
// resume line. Only a link that names a repo counts — a bare profile or org
// URL has no `owner/repo` to show.
export function githubRepo(node: Pick<Node, "links">): { slug: string; href: string } | null {
  const href = node.links?.github;
  const m = href?.match(/github\.com\/([^/?#]+)\/([^/?#]+)/);
  if (!href || !m) return null;
  return { slug: `${m[1]}/${m[2].replace(/\.git$/, "")}`, href };
}

// Where a project can be seen running or read about — its demo, else its
// site — for the globe link beside the repo. Labelled with the host, plus
// the path when that stays short, so the reader knows where it goes.
export function showcaseLink(node: Pick<Node, "links">): { label: string; href: string } | null {
  const raw = node.links?.demo ?? node.links?.site;
  if (!raw) return null;
  const url = new URL(raw, `https://${contact.website}`);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/\/(index\.html)?$/, "");
  const label = `${host}${path}`.length <= 36 ? `${host}${path}` : host;
  return { label, href: url.href };
}

// A project's published packages, for the box links after its repo.
export function packageLinks(node: Pick<Node, "links">): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  const pypi = node.links?.pypi?.match(/pypi\.org\/project\/([^/?#]+)/);
  if (pypi) out.push({ label: `pypi/${pypi[1]}`, href: node.links!.pypi! });
  const npm = node.links?.npm?.match(/npmjs\.com\/package\/((?:@[^/]+\/)?[^/?#]+)/);
  if (npm) out.push({ label: `npm/${npm[1]}`, href: node.links!.npm! });
  return out;
}

export const resumePdfHref = "/resume/pdf";
