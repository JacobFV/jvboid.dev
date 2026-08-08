import Link from "next/link";
import { getGraph, nodeHref } from "@/lib/graph";

const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

// Delisted, like `/t`: reachable by URL so old links keep resolving, but
// kept out of the nav, the home page, the command menu, the feed, the
// sitemap, and search. Update nodes are `unlisted` site-wide (see
// DELISTED_KINDS in lib/graph.ts), so this archive deliberately does not
// filter by `isListedNode` — otherwise it would list nothing.
export const metadata = {
  title: "Updates · Jacob Valdez",
  description: "Recent updates, notes, and embedded posts.",
  robots: { index: false, follow: false },
};

export default function UpdatesPage() {
  const updates = getGraph()
    .nodes.filter((n) => n.kind === "update")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          Updates
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">
          Durable notes, links, and embedded posts, sorted newest first.
        </p>
      </header>

      {/* Vertical timeline: a continuous grey rail threads through a
          neutral-grey dot on each row, with summary text per row. */}
      <ul className="flex flex-col">
        {updates.map((n, i) => {
          const first = i === 0;
          const last = i === updates.length - 1;
          return (
            <li key={n.id} className="relative">
              <Link
                href={nodeHref(n)}
                className="group flex gap-4 py-4 pr-3 pl-9 no-underline transition-colors"
              >
                <time className="w-20 shrink-0 pt-0.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  {fmtDate(n.date)}
                </time>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
                      {n.title}
                    </span>
                    {n.updateType && (
                      <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                        · {n.updateType}
                      </span>
                    )}
                  </div>
                  {n.summary && (
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                      {n.summary}
                    </p>
                  )}
                </div>
              </Link>
              {/* Rail + dot, painted after the Link in DOM order. The
                  rail is clipped to start/end at the dot on the
                  first/last row. */}
              <span
                aria-hidden
                className="absolute left-3 w-px -translate-x-1/2 bg-[var(--color-bg-2)]"
                style={{ top: first ? "1.6rem" : 0, bottom: last ? "calc(100% - 1.6rem)" : 0 }}
              />
              <span
                aria-hidden
                className="absolute left-3 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--color-ink-mute)] ring-4 ring-[var(--color-bg-0)]"
                style={{ top: "1.6rem", marginTop: "-0.25rem" }}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
