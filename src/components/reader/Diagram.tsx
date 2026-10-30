import type { CSSProperties } from "react";

/**
 * An inlined SVG diagram. The markup is produced at build time by
 * `remarkInlineSvg` from a local `.svg` placed as an image in MDX, with its
 * ids and styles already scoped to this figure's `data-diagram`. It renders
 * at the drawing's own width, bleeding out of the reading column when the
 * viewport allows, and scrolls sideways rather than shrinking its type
 * below legibility on a phone.
 */
export function Diagram({
  id,
  src,
  alt,
  width,
  height,
  svg,
}: {
  id: string;
  src: string;
  alt?: string;
  width: string | number;
  height: string | number;
  svg: string;
}) {
  const style = { "--diagram-w": `${width}px`, "--diagram-h": `${height}px` } as CSSProperties;
  return (
    <figure className="diagram" data-diagram={id} data-src={src} style={style}>
      <div className="diagram__canvas" dangerouslySetInnerHTML={{ __html: svg }} />
      {alt && <figcaption className="diagram__caption">{alt}</figcaption>}
    </figure>
  );
}
