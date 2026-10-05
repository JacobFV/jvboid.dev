/**
 * A LinkedIn post, rendered by us — the sibling of `XPost`.
 *
 * LinkedIn's own embed is an iframe from linkedin.com/embed/feed/update/…
 * that draws a white card in LinkedIn's chrome, loads their script, and
 * shows nothing at all to a reader who blocks it or isn't signed in on
 * some networks. Same problem XPost solved for tweets, same answer: keep
 * the post's anatomy (who, their headline, when, the text, who was
 * tagged) and build it from this site's tokens.
 *
 * Unlike X there is no unauthenticated oEmbed endpoint to sync from, so
 * the body is passed in from the MDX. That makes the MDX the record of
 * what was posted — which is the point for a launch post that a project
 * page is quoting.
 */

type LinkedInPostProps = {
  url: string;
  authorName: string;
  /** The line under the name on LinkedIn — the account's headline. */
  headline?: string;
  /** Site-relative avatar path; falls back to an initial in a disc. */
  avatar?: string;
  date?: string;
  /** Paragraphs separated by blank lines. #hashtags are linked. */
  text: string;
  /** People and pages tagged on the post, in the order LinkedIn lists them. */
  mentions?: string[];
};

export function LinkedInPost({
  url,
  authorName,
  headline,
  avatar,
  date,
  text,
  mentions = [],
}: LinkedInPostProps) {
  const paragraphs = text.trim().split(/\n{2,}/);

  return (
    <div data-linkedin-post className="my-7 grid">
      <figure className="relative m-0 grid w-full max-w-[34rem] grid-cols-[auto_1fr] gap-x-3 gap-y-2 self-start justify-self-center rounded-2xl border border-[color-mix(in_srgb,var(--color-ink)_15%,transparent)] p-4 transition-colors hover:border-[color-mix(in_srgb,var(--color-ink)_40%,transparent)]">
        {/* Stretched anchor under everything, as in XPost: the hashtags keep
            their own links above it on `relative z-[1]`. */}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${authorName}'s post on LinkedIn${date ? `, ${date}` : ""}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />
        {avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatar}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            className="col-start-1 row-start-1 m-0 h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="col-start-1 row-start-1 grid h-11 w-11 place-items-center rounded-full bg-[var(--color-bg-2)] font-semibold text-[var(--color-ink)]"
          >
            {authorName.charAt(0)}
          </span>
        )}

        <div className="col-start-2 row-start-1 grid min-w-0 self-center">
          <div className="flex min-w-0 items-center gap-x-1.5">
            <span className="truncate font-semibold text-[15px] leading-tight text-[var(--color-ink)]">
              {authorName}
            </span>
            <span aria-hidden className="ml-auto shrink-0 text-[var(--color-ink-mute)]">
              <InMark />
            </span>
          </div>
          {headline && (
            <span className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
              {headline}
            </span>
          )}
        </div>

        <div className="col-span-2 row-start-2 grid gap-3">
          <blockquote className="m-0 grid gap-3 p-0">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="m-0 whitespace-pre-line text-[17px] leading-[1.65] text-[var(--color-ink)]"
              >
                <Hashtagged text={para} />
              </p>
            ))}
          </blockquote>

          {mentions.length > 0 && (
            <p className="m-0 text-sm leading-relaxed text-[var(--color-ink-mute)]">
              <span className="sr-only">Tagged: </span>
              {mentions.map((name, i) => (
                <span key={name}>
                  <span className="font-medium text-[var(--color-ink)]">{name}</span>
                  {i < mentions.length - 1 && " · "}
                </span>
              ))}
            </p>
          )}

          <figcaption className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="relative z-[1] text-inherit no-underline transition-colors hover:text-[var(--color-accent)]"
            >
              {date ? `${date} · ` : ""}view on LinkedIn ↗
            </a>
          </figcaption>
        </div>
      </figure>
    </div>
  );
}

/** A plain "in" in a rounded square — says LinkedIn without lifting their logo file. */
function InMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5">
      <rect x="0.75" y="0.75" width="14.5" height="14.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.6" y="6.6" width="1.9" height="5.6" fill="currentColor" />
      <circle cx="4.55" cy="4.4" r="1.1" fill="currentColor" />
      <path
        d="M7.3 6.6h1.8v.8c.35-.55 1-.95 1.9-.95 1.4 0 2 .9 2 2.4v3.35h-1.9V9.2c0-.75-.25-1.15-.85-1.15-.65 0-1.05.45-1.05 1.2v2.95H7.3z"
        fill="currentColor"
      />
    </svg>
  );
}

// Hashtags are the one link-shaped thing in a LinkedIn post body worth
// following; everything else stays a plain text node.
const HASHTAG = /(#[A-Za-z][A-Za-z0-9_]*)/g;

function Hashtagged({ text }: { text: string }) {
  return (
    <>
      {text.split(HASHTAG).map((part, i) =>
        /^#[A-Za-z][A-Za-z0-9_]*$/.test(part) ? (
          <a
            key={i}
            href={`https://www.linkedin.com/feed/hashtag/${part.slice(1).toLowerCase()}/`}
            target="_blank"
            rel="noreferrer"
            className="relative z-[1]"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
