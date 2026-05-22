import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGraph,
  isListedNode,
  KIND_FROM_PREFIX,
  KIND_PREFIX,
  nodeHref,
  type Node,
  type NodeKind,
} from "@/lib/graph";

type Params = Promise<{ kind: string }>;

const KIND_TITLE: Record<NodeKind, string> = {
  post: "Posts",
  project: "Projects",
  paper: "Papers",
  reading: "Readings",
  update: "Updates",
  skill: "Skills",
  friend: "Friends",
  event: "Events",
  vision: "Visions",
  experience: "Experience",
};

const KIND_DESCRIPTION: Record<NodeKind, string> = {
  post: "Essays, notes, arguments, and working thoughts.",
  project: "Built systems, prototypes, experiments, tools, and artifacts.",
  paper: "Research papers and formal writing.",
  reading: "Books, papers, articles, and references worth tracking.",
  update: "Durable updates, links, launches, and short notes.",
  skill: "Capabilities, practice areas, and supporting evidence.",
  friend: "People and collaborators in the graph.",
  event: "Conferences, talks, trips, launches, and other dated events.",
  vision: "Longer vision documents and application essays.",
  experience: "Roles, education, and operating history.",
};

export function generateStaticParams() {
  return Object.values(KIND_PREFIX).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { kind } = await params;
  const nodeKind = KIND_FROM_PREFIX[kind];
  if (!nodeKind) return {};
  return {
    title: `${KIND_TITLE[nodeKind]} · Jacob Valdez`,
    description: KIND_DESCRIPTION[nodeKind],
  };
}

function byDateDesc(a: Node, b: Node) {
  return a.date < b.date ? 1 : -1;
}

export default async function KindIndexPage({ params }: { params: Params }) {
  const { kind } = await params;
  const nodeKind = KIND_FROM_PREFIX[kind];
  if (!nodeKind) notFound();

  const nodes = getGraph()
    .nodes.filter((n) => n.kind === nodeKind && isListedNode(n))
    .sort(byDateDesc);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          {KIND_TITLE[nodeKind]}
        </h1>
        <p className="mt-3 text-[var(--color-ink-dim)]">{KIND_DESCRIPTION[nodeKind]}</p>
      </header>

      {nodes.length === 0 ? (
        <p className="text-[var(--color-ink-dim)]">No entries yet.</p>
      ) : (
        <ul className="grid gap-4">
          {nodes.map((node) => (
            <li key={node.id}>
              <Link
                href={nodeHref(node)}
                className="block rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/45 p-5 no-underline transition-colors hover:border-[var(--color-ink-mute)] hover:bg-[var(--color-bg-1)]"
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                  <time>{new Date(node.date).toISOString().slice(0, 10)}</time>
                  {node.status && (
                    <>
                      <span>·</span>
                      <span>{node.status}</span>
                    </>
                  )}
                  {node.eventStatus && (
                    <>
                      <span>·</span>
                      <span>{node.eventStatus}</span>
                    </>
                  )}
                  <span>·</span>
                  <span>{node.lane}</span>
                </div>
                <div className="text-lg text-[var(--color-ink)]">{node.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-dim)]">
                  {node.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
