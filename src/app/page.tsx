import Image from "next/image";
import Link from "next/link";
import { type HeroSocial, type HeroSocialGroup } from "@/components/chrome/HeroHex";
import { CoverGallery } from "@/components/chrome/CoverGallery";
import { CoverArt } from "@/components/chrome/CoverArt";
import { HomeField } from "@/components/chrome/HomeField";
import { ProjectsBrowser, type ProjectItem } from "@/components/chrome/ProjectsBrowser";
import { getGraph, isListedNode, nodeHref, nodeLinkHref, type Lane, type Node } from "@/lib/graph";
import { byProjectRank, projectItemsFromNodes, withAdjacentProjects } from "@/lib/project-items";
import { getPostRevisionSummary } from "@/lib/post-revisions";
import { imageRefsForNode } from "@/lib/project-face";

const laneBg: Record<Lane, string> = {
  research: "bg-[var(--color-lane-research)]",
  building: "bg-[var(--color-lane-building)]",
  writing: "bg-[var(--color-lane-writing)]",
  personal: "bg-[var(--color-lane-personal)]",
};

const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const pad2 = (n: number) => String(n).padStart(2, "0");
// A post is dated by the last time it changed: its latest revision, or
// the day it went up if it has never been revised.
const latestDate = (node: Node) => getPostRevisionSummary(node.id).updatedDate ?? fmtDate(node.date);
// The image optimizer only takes local rasters; anything else is served as-is.
const unoptimizable = (src: string) => !src.startsWith("/") || /\.(?:svg|gif)(?:[?#]|$)/i.test(src);
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
  // Lite shape for the client-side ProjectsBrowser — a baked tile face
  // and the caption, nothing else. Every tile links straight to the
  // project page. The hero variant has no list view to switch to, so the
  // summaries stay on the server rather than riding along in the flight
  // payload for 72 projects that will never show one.
  const projectItems: ProjectItem[] = projectItemsFromNodes(allProjects, { summaries: false });
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

  const [feature, ...restPosts] = recentPosts;
  // The feature's picture: its hero if it names one, else the first image
  // its body places — whichever post happens to be the latest.
  const featureImage = feature ? imageRefsForNode(feature)[0] : undefined;
  const featureDate = feature ? latestDate(feature) : undefined;

  return (
    <main className="mx-auto max-w-5xl px-6 pt-10 pb-32">
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
              Training <BioLink href="https://sc-wbd.pages.dev/">SC-WBD-00X</BioLink> +{" "}
              <BioLink href="https://jacobfv.github.io/IBM-1/">IBM</BioLink> brain prediction and
              decoding models for{" "}
              <BioLink href="https://supercognitionlabs.com/">SuperCognition Labs</BioLink>. Building
              Agentic + Robotics Infrastructure at{" "}
              <BioLink href="https://commandagi.com">CommandAGI.com</BioLink>. API/Integration
              Architect at <BioLink href="https://agi.app">AGI, Inc.</BioLink>, shipping APIs,
              integrations, and agent infrastructure for on-device mobile AI agents. Earlier:{" "}
              <BioLink href="https://www.getbreezy.app">Breezy</BioLink>,{" "}
              <BioLink href="https://deepshard.org">Deepshard</BioLink>,{" "}
              <BioLink href="https://motio.com">Motio</BioLink>, and{" "}
              <BioLink href="https://itlab.uta.edu">UTA research labs</BioLink>. BS Computer Science
              from <BioLink href="https://www.uta.edu">UT Arlington</BioLink>. I love science and
              engineering and people
            </>
          ),
        }}
      />

      {/* ---- Feature ---- */}
      {/* The issue's one feature spread: the latest essay, set as large
          as a page title, with its picture and standfirst stacked beside
          it. */}
      {feature && (
        <section id="posts" className="mt-32 scroll-mt-20">
          <Link
            href={nodeHref(feature)}
            className="group grid gap-8 no-underline lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14"
          >
            <div>
              <div className="flex items-baseline gap-3">
                <span className="numeral">{pad2(1)}</span>
                <span className="font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase">
                  <time dateTime={featureDate}>{featureDate}</time>
                </span>
              </div>
              <h2 className="display-title mt-4 transition-colors duration-500 group-hover:text-[var(--color-ink-dim)]">
                {feature.title}
              </h2>
            </div>
            <div className={featureImage ? "lg:pt-1" : "lg:pt-10"}>
              {featureImage && (
                <div className="relative mb-7 aspect-[4/3] overflow-hidden bg-[var(--color-bg-1)]">
                  <Image
                    src={featureImage.src}
                    alt={featureImage.alt}
                    fill
                    sizes="(min-width: 1024px) 26rem, 100vw"
                    unoptimized={unoptimizable(featureImage.src)}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  />
                </div>
              )}
              <p className="standfirst">{feature.summary}</p>
              <span className="mt-6 inline-block font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.14em] text-[var(--color-brass)] uppercase">
                Read the essay
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* ---- Recent posts ---- */}
      {/* The rest of the latest writing runs straight on from the
          feature, numbered after it, and closes on the way into the whole
          index. */}
      {restPosts.length > 0 && (
        <section className="mt-16">
          <ol className="flex flex-col">
            {restPosts.map((n, i) => (
              <li key={n.id} className="border-t border-[var(--color-rule)] last:border-b">
                <RowLink node={n} n={i + 2} of={recentPosts.length} />
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Link
              href="/posts"
              className="font-[family-name:var(--font-mono)] text-[0.68rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase no-underline hover:text-[var(--color-ink)]"
            >
              All
            </Link>
          </div>
        </section>
      )}

      {/* ---- Readings ---- */}
      {recentReadings.length > 0 && (
        <Section title="Readings" link={{ href: "/readings", label: "all" }}>
          <ReadingCoverRail nodes={recentReadings} />
        </Section>
      )}

      {/* ---- Papers ---- */}
      {recentPapers.length > 0 && (
        <Section title="Writings" link={{ href: "/papers", label: "all" }}>
          <CoverRail nodes={recentPapers} variant="paper" />
        </Section>
      )}
    </main>
  );
}

// A link inside the hero bio: body ink, a quiet underline that warms on hover.
function BioLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
    >
      {children}
    </a>
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
  // The heading sits on the rule, small and letterspaced, with the
  // section's link at the far end of the same line: the running head of
  // a magazine section rather than a heading above a card.
  return (
    <section id={id} className="mt-40 scroll-mt-20">
      <div className="rule-label mb-10">
        <h2 className="font-[inherit] text-[inherit] tracking-[inherit] uppercase">
          {eyebrow ? `${eyebrow} · ${title}` : title}
        </h2>
        {link && (
          <Link
            href={link.href}
            className="order-last text-[var(--color-ink-mute)] no-underline hover:text-[var(--color-ink)]"
          >
            {link.label} →
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
  // A cover opens the thing it is a cover of — the PDF, the arXiv page,
  // the publisher — not a page about it. See `nodeSourceHref`.
  const href = nodeLinkHref(node);
  const offsite = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(offsite ? { target: "_blank", rel: "noreferrer" } : {})}
      title={node.note ?? node.title}
      aria-label={node.note ? `${node.title} — ${node.note}` : node.title}
      className="group block w-28 no-underline sm:w-32"
    >
      <CoverArt
        node={node}
        variant={variant}
        className="transition-[transform,box-shadow] duration-200 group-hover:scale-[1.02] group-hover:shadow-[0_10px_26px_color-mix(in_srgb,var(--color-ink)_16%,transparent)]"
      />
      <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-center text-xs leading-tight text-[var(--color-ink-dim)] underline-offset-4 group-hover:text-[var(--color-ink)] group-hover:underline">
        {node.title}
      </div>
    </a>
  );
}

// A numbered contents row: "02 / 06", the title in the serif, the latest
// date on the right. Rules above and below come from the list.
function RowLink({ node, n, of }: { node: Node; n: number; of: number }) {
  const date = latestDate(node);
  return (
    <Link
      href={nodeHref(node)}
      className="group grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-1 py-5 no-underline sm:grid-cols-[5rem_1fr_auto]"
    >
      <span className="numeral">
        {pad2(n)} <span className="text-[var(--color-ink-mute)]">/ {pad2(of)}</span>
      </span>
      <span className="font-block text-xl font-extrabold leading-snug tracking-tight text-[var(--color-ink)] transition-colors duration-500 group-hover:text-[var(--color-ink-dim)] sm:text-2xl">
        <span className={`mr-3 inline-block h-1.5 w-1.5 rounded-full align-middle ${laneBg[node.lane]}`} aria-hidden />
        {node.title}
      </span>
      <span className="col-start-2 font-[family-name:var(--font-mono)] text-[0.66rem] tracking-[0.14em] text-[var(--color-ink-mute)] uppercase sm:col-start-3 sm:text-right">
        <time dateTime={date}>{date}</time>
      </span>
    </Link>
  );
}
