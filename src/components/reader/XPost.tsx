type XPostProps = {
  url?: string;
  urls?: string[];
  caption?: string;
};

export function XPost({ url, urls, caption }: XPostProps) {
  const postUrls = urls?.length ? urls : url ? [url] : [];
  if (!postUrls.length) return null;

  return (
    <aside className="my-8 grid gap-4 rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4">
      {caption && (
        <p className="m-0 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wide text-[var(--color-ink-mute)]">
          {caption}
        </p>
      )}
      {postUrls.map((postUrl, index) => (
        <blockquote key={postUrl} className="twitter-tweet" data-theme="dark">
          <a href={postUrl}>{caption ? `${caption} ${index + 1}` : postUrl}</a>
        </blockquote>
      ))}
      <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8" />
    </aside>
  );
}
