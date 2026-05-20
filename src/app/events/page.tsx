import Link from "next/link";
import { getGraph, nodeHref, type Node } from "@/lib/graph";

const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export const metadata = {
  title: "Events · Jacob Valdez",
  description: "Conferences, talks, trips, launches, and other places Jacob has been or is going.",
};

function byDateDesc(a: Node, b: Node) {
  return a.date < b.date ? 1 : -1;
}

function byDateAsc(a: Node, b: Node) {
  return a.date > b.date ? 1 : -1;
}

export default function EventsPage() {
  const events = getGraph().nodes.filter((n) => n.kind === "event");
  const upcoming = events.filter((n) => n.eventStatus === "upcoming").sort(byDateAsc);
  const past = events.filter((n) => n.eventStatus !== "upcoming").sort(byDateDesc);

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
          Events
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">
          Conferences, talks, trips, launches, and other places worth keeping in the graph.
        </p>
      </header>

      {upcoming.length > 0 && <EventList title="Upcoming" events={upcoming} />}
      <EventList title="Past" events={past} />
    </main>
  );
}

function EventList({ title, events }: { title: string; events: Node[] }) {
  if (events.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-[family-name:var(--font-mono)] text-xs tracking-wider text-[var(--color-ink-mute)] uppercase">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {events.map((n) => (
          <li key={n.id}>
            <Link
              href={nodeHref(n)}
              className="block rounded-xl bg-[var(--color-bg-1)]/50 p-5 no-underline shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition-colors hover:bg-[var(--color-bg-1)]"
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                <time>{fmtDate(n.date)}</time>
                {n.eventType && (
                  <>
                    <span>·</span>
                    <span>{n.eventType}</span>
                  </>
                )}
                {n.eventStatus && (
                  <>
                    <span>·</span>
                    <span>{n.eventStatus}</span>
                  </>
                )}
              </div>
              <div className="text-lg text-[var(--color-ink)]">{n.title}</div>
              {(n.venue || n.location) && (
                <div className="mt-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  {[n.venue, n.location].filter(Boolean).join(" · ")}
                </div>
              )}
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                {n.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
