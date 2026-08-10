"use client";

import { useRef } from "react";
import { useCanvasField, rng, token, useWorld } from "./atmosphere";

/**
 * The langcurriculum project page, dressed as langcurriculum.
 *
 * The site it documents (jacobfv.github.io/formal-language-cirriculum) is an
 * instrument panel: hairline rules, right angles everywhere, monospaced labels
 * in small caps, every quantity stated and in the same place on every page. The
 * project page borrows that, so the write-up and the thing it documents read as
 * one artifact rather than as an article about something living elsewhere.
 *
 * Behind the article is the curriculum's own dependency graph, and it does two
 * things a still picture of a graph cannot:
 *
 *   - **Packets travel it.** A lesson generator is only reachable once its
 *     prerequisites are, so signal moves left to right along the edges and each
 *     node flares as it is reached. The first version faded whole edges in and
 *     out at ~1/35 Hz between alpha 0.05 and 0.18, which is a still image with
 *     extra steps — nothing in it was ever visibly in motion.
 *   - **Scrolling walks it.** The graph is drawn about twice the width of the
 *     window and pans with scroll depth, so reading down the article moves you
 *     through the curriculum from the wide root layers into the narrow ones.
 *     That is the shape the project is *about*, which beats a texture chosen
 *     for looking nice.
 *
 * **This world does not force a theme, and that is the difference from jterm.**
 * jterm is a black-and-gold application, so a white version of its page would be
 * a picture of somewhere else. langcurriculum ships light and dark and looks
 * deliberate in both — its stylesheet carries a full `prefers-color-scheme`
 * palette — so forcing one here would misrepresent it just as surely. The
 * reader keeps whatever they chose; only the furniture changes.
 */

/** Columns of the drawn graph and how many nodes stand in each. Loosely the
 *  real shape of the `progressive` curriculum: very wide at the roots, and
 *  narrowing hard as the axes stack up. More columns than fit the window, on
 *  purpose — the ones off the right edge are what scrolling reveals. */
const LAYERS = [11, 9, 7, 6, 4, 3, 2, 1];

/** How much wider than the viewport the graph is drawn. The pan travels the
 *  difference over the whole article. */
const OVERSCAN = 2.15;

/** Seconds for a packet to cross one layer gap. */
const HOP = 2.6;

type GNode = { x: number; y: number; layer: number };
type GEdge = { a: number; b: number; phase: number };

function build(w: number, h: number) {
  const random = rng(0x5eed);
  const nodes: GNode[] = [];
  const perLayer: number[][] = [];
  const width = w * OVERSCAN;
  const padX = width * 0.04;
  const span = width - padX * 2;

  LAYERS.forEach((count, layer) => {
    const idx: number[] = [];
    const x = padX + (span * layer) / Math.max(1, LAYERS.length - 1);
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      // jitter, but deterministic jitter: a perfect lattice reads as wallpaper
      const y = h * (0.06 + 0.88 * t) + (random() - 0.5) * (h * 0.05);
      idx.push(nodes.length);
      nodes.push({ x: x + (random() - 0.5) * (span * 0.02), y, layer });
    }
    perLayer.push(idx);
  });

  const edges: GEdge[] = [];
  for (let layer = 0; layer < perLayer.length - 1; layer += 1) {
    for (const from of perLayer[layer]) {
      const targets = perLayer[layer + 1];
      const fan = 1 + Math.floor(random() * 2);
      for (let k = 0; k < fan; k += 1) {
        // Each edge carries its packet on its own offset, so the field is a
        // steady traffic of signal rather than one synchronised wavefront
        // marching across the window like a screensaver.
        edges.push({ a: from, b: targets[Math.floor(random() * targets.length)], phase: random() });
      }
    }
  }
  return { nodes, edges, width };
}

/** Cubic Bézier with both control points on the midline — the same curve the
 *  edge is stroked with, so the packet rides the wire instead of near it. */
