// Honeycomb packing for mixed-size hexagons.
//
// The projects grid is a honeycomb of flat-top hexagons in a few sizes
// (0.5× through 4×) — flat edges top and bottom, a vertex out each side,
// so the diagonals run down the sides. This is a 2D rigid-body packing
// problem, not a grid problem. Hexagons of different sizes share no lattice that keeps them
// all tangent — a 2× hexagon pinned to the 1× comb overlaps a whole
// seven-cell flower to deliver four cells of area — so every tile is
// instead dropped to the lowest position where it touches nothing
// (bottom-left fill). The geometry below makes that search exact.
//
// ---- No-fit polygons --------------------------------------------------
// Two hexagons of the same orientation overlap exactly when the center of
// one lies inside a hexagon of apothem `a + b` centered on the other: the
// Minkowski sum of two same-orientation regular hexagons is another
// regular hexagon, with the apothems added. So the forbidden region for a
// tile's center is a *union of hexagons*, bounded by lines running in only
// three directions.
//
// ---- Exact bottom-left fill -------------------------------------------
// The lowest feasible center is therefore a point where two constraints
// are active at once: an intersection of two no-fit-polygon edges, a
// corner of one, an edge meeting a container wall, or a container corner.
// That is a finite candidate set, so the search is exact — there is no
// scan resolution to tune, and tiles land flush against their neighbors at
// any size, including sizes that share no common lattice.
//
// Uniform input still produces the textbook comb: equal hexagons dropped
// bottom-left-first reproduce the interlocking columns exactly — each new
// column costs three quarters of a tile, not a whole one, because a
// flat-top comb's columns mesh half a row into each other.
//
// ---- Where the empty space actually comes from ------------------------
// Same-size hexagons tile perfectly, so all the wasted space lives on the
// boundary *between* sizes. Grouping tiles by size shortens that boundary;
// scattering big tiles through the order lengthens it. Order, not the
// packer, is what governs how dense the grid looks — placing the big tiles
// consecutively lets them pack into their own sub-comb and measurably
// tightens the whole grid.

// Flat-top hexagon: height / width. Its apothem — the half-distance
// between the two parallel edges, and the radius every collision test
// below is written in — is half its *height*.
export const HEX_RATIO = Math.sqrt(3) / 2;
// CSS clip for a flat-top hexagon filling its box. Every hexagon on the
// site cuts its corners with this one string, so a project tile, a list
// icon and the landing hero are all provably the same shape.
export const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
// sin(60°) — x component of the two off-axis edge normals.
const SIN60 = Math.sqrt(3) / 2;
// Circumradius / apothem. Two hexagons farther apart than the sum of their
// circumradii cannot share a contact point, which prunes the candidate
// search from O(n²) pairs to near neighbors.
const CIRCUM = 2 / Math.sqrt(3);

// Multiples of the base hexagon. A size-s hexagon is exactly as wide as s
// 1× hexagons plus the gaps between them, so sizes compose visually even
// though they never share a lattice.
export type HexSize = 0.5 | 1 | 2 | 3 | 4;

// Ascending, so a tile too wide for its container can step down the list.
export const HEX_SIZES: readonly HexSize[] = [0.5, 1, 2, 3, 4];

// A size-s hexagon spans s unit tiles plus the s−1 gaps between them, which
// is what makes the sizes compose visually even though they never share a
// lattice.
export function hexWidth(size: number, unitWidth: number, gap: number): number {
  return size * (unitWidth + gap) - gap;
}

// The inverse: the 1× tile implied by a size-`size` hexagon of known width.
// Lets a composition start from the *outer* hexagon — the landing hero is a
// 4× of fixed width — and derive the sizes that nest inside it.
export function hexUnitWidth(size: number, width: number, gap: number): number {
  return (width + gap) / size - gap;
}

// Flat-top columns interlock: neighboring columns sit half a row apart, so
// the horizontal pitch between them is three quarters of a tile plus the
// gap measured along the shared diagonal. These two are inverses — how
// wide a tile has to be for `cols` of them to span the container, and how
// many columns of a target width the container holds.
export function hexWidthForColumns(containerWidth: number, cols: number, gap: number): number {
  return (containerWidth - (cols - 1) * SIN60 * gap) / (1 + 0.75 * (cols - 1));
}

export function hexColumnsFor(containerWidth: number, targetWidth: number, gap: number): number {
  return 1 + Math.round((containerWidth - targetWidth) / (0.75 * targetWidth + SIN60 * gap));
}

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

// Slack so hexagons that are exactly tangent read as "not overlapping",
// and so sub-pixel drift can't reject an otherwise valid spot.
const EPS = 0.01;
// Positions here are constructed, not measured, so ties are exact to well
// within this; it only decides which of two coincident spots wins.
const TOL = 1e-6;

// Distance between two same-orientation hexagon centers measured in the
// hexagon's own metric — the largest of the three edge-normal projections.
// Two hexagons of apothem a and b touch exactly when this equals a + b, so
// `hexSeparation(dx, dy) - (a + b)` is the literal gap between their flat
// sides. Euclidean distance answers neither question. Flat-top, so the
// three normals are (0, ±1) and (±sin 60°, ±½): straight up is a flat
// edge, straight out to the side is a vertex.
export function hexSeparation(dx: number, dy: number): number {
  return Math.max(Math.abs(dy), Math.abs(dy * 0.5 + dx * SIN60), Math.abs(dy * 0.5 - dx * SIN60));
}

