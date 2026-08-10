"use client";

import { useEffect, useRef } from "react";
import { useWorld } from "./atmosphere";

/**
 * The jterm project page, dressed as jterm.
 *
 * jterm's own download page (jacobfv.github.io/jterm) sits on an animated
 * field of ASCII Julia sets — escape-time `z ← z² + c`, drawn as characters
 * into `<pre>` elements at three grains. This is that field, ported, so the
 * project page and the thing it documents read as one artifact rather than as
 * a write-up about something that lives elsewhere.
 *
 * This component draws the field; `useWorld` — shared with every other world,
 * see reader/atmosphere.ts — holds `data-page-theme="jterm"` and the forced
 * `data-theme="dark"` on `<html>` while the page is mounted and puts both back
 * on the way out. jterm is a black-and-gold application, and a white version of
 * this page would be a picture of somewhere else. It is the only world here
 * that insists on a theme at all — everything else the site documents ships
 * light and dark and would be misrepresented by pinning one. Route table and
 * the reasoning per world: lib/worlds.ts.
 *
 * The characters are real characters — one text assignment per layer per
 * frame, which is far cheaper than touching thousands of nodes and keeps the
 * thing honest: it is ASCII, not a picture of some. It is also deliberately
 * frugal, because this is the backdrop to an article: capped grids, ~20fps
 * rather than 60, stopped outright when the tab is hidden or the reader has
 * asked for less motion.
 */

/** Characters are about twice as tall as they are wide; sampling the plane at
 *  the same ratio keeps the sets from coming out stretched. */
const CHAR_ASPECT = 0.52;
const FPS = 20;

interface LayerSpec {
  name: string;
  ramp: string;
  iter: number;
  /** Iterations the ramp is spread over — see `draw`. */
  band: number;
  scale: number;
  speed: number;
  phase: number;
  maxCols: number;
  maxRows: number;
  stipple: number;
}

/**
 * Three grains of the same idea, at different character sizes *and* different
 * zooms. The same window at three scales would just be the same picture three
 * times; giving each layer its own view of the plane means the fine one really
 * is noise, the coarse one really is legible glyphs, and they drift out of step
 * because each turns at its own rate.
 */
const LAYERS: LayerSpec[] = [
  {
    name: "noise",
    ramp: " .....::::----~~~~++++****####%%%%@@@@",
    iter: 30,
    band: 11,
    scale: 4.6,
    speed: 1.45,
    phase: 0,
    maxCols: 260,
    maxRows: 170,
    stipple: 11,
  },
  {
    name: "mid",
    ramp: " ...::--~~++**##%%@@",
    iter: 48,
    band: 18,
    scale: 3.0,
    speed: 1.0,
    phase: 2.1,
    maxCols: 190,
    maxRows: 80,
    stipple: 7,
  },
  {
    name: "read",
    ramp: " .:-=+*#%@",
    iter: 64,
    band: 30,
    scale: 2.1,
    speed: 0.5,
    phase: 4.2,
    maxCols: 90,
    maxRows: 44,
    stipple: 5,
  },
];

interface Layer extends LayerSpec {
  el: HTMLPreElement;
  cols: number;
  rows: number;
}

/**
 * The constant `c`, walked around just inside the Mandelbrot set's main
 * cardioid.
 *
 * The usual demo orbit, `0.7885·e^{iθ}`, runs along the *boundary* of the set —
 * every frame of it is a dendrite with almost nothing on screen. Parameterising
 * the cardioid and stepping inside it gives connected Julia sets with real
 * structure, and they change shape as θ turns rather than merely rotating.
 */
function cAt(phase: number): [number, number] {
  const r = 0.96;
  const mr = r * Math.cos(phase);
  const mi = r * Math.sin(phase);
  return [mr / 2 - (mr * mr - mi * mi) / 4, mi / 2 - (2 * mr * mi) / 4];
}

