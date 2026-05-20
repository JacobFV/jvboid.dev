"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Panel } from "./VisionRoomScene";

const Scene = dynamic(
  () => import("./VisionRoomScene").then((m) => m.VisionRoomScene),
  { ssr: false, loading: () => null },
);

function detectWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function VisionRoom({
  panels,
  onSkip,
}: {
  panels: Panel[];
  onSkip: () => void;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSupported(detectWebGL());
  }, []);

  // Reduced-motion users get the text immediately — the scene is
  // pure-motion content.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onSkip();
    }
  }, [onSkip]);

  if (supported === false) {
    onSkip();
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        background: "#08090B",
      }}
    >
      {supported && <Scene panels={panels} />}

      <button
        onClick={onSkip}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          background: "rgba(14, 16, 20, 0.85)",
          border: "1px solid var(--color-bg-2)",
          color: "var(--color-ink)",
          padding: "6px 10px",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        skip to text
      </button>

      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-ink-mute)",
          pointerEvents: "none",
        }}
      >
        scroll to walk through
      </div>
    </div>
  );
}
