import Link from "next/link";
import { nodeHref, type Node } from "@/lib/graph";

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

// Where the "back" breadcrumb on an artifact page points. Projects and
// posts have home-page sections; everything else falls back to the flat
// index. The SiteHeader is the site-wide nav — this is the local one.
function backCrumb(kind: Node["kind"]): { label: string; href: string } {
  switch (kind) {
    case "project":
      return { label: "Projects", href: "/#projects" };
    case "post":
      return { label: "Posts", href: "/#posts" };
    case "update":
      return { label: "Updates", href: "/updates" };
    case "event":
      return { label: "Events", href: "/events" };
    default:
      return { label: "Index", href: "/list" };
  }
}

// Polymorphic hero. The shared `view-transition-name` lets the browser
// FLIP-morph the constellation card into this block on navigation.
export function Hero({ node }: { node: Node }) {
  const start = fmt(node.date);
  const end = fmt(node.endDate);
  const range = end ? `${start} – ${end}` : start;
  const crumb = backCrumb(node.kind);

  return (
    <header
      style={{
        viewTransitionName: `node-${node.id}`,
      }}
      className="mb-10 border-b border-[var(--color-bg-2)]/60 pb-8"
    >
      <Link
        href={crumb.href}
        className="mb-5 inline-flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)] no-underline hover:text-[var(--color-accent)]"
      >
        <span aria-hidden>←</span> {crumb.label}
      </Link>

      <div className="mb-3 flex items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        <time>{range}</time>
        <span>·</span>
        <span>{node.lane}</span>
        <span>·</span>
        <span>{node.kind}</span>
        {node.kind === "project" && node.status && (
          <>
            <span>·</span>
            <StatusBadge status={node.status} />
          </>
        )}
      </div>

      <h1
        className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--color-ink)] sm:text-5xl"
        style={{ fontVariationSettings: '"opsz" 144' }}
      >
        {node.title}
      </h1>

      <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-dim)]">{node.summary}</p>

      <KindMeta node={node} />
    </header>
  );
}

function KindMeta({ node }: { node: Node }) {
  switch (node.kind) {
    case "project":
      return <ProjectMeta node={node} />;
    case "paper":
      return <PaperMeta node={node} />;
    case "reading":
      return <ReadingMeta node={node} />;
    case "update":
      return <UpdateMeta node={node} />;
    case "skill":
      return <SkillMeta node={node} />;
    case "friend":
      return <FriendMeta node={node} />;
    case "event":
      return <EventMeta node={node} />;
    case "experience":
      return <ExperienceMeta node={node} />;
    case "vision":
      return <VisionMeta node={node} />;
    default:
      return null;
  }
}