// The shortest move that puts a hexagon back outside another one, given
// the offset between their centers and the separation they owe each other
// (the two apothems plus whatever margin). Null when they already clear.
//
// The metric is a max over three normal projections, so exactly one of
// them is binding, and moving along that normal raises it one-for-one:
// the push is the shortfall itself, along a single edge normal. That is
// also why it reads as a contact rather than a repulsion — a hexagon
// resting on a flat side slides along it instead of being shoved off
// diagonally.
export function hexPushOut(
  dx: number,
  dy: number,
  needed: number,
): { x: number; y: number } | null {
  const projections: [number, number, number][] = [
    [dy, 0, 1],
    [dy * 0.5 + dx * SIN60, SIN60, 0.5],
    [dy * 0.5 - dx * SIN60, -SIN60, 0.5],
  ];
  let binding = projections[0];
  for (const p of projections) if (Math.abs(p[0]) > Math.abs(binding[0])) binding = p;
  const depth = needed - Math.abs(binding[0]);
  if (depth <= EPS) return null;
  // Out along the binding normal, on the side the hexagon is already on.
  const away = binding[0] < 0 ? -depth : depth;
  return { x: binding[1] * away, y: binding[2] * away };
}

type Placed = { cx: number; cy: number; ra: number };

// A y that clears everything placed outright, whichever x we end up at.
// Flat edges face up and down, so the first normal alone answers it: the
// separation is at least |dy| for any dx, and a + b of it is enough.
function clearOf(placed: Placed[], ra: number, halfHeight: number): number {
  let y = halfHeight;
  for (const q of placed) y = Math.max(y, q.cy + q.ra + ra);
  return y;
}

