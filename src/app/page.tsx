import Link from "next/link";
import { AskInput } from "@/components/chrome/AskInput";
import { PfpReveal } from "@/components/chrome/PfpReveal";
import { ProjectsBrowser, type ProjectItem } from "@/components/chrome/ProjectsBrowser";
import { UpdateDock } from "@/components/chrome/UpdateDock";
import {
  getGraph,
  getLatestUpdate,
  isListedNode,
  nodeHref,
  type Lane,
  type Node,
} from "@/lib/graph";
import { byProjectRank, projectItemsFromNodes, withAdjacentProjects } from "@/lib/project-items";
import { getPostRevisionSummary } from "@/lib/post-revisions";

const laneClass: Record<Lane, string> = {
  research: "text-[var(--color-lane-research)]",
  building: "text-[var(--color-lane-building)]",
  writing: "text-[var(--color-lane-writing)]",
  personal: "text-[var(--color-lane-personal)]",
};

const laneBg: Record<Lane, string> = {
  research: "bg-[var(--color-lane-research)]",
  building: "bg-[var(--color-lane-building)]",
  writing: "bg-[var(--color-lane-writing)]",
  personal: "bg-[var(--color-lane-personal)]",
};

const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const socialLinks = [
  { label: "email", href: "mailto:jacob@humanrobots.ai" },
  { label: "text/call", href: "tel:+19724606353" },
  { label: "x", href: "https://twitter.com/jvboid" },
  { label: "github", href: "https://github.com/JacobFV" },
  { label: "instagram", href: "https://www.instagram.com/jvboid/" },
  { label: "art", href: "https://jvboid.art" },
  { label: "anonymous feedback", href: "https://www.admonymous.co/jvboid" },
];

// Featured projects: a few pinned load-bearing ones, then by recency. Cap at 6.
function pickFeatured(nodes: Node[]): Node[] {
  const candidates = nodes.filter((n) => n.kind === "project");
  // Manual override — pin a few load-bearing ones to the top regardless of date.
  const pinned = [
    // Orbit slots (rank 0–1) — both live iframe embeds.
    "windows-web-next",
    "macos-web-next",
    // Planetoid slots (rank 2–5) — drift around the pfp with moons.
    "limboid",
    "computatrum",
    "jacobfv-site",
    "canvas-engineering",
  ];
  const pinnedNodes = pinned
    .map((id) => candidates.find((n) => n.id === id))
    .filter((n): n is Node => Boolean(n));
  const rest = candidates
    .filter((n) => !pinned.includes(n.id))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return [...pinnedNodes, ...rest].slice(0, 6);
}

