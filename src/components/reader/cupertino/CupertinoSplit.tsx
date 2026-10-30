/**
 * Code beside the screens it produced: a fenced code block on the left,
 * one or more screenshots on the right, so a figure explains rather than
 * only shows. The children are the MDX fence (already highlighted by
 * rehype-shiki); `images` are plain pictures with their alt as caption.
 */
export function CupertinoSplit({
  images,
  caption,
  children,
}: {
  images: { src: string; alt: string }[];
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="cup-split">
      <div className="cup-split__code">{children}</div>
      <div className="cup-split__shots" data-count={images.length}>
        {images.map((im) => (
          <figure key={im.src} className="cup-split__shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.src} alt={im.alt} loading="lazy" />
            <figcaption>{im.alt}</figcaption>
          </figure>
        ))}
      </div>
      {caption && <figcaption className="cup-split__caption">{caption}</figcaption>}
    </figure>
  );
}
