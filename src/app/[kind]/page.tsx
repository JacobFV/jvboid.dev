import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGraph,
  isListedNode,
  KIND_FROM_PREFIX,
  KIND_PREFIX,
  nodeLinkHref,
  type Node,
  type NodeKind,
} from "@/lib/graph";
import { ProjectsBrowser } from "@/components/chrome/ProjectsBrowser";
import { CollectionTitle } from "@/components/chrome/CollectionTitle";
import { byProjectRank, projectItemsFromNodes, withAdjacentProjects } from "@/lib/project-items";
import { getPostRevisionSummary } from "@/lib/post-revisions";

type Params = Promise<{ kind: string }>;

const KIND_TITLE: Record<NodeKind, string> = {
  post: "Posts",
  project: "Projects",
  paper: "Writings",
  reading: "Readings",
  update: "Updates",
  skill: "Skills",
  friend: "Friends",
  event: "Events",
  vision: "Visions",
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
};

// Writings and readings carry their title alone: the standfirst under the
// heading read as a subheader, and the home page dropped its equivalents.
const BARE_HEADER: ReadonlySet<NodeKind> = new Set<NodeKind>(["paper", "reading"]);

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
    .sort(nodeKind === "project" ? byProjectRank : byDateDesc);

  if (nodeKind === "project") {
    return (
      <main className="mx-auto max-w-5xl px-6 pb-16">
        <CollectionTitle>Projects</CollectionTitle>

        {nodes.length === 0 ? (
          <p className="text-[var(--color-ink-dim)]">No entries yet.</p>
        ) : (
          <ProjectsBrowser projects={projectItemsFromNodes(withAdjacentProjects(nodes))} />
        )}
      </main>
    );
  }

  const bare = BARE_HEADER.has(nodeKind);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className={bare ? "mb-8" : "mb-12"}>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)]"
          style={{ fontVariationSettings: '"opsz" 144' }}
        >
          {KIND_TITLE[nodeKind]}
        </h1>
        {!bare && (
          <p className="mt-3 text-[var(--color-ink-dim)]">{KIND_DESCRIPTION[nodeKind]}</p>
        )}
      </header>

      {/* No cards. An index is a list of things to read, so it is set as
          text: mono meta line, title, summary. Spacing and type weight do
          the separating that borders used to do. */}
      {nodes.length === 0 ? (
        <p className="text-[var(--color-ink-dim)]">No entries yet.</p>
      ) : (
        <ul className="flex flex-col gap-10">
          {nodes.map((node) => {
            const postedDate = new Date(node.date).toISOString().slice(0, 10);
            const revisionSummary =
              node.kind === "post" ? getPostRevisionSummary(node.id) : null;
            // Papers and readings have no page here — the title is a link
            // to the artifact itself. See `nodeSourceHref`.
            const href = nodeLinkHref(node);
            const offsite = /^https?:/i.test(href);
            return (
              <li key={node.id}>
                <Link
                  href={href}
                  {...(offsite ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="group block no-underline"
                >
                  <div className="flex flex-wrap items-baseline gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                    {node.kind === "post" ? (
                      <>
                        <span>
                          posted: <time dateTime={postedDate}>{postedDate}</time>
                        </span>
                        {revisionSummary?.updatedDate && (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              updated:{" "}
                              <time dateTime={revisionSummary.updatedDate}>
                                {revisionSummary.updatedDate}
                              </time>
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <time dateTime={postedDate}>{postedDate}</time>
                        {node.eventStatus && (
                          <>
                            <span>·</span>
                            <span>{node.eventStatus}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{node.lane}</span>
                      </>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-xl leading-snug text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
                    {node.title}
                  </h2>
                  <p className="mt-1.5 max-w-[64ch] leading-relaxed text-[var(--color-ink-dim)]">
                    {node.summary}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
