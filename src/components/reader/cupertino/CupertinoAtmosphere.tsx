"use client";

import { useEffect } from "react";
import { useWorld } from "../atmosphere";

/**
 * The iPhone on Linux project page, dressed the way Apple dresses a phone.
 *
 * The subject is an iPhone, and an iPhone already has a look everywhere it is
 * sold: solid white, one system face, black type with grey secondary copy,
 * one blue for the two links a page is allowed, and every section surfacing
 * as the reader reaches it. Almost all of that is colour and type, so it
 * lives in globals.css under `data-page-theme="cupertino"`. This component
 * holds the world on <html> and runs the one piece of choreography: the
 * fade-in.
 *
 * Every direct child of the hero, the prose and the related section starts
 * transparent and a little low (the CSS does that the moment the world is
 * on <html>, which the pre-paint script guarantees before first paint), and
 * is let through once it crosses into the viewport. The hero's children
 * stagger. A CSS safety animation shows everything after a couple of seconds
 * regardless, so a hydration failure costs the motion and not the page.
 *
 * Light is forced. A white iPhone page is the only kind there is.
 */
export function CupertinoAtmosphere() {
  useWorld("cupertino", "light");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main article > header > *, main article .prose-mdx > *, main article > section",
      ),
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).setAttribute("data-reveal", "in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return null;
}
