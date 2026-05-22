import { ProgressiveImage } from "./ProgressiveImage";

// A vertical timeline of screenshots — used in MDX bodies to show how
// something looked at successive points in time. A continuous grey rail
// threads through a dot on each step; each step carries a date label, a
// title, an optional caption, and a screenshot. When a step has an
// `href`, the screenshot becomes a link to that source.

type Step = {
  date: string;
  title: string;
  caption?: string;
  src: string;
  alt: string;
  href?: string;
};

export function ScreenshotTimeline({ steps }: { steps: Step[] }) {
  return (
    // Inline list-style/padding reset: `.prose-mdx ul` (globals.css) sets
    // a disc marker + indent that would otherwise show on this timeline.
    <ul className="my-7 flex flex-col" style={{ listStyle: "none", paddingLeft: 0 }}>
      {steps.map((s, i) => {
        const first = i === 0;
        const last = i === steps.length - 1;
        // Thin outline + slight rounded corners on every frame.
        const img = (
          <ProgressiveImage
            src={s.src}
            alt={s.alt}
            loading="lazy"
            className="w-full rounded-lg border border-[var(--color-bg-2)]"
          />
        );
        return (
          <li key={s.src} className="relative pb-8 pl-9 last:pb-0">
            {/* Rail + dot. The rail is clipped to start/end at the dot
                on the first/last step. */}
            <span
              aria-hidden
              className="absolute left-3 w-px -translate-x-1/2 bg-[var(--color-bg-2)]"
              style={{ top: first ? "0.4rem" : 0, bottom: last ? "calc(100% - 0.4rem)" : 0 }}
            />
            <span
              aria-hidden
              className="absolute left-3 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--color-ink-mute)] ring-4 ring-[var(--color-bg-0)]"
              style={{ top: "0.4rem", marginTop: "-0.25rem" }}
            />
            <div className="flex items-baseline gap-2">
              <time className="font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
                {s.date}
              </time>
              <span className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">
                {s.title}
              </span>
            </div>
            {s.caption && (
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-[var(--color-ink-dim)]">
                {s.caption}
              </p>
            )}
            {s.href ? (
              <a
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block no-underline transition-opacity hover:opacity-90"
              >
                {img}
              </a>
            ) : (
              <div className="mt-3">{img}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
