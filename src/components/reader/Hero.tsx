import Link from "next/link";
import { nodeHref, type Node } from "@/lib/graph";

const fmt = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : null);

// Polymorphic hero. The shared `view-transition-name` lets the browser
// FLIP-morph the constellation card into this block on navigation.
//
// The back-link to the parent section now lives in the SiteHeader
// breadcrumb (Jacob Valdez › Section › Title), so the hero no longer
// renders its own. The <h1> is marked `data-page-title` — SiteHeader
// observes it to know when to reveal the Title breadcrumb segment.
export function Hero({ node }: { node: Node }) {
  const start = fmt(node.date);
  const end = fmt(node.endDate);
  const range = end ? `${start} – ${end}` : start;

  return (
    <header
      style={{
        viewTransitionName: `node-${node.id}`,
      }}
      className="mb-10 border-b border-[var(--color-bg-2)]/60 pb-8"
    >
      <div className="mb-3 flex items-baseline gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        <time>{range}</time>
        <span>·</span>
        <span>{node.kind}</span>
      </div>

      <h1
        data-page-title
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
    case "vision":
      return <VisionMeta node={node} />;
    default:
      return null;
  }
}

// Projects render only their metadata pills here. Media embeds are NOT
// hoisted from frontmatter — `hero`, `pdf`, `video` and `links.demo`
// exist for cards, search and the constellation, and a body that wants
// to show one places <Pdf>/<Video>/<LiveDemo>/an image itself, at the
// point in the argument where it belongs. Auto-hoisting meant every
// project opened with the same slot whether or not the article already
// showed that artifact, which just duplicated it.
function ProjectMeta({ node }: { node: Node }) {
  const links = node.links ? Object.entries(node.links).filter(([, v]) => Boolean(v)) : [];
  if (links.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-3 font-[family-name:var(--font-mono)] text-xs">
      {links.map(([k, v]) => (
        <a
          key={k}
          href={v}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[var(--color-bg-1)] px-3 py-1 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
        >
          {k} ↗
        </a>
      ))}
    </div>
  );
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

