import type { CSSProperties, ReactNode } from "react";

// Gallery container for a run of consecutive content images (grouped by
// remark-image-grid). Lays them out as uniform tiles — 2 or 3 across —
// instead of a tall vertical stack. Each tile is a ReaderImage, so a
// click still opens the fullscreen Lightbox at full resolution.
//
// Column rule: 2 images → 2-up, 4 → a tidy 2×2, everything else → 3-up.
export function ImageGrid({
  count,
  children,
}: {
  count?: string | number;
  children: ReactNode;
}) {
  const n = Number(count) || 0;
  const cols = n === 2 ? 2 : n === 4 ? 2 : 3;
  return (
    <div
      className="reader-image-grid"
      data-count={n}
      style={{ "--reader-grid-cols": cols } as CSSProperties}
    >
      {children}
    </div>
  );
}
