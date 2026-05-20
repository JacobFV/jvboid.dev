import Link from "next/link";
import { getGraph, nodeHref, type Lane, type NodeKind } from "@/lib/graph";

const laneClass: Record<Lane, string> = {
  research: "text-[var(--color-lane-research)]",
  building: "text-[var(--color-lane-building)]",
  writing: "text-[var(--color-lane-writing)]",
  personal: "text-[var(--color-lane-personal)]",
};

const kindLabel: Record<NodeKind, string> = {
  post: "post",
  project: "project",
  paper: "paper",
  reading: "reading",
  update: "update",
  skill: "skill",
  friend: "friend",
  event: "event",
  vision: "vision",
  experience: "experience",
};

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ListPage() {
  const { nodes } = getGraph();
  const sorted = [...nodes].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Index
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">
          Flat list of every node — accessible mirror of the constellation at{" "}
          <Link href="/graph">/graph</Link>.
        </p>
      </header>

      <ul className="divide-y divide-[var(--color-bg-2)]">
        {sorted.map((n) => (
          <li key={n.id} className="py-4">
            <Link href={nodeHref(n)} className="group flex flex-col gap-1 no-underline">
              <div className="flex items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                <time>{formatDate(n.date)}</time>
                <span className={laneClass[n.lane]}>{n.lane}</span>
                <span>·</span>
                <span>{kindLabel[n.kind]}</span>
              </div>
              <div className="text-lg text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
                {n.title}
              </div>
              <div className="text-sm text-[var(--color-ink-dim)]">{n.summary}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
