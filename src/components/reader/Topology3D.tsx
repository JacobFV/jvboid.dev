"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { TOPOLOGIES } from "@/lib/topologies";
import type { TopologyPalette } from "@/components/three/TopologyScene";

const Scene = dynamic(
  () => import("@/components/three/TopologyScene").then((m) => m.TopologyScene),
  { ssr: false, loading: () => null },
);

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** The page's own ink, read off the cascade, so a world's palette or the
 *  reader's theme reaches the WebGL canvas, which cannot see CSS. */
function readPalette(): TopologyPalette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    ink: v("--color-ink", "#1a1815"),
    dim: v("--color-ink-dim", "#54585f"),
    accent: v("--color-accent", "#d8541c"),
    bg: v("--color-bg-0", "#f8f5ef"),
  };
}

const DEFAULT_MS = 3200;

/**
 * A 3D network-topology figure: how a system's parts talk to each other, played
 * as one pass through its phases. Drag to orbit; the phase chips under it step
 * through the computation and pause the auto-advance. The spec lives in
 * `src/lib/topologies/`, keyed by `id`.
 *
 * Reduced motion keeps the figure and the stepper but drops the pulses, the
 * rotation and the auto-advance. Without WebGL the figure is replaced by the
 * phase list, which carries the same sequence in words.
 */
export function Topology3D({ id, caption }: { id: string; caption?: string }) {
  const topology = TOPOLOGIES[id];
  const box = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [still, setStill] = useState(false);
  const [visible, setVisible] = useState(false);
  const [palette, setPalette] = useState<TopologyPalette | null>(null);
  const [phase, setPhase] = useState(0);
  const [phaseStart, setPhaseStart] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setGl(detectWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const onMq = () => setStill(mq.matches);
    mq.addEventListener("change", onMq);
    setPalette(readPalette());
    // Theme toggles and worlds both work by attributes on <html>.
    const mo = new MutationObserver(() => setPalette(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-page-theme", "class"] });
    return () => {
      mq.removeEventListener("change", onMq);
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    setPhase(i);
    setPhaseStart(performance.now());
  }, []);

  // Auto-advance only while it can be seen and nobody has taken the wheel.
  useEffect(() => {
    if (!topology || still || paused || !visible) return;
    const ms = topology.phases[phase]?.ms ?? DEFAULT_MS;
    const t = window.setTimeout(() => go((phase + 1) % topology.phases.length), ms);
    return () => window.clearTimeout(t);
  }, [topology, phase, still, paused, visible, go]);

  if (!topology) {
    if (process.env.NODE_ENV !== "production") throw new Error(`Topology3D: unknown topology "${id}"`);
    return null;
  }

  const current = topology.phases[phase];

  return (
    <figure className="topology3d my-10 w-full" aria-label={topology.title}>
      {gl !== false && (
        // Below 640px the figure scrolls sideways instead of shrinking: the
        // labels are a fixed size, and a phone-width drawing would pile them
        // on top of each other.
        <div className="w-full overflow-x-auto">
        <div
          ref={box}
          className="relative w-full min-w-[640px] overflow-hidden"
          style={{ aspectRatio: "16 / 10", maxHeight: "34rem", cursor: "grab" }}
          role="img"
          aria-label={topology.title}
        >
          {gl && palette && (
            <Scene
              topology={topology}
              palette={palette}
              phase={phase}
              phaseStart={phaseStart}
              still={still}
              visible={visible}
            />
          )}
        </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[12px]" role="tablist" aria-label="Phases">
        {topology.phases.map((p, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === phase}
            onClick={() => {
              setPaused(true);
              go(i);
            }}
            className={
              "rounded-full border px-2.5 py-0.5 transition-colors " +
              (i === phase
                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                : "border-[var(--color-rule)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]")
            }
          >
            {i + 1}
          </button>
        ))}
        {paused && !still && (
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              go((phase + 1) % topology.phases.length);
            }}
            className="ml-1 text-[var(--color-ink-dim)] underline-offset-2 hover:underline"
          >
            play
          </button>
        )}
      </div>
      <p className="mt-2 min-h-[3em] text-[15px] text-[var(--color-ink)]" aria-live="polite">
        <span className="font-mono text-[12px] text-[var(--color-ink-dim)]">
          {phase + 1}/{topology.phases.length}{" "}
        </span>
        {current?.label}
      </p>
      {gl === false && (
        <ol className="mt-2 list-decimal pl-5 text-[15px] text-[var(--color-ink-dim)]">
          {topology.phases.map((p, i) => (
            <li key={i}>{p.label}</li>
          ))}
        </ol>
      )}
      {caption && <figcaption className="mt-2 text-[14px] text-[var(--color-ink-dim)]">{caption}</figcaption>}
    </figure>
  );
}
