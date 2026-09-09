"use client";

import { useEffect, useRef, useState } from "react";

type XFallbackPost = {
  url: string;
  text?: string;
  authorName?: string;
  authorHandle?: string;
  date?: string;
  meta?: string;
  alt?: string;
  embed?: boolean;
};

type XPostProps = {
  url?: string;
  urls?: string[];
  posts?: XFallbackPost[];
  /**
   * Accessible name for the group — deliberately not painted.
   *
   * An X embed already arrives inside its own card: avatar, handle,
   * timestamp, border. Wrapping that in a second labelled panel put
   * chrome around chrome and made the tweet read as a sidebar exhibit
   * rather than as part of the page. The caption survives as the
   * group's `aria-label` and as the link text a blocked embed falls
   * back to, so nothing is lost for a reader who never sees the widget.
   */
  caption?: string;
};

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement | null) => void;
      };
    };
  }
}

const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";
let widgetsPromise: Promise<void> | null = null;

/**
 * One <script> per page instead of one per embed. Each XPost used to
 * render its own tag, so a post with three of them asked for (and
 * re-evaluated) the same bundle three times.
 */
function loadWidgets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twttr?.widgets) return Promise.resolve();
  if (widgetsPromise) return widgetsPromise;

  widgetsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGETS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("x widgets failed to load")));
    if (!existing) {
      script.src = WIDGETS_SRC;
      script.async = true;
      script.setAttribute("charset", "utf-8");
      document.head.appendChild(script);
    }
  });

  return widgetsPromise;
}

/**
 * The widget bakes its colour scheme in at render time, so it has to be
 * told which theme the page is currently wearing — a hard-coded dark
 * tweet on a light page is exactly the foreign-object look we are
 * trying to get rid of. Changing themes re-keys the embeds below.
 */
function useSiteTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const read = () =>
      setTheme(
        document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function XPost({ url, urls, posts, caption }: XPostProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);
  const theme = useSiteTheme();
  const fallbackPosts = normalizePosts({ url, urls, posts });
  const embedded = fallbackPosts.filter((post) => post.embed !== false);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let cancelled = false;
    let timer: number | undefined;

    loadWidgets()
      .then(() => {
        if (cancelled) return;
        window.twttr?.widgets?.load(root);
        timer = window.setTimeout(() => {
          if (cancelled) return;
          if (!root.querySelector("iframe, .twitter-tweet-rendered")) setShowFallback(true);
        }, 3500);
      })
      .catch(() => {
        if (!cancelled) setShowFallback(true);
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [theme]);

  if (!fallbackPosts.length) return null;

  return (
    <div
      role={fallbackPosts.length > 1 ? "group" : undefined}
      aria-label={caption}
      className="my-8 grid gap-4"
    >
      {/* Re-keyed on theme: twttr replaces the blockquote with an iframe
          and will not revisit one it has already rendered, so a theme
          swap needs fresh blockquotes to load against. */}
      <div key={theme} ref={ref} className={showFallback ? "hidden" : "grid gap-4"}>
        {embedded.map((post, index) => (
          <blockquote
            key={`${post.url}-${index}`}
            className="twitter-tweet"
            data-theme={theme}
            data-dnt="true"
          >
            <a href={post.url}>{post.alt ?? caption ?? post.url}</a>
          </blockquote>
        ))}
      </div>
      {showFallback && (
        <div className="grid gap-3">
          {fallbackPosts.map((post, index) => (
            <FallbackCard key={`${post.url}-${index}`} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function normalizePosts({
  url,
  urls,
  posts,
}: Pick<XPostProps, "url" | "urls" | "posts">): XFallbackPost[] {
  if (posts?.length) return posts;
  const postUrls = urls?.length ? urls : url ? [url] : [];
  return postUrls.map((postUrl) => ({ url: postUrl }));
}

function FallbackCard({ post }: { post: XFallbackPost }) {
  const authorName = post.authorName ?? "Jacob";
  const authorHandle = post.authorHandle ?? "@jvboid";
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noreferrer"
      aria-label={post.alt ?? `Open X post by ${authorHandle}`}
      className="block rounded-xl border border-[color-mix(in_srgb,var(--color-ink)_18%,transparent)] bg-[var(--color-bg)] p-4 text-[var(--color-ink)] no-underline transition-colors hover:border-[var(--color-accent)]"
    >
      {post.alt && (
        <p className="mb-3 rounded-lg bg-[var(--color-bg-1)] px-3 py-2 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-[var(--color-ink-mute)]">
          Alt: {post.alt}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--color-ink)]">{authorName}</p>
          <p className="m-0 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
            {authorHandle}
          </p>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          X ↗
        </span>
      </div>
      {post.text && (
        <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.6] text-[var(--color-ink)]">
          {post.text}
        </p>
      )}
      {(post.date || post.meta) && (
        <p className="mt-4 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          {[post.date, post.meta].filter(Boolean).join(" · ")}
        </p>
      )}
    </a>
  );
}