// Where a hexagon of collision apothem `ra` comes to rest: the highest
// position that clears everything placed and stays inside the container —
// but, among positions no more than half a row deeper than that, the one
// sharing the most *full edges* with its neighbors.
//
// That second clause is what a flat-top comb needs and a pointy-top one
// does not. Pointy-top hexagons side by side in a row meet flat side to
// flat side, so filling the highest row first is already the dense
// packing. Flat-top hexagons in a row meet at their side vertices: legal,
// a point of contact, and it strands a diamond of dead space at every
// junction. The dense arrangement instead drops every other column half a
// row, which no rule that simply minimizes y will ever choose — the
// stranded row always holds more tiles. Ranking by edge contact inside a
// half-row window picks the interlocked position without ever preferring
// a hole further down the page.
function lowestSpot(
  placed: Placed[],
  ra: number,
  halfWidth: number,
  halfHeight: number,
  containerWidth: number,
): { x: number; y: number } | null {
  const xMin = halfWidth;
  const xMax = containerWidth - halfWidth;
  const yMin = halfHeight;
  // Wider than the container; caller decides what to do about it.
  if (xMax < xMin - EPS) return null;

  // Half a row of this tile — the depth of the stagger between two
  // neighboring columns, and so the whole range a better contact can be
  // worth going down for.
  const window = ra;

  // Separating-axis test against the three edge normals — the same thing
  // as asking whether (x, y) falls inside the no-fit hexagon — and, for
  // positions that clear, how many neighbors they meet edge to edge.
  // Tangency with one normal active is a shared edge; two at once is a
  // corner of the no-fit hexagon, which is the single-point contact that
  // leaves the dead space.
  const evaluate = (x: number, y: number): number => {
    if (x < xMin - EPS || x > xMax + EPS || y < yMin - EPS) return -1;
    let shared = 0;
    for (const q of placed) {
      const dx = x - q.cx;
      const dy = y - q.cy;
      const reach = q.ra + ra;
      const p0 = Math.abs(dy);
      const p1 = Math.abs(dy * 0.5 + dx * SIN60);
      const p2 = Math.abs(dy * 0.5 - dx * SIN60);
      const far = Math.max(p0, p1, p2);
      if (far < reach - EPS) return -1;
      if (far > reach + EPS) continue;
      const touching = reach - EPS;
      const active = (p0 > touching ? 1 : 0) + (p1 > touching ? 1 : 0) + (p2 > touching ? 1 : 0);
      if (active === 1) shared++;
    }
    return shared;
  };

  // Always-legal fallback — clear below everything — so the search only
  // ever has to improve on it.
  const fallbackY = clearOf(placed, ra, yMin);
  // Shallowest legal position seen so far. It only ever rises up the page,
  // so the window a candidate has to beat only ever tightens.
  let frontier = fallbackY;
  const pool: { x: number; y: number; shared: number }[] = [];

  const consider = (x: number, y: number) => {
    if (y > frontier + window + TOL) return;
    const shared = evaluate(x, y);
    if (shared < 0) return;
    pool.push({ x, y, shared });
    if (y < frontier) frontier = y;
  };

  // Each no-fit hexagon contributes six edge lines: three normals, two
  // offsets each. A line is (nx, ny, d) for the points where n · p = d.
  const edges: number[][][] = placed.map((q) => {
    const off = q.ra + ra;
    const d0 = q.cy;
    const d1 = q.cx * SIN60 + q.cy * 0.5;
    const d2 = q.cx * SIN60 - q.cy * 0.5;
    return [
      [0, 1, d0 + off],
      [0, 1, d0 - off],
      [SIN60, 0.5, d1 + off],
      [SIN60, 0.5, d1 - off],
      [SIN60, -0.5, d2 + off],
      [SIN60, -0.5, d2 - off],
    ];
  });
  const walls = [
    [1, 0, xMin],
    [1, 0, xMax],
    [0, 1, yMin],
  ];

  const meet = (a: number[], b: number[]) => {
    const det = a[0] * b[1] - a[1] * b[0];
    if (Math.abs(det) < 1e-9) return; // parallel
    consider((a[2] * b[1] - b[2] * a[1]) / det, (a[0] * b[2] - b[0] * a[2]) / det);
  };

  // Container corners, for the very first tile and for tiles that reach a
  // wall before they reach anything already placed.
  consider(xMin, yMin);
  consider(xMax, yMin);

  // The six seats around each placed hexagon: square onto one of its
  // edges, which is where a neighbor in the comb actually sits. These are
  // *interior* points of the no-fit polygon's edges, so the corner and
  // wall intersections below never produce them — and for a flat-top comb
  // they are the whole dense lattice. Without them the second tile of a
  // row has only no-fit corners to choose from, and a flat-top corner is
  // the vertex-to-vertex position.
  for (const q of placed) {
    const seat = q.ra + ra;
    consider(q.cx, q.cy + seat);
    consider(q.cx, q.cy - seat);
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        consider(q.cx + sx * SIN60 * seat, q.cy + (sy * seat) / 2);
      }
    }
  }

  for (let i = 0; i < placed.length; i++) {
    const ei = edges[i];
    for (let k = 0; k < 6; k++) {
      for (const wall of walls) meet(ei[k], wall);
      // Corners of this no-fit hexagon: a single-contact resting position.
      for (let m = k + 1; m < 6; m++) meet(ei[k], ei[m]);
    }
    // Two-contact positions — wedged between a pair of placed hexagons.
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const reach = CIRCUM * (a.ra + b.ra + 2 * ra);
      const dx = a.cx - b.cx;
      const dy = a.cy - b.cy;
      if (dx * dx + dy * dy > reach * reach) continue;
      const ej = edges[j];
      for (let k = 0; k < 6; k++) for (let m = 0; m < 6; m++) meet(ei[k], ej[m]);
    }
  }

  // Most shared edges wins; ties break the way they always did, highest
  // then leftmost. Candidates pooled before the frontier rose to its final
  // height are re-filtered here rather than being trusted on the way in.
  let best = { x: xMin, y: fallbackY, shared: -1 };
  const cut = frontier + window + TOL;
  for (const c of pool) {
    if (c.y > cut) continue;
    if (
      c.shared > best.shared ||
      (c.shared === best.shared &&
        (c.y < best.y - TOL || (Math.abs(c.y - best.y) <= TOL && c.x < best.x - TOL)))
    ) {
      best = c;
    }
  }

  return { x: best.x, y: best.y };
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
  const widthOf = (size: HexSize) => hexWidth(size, unitWidth, gap);

  // A hexagon wider than the container has nowhere legal to sit, so step it
  // down to the largest size that fits rather than let it hang off the
  // edge. This is what makes 3× and 4× tiles safe to author: on a narrow
  // viewport they render as whatever the grid can hold.
  const clampSize = (size: HexSize): HexSize => {
    let clamped = size;
    for (let i = HEX_SIZES.indexOf(size); i >= 0; i--) {
      clamped = HEX_SIZES[i];
      if (widthOf(clamped) <= containerWidth + EPS) break;
    }
    return clamped;
  };

  const placed: Placed[] = [];
  const cells: HexCell<T>[] = [];
  let height = 0;

  for (const item of items) {
    const size = clampSize(sizeOf(item));
    const width = widthOf(size);
    const cellHeight = width * HEX_RATIO;
    const halfWidth = width / 2;
    const halfHeight = cellHeight / 2;
    // The gap is carried by the collision shape, not the drawn one, so
    // neighbors keep a constant margin whatever their sizes. Flat-top, so
    // the apothem to inflate is the half-height.
    const ra = halfHeight + gap / 2;

    // Only unreachable when even the smallest size overflows the
    // container; park it below everything rather than dropping the item.
    const spot = lowestSpot(placed, ra, halfWidth, halfHeight, containerWidth) ?? {
      x: halfWidth,
      y: clearOf(placed, ra, halfHeight),
    };

    placed.push({ cx: spot.x, cy: spot.y, ra });
    cells.push({
      item,
      size,
      left: spot.x - halfWidth,
      top: spot.y - halfHeight,
      width,
      height: cellHeight,
    });
    height = Math.max(height, spot.y + halfHeight);
  }

  return { cells, height };
}
