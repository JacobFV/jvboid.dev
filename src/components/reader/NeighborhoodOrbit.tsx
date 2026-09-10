"use client";

// Related pages, seen through the front of an old TV set.
//
// The panel is a squircle (superellipse, n≈4) cut out of a bezel — the
// shape a CRT tube actually is, not a rounded rectangle — and behind the
// glass the 2° neighborhood hangs in space: the focus node at the origin,
// its direct neighbors on a shell around it, and their neighbors drifting
// further out in the direction of whoever pulled them in.
//
// Dragging orbits the camera around that cloud. Motion is the same 3D
// idiom the home-page Planetoids field uses — a yaw/pitch rotation and a
// FOCAL/(FOCAL - z) perspective divide — so depth reads as size, opacity
// and overlap, and the starfield behind parallaxes against it. The RAF
// loop writes attributes straight onto refs; React renders the scene once
// (positioned for the SSR frame) and then keeps out of the way.
//
// It is meant to be read, not just watched: any interaction — a hover, a
// drag, a zoom — holds the idle spin for PAUSE_MS so labels stay put;
// scroll or pinch zooms toward the pointer; the button in the corner
// takes it fullscreen; and a tap on a star goes to that page.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { EdgeKind, Lane } from "@/lib/graph-types";

export type OrbitNode = {
  id: string;
  title: string;
  lane: Lane;
  href: string;
  ring: 0 | 1 | 2;
};

export type OrbitEdge = {
  source: string;
  target: string;
  kind: EdgeKind;
  onFocus: boolean;
};

const W = 720;
const H = 400;
const CX = W / 2;
const CY = H / 2;
// The screen is the whole component: the squircle fills the viewBox, so
// there is no bezel, no plate, nothing behind it — only the aperture.
const SA = W / 2;
const SB = H / 2;

const FOCAL = 520;
const R1 = 88; // 1° shell radius
const R2 = 158; // 2° shell radius
const Y_SQUASH = 0.6; // flatten the cloud into a disc — galaxy, not ball
const STAR_COUNT = 120;
const STAR_X = 400;
const STAR_Y = 250;

const YAW_0 = 0.55;
const PITCH_0 = -0.22;
const IDLE_SPIN = 0.00022; // rad/ms, the slow unattended drift
const PITCH_LIMIT = 0.95;

// How long the idle spin holds after the last interaction, so whatever
// was being read is still where it was.
const PAUSE_MS = 12000;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 5;
// A plain scroll wheel only zooms once the pointer has rested on the panel
// this long — otherwise scrolling the page past it would get hijacked.
// Pinch (ctrl+wheel), a click into the panel, or fullscreen arm it at once.
const WHEEL_DWELL = 700;

const NODE_R: Record<0 | 1 | 2, number> = { 0: 7, 1: 5, 2: 3.4 };
const LABEL_SIZE: Record<0 | 1 | 2, number> = { 0: 10, 1: 9, 2: 8 };
// The phone rule below sets every label at 15px; the collision boxes
// have to be measured at the size actually drawn.
const LABEL_SIZE_PHONE = 15;

const laneColor: Record<Lane, string> = {
  research: "#6FA8DC",
  building: "#93C47D",
  writing: "#C27BA0",
  personal: "#F1C232",
};

const dashFor: Record<EdgeKind, string | undefined> = {
  influence: undefined,
  realization: "5 4",
  critique: "2 3",
  collaboration: undefined,
};

type Vec3 = { x: number; y: number; z: number };
type View = { zoom: number; panX: number; panY: number };

// --- deterministic noise -------------------------------------------------
// Every position has to come out identical on the server and on the
// client or the SSR frame pops on hydration, so nothing here touches
// Math.random.

