"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  closeLightbox,
  getServerSnapshot,
  getSnapshot,
  setLightboxIndex,
  subscribe,
  type LightboxItem,
} from "./lightbox-store";

const MIN_SCALE = 1;
const MAX_SCALE = 6;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const deg = (a: Pt, b: Pt) =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

type Pt = { x: number; y: number };
type Transform = { scale: number; rotation: number; x: number; y: number };

type Gesture = {
  mode: "pinch" | "pan" | "swipe";
  onImage: boolean;
  start: Transform;
  startDist: number;
  startAngle: number;
  startMid: Pt;
  startPointer: Pt;
};

const IDENTITY: Transform = { scale: 1, rotation: 0, x: 0, y: 0 };

// Mount once (in the root layout). Renders nothing until a reader image
// is clicked, so it costs nothing on pages without images.
export function Lightbox() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (!state) return null;
  return <LightboxView items={state.items} index={state.index} />;
}

function LightboxView({
  items,
  index,
}: {
  items: LightboxItem[];
  index: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Live transform + gesture bookkeeping live in refs: pinch/pan/zoom
  // write straight to the DOM each frame, so dragging never re-renders.
  const t = useRef<Transform>({ ...IDENTITY });
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture | null>(null);
  const downOnImage = useRef(false);
  const wheelSnap = useRef<number | undefined>(undefined);

  const [zoomed, setZoomed] = useState(false);

  const current = items[index];
  const multi = items.length > 1;

  const apply = useCallback((animate: boolean) => {
    const el = imgRef.current;
    if (!el) return;
    const { scale, rotation, x, y } = t.current;
    el.style.transition = animate
      ? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
  }, []);

  const resetTransform = useCallback(
    (animate: boolean) => {
      t.current = { ...IDENTITY };
      apply(animate);
      setZoomed(false);
      const bd = backdropRef.current;
      if (bd) {
        bd.style.transition = "opacity 0.2s ease";
        bd.style.opacity = "1";
      }
    },
    [apply],
  );

  // New image → start clean.
  useLayoutEffect(() => {
    resetTransform(false);
  }, [index, resetTransform]);

  const go = useCallback(
    (dir: number) => {
      if (multi) setLightboxIndex(index + dir);
    },
    [index, multi],
  );

  // Keyboard control + scroll lock for the lifetime of the viewer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go]);

  // Snap to whichever finger config is now active, capturing the live
  // transform as the new baseline. Called on every pointer up/down so a
  // 2→1 finger transition re-bases cleanly into a pan.
  const beginGesture = useCallback(() => {
    const pts = [...pointers.current.values()];
    const start = { ...t.current };
    if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        mode: "pinch",
        onImage: downOnImage.current,
        start,
        startDist: dist(a, b),
        startAngle: deg(a, b),
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        startPointer: { x: 0, y: 0 },
      };
    } else if (pts.length === 1) {
      gesture.current = {
        mode: start.scale > 1.01 ? "pan" : "swipe",
        onImage: downOnImage.current,
        start,
        startDist: 0,
        startAngle: 0,
        startMid: { x: 0, y: 0 },
        startPointer: pts[0],
      };
    } else {
      gesture.current = null;
    }
  }, []);

  const updateGesture = useCallback(() => {
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];

    if (g.mode === "pinch" && pts.length >= 2) {
      const [a, b] = pts;
      const ratio = g.startDist > 0 ? dist(a, b) / g.startDist : 1;
      const scale = clamp(g.start.scale * ratio, MIN_SCALE * 0.6, MAX_SCALE);
      const eff = scale / g.start.scale;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      t.current = {
        scale,
        rotation: g.start.rotation + (deg(a, b) - g.startAngle),
        x: mid.x - eff * (g.startMid.x - g.start.x),
        y: mid.y - eff * (g.startMid.y - g.start.y),
      };
      apply(false);
    } else if (g.mode === "pan" && pts.length >= 1) {
      t.current.x = g.start.x + (pts[0].x - g.startPointer.x);
      t.current.y = g.start.y + (pts[0].y - g.startPointer.y);
      apply(false);
    } else if (g.mode === "swipe" && pts.length >= 1) {
      const dx = pts[0].x - g.startPointer.x;
      const dy = pts[0].y - g.startPointer.y;
      t.current = {
        scale: g.start.scale,
        rotation: g.start.rotation + dx * 0.02,
        x: g.start.x + dx,
        y: g.start.y + dy,
      };
      apply(false);
      const bd = backdropRef.current;
      if (bd) {
        bd.style.transition = "none";
        bd.style.opacity = String(clamp(1 - Math.abs(dy) / 600, 0.25, 1));
      }
    }
  }, [apply]);

  const endGesture = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;

    if (g.mode === "swipe") {
      const dx = t.current.x - g.start.x;
      const dy = t.current.y - g.start.y;
      // A near-still tap on the dark surround dismisses the viewer.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        if (!g.onImage) closeLightbox();
        else resetTransform(true);
        return;
      }
      if (Math.abs(dy) > 110 && Math.abs(dy) > Math.abs(dx)) {
        closeLightbox();
        return;
      }
      if (Math.abs(dx) > 80 && multi) {
        go(dx < 0 ? 1 : -1);
        return;
      }
      resetTransform(true);
      return;
    }

    // pinch / pan release: rotation springs back, scale settles, an
    // over-shrunk image snaps back to fit.
    let { scale, x, y } = t.current;
    if (scale < 1.05) {
      t.current = { ...IDENTITY };
    } else {
      scale = clamp(scale, MIN_SCALE, MAX_SCALE);
      const bx = (window.innerWidth * scale) / 2;
      const by = (window.innerHeight * scale) / 2;
      t.current = {
        scale,
        rotation: 0,
        x: clamp(x, -bx, bx),
        y: clamp(y, -by, by),
      };
    }
    apply(true);
    setZoomed(t.current.scale > 1.01);
  }, [apply, go, multi, resetTransform]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    downOnImage.current = !!imgRef.current?.contains(e.target as Node);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    beginGesture();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    updateGesture();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size === 0) endGesture();
    else beginGesture();
  };

  // Wheel-zoom anchored on the cursor. Bound natively (non-passive) so
  // preventDefault actually stops the page from scrolling underneath.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cur = t.current;
      const scale = clamp(
        cur.scale * Math.exp(-e.deltaY * 0.0015),
        MIN_SCALE * 0.8,
        MAX_SCALE,
      );
      const eff = scale / cur.scale;
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      t.current = {
        scale,
        rotation: cur.rotation,
        x: cx - eff * (cx - cur.x),
        y: cy - eff * (cy - cur.y),
      };
      apply(false);
      window.clearTimeout(wheelSnap.current);
      wheelSnap.current = window.setTimeout(() => {
        if (t.current.scale < 1.05) t.current = { ...IDENTITY };
        else t.current.scale = clamp(t.current.scale, MIN_SCALE, MAX_SCALE);
        apply(true);
        setZoomed(t.current.scale > 1.01);
      }, 220);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [apply]);

  const onDoubleClick = (e: React.MouseEvent) => {
    if (t.current.scale > 1.01) {
      resetTransform(true);
      return;
    }
    const s = 2.5;
    const cx = e.clientX - window.innerWidth / 2;
    const cy = e.clientY - window.innerHeight / 2;
    t.current = { scale: s, rotation: 0, x: cx * (1 - s), y: cy * (1 - s) };
    apply(true);
    setZoomed(true);
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={current?.alt || "Image viewer"}
    >
      <button
        type="button"
        className="lightbox-btn lightbox-close"
        aria-label="Close"
        onClick={closeLightbox}
      >
        <X size={20} aria-hidden />
      </button>

      {multi && (
        <>
          <button
            type="button"
            className="lightbox-btn lightbox-prev"
            aria-label="Previous image"
            onClick={() => go(-1)}
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
          <button
            type="button"
            className="lightbox-btn lightbox-next"
            aria-label="Next image"
            onClick={() => go(1)}
          >
            <ChevronRight size={24} aria-hidden />
          </button>
          <div className="lightbox-counter">
            {index + 1} / {items.length}
          </div>
        </>
      )}

      <div
        ref={stageRef}
        className="lightbox-stage"
        data-zoomed={zoomed || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        {/* A real <img>: right-click "Save image as…" still works here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={current?.src}
          alt={current?.alt || ""}
          title={current?.alt || undefined}
          draggable={false}
          className="lightbox-img"
        />
      </div>

      {current?.alt && <div className="lightbox-caption">{current.alt}</div>}
    </div>,
    document.body,
  );
}
