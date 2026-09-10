"use client";

import type { ImgHTMLAttributes } from "react";
import { openLightbox } from "./lightbox-store";
import { ProgressiveImage } from "./ProgressiveImage";

const cls = (...x: (string | false | undefined)[]) =>
  x.filter(Boolean).join(" ");

// The MDX `img` mapping. Stays a real <img> — right-click "Save image
// as…" and the native title tooltip keep working — but clicking it
// opens the fullscreen Lightbox. `data-reader-image` lets the lightbox
// gather every content image on the page for prev/next navigation.
//
// The picture and its caption are wrapped in <span>s rather than a
// <figure>: MDX hands a lone `![]()` through the `p` map, and a block
// inside a paragraph is invalid HTML that the browser re-parents before
// React hydrates. The alt *is* the caption. It is only drawn in the
// serif post column (`.prose-lede .reader-caption`); everywhere else the
// span is inert and the picture reads as it always has.
export function ReaderImage(p: ImgHTMLAttributes<HTMLImageElement>) {
  const alt = p.alt ?? "";
  return (
    <span className="reader-figure">
      <ProgressiveImage
        {...p}
        alt={alt}
        title={p.title ?? (alt || undefined)}
        data-reader-image=""
        loading="lazy"
        onClick={(e) => openLightbox(e.currentTarget)}
        className={cls(
          "reader-image my-6 max-w-full cursor-zoom-in rounded",
          p.className,
        )}
      />
      {alt && <span className="reader-caption">{linkify(alt)}</span>}
    </span>
  );
}

// A caption is plain alt text, so a credit can only name its source as a
// bare URL. Draw any such URL as a link, shown without its scheme.
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s)]+)/g).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
      </a>
    ) : (
      part
    ),
  );
}
