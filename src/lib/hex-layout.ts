// Honeycomb packing for mixed-size hexagons.
//
// The projects grid is a honeycomb of pointy-top hexagons that may come
// in a few sizes (0.5×, 1×, 2×). A flexbox row-per-row layout can only
// express the uniform case, so placement happens here instead: every
// hexagon is positioned absolutely on a shared lattice, and the packer
// walks that lattice in reading order looking for the first spot where
// the hexagon does not touch anything already placed.
//
// ---- The lattice ------------------------------------------------------
// The unit of the grid is the *smallest* hexagon (0.5×), so every allowed
// size lands on a lattice point: a hex lattice is closed under scaling by
// 2 about a cell center, which is exactly the 0.5 → 1 → 2 progression.
// Positions use odd-r offset coordinates — row `r` steps down by
// `HEX_ROW_STEP * pitch`, and odd rows are inset half a pitch, which is
// what interlocks the rows.
//
// Sizes are measured in *pitch*, not in hexagon width: a hexagon of size
// s spans `2s` lattice steps minus one gap. So a 2× hexagon is exactly as
// wide as two 1× hexagons plus the gap between them, and the gap between
// neighbors stays constant regardless of the sizes involved. The vertical
// step is likewise a fraction of the pitch rather than of the height, so
// the gap survives in the diagonal directions too.
//
// ---- Overlap ----------------------------------------------------------
// Cell occupancy would be wrong here: a 1× hexagon covers four lattice
// cells but *overlaps* seven, so two legitimately-adjacent 1× hexagons
// both reach into the same in-between cells. The test is therefore
// geometric. Two hexagons of the same orientation are convex polygons
// with parallel edges, so the separating-axis theorem needs only the
// three distinct edge normals; along each, the projected half-extent of a
// hexagon is its apothem (half its width).

// Pointy-top hexagon: height / width.
export const HEX_RATIO = 2 / Math.sqrt(3);
// Vertical distance between adjacent rows, in pitch units (= 0.75 * HEX_RATIO).
export const HEX_ROW_STEP = 0.8660254;

// Multiples of the base hexagon. Widths are in pitch units, so these are
// the sizes that keep every hexagon on the shared lattice.
export type HexSize = 0.5 | 1 | 2;

export type HexCell<T> = {
  item: T;
  size: HexSize;
  // Bounding box of the hexagon, relative to the container's top-left.
  left: number;
  top: number;
  width: number;
  height: number;
};

export type HexLayout<T> = {
  cells: HexCell<T>[];
  // Container height needed to hold every hexagon.
  height: number;
};

// The three edge normals of a pointy-top hexagon (0°, 60°, 120°).
const AXES = [
  { x: 1, y: 0 },
  { x: 0.5, y: Math.sqrt(3) / 2 },
  { x: -0.5, y: Math.sqrt(3) / 2 },
];

// Slack so hexagons that are exactly tangent read as "not overlapping"
// and so sub-pixel drift in the lattice arithmetic can't reject a spot.
const EPS = 0.01;

type Disc = { cx: number; cy: number; apothem: number };

function overlaps(a: Disc, b: Disc): boolean {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  const reach = a.apothem + b.apothem - EPS;
  return AXES.every((n) => Math.abs(dx * n.x + dy * n.y) < reach);
}

export function packHoneycomb<T>({
  items,
  sizeOf,
  containerWidth,
  unitWidth,
  gap,
}: {
  items: T[];
  // Size of each item, in multiples of the 1× hexagon.
  sizeOf: (item: T) => HexSize;
  containerWidth: number;
  // Width of a 1× hexagon.
  unitWidth: number;
  // Margin between the flat sides of two neighboring hexagons.
  gap: number;
}): HexLayout<T> {
  // Lattice step = the pitch of the smallest (0.5×) hexagon, i.e. half
  // the 1× pitch.
  const pitch = (unitWidth + gap) / 2;
  const rowStep = HEX_ROW_STEP * pitch;
  // Lattice origin, placed so the 1× hexagon at (row 0, col 0) sits flush
  // against the container's top-left corner.
  const originX = unitWidth / 2;
  const originY = (unitWidth * HEX_RATIO) / 2;
  const widthOf = (size: HexSize) => 2 * size * pitch - gap;

  // Every hexagon spans at most 4 rows, so a row per item plus slack is
  // more than any reachable layout needs; it only exists so a hexagon
  // that cannot fit at all can't spin the scan forever.
  const rowLimit = 4 * items.length + 8;

  const placed: Disc[] = [];
  const cells: HexCell<T>[] = [];
  let height = 0;
  let lastRow = 0;

  for (const item of items) {
    const size = sizeOf(item);
    const width = widthOf(size);
    const cellHeight = width * HEX_RATIO;
    const apothem = width / 2;

    // First fit, scanning from the very top every time: a small hexagon
    // can drop into a hole left above by its larger neighbors.
    let spot: Disc | null = null;
    let spotRow = 0;
    for (let row = 0; row <= rowLimit && !spot; row++) {
      const cy = originY + row * rowStep;
      // Would hang off the top of the container.
      if (cy - cellHeight / 2 < -EPS) continue;
      const rowShift = row % 2 === 1 ? pitch / 2 : 0;
      for (let col = 0; ; col++) {
        const cx = originX + rowShift + col * pitch;
        if (cx + apothem > containerWidth + EPS) break;
        // Hangs off the left edge — a wide hexagon needs a few columns
        // of run-up before its bounding box clears the container.
        if (cx - apothem < -EPS) continue;
        const candidate = { cx, cy, apothem };
        if (placed.some((other) => overlaps(candidate, other))) continue;
        spot = candidate;
        spotRow = row;
        break;
      }
    }

    if (!spot) {
      // Only reachable when the hexagon is wider than the container.
      // Park it below everything else rather than dropping the item.
      spotRow = lastRow + 4;
      spot = {
        cx: Math.max(originX, apothem),
        cy: originY + spotRow * rowStep + Math.max(0, cellHeight - unitWidth * HEX_RATIO) / 2,
        apothem,
      };
    }

    placed.push(spot);
    lastRow = Math.max(lastRow, spotRow);
    const top = spot.cy - cellHeight / 2;
    cells.push({
      item,
      size,
      left: spot.cx - width / 2,
      top,
      width,
      height: cellHeight,
    });
    height = Math.max(height, top + cellHeight);
  }

  return { cells, height };
}
