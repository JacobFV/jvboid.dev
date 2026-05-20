import Link from "next/link";
import { getGraph, nodeHref, type Node } from "@/lib/graph";

export const metadata = {
  title: "Resume · Jacob Valdez",
  description: "Experience, projected from the experience nodes in the graph.",
};

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 7) : null);

function rangeLabel(n: Node) {
  const s = fmt(n.date);
  const e = fmt(n.endDate) ?? "present";
  return `${s} – ${e}`;
}

export default function ResumePage() {
  const { nodes } = getGraph();
  const experience = nodes
    .filter((n) => n.kind === "experience")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const projects = nodes
    .filter((n) => n.kind === "project" && n.status !== "shelved")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]"
      >
        ← home
      </Link>

      <header className="mb-12 mt-8">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Jacob Valdez
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">
          Resume — auto-projected from <code>kind=experience</code> nodes,
          sorted by date desc. PDF export is the Phase 8 follow-up.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-[var(--color-ink-mute)]">
          Experience
        </h2>
        {experience.length === 0 ? (
          <p className="text-[var(--color-ink-dim)]">No entries yet.</p>
        ) : (
          <ul className="grid gap-6">
            {experience.map((n) => (
              <li key={n.id} className="grid grid-cols-[140px_1fr] gap-4">
                <div className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  {rangeLabel(n)}
                </div>
                <div>
                  <Link
                    href={nodeHref(n)}
                    className="block text-lg text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
                  >
                    {n.title}
                    {n.org && (
                      <span className="text-[var(--color-ink-dim)]">
                        {" "}
                        · {n.org}
                      </span>
                    )}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--color-ink-dim)]">
                    {n.summary}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
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