export default function HomePage() {
  const graph = getGraph();
  const { nodes } = graph;
  const listedNodes = nodes.filter(isListedNode);

  const featured = pickFeatured(listedNodes);
  // Full project list: curated hardware/polished projects first, then the rest
  // by date.
  const allProjects = withAdjacentProjects(
    listedNodes.filter((n) => n.kind === "project").sort(byProjectRank),
  );
  // Lite shape for the client-side ProjectsBrowser — icon art and meta
  // only. Every tile links straight to the project page.
  const projectItems: ProjectItem[] = projectItemsFromNodes(allProjects);
  const recentPosts = listedNodes
    .filter((n) => n.kind === "post")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const recentPapers = listedNodes
    .filter((n) => n.kind === "paper")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const recentReadings = listedNodes
    .filter((n) => n.kind === "reading")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);
  const recentUpdates = listedNodes
    .filter((n) => n.kind === "update")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const latestUpdate = getLatestUpdate(listedNodes);

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 pt-24 pb-32">
        {/* ---- Hero ---- */}
        <section className="mb-32 flex flex-col items-center text-center">
          <div className="relative isolate grid h-[200px] w-[200px] place-items-center">
            <PfpReveal />
          </div>
          <div className="relative flex w-full flex-col items-center">
            <h1
              className="mt-6 font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--color-ink)] sm:text-6xl"
              style={{ fontVariationSettings: '"opsz" 144' }}
            >
              Jacob Valdez
            </h1>

            <AskInput />

            <div className="mt-4 flex max-w-2xl flex-wrap justify-center gap-x-3 gap-y-2 font-[family-name:var(--font-mono)] text-xs">
              {socialLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  className="text-[var(--color-ink-dim)] no-underline underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* The nav pills that used to sit here (timeline / blog /
                resume / projects) are all reachable from the sticky
                header, so they were duplicated chrome between the reader
                and the one thing on this page worth reading. */}

            <p className="mt-10 max-w-2xl text-left text-lg leading-[1.65] text-[var(--color-ink-dim)]">
              Currently working on{" "}
              <a
                href="https://commandagi.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
              >
                CommandAGI
              </a>
              . Most recently API/Integration Architect
              at{" "}
              <a
                href="https://agi.app"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
              >
                AGI, Inc.
              </a>
              , shipping APIs, integrations, and agent infrastructure for on-device mobile AI
              agents. Earlier: Breezy, Deepshard, Motio, and UTA research labs. BS Computer Science
              from UT Arlington. I love science and engineering and people
            </p>
          </div>
        </section>

        {/* ---- All projects ---- */}
        <ProjectsBrowser id="projects" projects={projectItems} />

        {/* ---- Updates ---- */}
        {recentUpdates.length > 0 && (
          <Section title="Updates" link={{ href: "/updates", label: "all updates →" }}>
            <UpdateTimeline nodes={recentUpdates} />
          </Section>
        )}

        {/* ---- Recent posts ---- */}
        <Section
          id="posts"
          eyebrow="Writing"
          title="Recent posts"
          link={{ href: "/posts", label: "all posts →" }}
        >
          <ul className="flex flex-col">
            {recentPosts.map((n) => (
              <li key={n.id}>
                <RowLink node={n} />
              </li>
            ))}
          </ul>
        </Section>

        {/* ---- Papers ---- */}
        {recentPapers.length > 0 && (
          <Section
            eyebrow="Research"
            title="Papers & notes"
            link={{ href: "/papers", label: "all papers →" }}
          >
            <CoverRail nodes={recentPapers} variant="paper" />
          </Section>
        )}

        {/* ---- Readings ---- */}
        {recentReadings.length > 0 && (
          <Section
            eyebrow="Reading"
            title="Favorites"
            link={{ href: "/readings", label: "all readings →" }}
          >
            <ReadingCoverRail nodes={recentReadings} />
          </Section>
        )}

        {/* ---- Footer ---- */}
        <footer className="mt-32 border-t border-[var(--color-bg-2)]/50 pt-8 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <p className="opacity-45">Copyright Jacob Valdez.</p>
        </footer>
      </main>
      {latestUpdate && (
        <UpdateDock
          id={latestUpdate.id}
          title={latestUpdate.title}
          summary={latestUpdate.summary}
          date={fmtDate(latestUpdate.date)}
        />
      )}
    </>
  );
}

