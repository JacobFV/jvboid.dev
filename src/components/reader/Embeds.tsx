import { InviteCursor } from "./InviteCursor";

// Media embeds for MDX bodies: <Pdf>, <Video>, <LiveDemo>.
//
// These used to be auto-hoisted above the article from `pdf` / `video` /
// `links.demo` frontmatter. That put every artifact in the same slot
// regardless of whether the body already showed it, so decks and demos
// routinely appeared twice. Bodies now place their own embeds at the
// point in the argument where the artifact is actually being discussed.

const frame =
  "relative w-full overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-[var(--color-bg-1)] shadow-none transition-shadow duration-200 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--color-ink)_14%,transparent)]";

function Caption({ children }: { children: string }) {
  return (
    <figcaption className="mt-2 text-center font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
      {children}
    </figcaption>
  );
}

function OpenButton({
  url,
  center = false,
  label,
}: {
  url: string;
  center?: boolean;
  label: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`embed-cta absolute z-10 rounded-full bg-[var(--color-accent)] px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-white no-underline shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 ${
        center ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "right-3 top-3"
      }`}
    >
      {label}
      <InviteCursor />
    </a>
  );
}

export function Pdf({
  src,
  title,
  caption,
}: {
  src: string;
  title?: string;
  caption?: string;
}) {
  return (
    <figure className="my-7">
      <div className={frame}>
        <iframe
          src={`${src}#view=FitH`}
          title={title ?? "PDF"}
          loading="lazy"
          className="h-[72vh] min-h-[520px] w-full"
          style={{ border: 0 }}
        />
        <OpenButton url={src} label="open PDF ↗" />
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  );
}

export function LiveDemo({
  url,
  title,
  caption,
}: {
  url: string;
  title?: string;
  caption?: string;
}) {
  return (
    <figure className="my-7">
      <div className={frame} style={{ aspectRatio: "16 / 10" }}>
        <iframe
          src={url}
          title={title ?? "Live demo"}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          className="absolute inset-0 h-full w-full"
          style={{ border: 0 }}
        />
        <OpenButton url={url} label="try it out ↗" />
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
  );
}

// Embed a YouTube or Vimeo URL as a 16:9 iframe, or a self-hosted media
// file as a native <video>. For other hosts, fall back to a plain link —
// saves us a brittle URL-shape catalogue.
export function Video({
  url,
  title,
  caption,
  poster,
}: {
  url: string;
  title?: string;
  caption?: string;
  poster?: string;
}) {
  if (/\.(mp4|webm|mov|m4v)$/i.test(url)) {
    return (
      <figure className="my-7">
        <video
          src={url}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          aria-label={title}
          className="block max-h-[720px] w-full rounded-2xl bg-[var(--color-bg-1)] object-contain"
        />
        {caption && <Caption>{caption}</Caption>}
      </figure>
    );
  }
  const embed = toEmbedUrl(url);
  if (!embed) {
    return (
      <p className="my-7">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[var(--color-bg-1)] px-3 py-1 text-[var(--color-ink-dim)] no-underline hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent)]"
        >
          {caption ?? "watch demo ↗"}
        </a>
      </p>
    );
  }
  return (
    <figure className="my-7">
      <div className={frame} style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={embed}
          title={title ?? "Video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          style={{ border: 0 }}
        />
      </div>
      {caption && <Caption>{caption}</Caption>}
    </figure>
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
