import Link from "next/link";
import { type HeroSocial, type HeroSocialGroup } from "@/components/chrome/HeroHex";
import { CoverGallery } from "@/components/chrome/CoverGallery";
import { HomeField } from "@/components/chrome/HomeField";
import { ProjectsBrowser, type ProjectItem } from "@/components/chrome/ProjectsBrowser";
import { getGraph, isListedNode, nodeHref, nodeLinkHref, type Lane, type Node } from "@/lib/graph";
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
// Contact row inside the hero hexagon, in the order it reads. Kept to the
// accounts worth interrupting someone for — the long tail lives in
// `moreSocialGroups`, behind the row's `> more` toggle.
const socialLinks: HeroSocial[] = [
  { label: "email", href: "mailto:jacob@humanrobots.ai", glyph: "email" },
  { label: "text/call", href: "tel:+19724606353", glyph: "phone" },
  { label: "x", href: "https://twitter.com/jvboid", glyph: "x" },
  { label: "github", href: "https://github.com/JacobFV", glyph: "github" },
  { label: "instagram", href: "https://www.instagram.com/jvboid/", glyph: "instagram" },
  {
    label: "youtube",
    href: "https://www.youtube.com/channel/UCs5sasWz1dlbrvBo7tBincg",
    glyph: "youtube",
  },
  { label: "hugging face", href: "https://huggingface.co/jacob-valdez", glyph: "huggingface" },
  { label: "art", href: "https://jvboid.art", glyph: "art" },
  {
    label: "anonymous feedback",
    href: "https://www.admonymous.co/jvboid",
    glyph: "feedback",
  },
];

// Everything else, carried over from the old jacobfv.github.io
// `_data/social.yml`. Grouped by what someone would be looking for
// rather than by platform type, so the drawer reads as a directory.
const moreSocialGroups: HeroSocialGroup[] = [
  {
    title: "Code & Q&A",
    items: [
      { label: "gitlab", href: "https://gitlab.com/jacobfv123", glyph: "gitlab" },
      {
        label: "stack overflow",
        href: "https://stackoverflow.com/users/14971315",
        glyph: "stackoverflow",
      },
      {
        label: "stack exchange",
        href: "https://stackexchange.com/users/14971315",
        glyph: "stackexchange",
      },
      { label: "quora", href: "https://www.quora.com/profile/Jacob-Valdez-127", glyph: "quora" },
    ],
  },
  {
    title: "Writing & video",
    items: [
      { label: "substack", href: "https://jacobvaldez.substack.com", glyph: "substack" },
      { label: "medium", href: "https://medium.com/@jacobfv123", glyph: "medium" },
      { label: "tiktok", href: "https://www.tiktok.com/@jvboid", glyph: "tiktok" },
    ],
  },
  {
    title: "Making",
    items: [
      {
        label: "thingiverse",
        href: "https://www.thingiverse.com/jacobfv123/designs",
        glyph: "thingiverse",
      },
      {
        label: "onshape",
        href: "https://cad.onshape.com/documents?nodeId=64df5b4326f1f07cfd2980e3&resourceType=resourceuserowner",
        glyph: "onshape",
      },
    ],
  },
  {
    title: "Art & sound",
    items: [
      {
        label: "soundcloud",
        href: "https://soundcloud.com/jacob-valdez-946056620",
        glyph: "soundcloud",
      },
      { label: "deviantart", href: "https://www.deviantart.com/jvboid", glyph: "deviantart" },
      { label: "unsplash", href: "https://unsplash.com/@jvboid", glyph: "unsplash" },
      { label: "are.na", href: "https://www.are.na/jacob-valdez/channels", glyph: "arena" },
    ],
  },
  {
    title: "Elsewhere",
    items: [
      { label: "f6s", href: "https://www.f6s.com/member/jacob-valdez", glyph: "f6s" },
      { label: "junk email", href: "mailto:jacobspam0123456789@gmail.com", glyph: "junk" },
    ],
  },
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

  return (
    <main className="mx-auto max-w-5xl px-6 pt-24 pb-32">
      {/* Home only: a monochrome cloud field at 2%, behind everything
          including the bioluminescent mesh. One channel and one hue-free
          value swing, which is the term on which it is allowed inside the
          content measure at all. See components/chrome/HomeField.tsx. */}
      <HomeField />

      {/* ---- Hero + projects ---- */}
      {/* The hero is a 4× tile of the projects comb, not a block above
            it, so the tiles pack against its edges. That is also why this
            section has no list/grid picker: the hero only exists in the
            honeycomb. */}
      <ProjectsBrowser
        id="projects"
        projects={projectItems}
        hero={{
          name: "Jacob Valdez",
          pfp: { src: "/img/prof_pic.jpg", alt: "Jacob Valdez" },
          socials: socialLinks,
          moreSocials: moreSocialGroups,
          bio: (
            <>
              Currently working on{" "}
              <a
                href="https://commandagi.com"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
              >
                CommandAGI
              </a>
              . Most recently API/Integration Architect at{" "}
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
            </>
          ),
        }}
      />

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

      {/* ---- Readings ---- */}
      {recentReadings.length > 0 && (
        <Section title="Readings" link={{ href: "/readings", label: "all readings →" }}>
          <ReadingCoverRail nodes={recentReadings} />
        </Section>
      )}

      {/* ---- Papers ---- */}
      {recentPapers.length > 0 && (
        <Section
          tight
          title="Writings"
          link={{ href: "/papers", label: "all writings →" }}
        >
          <CoverRail nodes={recentPapers} variant="paper" />
        </Section>
      )}
    </main>
  );
}

function Section({
  eyebrow,
  title,
  link,
  children,
  id,
  tight,
}: {
  eyebrow?: string;
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  id?: string;
  /** Pulls the section up close to the one above it. */
  tight?: boolean;
}) {
  return (
    <section id={id} className={`${tight ? "mt-12" : "mt-24"} scroll-mt-20`}>
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

// A shelf, not a scrollbar: covers are dragged past a fixed vanishing
// point, tilting out of the page as they approach either edge. Geometry
// lives in CoverGallery; this only sets the spacing it works over.
function CoverRail({ nodes, variant }: { nodes: Node[]; variant: "reading" | "paper" }) {
  return (
    <CoverGallery className="-mx-6 flex gap-5 px-8 py-6">
      {nodes.map((node) => (
        <li key={node.id} className="shrink-0">
          <CoverCard node={node} variant={variant} />
        </li>
      ))}
    </CoverGallery>
  );
}

function CoverCard({ node, variant }: { node: Node; variant: "reading" | "paper" }) {
  // Paper covers are first-page PNG exports from PDFs. To add another,
  // download the PDF to /tmp and run:
  // `pdftoppm -png -f 1 -singlefile -r 160 /tmp/<slug>.pdf public/assets/img/{readings|papers}/<slug>`.
  // Then set `hero.src` in frontmatter to `/assets/img/{readings|papers}/<slug>.png`.
  //
  // A cover opens the thing it is a cover of — the PDF, the arXiv page,
  // the publisher — not a page about it. See `nodeSourceHref`.
  const href = nodeLinkHref(node);
  const offsite = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(offsite ? { target: "_blank", rel: "noreferrer" } : {})}
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
    </a>
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
