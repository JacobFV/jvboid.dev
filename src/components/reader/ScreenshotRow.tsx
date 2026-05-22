import { ReaderImage } from "./ReaderImage";

// A horizontal row of screenshots with one shared caption — used in MDX
// bodies when a set of images is a single grouped exhibit (e.g. four
// frames pulled from the same source page) rather than figures that
// each need their own prose. Each tile is a ReaderImage, so a click
// still opens the fullscreen Lightbox at full resolution.

type Shot = { src: string; alt: string };

export function ScreenshotRow({
  shots,
  caption,
  href,
}: {
  shots: Shot[];
  caption?: string;
  href?: string;
}) {
  return (
    <figure className="my-7">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shots.map((s) => (
          <ReaderImage
            key={s.src}
            src={s.src}
            alt={s.alt}
            className="!my-0 aspect-[4/3] h-full w-full rounded object-cover"
          />
        ))}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-[var(--color-ink-mute)] underline-offset-2 hover:text-[var(--color-accent)] hover:decoration-[var(--color-accent)]"
            >
              {caption}
            </a>
          ) : (
            caption
          )}
        </figcaption>
      )}
    </figure>
  );
}
