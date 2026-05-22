import { ReaderImage } from "./ReaderImage";

// A vertical timeline of screenshots — used in MDX bodies to show how
// something looked at successive points in time. A continuous grey rail
// threads through a dot on each step, matching the home page "Updates"
// timeline; each step carries a date label, a title, an optional
// caption, and a full-width screenshot. The image is a ReaderImage, so
// a click opens the fullscreen Lightbox at full resolution.

type Step = {
  date: string;
  title: string;
  caption?: string;
  src: string;
  alt: string;
};

export function ScreenshotTimeline({ steps }: { steps: Step[] }) {
  return (
    <ul className="my-7 flex flex-col">
      {steps.map((s, i) => {
        const first = i === 0;
        const last = i === steps.length - 1;
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
            <ReaderImage
              src={s.src}
              alt={s.alt}
              className="mt-3 !mb-0 w-full rounded shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
            />
          </li>
        );
      })}
    </ul>
  );
}