function measure(layer: Layer) {
  const style = getComputedStyle(layer.el);
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;white-space:pre;font-family:" +
    style.fontFamily +
    ";font-size:" +
    style.fontSize +
    ";letter-spacing:" +
    style.letterSpacing;
  probe.textContent = "0".repeat(100);
  document.body.appendChild(probe);
  const charWidth = probe.getBoundingClientRect().width / 100 || 7;
  probe.remove();

  const lineHeight = parseFloat(style.lineHeight) || 12;
  // Capped: past this the per-frame cost stops buying visible detail.
  layer.cols = Math.min(
    layer.maxCols,
    Math.max(16, Math.ceil(window.innerWidth / charWidth)),
  );
  layer.rows = Math.min(
    layer.maxRows,
    Math.max(10, Math.ceil(window.innerHeight / lineHeight)),
  );
}

function draw(layer: Layer, time: number) {
  const [cr, ci] = cAt(layer.phase + time * layer.speed);
  const { cols, rows, ramp } = layer;
  const top = ramp.length - 1;
  const halfW = layer.scale / 2;
  const halfH = ((layer.scale / 2) * (rows / cols)) / CHAR_ASPECT;

  let out = "";
  for (let y = 0; y < rows; y++) {
    const zi0 = -halfH + (2 * halfH * y) / rows;
    let line = "";
    for (let x = 0; x < cols; x++) {
      let zr = -halfW + (2 * halfW * x) / cols;
      let zi = zi0;
      let i = 0;
      for (; i < layer.iter; i++) {
        const a = zr * zr;
        const b = zi * zi;
        if (a + b > 4) break;
        zi = 2 * zr * zi + ci;
        zr = a - b + cr;
      }
      if (i === layer.iter) {
        // The interior gets a sparse stipple rather than nothing. Left blank
        // it is a large dead area, and it lands squarely behind the article.
        line += (x + y) % layer.stipple === 0 ? "·" : " ";
      } else {
        // The ramp is spent on the narrow band hugging the boundary, which is
        // the part with any structure in it. Spread evenly across the whole
        // range, almost every cell lands on the same two characters and the
        // set vanishes into a flat wash.
        line += ramp[Math.min(top, Math.floor((i / layer.band) * top))];
      }
    }
    out += line + "\n";
  }
  layer.el.textContent = out;
}

export function JtermAtmosphere() {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  // The page is dark whatever the site is set to, and goes back on the way out.
  useWorld("jterm", "dark");

  useEffect(() => {
    const host = fieldRef.current;
    let raf = 0;
    let last = 0;
    let t = 0;
    let running = true;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const layers: Layer[] = host
      ? LAYERS.flatMap((spec) => {
          const el = host.querySelector<HTMLPreElement>(
            `.jterm-fractal[data-layer="${spec.name}"]`,
          );
          if (!el) return [];
          const layer: Layer = { ...spec, el, cols: 0, rows: 0 };
          measure(layer);
          draw(layer, 0);
          return [layer];
        })
      : [];

    const frame = (time: number) => {
      raf = requestAnimationFrame(frame);
      if (time - last < 1000 / FPS) return;
      last = time;
      t += 0.006;
      for (const layer of layers) draw(layer, t);
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
        for (const layer of layers) {
          measure(layer);
          draw(layer, t);
        }
      }, 160);
    };

    // A still first frame is already drawn above, so honouring the preference
    // costs the reader the motion and none of the texture.
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
      // Dismantling the world itself — page theme off, reader's own theme back
      // — is `useWorld`'s job now; see reader/atmosphere.ts.
    };
  }, []);

  return (
    <div className="jterm-field" ref={fieldRef} aria-hidden="true">
      <pre className="jterm-fractal" data-layer="noise" />
      <pre className="jterm-fractal" data-layer="mid" />
      <pre className="jterm-fractal" data-layer="read" />
    </div>
  );
}
