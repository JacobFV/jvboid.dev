import Link from "next/link";
import { getGraph, nodeHref } from "@/lib/graph";

const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export const metadata = {
  title: "Updates · Jacob Valdez",
  description: "Recent updates, notes, and embedded posts.",
};

export default function UpdatesPage() {
  const updates = getGraph()
    .nodes.filter((n) => n.kind === "update")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <Link
          href="/"
          className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]"
        >
          ← home
        </Link>
        <h1
          className="mt-8 font-[family-name:var(--font-display)] text-4xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Updates
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">
          Durable notes, links, and embedded posts, sorted newest first.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {updates.map((n) => (
          <li key={n.id}>
            <Link
              href={nodeHref(n)}
              className="block rounded-xl bg-[var(--color-bg-1)]/50 p-5 no-underline shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition-colors hover:bg-[var(--color-bg-1)]"
            >
              <div className="mb-2 flex items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                <time>{fmtDate(n.date)}</time>
                {n.updateType && (
                  <>
                    <span>·</span>
                    <span>{n.updateType}</span>
                  </>
                )}
              </div>
              <div className="text-lg text-[var(--color-ink)]">{n.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                {n.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
