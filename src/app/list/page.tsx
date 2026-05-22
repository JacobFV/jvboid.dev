import Link from "next/link";
import type React from "react";
import {
  getGraph,
  isListedNode,
  KIND_FROM_PREFIX,
  nodeHref,
  type Lane,
  type Node,
  type NodeKind,
  type ProjectStatus,
} from "@/lib/graph";

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
const kindPluralLabel: Record<NodeKind, string> = {
  post: "posts",
  project: "projects",
  paper: "papers",
  reading: "readings",
  update: "updates",
  skill: "skills",
  friend: "friends",
  event: "events",
  vision: "visions",
  experience: "experience",
};

const kindOptions: NodeKind[] = [
  "post",
  "project",
  "paper",
  "reading",
  "update",
  "skill",
  "friend",
  "event",
  "vision",
  "experience",
];
const laneOptions: Lane[] = ["research", "building", "writing", "personal"];
const statusOptions: ProjectStatus[] = ["active", "shipped", "idea", "shelved"];

function formatDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeKind(value: string | undefined): NodeKind | undefined {
  if (!value) return undefined;
  const raw = value.toLowerCase();
  if (raw in kindLabel) return raw as NodeKind;
  return KIND_FROM_PREFIX[raw];
}

function normalizeLane(value: string | undefined): Lane | undefined {
  return laneOptions.includes(value as Lane) ? (value as Lane) : undefined;
}

function normalizeStatus(value: string | undefined): ProjectStatus | undefined {
  return statusOptions.includes(value as ProjectStatus) ? (value as ProjectStatus) : undefined;
}

function matchesQuery(node: Node, q: string): boolean {
  const haystack = [node.title, node.summary, node.kind, node.lane, node.status, ...node.tags]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

function hrefWith(current: URLSearchParams, updates: Record<string, string | undefined>): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  next.delete("filter");
  const qs = next.toString();
  return qs ? `/list?${qs}` : "/list";
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs no-underline transition-colors ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
          : "border-[var(--color-bg-2)] text-[var(--color-ink-dim)] hover:border-[var(--color-ink-mute)] hover:text-[var(--color-ink)]"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ListPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const filter = firstParam(params.filter);
  const kind = normalizeKind(firstParam(params.kind) ?? filter);
  const lane = normalizeLane(firstParam(params.lane));
  const status = normalizeStatus(firstParam(params.status));
  const tag = firstParam(params.tag)?.trim().toLowerCase();
  const q = firstParam(params.q)?.trim();
  const current = new URLSearchParams();
  if (kind) current.set("kind", kind);
  if (lane) current.set("lane", lane);
  if (status) current.set("status", status);
  if (tag) current.set("tag", tag);
  if (q) current.set("q", q);

  const { nodes } = getGraph();
  const listed = nodes.filter(isListedNode);
  const tags = Array.from(new Set(listed.flatMap((n) => n.tags))).sort((a, b) =>
    a.localeCompare(b),
  );
  const sorted = listed
    .filter((n) => {
      if (kind && n.kind !== kind) return false;
      if (lane && n.lane !== lane) return false;
      if (status && n.status !== status) return false;
      if (tag && !n.tags.some((t) => t.toLowerCase() === tag)) return false;
      if (q && !matchesQuery(n, q)) return false;
      return true;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const activeSummary = [
    kind && kindLabel[kind],
    lane,
    status,
    tag && `#${tag}`,
    q && `"${q}"`,
  ].filter(Boolean);

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
          Flat list of {activeSummary.length ? activeSummary.join(" · ") : "every node"} —
          accessible mirror of the constellation at <Link href="/graph">/graph</Link>.
        </p>
      </header>

      <section aria-label="List filters" className="mb-10 space-y-5">
        <div className="flex flex-wrap gap-2">
          <FilterLink href={hrefWith(current, { kind: undefined })} active={!kind}>
            all kinds
          </FilterLink>
          {kindOptions.map((option) => (
            <FilterLink
              key={option}
              href={hrefWith(current, { kind: option })}
              active={kind === option}
            >
              {kindPluralLabel[option]}
            </FilterLink>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterLink href={hrefWith(current, { lane: undefined })} active={!lane}>
            all lanes
          </FilterLink>
          {laneOptions.map((option) => (
            <FilterLink
              key={option}
              href={hrefWith(current, { lane: option })}
              active={lane === option}
            >
              {option}
            </FilterLink>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterLink href={hrefWith(current, { status: undefined })} active={!status}>
            all statuses
          </FilterLink>
          {statusOptions.map((option) => (
            <FilterLink
              key={option}
              href={hrefWith(current, { status: option, kind: "project" })}
              active={status === option}
            >
              {option}
            </FilterLink>
          ))}
        </div>

        <form action="/list" className="flex gap-2">
          {kind && <input type="hidden" name="kind" value={kind} />}
          {lane && <input type="hidden" name="lane" value={lane} />}
          {status && <input type="hidden" name="status" value={status} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Filter by text"
            className="min-w-0 flex-1 rounded-full border border-[var(--color-bg-2)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-mute)] focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-bg-0)]"
          >
            filter
          </button>
          {current.toString() && (
            <Link
              href="/list"
              className="rounded-full px-3 py-2 text-sm text-[var(--color-ink-mute)] no-underline hover:text-[var(--color-ink)]"
            >
              reset
            </Link>
          )}
        </form>

        {tags.length > 0 && (
          <details className="text-sm text-[var(--color-ink-dim)]">
            <summary className="cursor-pointer text-[var(--color-ink-mute)]">tags</summary>
            <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
              {tags.map((option) => (
                <FilterLink
                  key={option}
                  href={hrefWith(current, { tag: option })}
                  active={tag === option.toLowerCase()}
                >
                  #{option}
                </FilterLink>
              ))}
            </div>
          </details>
        )}
      </section>

      <div className="mb-4 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        {sorted.length} {sorted.length === 1 ? "result" : "results"}
      </div>

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