function Section({
  eyebrow,
  title,
  link,
  children,
  id,
}: {
  eyebrow?: string;
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-24 scroll-mt-20">
      <div className="mb-8 flex items-baseline justify-between gap-6">
        <div>
          {eyebrow && <p className="text-xs text-[var(--color-ink-mute)]">{eyebrow}</p>}
          <h2
            className={[
              eyebrow ? "mt-2" : "",
              "font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-ink)]",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ fontVariationSettings: '"opsz" 96' }}
          >
            {title}
          </h2>
        </div>
        {link && (
          <Link
            href={link.href}
            className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function ReadingCoverRail({ nodes }: { nodes: Node[] }) {
  return <CoverRail nodes={nodes} variant="reading" />;
}

function CoverRail({ nodes, variant }: { nodes: Node[]; variant: "reading" | "paper" }) {
  return (
    <ul className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-3 [scrollbar-width:thin]">
      {nodes.map((node) => (
        <li key={node.id} className="shrink-0">
          <CoverCard node={node} variant={variant} />
        </li>
      ))}
    </ul>
  );
}

function CoverCard({ node, variant }: { node: Node; variant: "reading" | "paper" }) {
  // Paper covers are first-page PNG exports from PDFs. To add another,
  // download the PDF to /tmp and run:
  // `pdftoppm -png -f 1 -singlefile -r 160 /tmp/<slug>.pdf public/assets/img/{readings|papers}/<slug>`.
  // Then set `hero.src` in frontmatter to `/assets/img/{readings|papers}/<slug>.png`.
  return (
    <Link
      href={nodeHref(node)}
      title={node.title}
      aria-label={node.title}
      className="group block w-28 no-underline sm:w-32"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] shadow-sm transition-[transform,box-shadow] duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--color-ink)_16%,transparent)]">
        {node.hero ? (
          <img
            src={node.hero.src}
            alt={node.hero.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,var(--color-bg-1),var(--color-bg-0)_46%,var(--color-bg-2))] p-3">
            <div className="font-[family-name:var(--font-mono)] text-[9px] tracking-wider text-[var(--color-ink-mute)] uppercase">
              {variant === "paper" ? "note" : (node.workType ?? "reading")}
            </div>
            <div className="text-sm leading-tight text-[var(--color-ink)]">{node.title}</div>
            <div className={`h-1 w-8 rounded-full ${laneBg[node.lane]}`} aria-hidden />
          </div>
        )}
        {node.tier && (
          <div className="absolute top-2 right-2 rounded-full bg-[var(--color-bg-0)]/90 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-[var(--color-ink)] shadow-[var(--ring-soft)]">
            {node.tier}
          </div>
        )}
      </div>
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-center text-xs leading-tight text-[var(--color-ink-dim)] underline-offset-4 group-hover:text-[var(--color-ink)] group-hover:underline">
        {node.title}
      </div>
    </Link>
  );
}

// Updates rendered as a vertical timeline: a continuous grey rail
// threads through a neutral-grey dot on each row (no lane color here —
// updates are chronological, not categorical).
function UpdateTimeline({ nodes }: { nodes: Node[] }) {
  return (
    <ul className="flex flex-col">
      {nodes.map((n, i) => {
        const first = i === 0;
        const last = i === nodes.length - 1;
        return (
          <li key={n.id} className="relative">
            <Link
              href={nodeHref(n)}
              className="group flex items-baseline gap-4 py-3 pr-3 pl-9 no-underline transition-colors"
            >
              <time className="w-20 shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                {fmtDate(n.date)}
              </time>
              <span className="text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
                {n.title}
              </span>
            </Link>
            {/* Rail + dot, painted after the Link in DOM order. The rail
                is clipped to start/end at the dot on the first/last
                row. */}
            <span
              aria-hidden
              className="absolute left-3 w-px -translate-x-1/2 bg-[var(--color-bg-2)]"
              style={{ top: first ? "50%" : 0, bottom: last ? "50%" : 0 }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 left-3 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-ink-mute)] ring-4 ring-[var(--color-bg-0)]"
            />
          </li>
        );
      })}
    </ul>
  );
}

function RowLink({ node }: { node: Node }) {
  const postedDate = fmtDate(node.date);
  const { updatedDate } = getPostRevisionSummary(node.id);
  return (
    <Link
      href={nodeHref(node)}
      className="group flex items-start gap-4 px-3 py-3 no-underline transition-colors"
    >
      <span className="w-44 shrink-0 font-[family-name:var(--font-mono)] text-[10px] leading-4 text-[var(--color-ink-mute)] sm:text-xs">
        <span className="block">
          posted: <time dateTime={postedDate}>{postedDate}</time>
        </span>
        {updatedDate && (
          <span className="block">
            updated: <time dateTime={updatedDate}>{updatedDate}</time>
          </span>
        )}
      </span>
      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${laneBg[node.lane]}`} aria-hidden />
      <span className="pt-0.5 text-[var(--color-ink)] underline-offset-4 group-hover:text-[var(--color-accent)] group-hover:underline">
        {node.title}
      </span>
    </Link>
  );
}