function hash01(s: string, salt: number) {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- geometry ------------------------------------------------------------

function fibonacciSphere(n: number): Vec3[] {
  if (n <= 0) return [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    out.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return out;
}

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

// Focus at the origin; 1° neighbors on a golden-spiral shell around it;
// each 2° neighbor pushed further out along the direction of the 1°
// neighbor that introduced it, tilted off that axis by its own hash. The
// result clusters cousins into little clouds instead of scattering them.
function shellLayout(nodes: OrbitNode[], edges: OrbitEdge[], focusId: string) {
  const pos = new Map<string, Vec3>();
  pos.set(focusId, { x: 0, y: 0, z: 0 });

  const ring1 = nodes.filter((n) => n.ring === 1);
  const lattice = fibonacciSphere(ring1.length);
  ring1.forEach((n, i) => {
    const u = lattice[i];
    const r = R1 * (0.86 + 0.3 * hash01(n.id, 1));
    pos.set(n.id, { x: u.x * r, y: u.y * r * Y_SQUASH, z: u.z * r });
  });

  const ring1Ids = new Set(ring1.map((n) => n.id));
  const parentOf = new Map<string, string>();
  for (const e of edges) {
    if (ring1Ids.has(e.source) && !parentOf.has(e.target)) {
      parentOf.set(e.target, e.source);
    }
    if (ring1Ids.has(e.target) && !parentOf.has(e.source)) {
      parentOf.set(e.source, e.target);
    }
  }

  const ring2 = nodes.filter((n) => n.ring === 2);
  const fallback = fibonacciSphere(ring2.length);
  ring2.forEach((n, i) => {
    const parent = parentOf.get(n.id);
    const anchor = parent ? pos.get(parent) : undefined;
    const u = anchor ? norm(anchor) : fallback[i];
    // Orthonormal frame around the parent's direction, then swing off it.
    const t = Math.abs(u.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const e1 = norm(cross(u, t));
    const e2 = cross(u, e1);
    const ang = hash01(n.id, 2) * Math.PI * 2;
    const tilt = 0.4 + 0.55 * hash01(n.id, 3);
    const st = Math.sin(tilt);
    const dir = norm({
      x: u.x * Math.cos(tilt) + (e1.x * Math.cos(ang) + e2.x * Math.sin(ang)) * st,
      y: u.y * Math.cos(tilt) + (e1.y * Math.cos(ang) + e2.y * Math.sin(ang)) * st,
      z: u.z * Math.cos(tilt) + (e1.z * Math.cos(ang) + e2.z * Math.sin(ang)) * st,
    });
    const r = R2 * (0.82 + 0.34 * hash01(n.id, 4));
    pos.set(n.id, { x: dir.x * r, y: dir.y * r * Y_SQUASH, z: dir.z * r });
  });

  return pos;
}

function superellipse(cx: number, cy: number, a: number, b: number, n = 4, steps = 176) {
  let d = "";
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = cx + a * Math.sign(ct) * Math.abs(ct) ** (2 / n);
    const y = cy + b * Math.sign(st) * Math.abs(st) ** (2 / n);
    d += `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

function shortTitle(title: string, max: number) {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

// A camera rotation applied to one world point, then the view's zoom and
// pan on the flat screen.
function project(p: Vec3, cosY: number, sinY: number, cosP: number, sinP: number, v: View) {
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;
  const y2 = p.y * cosP - z1 * sinP;
  const z2 = p.y * sinP + z1 * cosP;
  const k = FOCAL / (FOCAL - z2);
  return { x: CX + v.panX + x1 * k * v.zoom, y: CY + v.panY + y2 * k * v.zoom, z: z2, k };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const REST: View = { zoom: 1, panX: 0, panY: 0 };

export function NeighborhoodOrbit({
  nodes,
  edges,
  focusId,
  label,
}: {
  nodes: OrbitNode[];
  edges: OrbitEdge[];
  focusId: string;
  label: string;
}) {
  const router = useRouter();
  const positions = useMemo(() => shellLayout(nodes, edges, focusId), [nodes, edges, focusId]);
  const labels = useMemo(
    () =>
      new Map(
        nodes.map((n) => [n.id, shortTitle(n.title, n.ring === 0 ? 32 : n.ring === 1 ? 28 : 22)]),
      ),
    [nodes],
  );

  const stars = useMemo(() => {
    const rand = mulberry32(0x5eed ^ focusId.length);
    const lattice = fibonacciSphere(STAR_COUNT);
    return lattice.map((u, i) => ({
      u,
      r: 0.35 + rand() * 0.9,
      base: 0.2 + rand() * 0.55,
      // A few stars twinkle; most sit still.
      tw: i % 7 === 0 ? 0.4 + rand() * 0.5 : 0,
      ph: rand() * Math.PI * 2,
    }));
  }, [focusId]);

  const screenPath = useMemo(() => superellipse(CX, CY, SA, SB, 4), []);

  const nodeRefs = useRef(new Map<string, SVGGElement>());
  // The element that actually sits in the node layer — an <a> for every
  // node but the focus. Depth sorting re-stacks these, not the inner <g>.
  const stackRefs = useRef(new Map<string, Element>());
  const labelRefs = useRef(new Map<string, SVGTextElement>());
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const starRefs = useRef<(SVGCircleElement | null)[]>([]);
  const nebulaRef = useRef<SVGGElement | null>(null);
  const nodeLayer = useRef<SVGGElement | null>(null);
  const hintRef = useRef<SVGTextElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Camera state lives in a ref: the loop writes DOM, never React state.
  const cam = useRef({ yaw: YAW_0, pitch: PITCH_0, vYaw: 0, vPitch: 0, ...REST });
  const drag = useRef({ id: null as number | null, x: 0, y: 0, moved: 0, captured: false });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // Finger spread at the last pinch frame; null when not pinching.
  const pinch = useRef<number | null>(null);
  const lastInteract = useRef(-Infinity);
  const wheelArmedAt = useRef(Infinity);

  const [full, setFull] = useState(false);
  const fullRef = useRef(false);
  const nativeFull = useRef(false);

  const touch = useCallback(() => {
    lastInteract.current = performance.now();
  }, []);

  const hideHint = () => {
    if (hintRef.current) hintRef.current.style.opacity = "0";
  };

  // Client pixels → viewBox units, allowing for the letterboxing the
  // fullscreen layout adds around the 720×400 screen.
  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: CX, y: CY, s: 1 };
    const s = Math.min(r.width / W, r.height / H) || 1;
    return {
      x: (clientX - r.left - (r.width - W * s) / 2) / s,
      y: (clientY - r.top - (r.height - H * s) / 2) / s,
      s,
    };
  }, []);

  // Zoom by `factor`, keeping the point under (clientX, clientY) fixed.
  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const c = cam.current;
      const pt =
        clientX === undefined || clientY === undefined
          ? { x: CX + c.panX, y: CY + c.panY }
          : toViewBox(clientX, clientY);
      const next = clamp(c.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      const f = next / c.zoom;
      c.panX = clamp(pt.x - CX - (pt.x - CX - c.panX) * f, (-W / 2) * next, (W / 2) * next);
      c.panY = clamp(pt.y - CY - (pt.y - CY - c.panY) * f, (-H / 2) * next, (H / 2) * next);
      c.zoom = next;
      hideHint();
    },
    [toViewBox],
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 640px)");
    let raf = 0;
    let last = performance.now();
    let order: string[] = [];

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const c = cam.current;
      const paused = now - lastInteract.current < PAUSE_MS;

      if (drag.current.id === null) {
        // Inertia, then the idle drift once it has bled off — unless
        // someone has been reading it recently.
        c.yaw += c.vYaw * dt;
        c.pitch += c.vPitch * dt;
        const decay = Math.exp(-dt / 260);
        c.vYaw *= decay;
        c.vPitch *= decay;
        if (Math.abs(c.vYaw) < IDLE_SPIN && !reduced) c.vYaw = 0;
        if (!reduced && !paused && Math.abs(c.vYaw) < 1e-6) c.yaw += IDLE_SPIN * dt;
      }
      c.pitch = clamp(c.pitch, -PITCH_LIMIT, PITCH_LIMIT);

      const cosY = Math.cos(c.yaw);
      const sinY = Math.sin(c.yaw);
      const cosP = Math.cos(c.pitch);
      const sinP = Math.sin(c.pitch);

      // Stars sit on an infinitely distant sphere — orthographic, so they
      // slide against the cloud instead of rushing past it.
      for (let i = 0; i < stars.length; i++) {
        const el = starRefs.current[i];
        if (!el) continue;
        const s = stars[i];
        const x1 = s.u.x * cosY + s.u.z * sinY;
        const z1 = -s.u.x * sinY + s.u.z * cosY;
        const y2 = s.u.y * cosP - z1 * sinP;
        const z2 = s.u.y * sinP + z1 * cosP;
        el.setAttribute("cx", (CX + x1 * STAR_X).toFixed(2));
        el.setAttribute("cy", (CY + y2 * STAR_Y).toFixed(2));
        const depth = 0.45 + 0.55 * (z2 * 0.5 + 0.5);
        const twinkle = s.tw ? 1 + s.tw * Math.sin(now / 900 + s.ph) : 1;
        el.setAttribute("opacity", (s.base * depth * twinkle).toFixed(3));
      }

      if (nebulaRef.current) {
        nebulaRef.current.setAttribute(
          "transform",
          `translate(${(-sinY * 26).toFixed(2)} ${(sinP * 18).toFixed(2)})`,
        );
      }

      const screen = new Map<string, { x: number; y: number; z: number; k: number }>();
      for (const n of nodes) {
        const p = positions.get(n.id);
        if (p) screen.set(n.id, project(p, cosY, sinY, cosP, sinP, c));
      }

      for (let i = 0; i < edges.length; i++) {
        const el = edgeRefs.current[i];
        if (!el) continue;
        const e = edges[i];
        const a = screen.get(e.source);
        const b = screen.get(e.target);
        if (!a || !b) continue;
        el.setAttribute("x1", a.x.toFixed(2));
        el.setAttribute("y1", a.y.toFixed(2));
        el.setAttribute("x2", b.x.toFixed(2));
        el.setAttribute("y2", b.y.toFixed(2));
        const depth = (a.k + b.k) / 2;
        const base = e.onFocus ? 0.72 : 0.3;
        el.setAttribute("opacity", (base * clamp(depth ** 2, 0.35, 1.25)).toFixed(3));
      }

      // Zooming spreads the cloud out a lot faster than it grows the
      // stars, so there is room between them to read.
      const zs = Math.sqrt(c.zoom);
      for (const n of nodes) {
        const el = nodeRefs.current.get(n.id);
        const p = screen.get(n.id);
        if (!el || !p) continue;
        el.setAttribute(
          "transform",
          `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${(p.k * zs).toFixed(3)})`,
        );
        const depth = clamp(p.k ** 1.6, 0.3, 1.3);
        const opacity = n.ring === 0 ? 1 : n.ring === 1 ? 0.95 * depth : 0.62 * depth;
        el.setAttribute("opacity", Math.min(1, opacity).toFixed(3));
      }

      // Labels: as many as fit without colliding. The focus claims its
      // space first, then direct neighbors nearest the glass first, then
      // the second ring — which only competes once the view is zoomed in
      // or a star has swung right up close. A label that would land on
      // one already placed stays hidden until the view turns.
      const placed: [number, number, number, number][] = [];
      const base = phone.matches ? LABEL_SIZE_PHONE : 0;
      const ranked = [...nodes].sort(
        (a, b) => a.ring - b.ring || (screen.get(b.id)?.z ?? 0) - (screen.get(a.id)?.z ?? 0),
      );
      for (const n of ranked) {
        const lab = labelRefs.current.get(n.id);
        const p = screen.get(n.id);
        if (!lab || !p) continue;
        let o = 0;
        if (n.ring < 2 || c.zoom >= 1.35 || p.k > 1.08) {
          const s = p.k * zs;
          const fs = (base || LABEL_SIZE[n.ring]) * s;
          const w = (labels.get(n.id)?.length ?? 0) * fs * 0.62;
          const cy = p.y - (NODE_R[n.ring] + 6) * s - fs * 0.35;
          const box: [number, number, number, number] = [
            p.x - w / 2 - 3,
            cy - fs * 0.6 - 2,
            p.x + w / 2 + 3,
            cy + fs * 0.6 + 2,
          ];
          const onScreen = box[0] > 6 && box[2] < W - 6 && box[1] > 6 && box[3] < H - 6;
          const clear = placed.every(
            (q) => box[2] < q[0] || box[0] > q[2] || box[3] < q[1] || box[1] > q[3],
          );
          if (n.ring === 0 || (onScreen && clear)) {
            placed.push(box);
            o =
              n.ring === 0
                ? 1
                : n.ring === 1
                  ? clamp(0.6 + 0.5 * (p.k - 0.8), 0.45, 1)
                  : clamp(0.45 + 0.6 * (p.k - 0.8), 0.3, 0.85);
          }
        }
        lab.setAttribute("opacity", o.toFixed(3));
      }

      // Painter's order — far nodes behind near ones. Only touch the DOM
      // when the order actually flips.
      const next = [...nodes]
        .sort((a, b) => (screen.get(a.id)?.z ?? 0) - (screen.get(b.id)?.z ?? 0))
        .map((n) => n.id);
      let changed = next.length !== order.length;
      if (!changed) {
        for (let i = 0; i < next.length; i++) {
          if (next[i] !== order[i]) {
            changed = true;
            break;
          }
        }
      }
      if (changed && nodeLayer.current) {
        for (const id of next) {
          const el = stackRefs.current.get(id);
          if (el) nodeLayer.current.appendChild(el);
        }
        order = next;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [nodes, edges, positions, stars, labels]);

  // Wheel and trackpad zoom. Registered by hand because React's wheel
  // listener is passive, and a zoom that also scrolls the page is useless.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (!(e.ctrlKey || fullRef.current || now >= wheelArmedAt.current)) {
        // Still scrolling the page past the panel: let it, and keep the
        // wheel disarmed until the pointer actually rests here.
        wheelArmedAt.current = now + WHEEL_DWELL;
        return;
      }
      e.preventDefault();
      touch();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002)), e.clientX, e.clientY);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [touch, zoomAt]);

  // Fullscreen: the real Fullscreen API where there is one, and a fixed
  // overlay either way, so a phone without it still gets the whole screen.
  useEffect(() => {
    fullRef.current = full;
    if (!full) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    const onChange = () => {
      if (!document.fullscreenElement && nativeFull.current) {
        nativeFull.current = false;
        setFull(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      root.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      nativeFull.current = false;
    };
  }, [full]);

  const toggleFull = () => {
    touch();
    if (full) {
      setFull(false);
      return;
    }
    setFull(true);
    const el = wrapRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen()
        .then(() => {
          nativeFull.current = true;
        })
        .catch(() => {
          /* no Fullscreen API permission — the overlay still covers the page */
        });
    }
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    touch();
    wheelArmedAt.current = 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // Two fingers zoom; they neither orbit nor count as a tap.
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current.id = null;
      drag.current.moved = 99;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, captured: false };
    cam.current.vYaw = 0;
    cam.current.vPitch = 0;
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    touch();
    if (wheelArmedAt.current === Infinity) wheelArmedAt.current = performance.now() + WHEEL_DWELL;
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (pinch.current !== null && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const spread = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current > 0) zoomAt(spread / pinch.current, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current = spread;
      return;
    }
    if (drag.current.id !== e.pointerId) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    // Capture only once this is clearly a drag. Capturing on press
    // retargets the click to the <svg>, which is why a tap on a star
    // used to go nowhere.
    if (!drag.current.captured && drag.current.moved > 4) {
      drag.current.captured = true;
      hideHint();
      // It can throw for a pointer the browser no longer knows about; a
      // lost capture is survivable, a thrown handler is not.
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* no capture — drag still tracks while the pointer is over the panel */
      }
    }
    // Scale by the rendered size so a drag turns the same amount of sky
    // whatever size the panel is laid out at.
    const k = 1 / toViewBox(e.clientX, e.clientY).s;
    const yaw = dx * k * 0.006;
    const pitch = dy * k * 0.005;
    cam.current.yaw += yaw;
    cam.current.pitch += pitch;
    cam.current.vYaw = yaw / 16;
    cam.current.vPitch = pitch / 16;
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (drag.current.id !== e.pointerId) return;
    drag.current.id = null;
    if (drag.current.captured) {
      try {
        svgRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* nothing held it */
      }
    }
  };

  const onPointerLeave = () => {
    if (!fullRef.current) wheelArmedAt.current = Infinity;
  };

  const resetView = () => {
    Object.assign(cam.current, REST);
    touch();
  };

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const step = 0.12;
    if (e.key === "ArrowLeft") cam.current.yaw -= step;
    else if (e.key === "ArrowRight") cam.current.yaw += step;
    else if (e.key === "ArrowUp") cam.current.pitch -= step;
    else if (e.key === "ArrowDown") cam.current.pitch += step;
    else if (e.key === "+" || e.key === "=") zoomAt(1.25);
    else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.25);
    else if (e.key === "0") resetView();
    else return;
    e.preventDefault();
    touch();
    hideHint();
  };

  // A drag that ends on a star must not follow its link; a tap should,
  // and through the router, so it is a page turn rather than a reload.
  const onClickCapture = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drag.current.moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = 0;
      return;
    }
    const link = (e.target as Element).closest?.("a.orbit-link");
    const href = link?.getAttribute("href");
    if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setFull(false);
    router.push(href);
  };

  const cosY = Math.cos(YAW_0);
  const sinY = Math.sin(YAW_0);
  const cosP = Math.cos(PITCH_0);
  const sinP = Math.sin(PITCH_0);
  const initial = new Map(
    nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: 0, y: 0, z: 0 };
      return [n.id, project(p, cosY, sinY, cosP, sinP, REST)];
    }),
  );

  return (
    <div ref={wrapRef} className="neighborhood-tv" data-full={full ? "" : undefined}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: "block",
          height: full ? "100%" : "auto",
          touchAction: full ? "none" : "pan-y",
          cursor: "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        role="img"
        aria-label={label}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={onPointerLeave}
        onDoubleClick={resetView}
        onKeyDown={onKeyDown}
        onClickCapture={onClickCapture}
      >
        <defs>
          <clipPath id="tv-screen-clip">
            <path d={screenPath} />
          </clipPath>
          <radialGradient id="tv-space" cx="50%" cy="46%" r="72%">
            <stop offset="0%" stopColor="#141c2f" />
            <stop offset="55%" stopColor="#080c17" />
            <stop offset="100%" stopColor="#03050b" />
          </radialGradient>
          <radialGradient id="tv-nebula-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3d5b8c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3d5b8c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tv-nebula-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8c4a6b" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#8c4a6b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="tv-vignette" cx="50%" cy="50%" r="62%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="68%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </radialGradient>
          <linearGradient id="tv-glare" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.13" />
            <stop offset="42%" stopColor="#fff" stopOpacity="0.03" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <pattern id="tv-scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="2" fill="#000" opacity="0.5" />
          </pattern>
          <radialGradient id="tv-halo-focus">
            <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </radialGradient>
        </defs>

        <style>{`
          .neighborhood-tv { position: relative; }
          .neighborhood-tv svg { outline: none; }
          /* Fullscreen: the whole viewport, deep space around the glass. */
          .neighborhood-tv[data-full] {
            position: fixed; inset: 0; z-index: 100;
            display: flex; align-items: center; justify-content: center;
            background: #03050b;
          }
          .neighborhood-tv[data-full] svg { width: 100%; height: 100%; }
          /* Keyboard focus is shown by lighting the glass, not by drawing a
             rectangle around a shape that isn't one. */
          .neighborhood-tv svg:focus-visible .orbit-focus-ring { opacity: 0.9; }
          .neighborhood-tv svg:active { cursor: grabbing; }
          .orbit-link { text-decoration: none; cursor: pointer; }
          .orbit-body { transition: transform 140ms ease; transform-box: fill-box; transform-origin: center; }
          .orbit-link:hover .orbit-body,
          .orbit-link:focus-visible .orbit-body { transform: scale(1.45); }
          .orbit-link:hover .orbit-label,
          .orbit-link:focus-visible .orbit-label { opacity: 1 !important; fill: #FFFFFF !important; }
          .orbit-label { paint-order: stroke; stroke: #04060c; stroke-width: 3px; stroke-linejoin: round; pointer-events: none; }
          .orbit-scanlines { animation: orbit-scan 5s linear infinite; }
          .orbit-hint { transition: opacity 400ms ease; }
          .orbit-full {
            position: absolute; top: 7%; right: 4.5%;
            display: grid; place-items: center; width: 30px; height: 30px;
            border-radius: 999px; border: 1px solid rgba(255,255,255,0.18);
            background: rgba(8,12,23,0.62); color: #C6CEDD;
            transition: color 160ms ease, border-color 160ms ease;
          }
          .orbit-full:hover, .orbit-full:focus-visible { color: #fff; border-color: rgba(255,255,255,0.45); }
          .neighborhood-tv[data-full] .orbit-full { top: 16px; right: 16px; }
          /* The panel scales down with the column, so type set in user
             units gets tiny on a phone. Bump it back up — a CSS
             font-size beats the presentation attribute. */
          @media (max-width: 640px) {
            .orbit-label { font-size: ${LABEL_SIZE_PHONE}px; }
            .orbit-caption { font-size: 13px; }
          }
          @keyframes orbit-scan { from { transform: translateY(0); } to { transform: translateY(4px); } }
          @media (prefers-reduced-motion: reduce) { .orbit-scanlines { animation: none; } }
        `}</style>

        <g clipPath="url(#tv-screen-clip)">
          <rect x="0" y="0" width={W} height={H} fill="url(#tv-space)" />

          <g ref={nebulaRef}>
            <ellipse cx={CX - 130} cy={CY - 40} rx="230" ry="150" fill="url(#tv-nebula-a)" />
            <ellipse cx={CX + 170} cy={CY + 70} rx="210" ry="130" fill="url(#tv-nebula-b)" />
          </g>

          <g aria-hidden>
            {stars.map((s, i) => (
              <circle
                key={i}
                ref={(el) => {
                  starRefs.current[i] = el;
                }}
                cx={CX + s.u.x * STAR_X}
                cy={CY + s.u.y * STAR_Y}
                r={s.r}
                fill="#E8EEFF"
                opacity={s.base}
              />
            ))}
          </g>

          {/* Edges */}
          <g>
            {edges.map((e, i) => {
              const a = initial.get(e.source);
              const b = initial.get(e.target);
              return (
                <line
                  key={i}
                  ref={(el) => {
                    edgeRefs.current[i] = el;
                  }}
                  x1={a?.x ?? CX}
                  y1={a?.y ?? CY}
                  x2={b?.x ?? CX}
                  y2={b?.y ?? CY}
                  stroke={e.onFocus ? "#FF6B35" : "#7C88A6"}
                  strokeWidth={e.onFocus ? 1.2 : 0.6}
                  strokeDasharray={dashFor[e.kind]}
                  opacity={e.onFocus ? 0.7 : 0.3}
                />
              );
            })}
          </g>

          {/* Nodes — the RAF loop re-stacks these by depth. */}
          <g ref={nodeLayer}>
            {nodes.map((n) => {
              const p = initial.get(n.id);
              const r = NODE_R[n.ring];
              const body = (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) {
                      nodeRefs.current.set(n.id, el);
                      if (n.ring === 0) stackRefs.current.set(n.id, el);
                    } else {
                      nodeRefs.current.delete(n.id);
                    }
                  }}
                  transform={`translate(${(p?.x ?? CX).toFixed(2)} ${(p?.y ?? CY).toFixed(2)}) scale(${(p?.k ?? 1).toFixed(3)})`}
                  opacity={n.ring === 0 ? 1 : n.ring === 1 ? 0.95 : 0.62}
                >
                  {n.ring === 0 ? (
                    <g className="orbit-body">
                      <circle r={r * 3.4} fill="url(#tv-halo-focus)" />
                      <circle r={r} fill={laneColor[n.lane]} stroke="#FF6B35" strokeWidth={2} />
                    </g>
                  ) : (
                    <>
                      {/* A fingertip-sized target: the stars themselves
                          are a few pixels across. */}
                      <circle r={Math.max(12, r * 2.4)} fill="#000" fillOpacity={0} />
                      <g className="orbit-body">
                        <title>{n.title}</title>
                        <circle r={r} fill={laneColor[n.lane]} />
                      </g>
                    </>
                  )}
                  <text
                    ref={(el) => {
                      if (el) labelRefs.current.set(n.id, el);
                      else labelRefs.current.delete(n.id);
                    }}
                    className="orbit-label"
                    y={n.ring === 0 ? -r - 11 : -r - 6}
                    textAnchor="middle"
                    fontSize={LABEL_SIZE[n.ring]}
                    fontFamily="var(--font-mono)"
                    fill={n.ring === 0 ? "#F4F1EB" : n.ring === 1 ? "#C6CEDD" : "#98A2B6"}
                    opacity={n.ring === 0 ? 1 : 0}
                  >
                    {labels.get(n.id)}
                  </text>
                </g>
              );
              return n.ring === 0 ? (
                body
              ) : (
                <a
                  key={n.id}
                  href={n.href}
                  className="orbit-link"
                  ref={(el) => {
                    if (el) stackRefs.current.set(n.id, el);
                    else stackRefs.current.delete(n.id);
                  }}
                >
                  {body}
                </a>
              );
            })}
          </g>

          {/* Glass: scanlines, vignette, a smear of reflection. */}
          <rect
            className="orbit-scanlines"
            x="0"
            y="-4"
            width={W}
            height={H + 8}
            fill="url(#tv-scanlines)"
            opacity="0.16"
            pointerEvents="none"
          />
          <rect x="0" y="0" width={W} height={H} fill="url(#tv-vignette)" pointerEvents="none" />
          <path
            d={`M ${CX - SA} ${CY - SB} L ${CX + 40} ${CY - SB} L ${CX - SA} ${CY + 90} Z`}
            fill="url(#tv-glare)"
            pointerEvents="none"
          />

          <path
            className="orbit-focus-ring"
            d={screenPath}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            opacity="0"
            pointerEvents="none"
          />

          <text
            ref={hintRef}
            className="orbit-hint orbit-caption"
            x={CX}
            y={CY + SB - 42}
            textAnchor="middle"
            fontSize="8"
            fontFamily="var(--font-mono)"
            letterSpacing="0.18em"
            fill="#8A97AE"
            pointerEvents="none"
          >
            DRAG TO ORBIT · SCROLL OR PINCH TO ZOOM
          </text>
        </g>
      </svg>

      <button
        type="button"
        className="orbit-full"
        onClick={toggleFull}
        aria-label={full ? "Exit full screen" : "Full screen"}
        aria-pressed={full}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {full ? (
            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
          ) : (
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          )}
        </svg>
      </button>
    </div>
  );
}
