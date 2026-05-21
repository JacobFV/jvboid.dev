"use client";

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import imageManifest from "../../../public/_generated/image-manifest.json";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const manifest = imageManifest as Record<string, string | undefined>;

function lowResFor(src: unknown): string | undefined {
  return typeof src === "string" ? manifest[src.split(/[?#]/, 1)[0]] : undefined;
}

function scheduleFullLoad(cb: () => void) {
  const win = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (win.requestIdleCallback) {
    const id = win.requestIdleCallback(cb, { timeout: 1200 });
    return () => win.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 120);
  return () => window.clearTimeout(id);
}

export function ProgressiveImage({
  src,
  loading = "lazy",
  decoding = "async",
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const fullSrc = typeof src === "string" ? src : undefined;
  const lowSrc = useMemo(() => lowResFor(fullSrc), [fullSrc]);
  const initialSrc = lowSrc ?? TRANSPARENT_PIXEL;
  const [displaySrc, setDisplaySrc] = useState(initialSrc);

  useEffect(() => {
    setDisplaySrc(initialSrc);
    if (!fullSrc) return;
    return scheduleFullLoad(() => setDisplaySrc(fullSrc));
  }, [fullSrc, initialSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={displaySrc}
      data-full-src={fullSrc}
      data-low-src={lowSrc}
      loading={loading}
      decoding={decoding}
    />
  );
}
