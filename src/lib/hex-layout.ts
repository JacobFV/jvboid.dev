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
  // Rotation about the cell's centre, in radians, once settled.
  angle?: number;
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

// ---- Settling ---------------------------------------------------------
// Bottom-left fill is exact one tile at a time and greedy across them: a
// tile takes the best spot *given what is already down*, and never
// revisits it. It also packs every tile as the hexagon its cell is,
// including the app icons and square pages that draw something smaller
// inside that cell, so their neighbors stop a whole hexagon away.
//
// `settleComb` takes the fill as a starting position and lets it fall, as
// 2D rigid bodies: position *and* rotation. Every tile is shaped like what
// it actually draws — the hexagon, the app icon's rounded square, the
// square page — and collided by the separating axis theorem against its
// neighbors' rotated outlines. Each contact is resolved at the point where
// the two shapes actually meet, so a push that lands off-centre turns the
// tile as well as moving it, weighted by its moment of inertia: a small
// tile resting on a neighbor's slanted edge rocks into the pocket beside
// it instead of sitting on the corner. A slow pull back toward upright,
// and a cap on how far any tile may tilt, keep that to a lean.
//
// Gravity pulls everything toward the top of the comb, easing off to zero;
// the container's sides and top are walls; the hero is fixed — it neither
// moves nor turns — and the tiles pack against it. Heavier (bigger) tiles
// give way less.
//
// The gap between tiles is a spring rather than a wall: inside it, a
// contact pushes back only in proportion to how far it is compressed, so
// while the comb is settling the tiles can crowd into one another's
// margin — down to MIN_GAP of it, never further — and shoulder through
// into space that a rigid margin would have left locked. Once gravity is
// gone the springs relax back out to the full gap wherever there is room.
//
// Deterministic — same input, same output — so the server-rendered frame
// and the client's agree.

export type SettleShape = "hex" | "app" | "square";
export type SquareGeometry = Record<Exclude<SettleShape, "hex">, { side: number; radius: number }>;

type Body = {
  cx: number;
  cy: number;
  // Rotation in radians, and its cosine and sine, kept in step.
  a: number;
  cos: number;
  sin: number;
  w: number;
  h: number;
  // Mass in 1× tiles (Infinity for a fixed body), its inverse, and the
  // inverse moment of inertia; the inverses are 0 for a fixed body.
  m: number;
  inv: number;
  invI: number;
  // How hard gravity pulls this body, relative to a 1× tile.
  pull: number;
  // Broad-phase radius: nothing outside it can touch this body.
  r: number;
  // Outline and edge normals in the body's own frame.
  verts: [number, number][];
  axes: [number, number][];
  // The outline where the body is now, rebuilt only when it moves or turns.
  world: [number, number][];
};

const SETTLE_STEPS = 120;
const SETTLE_ITERS = 3;
const RELAX_STEPS = 32;
const FIX_STEPS = 40;
// Gravity at the start of the settle, in 1× tile widths per step.
const GRAVITY = 0.02;
// How hard a compressed margin pushes back, per iteration.
const SOFT = 0.3;
// How much of the margin a contact may give up while settling.
const MIN_GAP = 0.75;
// Each step a tile keeps this much of its tilt: the slow pull upright.
const UPRIGHT = 0.985;
// And no tile leans further than this.
const MAX_TILT = (14 * Math.PI) / 180;
// A regular hexagon's moment of inertia about its centre is 5/64 · m · w²
// (w corner to corner); close enough for the squares too.
const INERTIA = 5 / 64;
// Vertices within this many px of a contact plane share the contact.
const CONTACT_TOL = 0.75;
// Heavier tiles fall harder: gravity scales with mass to this power,
// within PULL_MIN..PULL_MAX of a 1× tile's. Big tiles rise through the
// small ones and come to rest against each other — dense things settle
// first in a jar.
const PULL_EXP = 0.4;
const PULL_MIN = 0.6;
const PULL_MAX = 2.2;
// How far, per pass, a contact turns a tile to lie flush along the face it
// is touching — scaled by the lighter body's weight, m² / (m² + 1), so two
// big tiles square up to each other almost completely, a pair of 1× tiles
// half-heartedly, and a small tile hardly at all and keeps its lean.
const ALIGN = 0.3;

