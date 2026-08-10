"use client";

import { useEffect, useRef } from "react";

/**
 * The langcurriculum project page, dressed as langcurriculum.
 *
 * The site it documents (jacobfv.github.io/formal-language-cirriculum) is an
 * instrument panel: hairline rules, right angles everywhere, monospaced labels
 * in small caps, every quantity stated and in the same place on every page. The
 * project page borrows that, so the write-up and the thing it documents read as
 * one artifact rather than as an article about something living elsewhere.
 *
 * Behind the article is the curriculum's own dependency graph — layers of nodes
 * with edges between them, and a slow pulse travelling left to right along
 * those edges the way a prerequisite reaches what it enables. It is the shape
 * the project is *about*, which is a better backdrop than a texture chosen for
 * looking nice.
 *
 * **This world does not force a theme, and that is the difference from jterm.**
 * jterm is a black-and-gold application, so a white version of its page would be
 * a picture of somewhere else. langcurriculum ships light and dark and looks
 * deliberate in both — its stylesheet carries a full `prefers-color-scheme`
 * palette — so forcing one here would misrepresent it just as surely. The
 * reader keeps whatever they chose; only the furniture changes.
 *
 * Because no theme is forced, there is nothing for the pre-paint script in
 * `app/layout.tsx` to do beyond setting `data-page-theme` for a first load, and
 * nothing to put back on the way out except the attribute itself.
 */

/** Columns of the drawn graph, and how many nodes stand in each. Loosely the
 *  real shape of the `progressive` curriculum: very wide at the roots, and
 *  narrowing hard as the axes stack up. */
const LAYERS = [9, 6, 4, 3, 2];

const FPS = 30;

type Node = { x: number; y: number; layer: number };

/** A tiny deterministic generator, so the field is the same field after a
 *  resize instead of a new one every time the window moves. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function build(w: number, h: number): { nodes: Node[]; edges: [number, number][] } {
  const random = rng(0x5eed);
  const nodes: Node[] = [];
  const perLayer: number[][] = [];
  const padX = w * 0.08;
  const span = w - padX * 2;

  LAYERS.forEach((count, layer) => {
    const idx: number[] = [];
    const x = padX + (span * layer) / Math.max(1, LAYERS.length - 1);
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      // jitter, but deterministic jitter: a perfect lattice reads as wallpaper
      const y = h * (0.08 + 0.84 * t) + (random() - 0.5) * (h * 0.05);
      idx.push(nodes.length);
      nodes.push({ x: x + (random() - 0.5) * (span * 0.03), y, layer });
    }
    perLayer.push(idx);
  });

  const edges: [number, number][] = [];
  for (let layer = 0; layer < perLayer.length - 1; layer += 1) {
    for (const from of perLayer[layer]) {
      const targets = perLayer[layer + 1];
      const fan = 1 + Math.floor(random() * 2);
      for (let k = 0; k < fan; k += 1) {
        edges.push([from, targets[Math.floor(random() * targets.length)]]);
      }
    }
  }
  return { nodes, edges };
}

export function LangCurriculumAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-page-theme", "langcurriculum");

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    let raf = 0;
    let last = 0;
    let t = 0;
    let running = true;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let graph = { nodes: [] as Node[], edges: [] as [number, number][] };
    let ink = "#0d33ff";

    const measure = () => {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      graph = build(w, h);
      // read the accent from the cascade, so the field retunes with the theme
      // instead of carrying a colour of its own
      const accent = getComputedStyle(root).getPropertyValue("--color-accent").trim();
      if (accent) ink = accent;
    };

    const draw = (time: number) => {
      if (!canvas || !ctx) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1;

      for (const [a, b] of graph.edges) {
        const from = graph.nodes[a];
        const to = graph.nodes[b];
        // the pulse: a band of brightness sweeping left to right, so an edge
        // lights when the signal reaches the column it leaves
        const phase = (from.x / Math.max(1, w) - time * 0.06) % 1;
        const lit = Math.max(0, 1 - Math.abs(((phase + 1) % 1) - 0.5) * 4);
        ctx.globalAlpha = 0.05 + lit * 0.13;
        const mid = (from.x + to.x) / 2;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(mid, from.y, mid, to.y, to.x, to.y);
        ctx.stroke();
      }

      for (const node of graph.nodes) {
        ctx.globalAlpha = 0.16;
        ctx.fillRect(node.x - 3, node.y - 3, 6, 6);      // square, like everything else
      }
      ctx.globalAlpha = 1;
    };

    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (time - last < 1000 / FPS) return;
      last = time;
      t += 0.016;
      draw(t);
    };

    const start = () => {
      if (!raf && running) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) start();
      else stop();
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        measure();
        draw(t);
      }, 160);
    };

    measure();
    draw(0);

    // A still first frame is already drawn, so honouring the preference costs
    // the reader the motion and none of the structure.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      start();
      document.addEventListener("visibilitychange", onVisibility);
    }
    window.addEventListener("resize", onResize);

    return () => {
      stop();
      clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      root.removeAttribute("data-page-theme");
    };
  }, []);

  return (
    <div className="lc-field" aria-hidden="true">
      <canvas className="lc-graph" ref={canvasRef} />
    </div>
  );
}
