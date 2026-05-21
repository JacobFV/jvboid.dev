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
export function ReaderImage(p: ImgHTMLAttributes<HTMLImageElement>) {
  const alt = p.alt ?? "";
  return (
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
  );
}
