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
    // Inline entries still get the cache as a backstop, so a post can
    // override just the text and inherit the author and date.
    return posts.map((post) => {
      const id = tweetId(post.url);
      return { ...(id ? CACHE[id] : undefined), ...post };
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
  const meta = [handle, post.date].filter(Boolean).join(" · ");
  const photos = post.photos ?? [];
  const paragraphs = post.text ? post.text.split(/\n{2,}/) : [];

  return (
    <figure className="m-0 grid gap-3">
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
        <div className={photos.length > 1 ? "grid gap-2 sm:grid-cols-2" : "grid"}>
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
              className="m-0 h-auto w-full rounded-lg"
            />
          ))}
        </div>
      )}
      <figcaption>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)] no-underline transition-colors hover:text-[var(--color-accent)]"
        >
          {meta} · {post.truncated ? "read the rest on X" : "X"} ↗
        </a>
      </figcaption>
    </figure>
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