function polygonAxes(verts: [number, number][]): [number, number][] {
  const axes: [number, number][] = [];
  for (let i = 0; i < verts.length; i++) {
    const [x0, y0] = verts[i];
    const [x1, y1] = verts[(i + 1) % verts.length];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1e-6) continue;
    let nx = (y1 - y0) / len;
    let ny = -(x1 - x0) / len;
    // An axis and its opposite are the same test; keep one of each.
    if (nx < -TOL || (Math.abs(nx) <= TOL && ny < 0)) {
      nx = -nx;
      ny = -ny;
    }
    if (!axes.some(([ax, ay]) => Math.abs(ax - nx) < 1e-6 && Math.abs(ay - ny) < 1e-6)) {
      axes.push([nx, ny]);
    }
  }
  return axes;
}

/** A tile's collision outline in its own frame — also what tests check against. */
export function tileOutline(
  shape: SettleShape,
  w: number,
  h: number,
  squares: SquareGeometry,
): [number, number][] {
  if (shape === "hex") {
    return [
      [-w / 2, 0],
      [-w / 4, -h / 2],
      [w / 4, -h / 2],
      [w / 2, 0],
      [w / 4, h / 2],
      [-w / 4, h / 2],
    ];
  }
  // A square, its corner arcs as short chords — close enough that a
  // neighbor nests into the corner the way the drawn one allows.
  const side = squares[shape].side * w;
  const radius = squares[shape].radius * w;
  const c = side / 2 - radius;
  const steps = radius > 0.03 * w ? 3 : 1;
  const verts: [number, number][] = [];
  const corners: [number, number, number][] = [
    [c, -c, -Math.PI / 2],
    [c, c, 0],
    [-c, c, Math.PI / 2],
    [-c, -c, Math.PI],
  ];
  for (const [ox, oy, start] of corners) {
    for (let k = 0; k <= steps; k++) {
      const t = start + (k / steps) * (Math.PI / 2);
      verts.push([ox + radius * Math.cos(t), oy + radius * Math.sin(t)]);
    }
  }
  return verts;
}

function worldOutline(b: Body): [number, number][] {
  return b.verts.map(([x, y]) => [b.cx + x * b.cos - y * b.sin, b.cy + x * b.sin + y * b.cos]);
}

