import xPosts from "@/data/x-posts.json";

/**
 * A tweet, rendered by us.
 *
 * This used to mount X's official widget, which meant every quoted post
 * arrived as a 550px card in X's own dim navy (#15202b) with a
 * #425364 border and 16px corners — a panel sitting on a #08090b page,
 * visibly a foreign object in the middle of an essay. None of that is
 * reachable from here: it renders inside a cross-origin iframe, and the
 * widget exposes no chrome options for single posts (`data-chrome` is a
 * timeline-only feature). The only way to make a quoted tweet look like
 * part of the page was to stop asking X to draw it.
 *
 * Drawing it ourselves is not the same as stripping it. A post still
 * has an anatomy — a face, a name, a handle, a timestamp, what it was
 * worth to the people who saw it — and prose with a byline underneath
 * is not a tweet, it is a pull quote. So the parts are all here; they
 * are just built from this site's tokens, at this site's measure,
 * instead of borrowed from X's stylesheet.
 *
 * So the text lives in `src/data/x-posts.json`, resolved from X's
 * oEmbed endpoint by `scripts/sync-x-posts.mjs` and committed. That
 * makes this a plain server component: no widget, no client bundle, no
 * third-party script, no layout shift, and the quote still renders when
 * X is down or the reader blocks it.
 *
 * The photos come along: the sync script copies them into
 * public/assets/media/x/ rather than hotlinking pbs.twimg.com, so a
 * project page does not quietly lose its screenshot the day a tweet
 * goes away.
 *
 * The one thing genuinely out of reach is the full text of a long-form
 * post. X caps those at ~275 characters for anyone without API
 * credentials and hands back only an id for the rest, so those are
 * flagged `truncated` and say so, rather than trailing an ellipsis and
 * pretending that was the whole thought.
 */

type XPostData = {
  url: string;
  text?: string;
  authorName?: string;
  authorHandle?: string;
  date?: string;
  /** X only serves the first ~275 characters of a long-form post. */
  truncated?: boolean;
  /** Site-relative avatar path, keyed by account, written by the sync script. */
  avatar?: string;
  verified?: boolean;
  likes?: number;
  replies?: number;
  /** Site-relative paths under public/, written by the sync script. */
  photos?: string[];
  /**
   * Alt text per photo, positionally. X ships none of its own, so this
   * is the only way a screenshot that carries meaning gets described —
   * supply it through the `posts` prop when the image is the point.
   * Falls back to a provenance line, which at least tells a screen
   * reader what the image *is* rather than claiming it is decorative.
   */
  photoAlts?: string[];
};

type XPostProps = {
  url?: string;
  urls?: string[];
  /**
   * Hand-written entries, used in place of the synced cache. For a
   * tweet that is deleted, protected, or whose oEmbed text reads badly
   * out of context.
   */
  posts?: XPostData[];
  /**
   * Accessible name for the group — deliberately not painted. It is the
   * group's `aria-label` and nothing else; the whole point of this
   * component is that a quoted tweet arrives without a label above it.
   */
  caption?: string;
};

const CACHE = xPosts as Record<string, XPostData>;

const tweetId = (url: string) => url.match(/\/status\/(\d+)/)?.[1];

function resolve({ url, urls, posts }: Pick<XPostProps, "url" | "urls" | "posts">): XPostData[] {
  if (posts?.length) {
    // Inline entries take only identity from the cache — never its
    // text, photos or truncation. A hand-written thread routinely
    // points every entry at the same status URL (the reply chain has
    // one canonical link), so merging the cached body in would repeat
    // one tweet's text and photo once per entry.
    return posts.map((post) => {
      const cached = CACHE[tweetId(post.url) ?? ""];
      return {
        authorName: cached?.authorName,
        authorHandle: cached?.authorHandle,
        date: cached?.date,
        ...post,
      };
    });
  }
  const list = urls?.length ? urls : url ? [url] : [];
  return list.map((postUrl) => {
    const id = tweetId(postUrl);
    return { url: postUrl, ...(id ? CACHE[id] : undefined) };
  });
}

export function XPost({ url, urls, posts, caption }: XPostProps) {
  const resolved = resolve({ url, urls, posts });
  if (!resolved.length) return null;

  return (
    <div
      data-x-post
      role={resolved.length > 1 ? "group" : undefined}
      aria-label={caption}
      className="grid gap-7"
    >
      {resolved.map((post, index) => (
        <Tweet key={`${post.url}-${index}`} post={post} />
      ))}
    </div>
  );
}

