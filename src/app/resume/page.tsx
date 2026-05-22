import Link from "next/link";
import { getGraph, isListedNode, nodeHref } from "@/lib/graph";

export const metadata = {
  title: "Resume · Jacob Valdez",
  description: "AI systems engineer and product builder resume.",
};

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 7) : null);

const experience = [
  {
    title: "Founder",
    org: "Limboid",
    href: "/projects/limboid",
    range: "2019-06 - present",
    summary:
      "Founded and operated the long-horizon robotics effort behind hydraulic actuation, embodied intelligence, on-demand physical automation, and the Computatrum/Limboid prototype lineage.",
    tags: ["robotics", "hardware", "founder"],
  },
  {
    title: "API / Integration Architect",
    org: "AGI, Inc.",
    href: "https://agi.app",
    range: "2024-01 - 2024-12",
    summary:
      "Owned the contract between agent runtime, mobile clients, web clients, and internal evaluation surfaces; led schema and integration work through fast product pivots.",
    tags: ["agents", "mobile", "schemas"],
  },
  {
    title: "B.S., Computer Science",
    org: "The University of Texas at Dallas",
    href: "https://utdallas.edu",
    range: "2018-08 - 2022-05",
    summary:
      "Studied computer science while building early ML, robotics, and research prototypes across lab work and independent projects.",
    tags: ["education", "computer-science"],
  },
];

export default function ResumePage() {
  const { nodes } = getGraph();
  const listedNodes = nodes.filter(isListedNode);

  const projects = listedNodes
    .filter((n) => n.kind === "project" && n.status !== "shelved")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  const highlights = [
    "Architected production integration surfaces for mobile AI agents across runtime, mobile clients, web clients, and internal evaluation tools.",
    "Built full-stack AI products from concept to shipped demos, including agent workflows, embedded live previews, graph-backed portfolio infrastructure, and robotics control prototypes.",
    "Founded and operated Limboid as a long-horizon robotics company focused on hydraulic actuation, embodied intelligence, and low-cost physical automation.",
    "Published a broad technical archive spanning machine learning systems, autonomous agents, robotics, consciousness theory, and developer platforms.",
  ];

  const strengths = [
    "AI agents, tool use, schemas, runtime integration",
    "Full-stack TypeScript, Next.js, MDX, product systems",
    "Robotics prototypes, CAD-to-control reasoning, lab automation",
    "Technical writing, research synthesis, product strategy",
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Jacob Valdez
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-[var(--color-ink-dim)]">
          AI systems engineer and product builder focused on agent infrastructure,
          full-stack AI applications, robotics, and technical systems that turn
          ambiguous research ideas into working software.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <a className="hover:text-[var(--color-accent)]" href="mailto:jacob@humanrobots.ai">
            jacob@humanrobots.ai
          </a>
          <a className="hover:text-[var(--color-accent)]" href="https://github.com/JacobFV">
            github.com/JacobFV
          </a>
          <a className="hover:text-[var(--color-accent)]" href="https://twitter.com/jvboid">
            @jvboid
          </a>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Highlights
        </h2>
        <ul className="grid gap-3 text-sm leading-relaxed text-[var(--color-ink-dim)]">
          {highlights.map((highlight) => (
            <li key={highlight} className="border-l border-[var(--color-bg-2)] pl-4">
              {highlight}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Strengths
        </h2>
        <div className="flex flex-wrap gap-2">
          {strengths.map((strength) => (
            <span
              key={strength}
              className="rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-3 py-1.5 text-xs text-[var(--color-ink-dim)]"
            >
              {strength}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Experience
        </h2>
        <ul className="grid gap-6">
          {experience.map((n) => (
            <li key={`${n.org}-${n.title}`} className="grid grid-cols-[140px_1fr] gap-4">
              <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                {n.range}
              </div>
              <div>
                <Link
                  href={n.href}
                  className="block text-lg text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
                >
                  {n.title}
                  <span className="text-[var(--color-ink-dim)]"> · {n.org}</span>
                </Link>
                <p className="mt-1 text-sm text-[var(--color-ink-dim)]">{n.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--color-ink-mute)]">
                  {n.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[var(--color-bg-1)] px-2 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Selected projects
        </h2>
        <ul className="grid gap-3">
          {projects.map((n) => (
            <li key={n.id} className="grid grid-cols-[140px_1fr] gap-4">
              <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                {fmt(n.date)}
              </div>
              <Link
                href={nodeHref(n)}
                className="text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
              >
                {n.title}{" "}
                <span className="text-[var(--color-ink-dim)]">
                  — {n.summary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