// The turn that would bring the body's nearest face normal parallel to
// (nx, ny). Normals are undirected, so the error wraps into ±90°.
function faceError(b: Body, nx: number, ny: number): number {
  const target = Math.atan2(ny, nx);
  let best = Infinity;
  for (const [lx, ly] of b.axes) {
    let e = target - (Math.atan2(ly, lx) + b.a);
    e = ((((e + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
    if (Math.abs(e) < Math.abs(best)) best = e;
  }
  return best === Infinity ? 0 : best;
}

function turn(b: Body, by: number) {
  b.a = Math.max(-MAX_TILT, Math.min(MAX_TILT, b.a + by));
  b.cos = Math.cos(b.a);
  b.sin = Math.sin(b.a);
}

// Separating-axis test between two rotated convex bodies. `d` is the
// largest gap along any axis — positive when they are apart, negative (the
// shallowest overlap) when they are not — `n` is that axis, pointing from
// a to b, and `p` is where they meet: the average of the features of each
// that face the other along it.
function contactOf(
  a: Body,
  b: Body,
): { d: number; nx: number; ny: number; px: number; py: number } {
  const wa = a.world;
  const wb = b.world;
  let best = -Infinity;
  let nx = 0;
  let ny = 0;
  const test = (lx: number, ly: number, owner: Body) => {
    const ax = lx * owner.cos - ly * owner.sin;
    const ay = lx * owner.sin + ly * owner.cos;
    let aMin = Infinity;
    let aMax = -Infinity;
    for (const [x, y] of wa) {
      const p = x * ax + y * ay;
      if (p < aMin) aMin = p;
      if (p > aMax) aMax = p;
    }
    let bMin = Infinity;
    let bMax = -Infinity;
    for (const [x, y] of wb) {
      const p = x * ax + y * ay;
      if (p < bMin) bMin = p;
      if (p > bMax) bMax = p;
    }
    if (bMin - aMax > best) {
      best = bMin - aMax;
      nx = ax;
      ny = ay;
    }
    if (aMin - bMax > best) {
      best = aMin - bMax;
      nx = -ax;
      ny = -ay;
    }
  };
  for (const [lx, ly] of a.axes) test(lx, ly, a);
  for (const [lx, ly] of b.axes) test(lx, ly, b);

  let aTop = -Infinity;
  for (const [x, y] of wa) aTop = Math.max(aTop, x * nx + y * ny);
  let bBottom = Infinity;
  for (const [x, y] of wb) bBottom = Math.min(bBottom, x * nx + y * ny);
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (const [x, y] of wa) {
    if (x * nx + y * ny >= aTop - CONTACT_TOL) {
      sx += x;
      sy += y;
      count++;
    }
  }
  for (const [x, y] of wb) {
    if (x * nx + y * ny <= bBottom + CONTACT_TOL) {
      sx += x;
      sy += y;
      count++;
    }
  }
  return { d: best, nx, ny, px: sx / count, py: sy / count };
}

export function settleComb<T>(
  layout: HexLayout<T>,
  {
    containerWidth,
    unitWidth,
    gap,
    shapeOf,
    isFixed,
    squares,
  }: {
    containerWidth: number;
    unitWidth: number;
    gap: number;
    shapeOf: (item: T) => SettleShape;
    isFixed: (item: T) => boolean;
    squares: SquareGeometry;
  },
): HexLayout<T> {
  const unitArea = unitWidth * unitWidth * HEX_RATIO;
  const bodies: Body[] = layout.cells.map((cell) => {
    const verts = tileOutline(shapeOf(cell.item), cell.width, cell.height, squares);
    const fixed = isFixed(cell.item);
    const m = fixed ? Infinity : (cell.width * cell.height) / unitArea;
    const inv = fixed ? 0 : 1 / m;
    return {
      cx: cell.left + cell.width / 2,
      cy: cell.top + cell.height / 2,
      a: 0,
      cos: 1,
      sin: 0,
      w: cell.width,
      h: cell.height,
      m,
      inv,
      invI: fixed ? 0 : inv / (INERTIA * cell.width * cell.width),
      pull: fixed ? 0 : Math.min(PULL_MAX, Math.max(PULL_MIN, m ** PULL_EXP)),
      r: cell.width / 2,
      verts,
      axes: polygonAxes(verts),
      world: [],
    };
  });
  for (const body of bodies) body.world = worldOutline(body);

  // Sweep and prune: bodies kept sorted by their left reach, so each one
  // only meets the few whose horizontal extents overlap its own instead of
  // all seventy-odd. Positions move a little per pass, so an insertion
  // sort over the previous order is close to linear.
  const order = bodies.map((_, i) => i).sort((p, q) => bodies[p].cx - bodies[q].cx);
  const resort = () => {
    for (let i = 1; i < order.length; i++) {
      const cur = order[i];
      const key = bodies[cur].cx - bodies[cur].r;
      let j = i - 1;
      while (j >= 0 && bodies[order[j]].cx - bodies[order[j]].r > key) {
        order[j + 1] = order[j];
        j--;
      }
      order[j + 1] = cur;
    }
  };

  // One pass over every pair in reach. `soft` is how much of a margin
  // shortfall to take back per pass; anything closer than `floor` is taken
  // back outright. Each correction is an impulse at the contact point, so
  // it is split between moving and turning each body by how easily that
  // body does either about that point — unless `rotate` is off, when the
  // whole correction is a push.
  const solve = (soft: number, floor: number, rotate = true) => {
    resort();
    for (let oi = 0; oi < order.length; oi++) {
      const a = bodies[order[oi]];
      const right = a.cx + a.r + gap;
      for (let oj = oi + 1; oj < order.length; oj++) {
        const b = bodies[order[oj]];
        if (b.cx - b.r > right) break;
        if (a.inv + b.inv === 0) continue;
        const reach = a.r + b.r + gap;
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        if (dx * dx + dy * dy > reach * reach) continue;
        const { d, nx, ny, px, py } = contactOf(a, b);
        if (d >= gap) continue;
        const push = soft * (gap - d) + (d < floor ? floor - d : 0);
        const ia = rotate ? a.invI : 0;
        const ib = rotate ? b.invI : 0;
        const ca = (px - a.cx) * ny - (py - a.cy) * nx;
        const cb = (px - b.cx) * ny - (py - b.cy) * nx;
        const wsum = a.inv + ia * ca * ca + b.inv + ib * cb * cb;
        const lambda = push / wsum;
        a.cx -= nx * lambda * a.inv;
        a.cy -= ny * lambda * a.inv;
        b.cx += nx * lambda * b.inv;
        b.cy += ny * lambda * b.inv;
        if (ia) turn(a, -ia * ca * lambda);
        if (ib) turn(b, ib * cb * lambda);
        if (rotate) {
          // Lie flat. The contact normal is a face normal of one of the
          // two (that is what the separating axis is), so turning each
          // body's nearest face toward it lays the pair edge to edge — as
          // hard as the lighter of the two is heavy.
          const lighter = Math.min(a.m, b.m);
          const weight = lighter === Infinity ? 1 : (lighter * lighter) / (lighter * lighter + 1);
          if (a.invI) turn(a, ALIGN * weight * faceError(a, nx, ny));
          if (b.invI) turn(b, ALIGN * weight * faceError(b, nx, ny));
        }
        a.world = worldOutline(a);
        b.world = worldOutline(b);
      }
    }
    for (const body of bodies) {
      if (body.inv === 0) continue;
      const cx = Math.min(Math.max(body.cx, body.w / 2), containerWidth - body.w / 2);
      const cy = Math.max(body.cy, body.h / 2);
      if (cx !== body.cx || cy !== body.cy) {
        body.cx = cx;
        body.cy = cy;
        body.world = worldOutline(body);
      }
    }
  };

  for (let step = 0; step < SETTLE_STEPS; step++) {
    const g = GRAVITY * unitWidth * (1 - step / SETTLE_STEPS);
    for (const body of bodies) {
      if (body.inv === 0) continue;
      body.cy -= g * body.pull;
      turn(body, body.a * (UPRIGHT - 1));
      body.world = worldOutline(body);
    }
    for (let k = 0; k < SETTLE_ITERS; k++) solve(SOFT, gap * MIN_GAP);
  }
  // Gravity off: the springs ease back out to the full margin wherever
  // there is room.
  for (let step = 0; step < RELAX_STEPS; step++) solve(SOFT, gap * MIN_GAP);
  // Then the guarantee. A correction that would turn a tile past MAX_TILT
  // loses the turning part, so a contact can be left short — worst where a
  // leaning tile is wedged between two others. With rotation off, every
  // correction is a push that lands in full, so these passes are what make
  // "nothing closer than MIN_GAP of the margin" true rather than likely.
  for (let step = 0; step < FIX_STEPS; step++) solve(0, gap * MIN_GAP, false);

  let height = 0;
  const cells = layout.cells.map((cell, i) => {
    const body = bodies[i];
    height = Math.max(height, body.cy + body.h / 2);
    return { ...cell, left: body.cx - body.w / 2, top: body.cy - body.h / 2, angle: body.a };
  });
  return { cells, height };
}
