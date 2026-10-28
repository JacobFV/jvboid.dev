"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const Scene = dynamic(
  () => import("@/components/three/LittleBrainScene").then((m) => m.LittleBrainScene),
  { ssr: false, loading: () => null },
);

type Status = "loading" | "ready" | "failed";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * My Little Brain's own 3D brain, in the page rather than an embedded app:
 * its template anatomy and its eyes, which follow the reader. A toggle looks
 * inside; the pill under it opens the real thing.
 *
 * The anatomy (~16 MB of meshes) loads only once the figure is near the
 * viewport. Without WebGL the poster stands in for it.
 */
export function LittleBrain({ demo, poster }: { demo: string; poster?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [still, setStill] = useState(false);
  const [inside, setInside] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const onStatus = useCallback((s: Status) => setStatus(s), []);

  useEffect(() => {
    setGl(hasWebGL());
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setNear(true);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="little-brain">
      <div ref={box} className="little-brain__stage" aria-label="My Little Brain's 3D brain. Drag to turn it.">
        {gl === false && poster && (
          // eslint-disable-next-line @next/next/no-img-element -- fallback when WebGL is unavailable
          <img src={poster} alt="My Little Brain's 3D brain with eyes" className="little-brain__poster" />
        )}
        {gl && near && <Scene inside={inside} still={still} visible={visible} onStatus={onStatus} />}
        {gl && status !== "ready" && (
          <p className="little-brain__status" aria-live="polite">
            {status === "failed" ? "The brain didn't load. Reload to try again." : "Growing a brain…"}
          </p>
        )}
      </div>
      <div className="little-brain__controls">
        {gl && (
          <button
            type="button"
            className="little-brain__toggle"
            aria-pressed={inside}
            onClick={() => setInside((v) => !v)}
            disabled={status !== "ready"}
          >
            {inside ? "Close it up" : "Look inside"}
          </button>
        )}
        <a className="little-brain__try" href={demo} target="_blank" rel="noopener noreferrer">
          Try it out <span aria-hidden="true">↗</span>
        </a>
      </div>
      <figcaption className="little-brain__caption">
        The real cortex and nuclei from the app (fsaverage and ENIGMA template surfaces), with its eyes. Drag
        to turn it. It looks back at you; nothing here is measured activity.
      </figcaption>
    </figure>
  );
}
