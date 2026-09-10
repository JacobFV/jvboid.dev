import type { ReactNode } from "react";
import { ReaderImage } from "./ReaderImage";

/**
 * Media set beside the prose rather than across it — a photograph, a demo
 * video, a tweet or two — stacked in one column at the right (or left) of
 * the body, with a single caption under the whole stack. It floats, so the
 * paragraphs that follow run beside it; placed first, a reader landing on
 * the page sees the prose and the media at once. Below 64rem there is no
 * room for a column and it is a full-width block. Styles live under
 * `.side-media` in globals.css.
 *
 * `image` and `video` cover the common case; anything else (an <XPost>)
 * goes in as children. The caption can carry links; an image's `alt` stays
 * its accessible name and its lightbox title.
 */
export function SideMedia({
  side = "right",
  image,
  video,
  videoTitle,
  caption,
  children,
}: {
  side?: "left" | "right";
  image?: { src: string; alt: string };
  /** An embeddable video URL, e.g. https://www.youtube.com/embed/<id>. */
  video?: string;
  videoTitle?: string;
  caption?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <figure className="side-media" data-side={side}>
      {image && <ReaderImage src={image.src} alt={image.alt} />}
      {video && (
        <iframe
          src={video}
          title={videoTitle ?? "Video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
