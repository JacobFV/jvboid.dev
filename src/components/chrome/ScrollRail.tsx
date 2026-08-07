"use client";

import { useEffect, useRef } from "react";

/** How long the scrollbar lingers after the rail stops moving. */
const LINGER_MS = 700;

/**
 * A horizontal scroll container whose scrollbar only shows while it is
 * being scrolled. The visuals live in `.rail-scroll` (globals.css); this
 * just flips `data-scrolling` on scroll and clears it once motion stops.
 */
export function ScrollRail({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.dataset.scrolling = "true";
      clearTimeout(timer);
      timer = setTimeout(() => {
        delete el.dataset.scrolling;
      }, LINGER_MS);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);

  return (
    <ul ref={ref} className={["rail-scroll", className].filter(Boolean).join(" ")}>
      {children}
    </ul>
  );
}