function along(from: GNode, to: GNode, u: number) {
  const mid = (from.x + to.x) / 2;
  const v = 1 - u;
  const b0 = v * v * v;
  const b1 = 3 * v * v * u;
  const b2 = 3 * v * u * u;
  const b3 = u * u * u;
  return {
    x: b0 * from.x + b1 * mid + b2 * mid + b3 * to.x,
    y: b0 * from.y + b1 * from.y + b2 * to.y + b3 * to.y,
  };
}

export function LangCurriculumAtmosphere() {
  useWorld("langcurriculum");

  // Refs, not locals: the painter closures are refreshed on every render, and
  // plain `let`s would hand the running field a freshly emptied graph the next
  // time this component re-rendered for any reason at all.
  const graphRef = useRef({ nodes: [] as GNode[], edges: [] as GEdge[], width: 0 });
  const inkRef = useRef("#0d33ff");

  const canvasRef = useCanvasField({
    fps: 30,
    measure({ w, h }) {
      graphRef.current = build(w, h);
      inkRef.current = token("--color-accent", inkRef.current);
    },
    draw({ ctx, w, h, t, scroll }) {
      const graph = graphRef.current;
      const ink = inkRef.current;
      if (!graph.nodes.length) return;

      // Reading down the article walks the curriculum: the pan travels from the
      // root layers to the terminal ones over the length of the page.
      const pan = -(graph.width - w) * scroll;
      ctx.save();
      ctx.translate(pan, 0);
      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 1;

      // The wires, at a flat resting weight. They are structure, not event —
      // it is the packets that carry the motion.
      ctx.globalAlpha = 0.09;
      ctx.beginPath();
      for (const { a, b } of graph.edges) {
        const from = graph.nodes[a];
        const to = graph.nodes[b];
        const mid = (from.x + to.x) / 2;
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(mid, from.y, mid, to.y, to.x, to.y);
      }
      ctx.stroke();

      // Packets, and the short bright wake each drags behind it.
      const arrivals = new Map<number, number>();
      for (const { a, b, phase } of graph.edges) {
        const from = graph.nodes[a];
        const to = graph.nodes[b];
        // Start the run at the layer the edge leaves, so signal really does
        // propagate outward from the roots instead of every column firing at
        // once. Packets off-screen cost a modulo and nothing else.
        const u = ((t / HOP - from.layer + phase) % 1 + 1) % 1;
        if (to.x + pan < -40 || from.x + pan > w + 40) continue;

        const head = along(from, to, u);
        const tail = along(from, to, Math.max(0, u - 0.16));
        const grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, ink);
        ctx.strokeStyle = grad;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(tail.x, tail.y);
        ctx.lineTo(head.x, head.y);
        ctx.stroke();

        ctx.globalAlpha = 0.85;
        ctx.fillRect(head.x - 1.6, head.y - 1.6, 3.2, 3.2);

        // Remember the strongest arrival at each node this frame, so a node fed
        // by six edges flares once rather than being drawn six times over.
        if (u > 0.9) arrivals.set(b, Math.max(arrivals.get(b) ?? 0, (u - 0.9) / 0.1));
      }

      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      for (let i = 0; i < graph.nodes.length; i += 1) {
        const node = graph.nodes[i];
        if (node.x + pan < -20 || node.x + pan > w + 20) continue;
        const lit = arrivals.get(i) ?? 0;

        ctx.globalAlpha = 0.18 + lit * 0.55;
        ctx.fillRect(node.x - 3, node.y - 3, 6, 6); // square, like everything else
        if (lit > 0) {
          // The flare: a ring opening out of the node as the packet lands.
          ctx.globalAlpha = (1 - lit) * 0.45;
          ctx.strokeRect(node.x - 3 - lit * 9, node.y - 3 - lit * 9, 6 + lit * 18, 6 + lit * 18);
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    },
  });

  return (
    <div className="lc-field" aria-hidden="true">
      <canvas className="lc-graph" ref={canvasRef} />
    </div>
  );
}
