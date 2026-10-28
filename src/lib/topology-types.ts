/**
 * Network-topology figures: the data behind <Topology3D>.
 *
 * A topology is a small 3D node-and-edge drawing of how a system's parts talk
 * to each other, played as a sequence of phases. Each phase lights the edges
 * that carry information at that point in the computation and sends pulses
 * along them, so a reader watches one forward pass (or one machine cycle, or
 * one materialization) happen in order instead of decoding a static hairball.
 *
 * Pure data, safe to import from client components. Positions are hand-placed
 * in world units (the scene frames roughly x ∈ [-5, 5], y ∈ [-3, 3]); the
 * layout is part of the explanation, so it is authored, not force-directed.
 */

export type Vec3 = [number, number, number];

/** Shape is the legend: io = what enters or leaves, module = something that
 *  computes, store = something that holds state, model = a learned network,
 *  check = a test, oracle or loss. */
export type TopoKind = "io" | "module" | "store" | "model" | "check";

export type TopoNode = {
  id: string;
  label: string;
  /** Second, dimmer line under the label: a shape, a count, a file. */
  sub?: string;
  pos: Vec3;
  kind?: TopoKind;
  /** Radius multiplier; 1 is a normal node. */
  size?: number;
};

export type TopoEdge = {
  from: string;
  to: string;
  /** How far the edge arcs off the straight line, in world units. Two edges
   *  between the same pair in opposite directions want opposite bends. */
  bend?: number;
};

export type TopoPhase = {
  /** One short sentence shown under the figure while this phase plays. */
  label: string;
  /** Active edges, written "from>to". Every one must exist in `edges`. */
  edges: string[];
  /** How long the phase plays, in ms. */
  ms?: number;
};

export type Topology = {
  id: string;
  /** Accessible name of the figure. */
  title: string;
  nodes: TopoNode[];
  edges: TopoEdge[];
  phases: TopoPhase[];
  /** Camera position; looks at the origin. */
  camera?: Vec3;
};

export const edgeKey = (e: { from: string; to: string }) => `${e.from}>${e.to}`;