function Tweet({ post }: { post: XPostData }) {
  const handle = post.authorHandle ?? "@jvboid";
  const name = post.authorName ?? handle.replace(/^@/, "");
  const photos = post.photos ?? [];
  const paragraphs = post.text ? post.text.split(/\n{2,}/) : [];

  return (
    <figure className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
      {post.avatar ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.avatar}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          className="col-start-1 row-start-1 m-0 h-11 w-11 rounded-full object-cover"
        />
      ) : (
        <span className="col-start-1 row-start-1 h-11 w-11 rounded-full bg-[var(--color-bg-2)]" />
      )}

      <div className="col-start-2 row-start-1 flex min-w-0 items-center gap-x-1.5 self-center">
        <span className="truncate font-semibold text-[15px] leading-tight text-[var(--color-ink)]">
          {name}
        </span>
        {post.verified && <VerifiedMark />}
        <span className="truncate font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          {handle}
        </span>
        <span aria-hidden className="ml-auto shrink-0 text-[var(--color-ink-mute)]">
          <XMark />
        </span>
      </div>

      {/* Body sits under the avatar, not beside it: at this measure a
          44px indent on every line would cost more than the alignment
          buys, and the header row already establishes who is talking. */}
      <div className="col-span-2 row-start-2 grid gap-3">
        {paragraphs.length > 0 && (
          <blockquote className="m-0 grid gap-3 p-0">
            {paragraphs.map((para, i) => (
              <p
                key={i}
                className="m-0 whitespace-pre-line text-[17px] leading-[1.65] text-[var(--color-ink)]"
              >
                <Linkified text={para} />
                {/* The cut is real — show it, rather than letting the
                    sentence appear to simply stop. */}
                {post.truncated && i === paragraphs.length - 1 && "…"}
              </p>
            ))}
          </blockquote>
        )}

        {photos.length > 0 && (
          <div
            className={
              photos.length > 1
                ? "grid gap-2 overflow-hidden rounded-xl sm:grid-cols-2"
                : "grid overflow-hidden rounded-xl"
            }
          >
            {photos.map((src, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={src}
                src={src}
                alt={
                  post.photoAlts?.[i] ??
                  `Image attached to ${handle}'s post${post.date ? ` of ${post.date}` : ""}`
                }
                loading="lazy"
                className="m-0 h-auto w-full"
              />
            ))}
          </div>
        )}

        <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="text-inherit no-underline transition-colors hover:text-[var(--color-accent)]"
          >
            {post.date}
            {post.truncated && " · read the rest on X"} ↗
          </a>
          {Boolean(post.likes || post.replies) && (
            <span className="flex items-center gap-x-3">
              {post.likes ? <span>♥ {fmtCount(post.likes)}</span> : null}
              {post.replies ? <span>↩ {fmtCount(post.replies)}</span> : null}
            </span>
          )}
        </figcaption>
      </div>
    </figure>
  );
}

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

/**
 * A verified marker, drawn rather than copied. X's badge is their mark,
 * and this only needs to say "the account is verified" — a check in a
 * disc, in the site's own palette, does that without lifting theirs.
 */
function VerifiedMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label="Verified account"
      className="h-[0.95em] w-[0.95em] shrink-0"
    >
      <circle cx="8" cy="8" r="8" className="fill-[var(--color-lane-research)]" />
      <path
        d="M4.4 8.3l2.2 2.2 4.6-4.6"
        fill="none"
        stroke="var(--color-bg-0)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The X wordmark. */
function XMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// Bare URLs and @handles are load-bearing in a tweet — the reader
// expects to be able to follow them. Split on both and link them; the
// surrounding text stays a plain text node, so nothing here interpolates
// markup.
const TOKEN = /(https?:\/\/[^\s]+|@[A-Za-z0-9_]{1,15})/g;

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer">
              {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          );
        }
        if (/^@[A-Za-z0-9_]{1,15}$/.test(part)) {
          return (
            <a key={i} href={`https://x.com/${part.slice(1)}`} target="_blank" rel="noreferrer">
              {part}
            </a>
          );
        }
        return part;
      })}
    </>
  );
}
