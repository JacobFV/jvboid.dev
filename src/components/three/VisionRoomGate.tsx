"use client";

import { useState, type ReactNode } from "react";
import { VisionRoom } from "./VisionRoom";
import type { Panel } from "./VisionRoomScene";

// Mounts the 3D room by default; when the user clicks "skip to text" (or
// WebGL is unavailable, or prefers-reduced-motion is set) renders the
// server-prepared MDX article instead.
export function VisionRoomGate({
  panels,
  children,
}: {
  panels: Panel[];
  children: ReactNode;
}) {
  const [skipped, setSkipped] = useState(false);
  if (skipped) return <>{children}</>;
  return (
    <>
      {/* Server-rendered article kept in the DOM as fallback content for
          search engines and no-JS visitors. */}
      <noscript>{children}</noscript>
      <VisionRoom panels={panels} onSkip={() => setSkipped(true)} />
    </>
  );
}
