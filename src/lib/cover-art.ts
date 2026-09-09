// Baked paper/reading covers.
//
// A cover is a first-page PDF export — 1000×1500-ish, a few hundred
// kilobytes each — drawn into a plate 112px wide. Thirteen of them
// hanging off the home page's shelves came to 5.4 MB, more than the
// whole honeycomb above them. `scripts/generate-thumbnails.ts` resizes
// each one to the size the plate actually is; this is how `CoverArt`
// finds the result.
//
// Two of the readings point their jacket at openlibrary.org. Those are
// fetched at build time and baked like the rest, so the shelf renders
// from `public/` and doesn't go dark when a third party does.

import covers from "../../public/_generated/covers.json";

export type CoverArtSrc = {
  src: string;
  /** Same plate at twice the density, for `srcset`. */
  src2x: string;
  w: number;
  h: number;
};

const bakedById = covers as Record<string, CoverArtSrc>;

/** The baked plate for a node, or null if it has none to fall back from. */
export function bakedCover(id: string): CoverArtSrc | null {
  return bakedById[id] ?? null;
}
