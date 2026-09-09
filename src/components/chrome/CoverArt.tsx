import type { Lane, Node } from "@/lib/graph-types";
import { bakedCover } from "@/lib/cover-art";

/**
 * The cover of a paper or reading — the 2:3 rectangle itself, without
 * the link or the caption around it.
 *
 * It started life inside the home page's cover shelf and is now shared
 * with the `/papers` and `/readings` indexes, so a work looks like the
 * same object wherever it turns up. Anything that positions it (width,
 * link, label) belongs to the caller; this owns the art.
 *
 * Covers are first-page PNG exports from the PDFs. To add one, download
 * the PDF to /tmp and run:
 * `pdftoppm -png -f 1 -singlefile -r 160 /tmp/<slug>.pdf public/assets/img/{readings|papers}/<slug>`,
 * then point `hero.src` at `/assets/img/{readings|papers}/<slug>.png`.
 * Until that exists the typographic fallback below stands in, so a
 * missing cover is a plain-looking entry rather than a hole in the row.
 *
 * What actually gets served is the baked plate from
 * `scripts/generate-thumbnails.ts` — the same crop at the size the plate
 * renders, rather than the full-page export. The original is the
 * fallback for anything the compositor couldn't read.
 */

const laneBg: Record<Lane, string> = {
  research: "bg-[var(--color-lane-research)]",
  building: "bg-[var(--color-lane-building)]",
  writing: "bg-[var(--color-lane-writing)]",
  personal: "bg-[var(--color-lane-personal)]",
};

export function CoverArt({
  node,
  variant,
  className,
  size = "shelf",
}: {
  node: Node;
  variant: "reading" | "paper";
  className?: string;
  /**
   * The tier badge is absolutely positioned, so it does not shrink with
   * the cover. At the shelf's 112-128px it reads as a chip; at the
   * index's 80-96px the same chip covers a quarter of the art. "compact"
   * is the same badge tuned for the smaller plate.
   */
  size?: "shelf" | "compact";
}) {
  const compact = size === "compact";
  const baked = bakedCover(node.id);
  return (
    <div
      className={[
        "relative aspect-[2/3] overflow-hidden rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] shadow-sm",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {node.hero ? (
        <img
          src={baked?.src ?? node.hero.src}
          {...(baked
            ? { srcSet: `${baked.src} 1x, ${baked.src2x} 2x`, width: baked.w, height: baked.h }
            : {})}
          alt={node.hero.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(145deg,var(--color-bg-1),var(--color-bg-0)_46%,var(--color-bg-2))] p-3">
          <div className="font-[family-name:var(--font-mono)] text-[9px] tracking-wider text-[var(--color-ink-mute)] uppercase">
            {variant === "paper" ? "note" : (node.workType ?? "reading")}
          </div>
          <div className="text-sm leading-tight text-[var(--color-ink)]">{node.title}</div>
          <div className={`h-1 w-8 rounded-full ${laneBg[node.lane]}`} aria-hidden />
        </div>
      )}
      {node.tier && (
        <div
          className={
            compact
              ? "absolute top-1 right-1 rounded-full bg-[var(--color-bg-0)]/85 px-1.5 font-[family-name:var(--font-mono)] text-[8px] leading-[1.4] font-semibold text-[var(--color-ink)] shadow-[var(--ring-soft)]"
              : "absolute top-2 right-2 rounded-full bg-[var(--color-bg-0)]/90 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-semibold text-[var(--color-ink)] shadow-[var(--ring-soft)]"
          }
        >
          {node.tier}
        </div>
      )}
    </div>
  );
}