function ProjectMeta({ node }: { node: Node }) {
  const hasLinks = node.links && Object.keys(node.links).length > 0;
  if (!hasLinks && !node.video && !node.orbitEmbed) return null;
  return (
    <div className="mt-5 flex flex-col gap-5">
      {/* Live deploy embed — only set in orbit-overrides for URLs we
          know iframe cleanly. Renders above the demo video when both
          exist, since live > recorded. */}
      {node.orbitEmbed && <ProjectLiveEmbed url={node.orbitEmbed} title={node.title} />}
      {node.video && <ProjectVideo url={node.video} title={node.title} />}
      {hasLinks && (
        <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono)] text-xs">
          {Object.entries(node.links!).map(([k, v]) =>
            v ? (
              <a
                key={k}
                href={v}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[var(--color-bg-1)] px-3 py-1 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
              >
                {k} ↗
              </a>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

function ProjectLiveEmbed({ url, title }: { url: string; title: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[var(--color-bg-1)]"
      style={{ aspectRatio: "16 / 10" }}
    >
      <iframe
        src={url}
        title={`${title} — live demo`}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}

// Embed a YouTube or Vimeo URL as a 16:9 iframe. For other hosts, fall
// back to a plain link — saves us a brittle URL-shape catalogue.
function ProjectVideo({ url, title }: { url: string; title: string }) {
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-[var(--color-bg-1)] px-3 py-1 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
      >
        watch demo ↗
      </a>
    );
  }
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-[var(--color-bg-1)]" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={embed}
        title={`${title} — demo video`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}

function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    // youtu.be/<id>
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    // youtube.com/watch?v=<id> | /embed/<id> | /shorts/<id>
    if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const m = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
      if (m) return `https://www.youtube.com/embed/${m[2]}`;
    }
    // vimeo.com/<id>
    if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const m = u.pathname.match(/^\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }
    // Already an embed URL
    if (u.pathname.includes("/embed/") || u.hostname === "player.vimeo.com") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function PaperMeta({ node }: { node: Node }) {
  return (
    <div className="mt-5 grid gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      {node.authors && node.authors.length > 0 && <div>{node.authors.join(", ")}</div>}
      {node.venue && <div>{node.venue}</div>}
      {node.bibKey && (
        <div>
          cite key: <code>{node.bibKey}</code>
        </div>
      )}
      {node.pdf && (
        <a
          href={node.pdf}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          PDF ↗
        </a>
      )}
    </div>
  );
}

function ReadingMeta({ node }: { node: Node }) {
  return (
    <div className="mt-5 grid gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      <div>{[node.workType, node.readingStatus].filter(Boolean).join(" · ")}</div>
      {node.authors && node.authors.length > 0 && <div>{node.authors.join(", ")}</div>}
      {node.source && <div>{node.source}</div>}
      {node.url && (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          source ↗
        </a>
      )}
    </div>
  );
}

function UpdateMeta({ node }: { node: Node }) {
  return (
    <div className="mt-5 grid gap-4">
      <div className="flex flex-wrap gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        {node.updateType && <span>{node.updateType}</span>}
        {node.url && (
          <a
            href={node.url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-[var(--color-accent)]"
          >
            source ↗
          </a>
        )}
      </div>
      {node.embed && <EmbedPreview node={node} />}
    </div>
  );
}

function EmbedPreview({ node }: { node: Node }) {
  const embed = node.embed;
  if (!embed) return null;

  if (embed.kind === "html" && embed.html) {
    return (
      <div
        className="overflow-hidden rounded-2xl bg-[var(--color-bg-1)]"
        aria-label={embed.alt ?? node.summary}
        dangerouslySetInnerHTML={{ __html: embed.html }}
      />
    );
  }

  if (embed.kind === "x" && (embed.url || embed.urls?.length)) {
    const urls = embed.urls?.length ? embed.urls : embed.url ? [embed.url] : [];
    return (
      <div className="grid gap-4 rounded-2xl bg-[var(--color-bg-1)] p-4">
        {urls.map((url, index) => (
          <blockquote key={url} className="twitter-tweet" data-theme="dark">
            <a href={url}>{index === 0 ? (embed.alt ?? node.title) : `${node.title} (${index + 1})`}</a>
          </blockquote>
        ))}
        <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8" />
      </div>
    );
  }

  if (embed.url) {
    return (
      <a
        href={embed.url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-2xl bg-[var(--color-bg-1)] p-4 text-sm text-[var(--color-ink-dim)] no-underline transition-colors hover:bg-[var(--color-bg-2)]"
      >
        {embed.alt ?? embed.url}
      </a>
    );
  }

  return null;
}

function SkillMeta({ node }: { node: Node }) {
  return (
    <div className="mt-5 grid gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      <div>{[node.category, node.level].filter(Boolean).join(" · ")}</div>
      {node.tools && node.tools.length > 0 && <div>{node.tools.join(", ")}</div>}
      {node.evidence && node.evidence.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {node.evidence.map((id) => (
            <Link key={id} href={`/${id}`} className="hover:text-[var(--color-accent)]">
              {id}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FriendMeta({ node }: { node: Node }) {
  const links = node.links ? Object.entries(node.links).filter(([, v]) => Boolean(v)) : [];
  return (
    <div className="mt-5 grid gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      <div>{[node.relation, node.location].filter(Boolean).join(" · ")}</div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {links.map(([label, url]) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--color-accent)]"
            >
              {label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function EventMeta({ node }: { node: Node }) {
  const parts = [node.eventType, node.eventStatus, node.role].filter(Boolean);
  return (
    <div className="mt-5 grid gap-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      {parts.length > 0 && <div>{parts.join(" · ")}</div>}
      {(node.venue || node.location) && (
        <div>{[node.venue, node.location].filter(Boolean).join(" · ")}</div>
      )}
      {node.url && (
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-ink-dim)] hover:text-[var(--color-accent)]"
        >
          source ↗
        </a>
      )}
    </div>
  );
}

function ExperienceMeta({ node }: { node: Node }) {
  if (!node.org) return null;
  const orgUrl = node.links?.org;
  return (
    <div className="mt-5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-dim)]">
      at{" "}
      {orgUrl ? (
        <a
          href={orgUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)]"
        >
          {node.org}
        </a>
      ) : (
        <span className="text-[var(--color-ink)]">{node.org}</span>
      )}
    </div>
  );
}

function VisionMeta({ node }: { node: Node }) {
  if (!node.sceneId) return null;
  return (
    <div className="mt-5 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      <Link
        href={`${nodeHref(node)}?scene=1`}
        className="rounded-full bg-[var(--color-bg-1)] px-3 py-1 no-underline hover:bg-[var(--color-bg-2)]"
      >
        enter the room (3D — Phase 7)
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: NonNullable<Node["status"]> }) {
  const color =
    status === "active"
      ? "var(--color-accent)"
      : status === "shipped"
        ? "var(--color-ink-dim)"
        : "var(--color-ink-mute)";
  return (
    <span style={{ color }} className="uppercase">
      {status}
    </span>
  );
}
