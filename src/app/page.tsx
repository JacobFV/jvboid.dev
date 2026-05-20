import Link from "next/link";
import { AskInput } from "@/components/chrome/AskInput";
import { OrbitDecor } from "@/components/chrome/OrbitDecor";
import { PfpReveal } from "@/components/chrome/PfpReveal";
import { Planetoids } from "@/components/chrome/Planetoids";
import { UpdateDock } from "@/components/chrome/UpdateDock";
import { getGraph, getLatestUpdate, nodeHref, type Lane, type Node, type NodeKind } from "@/lib/graph";

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

const fmtYear = (iso: string) => new Date(iso).getUTCFullYear();
const fmtDate = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const eventRank = (n: Node) => (n.eventStatus === "upcoming" ? 0 : 1);

const socialLinks = [
  { label: "email", href: "mailto:jacob@humanrobots.ai" },
  { label: "text/call", href: "tel:+19724606353" },
  { label: "x", href: "https://twitter.com/jvboid" },
  { label: "github", href: "https://github.com/JacobFV" },
  { label: "instagram", href: "https://www.instagram.com/jvboid/" },
  { label: "art", href: "https://jvboid.art" },
  { label: "anonymous feedback", href: "https://www.admonymous.co/jvboid" },
];

// Featured projects: shipped or active first, then by recency. Cap at 6.
function pickFeatured(nodes: Node[]): Node[] {
  const candidates = nodes.filter(
    (n) => n.kind === "project" && (n.status === "active" || n.status === "shipped"),
  );
  // Manual override — pin a few load-bearing ones to the top regardless of date.
  const pinned = [
    // Orbit slots (rank 0–1) — both live iframe embeds.
    "windows-web",
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

  const featured = pickFeatured(nodes);
  // Full project list, sorted by status (active first, then shipped, then
  // shelved/idea), then by date desc within each bucket.
  const statusRank: Record<string, number> = {
    active: 0,
    shipped: 1,
    idea: 2,
    shelved: 3,
  };
  const allProjects = nodes
    .filter((n) => n.kind === "project")
    .sort((a, b) => {
      const ra = statusRank[a.status ?? "active"] ?? 9;
      const rb = statusRank[b.status ?? "active"] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.date < b.date ? 1 : -1;
    });
  const recentPosts = nodes
    .filter((n) => n.kind === "post")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const recentPapers = nodes
    .filter((n) => n.kind === "paper")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const recentReadings = nodes
    .filter((n) => n.kind === "reading")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);
  const recentUpdates = nodes
    .filter((n) => n.kind === "update")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const recentEvents = nodes
    .filter((n) => n.kind === "event")
    .sort((a, b) => {
      const rank = eventRank(a) - eventRank(b);
      if (rank !== 0) return rank;
      if (a.eventStatus === "upcoming" && b.eventStatus === "upcoming") {
        return a.date > b.date ? 1 : -1;
      }
      return a.date < b.date ? 1 : -1;
    })
    .slice(0, 4);
  const featuredSkills = nodes
    .filter((n) => n.kind === "skill")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);
  const featuredFriends = nodes
    .filter((n) => n.kind === "friend")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const latestUpdate = getLatestUpdate(nodes);

  // Lite shape consumed by OrbitDecor — never includes summary/body, so
  // the hero payload stays small.
  const toOrbiter = <K extends "friend" | "skill" | "project" | "post" | "event">(kind: K) =>
    (n: Node) => ({
      id: n.id,
      title: n.title,
      lane: n.lane,
      kind,
      asset: n.orbitAsset,
      embed: n.orbitEmbed,
    });
  const orbiterProps = {
    friends: featuredFriends.map(toOrbiter("friend")),
    skills: featuredSkills.map(toOrbiter("skill")),
    projects: featured.map(toOrbiter("project")),
    posts: recentPosts.map(toOrbiter("post")),
    events: recentEvents.map(toOrbiter("event")),
  };

  // Planetoid slots — drifting bodies around the pfp. We pull from
  // multiple kinds (not just projects) so the home feels like a system,
  // not a project list. Each carries up to 2 moons from its edge
  // neighborhood. Position is hand-tuned; cy mostly stays negative so
  // planets sit above the name/intro content below the pfp.
  type PlanetSource = { kind: "project" | "post" | "friend" | "event" | "skill"; rank: number };
  const planetSlots: Array<{
    source: PlanetSource;
    cx: number; cy: number; ax: number; ay: number;
    wx: number; wy: number; px: number; py: number; size: number;
  }> = [
    // Inner ring — closer to the pfp, the four pinned projects from
    // featured.slice(2): limboid, computatrum, jacobfv-site,
    // canvas-engineering. Note that rank here indexes sourcePool.project,
    // which already drops featured[0..1] (those live in OrbitDecor).
    { source: { kind: "project", rank: 0 }, cx: -290, cy: -120, ax: 20, ay: 16, wx: 0.16, wy: 0.11, px: 0.0, py: 1.4, size: 38 },
    { source: { kind: "project", rank: 1 }, cx:  300, cy: -110, ax: 18, ay: 20, wx: 0.13, wy: 0.18, px: 0.8, py: 0.3, size: 36 },
    { source: { kind: "project", rank: 2 }, cx:  360, cy:   30, ax: 22, ay: 18, wx: 0.10, wy: 0.14, px: 2.1, py: 2.7, size: 34 },
    { source: { kind: "project", rank: 3 }, cx: -360, cy:   10, ax: 18, ay: 22, wx: 0.18, wy: 0.12, px: 3.4, py: 0.9, size: 32 },
    // Upper hemisphere — posts arcing across the top, where the mask is
    // fully opaque so motion reads clearly.
    { source: { kind: "post",    rank: 0 }, cx:    0, cy: -320, ax: 22, ay: 14, wx: 0.10, wy: 0.16, px: 2.4, py: 1.0, size: 30 },
    { source: { kind: "post",    rank: 1 }, cx: -240, cy: -260, ax: 16, ay: 18, wx: 0.18, wy: 0.10, px: 3.6, py: 2.2, size: 28 },
    { source: { kind: "post",    rank: 2 }, cx:  150, cy: -220, ax: 14, ay: 18, wx: 0.14, wy: 0.17, px: 1.1, py: 2.4, size: 26 },
    { source: { kind: "post",    rank: 3 }, cx: -150, cy: -190, ax: 16, ay: 12, wx: 0.19, wy: 0.13, px: 4.2, py: 1.1, size: 26 },
    { source: { kind: "post",    rank: 4 }, cx:  320, cy: -210, ax: 16, ay: 14, wx: 0.12, wy: 0.16, px: 0.6, py: 3.8, size: 26 },
    { source: { kind: "post",    rank: 5 }, cx: -330, cy: -200, ax: 18, ay: 16, wx: 0.15, wy: 0.10, px: 2.8, py: 0.5, size: 28 },
    // Crown — events + skills along the top fringe.
    { source: { kind: "event",   rank: 0 }, cx:  260, cy: -280, ax: 18, ay: 14, wx: 0.12, wy: 0.20, px: 1.6, py: 0.4, size: 28 },
    { source: { kind: "skill",   rank: 1 }, cx:  180, cy: -340, ax: 18, ay: 12, wx: 0.11, wy: 0.18, px: 3.3, py: 1.7, size: 22 },
    { source: { kind: "skill",   rank: 2 }, cx: -180, cy: -340, ax: 16, ay: 14, wx: 0.17, wy: 0.14, px: 5.1, py: 3.2, size: 22 },
    // Halo — friends close to the pfp.
    { source: { kind: "friend",  rank: 1 }, cx:  -50, cy: -160, ax: 12, ay: 16, wx: 0.20, wy: 0.13, px: 1.9, py: 4.1, size: 22 },
    { source: { kind: "friend",  rank: 2 }, cx:   60, cy: -160, ax: 14, ay: 14, wx: 0.16, wy: 0.18, px: 4.7, py: 2.0, size: 22 },
    // Lower fringe — bodies in the soft-fade region. They fade in/out as
    // the mask's vertical gradient permits, which gives the field depth
    // without crowding the text below.
    { source: { kind: "skill",   rank: 0 }, cx:  -80, cy:   50, ax: 14, ay: 10, wx: 0.18, wy: 0.20, px: 2.3, py: 4.4, size: 22 },
    { source: { kind: "event",   rank: 2 }, cx:  140, cy:   60, ax: 12, ay: 14, wx: 0.22, wy: 0.11, px: 5.6, py: 0.8, size: 22 },
    { source: { kind: "event",   rank: 1 }, cx:  220, cy:  220, ax: 14, ay: 16, wx: 0.15, wy: 0.13, px: 0.3, py: 3.0, size: 26 },
    { source: { kind: "friend",  rank: 0 }, cx: -220, cy:  220, ax: 14, ay: 16, wx: 0.17, wy: 0.09, px: 2.7, py: 1.8, size: 26 },
    { source: { kind: "event",   rank: 3 }, cx:   80, cy:  280, ax: 14, ay: 12, wx: 0.20, wy: 0.16, px: 4.5, py: 2.5, size: 24 },
  ];

  const sourcePool: Record<PlanetSource["kind"], Node[]> = {
    project: featured.slice(2), // first 2 are in the tight orbit
    post: recentPosts,
    friend: featuredFriends,
    event: recentEvents,
    skill: featuredSkills,
  };

  const planets = planetSlots.flatMap((slot, i) => {
    const node = sourcePool[slot.source.kind]?.[slot.source.rank];
    if (!node) return [];
    // Up to 3 neighbors, preferring outbound edges. The wider this net,
    // the noisier — keep it tight so moons look related, not random.
    const neighborIds = graph
      .neighbors(node.id)
      .map((e) => (e.source === node.id ? e.target : e.source))
      .filter((id) => id !== node.id);
    const moonNodes = Array.from(new Set(neighborIds))
      .map((id) => graph.byId.get(id))
      .filter((n): n is Node => Boolean(n))
      .slice(0, 3);
    const moons = moonNodes.map((m, j) => ({
      id: m.id,
      title: m.title,
      lane: m.lane,
      kind: m.kind,
      asset: m.orbitAsset,
      r: 26 + j * 10,
      w: 0.55 + j * 0.15 * (j % 2 === 0 ? 1 : -1),
      phase: (j * Math.PI) / 2 + i * 0.7,
    }));
    const { source: _src, ...slotPos } = slot;
    return [
      {
        id: node.id,
        title: node.title,
        lane: node.lane,
        kind: node.kind,
        asset: node.orbitAsset,
        moons,
        ...slotPos,
      },
    ];
  });

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 pt-24 pb-32">
        {/* ---- Hero ---- */}
        <section className="mb-32 flex flex-col items-center text-center">
          <div className="relative isolate grid h-[200px] w-[200px] place-items-center">
            <Planetoids planets={planets} />
            <OrbitDecor {...orbiterProps} />
            <PfpReveal />
          </div>
          {/*
            Hero content wrapper. `relative` makes this a positioned
            descendant; since it comes after the pfp box in document
            order, it paints on top — so any planetoid/orbiter that
            drifts toward this area falls behind the text without
            needing a solid bg. The mask on Planetoids softens the
            visual fade; this z-stack is the structural backstop.
          */}
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

          <div className="mt-5 flex flex-wrap justify-center gap-2 font-[family-name:var(--font-mono)] text-xs">
            <Link
              href="/graph"
              className="rounded-full bg-[var(--color-bg-1)] px-4 py-1.5 text-[var(--color-ink)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              explore as a graph →
            </Link>
            <Link
              href="/t"
              className="rounded-full bg-[var(--color-bg-1)] px-4 py-1.5 text-[var(--color-ink-dim)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              timeline
            </Link>
            <Link
              href="/loop"
              className="rounded-full bg-[var(--color-bg-1)] px-4 py-1.5 text-[var(--color-ink-dim)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              /loop — book notes
            </Link>
            <Link
              href="/resume"
              className="rounded-full bg-[var(--color-bg-1)] px-4 py-1.5 text-[var(--color-ink-dim)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              resume
            </Link>
            <Link
              href="/list"
              className="rounded-full bg-[var(--color-bg-1)] px-4 py-1.5 text-[var(--color-ink-dim)] no-underline shadow-[var(--ring-soft)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
            >
              all writing & projects
            </Link>
          </div>

          <p className="mt-10 max-w-2xl text-left text-lg leading-[1.65] text-[var(--color-ink-dim)]">
            Currently building{" "}
            <a
              href="https://vibestartup.pro"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
            >
              VibeStartup
            </a>{" "}
            — a platform for building startups end to end. Most recently API/Integration Architect
            at{" "}
            <a
              href="https://agi.app"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
            >
              AGI, Inc.
            </a>
            , shipping APIs, integrations, and agent infrastructure for on-device mobile AI agents.
            Earlier: Breezy, Deepshard, Motio, and UTA research labs. BS Computer Science from UT
            Arlington. I love science and engineering and people — this site maps the arguments
            behind the work.
            <Link
              href="/introduction"
              className="ml-1 text-[var(--color-ink)] underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:decoration-[var(--color-accent)]"
            >
              More about me.
            </Link>
          </p>
          </div>
        </section>

        {/* ---- Latest updates ---- */}
        {recentUpdates.length > 0 && (
          <Section
            eyebrow="Latest"
            title="Updates"
            link={{ href: "/updates", label: "all updates →" }}
          >
            <ul className="flex flex-col">
              {recentUpdates.map((n) => (
                <li key={n.id}>
                  <RowLink node={n} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---- Events ---- */}
        {recentEvents.length > 0 && (
          <Section
            eyebrow="Events"
            title="Places & Things"
            link={{ href: "/events", label: "all events →" }}
          >
            <ul className="flex flex-col">
              {recentEvents.map((n) => (
                <li key={n.id}>
                  <RowLink node={n} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---- Featured projects ---- */}
        <Section
          eyebrow="Selected work"
          title="Active Threads:"
          link={{ href: "/list", label: "every node →" }}
        >
          <ul className="flex flex-col">
            {featured.map((n) => (
              <li key={n.id}>
                <ProjectRow node={n} />
              </li>
            ))}
          </ul>
        </Section>

        {/* ---- All projects ---- */}
        <Section id="projects" eyebrow="Index" title="Projects">
          <ul className="flex flex-col">
            {allProjects.map((n) => (
              <li key={n.id}>
                <ProjectRow node={n} />
              </li>
            ))}
          </ul>
        </Section>

        {/* ---- Skills ---- */}
        {featuredSkills.length > 0 && (
          <Section
            eyebrow="Capabilities"
            title="Skills"
            link={{ href: "/list", label: "all skills →" }}
          >
            <ul className="flex flex-col">
              {featuredSkills.map((n) => (
                <li key={n.id}>
                  <RowLink node={n} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---- Recent posts ---- */}
        <Section
          id="posts"
          eyebrow="Writing"
          title="Recent posts"
          link={{ href: "/list", label: "all posts →" }}
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
          <Section
            eyebrow="Reading"
            title="What I'm reading"
            link={{ href: "/list", label: "all readings →" }}
          >
            <ul className="flex flex-col">
              {recentReadings.map((n) => (
                <li key={n.id}>
                  <RowLink node={n} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---- Papers ---- */}
        {recentPapers.length > 0 && (
          <Section eyebrow="Research" title="Papers & notes">
            <ul className="flex flex-col">
              {recentPapers.map((n) => (
                <li key={n.id}>
                  <RowLink node={n} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---- Footer ---- */}
        <footer className="mt-32 border-t border-[var(--color-bg-2)]/50 pt-8 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <Link
                href="/introduction"
                className="text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
              >
                /introduction
              </Link>
              <span className="mx-2 opacity-40">·</span>
              <Link
                href="/focus-statement"
                className="text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
              >
                /the-robot
              </Link>
              <span className="mx-2 opacity-40">·</span>
              <Link
                href="/updates"
                className="text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
              >
                /updates
              </Link>
              <span className="mx-2 opacity-40">·</span>
              <Link
                href="/events"
                className="text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
              >
                /events
              </Link>
              <span className="mx-2 opacity-40">·</span>
              <a
                href="/feed.xml"
                className="text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
              >
                rss
              </a>
            </div>
            <div className="opacity-60">
              Press{" "}
              <kbd className="rounded-md bg-[var(--color-bg-1)] px-1.5 py-0.5 font-[family-name:var(--font-mono)]">
                ⌘K
              </kbd>{" "}
              to search.
            </div>
          </div>
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
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-24 scroll-mt-20">
      <div className="mb-8 flex items-baseline justify-between gap-6">
        <div>
          <p className="text-xs text-[var(--color-ink-mute)]">{eyebrow}</p>
          <h2
            className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--color-ink)]"
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

function ProjectRow({ node }: { node: Node }) {
  const status = node.status ?? "active";
  return (
    <Link
      href={nodeHref(node)}
      className="group block rounded-xl px-3 py-4 no-underline transition-colors hover:bg-[var(--color-bg-1)]/60"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-3">
          <span
            className={`h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full ${laneBg[node.lane]}`}
            aria-hidden
          />
          <span className="text-lg text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
            {node.title}
          </span>
        </div>
        <div className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] tracking-wider text-[var(--color-ink-mute)] uppercase">
          <span>{status}</span>
          <span className="mx-1.5 opacity-40">·</span>
          <span>{fmtYear(node.date)}</span>
        </div>
      </div>
      <p className="mt-1.5 ml-5 text-sm leading-relaxed text-[var(--color-ink-dim)]">
        {node.summary}
      </p>
    </Link>
  );
}

function RowLink({ node }: { node: Node }) {
  return (
    <Link
      href={nodeHref(node)}
      className="group flex items-baseline gap-4 rounded-xl px-3 py-3 no-underline transition-colors hover:bg-[var(--color-bg-1)]/60"
    >
      <time className="w-20 shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        {fmtDate(node.date)}
      </time>
      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${laneBg[node.lane]}`} aria-hidden />
      <span className="text-[var(--color-ink)] group-hover:text-[var(--color-accent)]">
        {node.title}
      </span>
    </Link>
  );
}
