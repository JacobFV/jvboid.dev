"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { openLightbox } from "./lightbox-store";
import { ProgressiveImage } from "./ProgressiveImage";

type Slide = {
  src: string;
  alt: string;
};

const cls = (...x: (string | false | undefined)[]) =>
  x.filter(Boolean).join(" ");

export function PresentationSlides({
  slides,
}: {
  slides: Slide[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  if (!slides.length) return null;

  const scrollBySlide = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section
      className="my-8"
      aria-label="Presentation slides"
    >
      <div className="mb-2 flex items-center justify-between gap-3 font-[family-name:var(--font-mono)] text-xs text-[var(--color-ink-mute)]">
        <span>presentation slides</span>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => scrollBySlide(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-[var(--color-bg-1)] text-[var(--color-ink)] transition hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-ink)_12%,transparent)]"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => scrollBySlide(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-[var(--color-bg-1)] text-[var(--color-ink)] transition hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--color-ink)_12%,transparent)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-2xl border border-[color-mix(in_srgb,var(--color-ink)_24%,transparent)] bg-[var(--color-bg-1)] p-3 shadow-none transition-shadow duration-200 hover:shadow-[0_14px_34px_color-mix(in_srgb,var(--color-ink)_14%,transparent)]"
      >
        {slides.map((slide, index) => (
          <figure
            key={slide.src}
            className="min-w-full snap-center"
          >
            <ProgressiveImage
              src={slide.src}
              alt={slide.alt}
              title={slide.alt}
              data-reader-image=""
              loading="lazy"
              onClick={(e) => openLightbox(e.currentTarget)}
              className={cls(
                "aspect-video w-full cursor-zoom-in rounded object-contain",
                "bg-black",
              )}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
