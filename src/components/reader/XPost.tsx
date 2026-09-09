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
 * What we give up is X's media. A tweet that was carrying a screenshot
 * renders as its words plus a link, so when the image *is* the point,
 * place it in the MDX next to the embed the way any other figure is
 * placed — projects own their own media (see CONTENT_MODEL.md).
 */

type XPostData = {
  url: string;
  text?: string;
  authorName?: string;
  authorHandle?: string;
  date?: string;
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
      role={resolved.length > 1 ? "group" : undefined}
      aria-label={caption}
      className="my-8 grid gap-7"
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

  return (
    <figure className="m-0 grid gap-2">
      {post.text && (
        <blockquote className="m-0 grid gap-3 border-0 p-0 not-italic">
          {post.text.split(/\n{2,}/).map((para, i) => (
            <p
              key={i}
              className="m-0 whitespace-pre-line text-[17px] leading-[1.65] text-[var(--color-ink)]"
            >
              <Linkified text={para} />
            </p>
          ))}
        </blockquote>
      )}
      <figcaption>
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)] no-underline transition-colors hover:text-[var(--color-accent)]"
        >
          {meta} · X ↗
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
