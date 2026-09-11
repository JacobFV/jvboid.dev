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
import { SlopTitle } from "@/components/chrome/SlopTitle";
import { PostThumb, postThumbImage } from "@/components/chrome/PostThumb";
import { CoverArt } from "@/components/chrome/CoverArt";
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

// The two kinds that are *objects* — a PDF, a book, a published page —
// rather than writing that lives here. They already have covers on the
// home shelf, and a row of them reads much faster with the cover than
// without: you recognise a paper you have read before you finish the
// title. Every other index stays pure text.
const COVER_KINDS: ReadonlySet<NodeKind> = new Set<NodeKind>(["paper", "reading"]);

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
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-16">
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
    <main className="mx-auto max-w-3xl px-6 pt-10 pb-16">
      <header className={bare ? "mt-14 mb-14" : "mt-14 mb-16"}>
        {nodeKind === "post" ? (
          <SlopTitle />
        ) : (
          <>
            <h1 data-page-title className="display-title">
              {KIND_TITLE[nodeKind]}
            </h1>
            {!bare && <p className="standfirst mt-8">{KIND_DESCRIPTION[nodeKind]}</p>}
          </>
        )}
      </header>

      {/* No cards. An index is a list of things to read, so it is set as
          text: a numeral, the title in the serif, the summary, and a
          hairline between entries — a table of contents, not a feed. */}
      {nodes.length === 0 ? (
        <p className="text-[var(--color-ink-dim)]">No entries yet.</p>
      ) : (
        <ol className="flex flex-col">
          {nodes.map((node, i) => {
            const postedDate = new Date(node.date).toISOString().slice(0, 10);
            const revisionSummary = node.kind === "post" ? getPostRevisionSummary(node.id) : null;
            // Papers and readings have no page here — the title is a link
            // to the artifact itself. See `nodeSourceHref`.
            const href = nodeLinkHref(node);
            const offsite = /^https?:/i.test(href);
            const withCover = COVER_KINDS.has(node.kind);
            // Posts carry their own picture in place of the numeral; a post
            // without one is set as text alone.
            const thumb = node.kind === "post" ? postThumbImage(node) : undefined;
            const withThumb = Boolean(thumb);
            const plainPost = node.kind === "post" && !thumb;
            return (
              <li key={node.id} className="border-t border-[var(--color-rule)] last:border-b">
                <Link
                  href={href}
                  {...(offsite ? { target: "_blank", rel: "noreferrer" } : {})}
                  {...(node.note ? { title: node.note } : {})}
                  className={
                    withCover
                      ? "group flex items-start gap-5 py-7 no-underline"
                      : withThumb
                        ? "group grid grid-cols-[6rem_1fr] items-start gap-x-5 py-7 no-underline sm:grid-cols-[8rem_1fr] sm:gap-x-6"
                        : plainPost
                          ? "group block py-7 no-underline"
                          : "group grid grid-cols-[3.5rem_1fr] gap-x-4 py-7 no-underline sm:grid-cols-[5rem_1fr]"
                  }
                >
                  {thumb && (
                    <PostThumb
                      image={thumb}
                      className="mt-1 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  )}
                  {!withCover && !withThumb && !plainPost && (
                    <span className="numeral pt-1">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                  {withCover && (
                    <CoverArt
                      node={node}
                      variant={node.kind === "paper" ? "paper" : "reading"}
                      size="compact"
                      className="w-20 shrink-0 transition-[transform,box-shadow] duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--color-ink)_16%,transparent)] sm:w-24"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2 font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase">
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
                    <h2 className="mt-2 font-block text-2xl font-extrabold leading-tight tracking-tight text-[var(--color-ink)] transition-colors duration-500 group-hover:text-[var(--color-ink-dim)] sm:text-3xl">
                      {node.title}
                    </h2>
                    <p className="standfirst mt-3 !text-[1.02rem] !leading-[1.5]">{node.summary}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
