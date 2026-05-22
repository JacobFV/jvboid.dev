"use client";

import { useEffect, useId, useRef, useState } from "react";

type XFallbackPost = {
  url: string;
  text?: string;
  authorName?: string;
  authorHandle?: string;
  date?: string;
  meta?: string;
  alt?: string;
};

type XPostProps = {
  url?: string;
  urls?: string[];
  posts?: XFallbackPost[];
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

export function XPost({ url, urls, posts, caption }: XPostProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const fallbackTimer = useRef<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackPosts = normalizePosts({ url, urls, posts });

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const markFallbackIfUnrendered = () => {
      const rendered = root.querySelector("iframe, .twitter-tweet-rendered");
      if (!rendered) setShowFallback(true);
    };

    if (window.twttr?.widgets) {
      window.twttr.widgets.load(root);
    }

    fallbackTimer.current = window.setTimeout(markFallbackIfUnrendered, 3500);

    return () => {
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  if (!fallbackPosts.length) return null;

  return (
    <aside
      aria-labelledby={caption ? id : undefined}
      className="my-8 grid gap-4 rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4"
    >
      {caption && (
        <p
          id={id}
          className="m-0 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-ink-mute)]"
        >
          {caption}
        </p>
      )}
      <div ref={ref} className={showFallback ? "hidden" : "grid gap-4"}>
        {fallbackPosts.map((post, index) => (
          <blockquote
            key={post.url}
            className="twitter-tweet"
            data-theme="dark"
            aria-label={post.alt ?? `${caption ?? "X post"} ${index + 1}`}
          >
            <a href={post.url}>{post.alt ?? caption ?? post.url}</a>
          </blockquote>
        ))}
      </div>
      {showFallback && (
        <div className="grid gap-3">
          {fallbackPosts.map((post) => (
            <FallbackCard key={post.url} post={post} />
          ))}
        </div>
      )}
      <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8" />
    </aside>
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
