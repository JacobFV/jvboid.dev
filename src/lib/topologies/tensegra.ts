import type { Topology } from "@/lib/topology-types";

// Checked against JacobFV/tensegra: the runtime graph and structural bias
// (S = QKᵀ/√d + Σ λ_r B_r, B_r = P_q A_r P_kᵀ), the recurrent proposal /
// readiness / gate / exact-execution path of stages 4-7, the return encoder,
// and the metacontrol worlds of campaigns extended-03..07.
export const tensegraTopology: Topology = {
  id: "tensegra",
  title:
    "Tensegra: tokens attend by content plus a structural bias from a declared entity graph; a recurrent workspace proposes typed operations, a gate admits them, an exact executor runs them and updates the graph, and the encoded result returns to the workspace, which a policy reads to decide what to compute next",
  camera: [0, 1.5, 10.5],
  nodes: [
    { id: "tok", label: "tokens", sub: "measurements · text", pos: [-4.8, 1.6, 0], kind: "io" },
    { id: "graph", label: "entity graph", sub: "identities · relations", pos: [-4.4, -1.4, 0.6], kind: "store", size: 1.2 },
    { id: "bind", label: "soft binding", sub: "token ↔ entity", pos: [-2.8, -0.2, 0.9] },
    { id: "bias", label: "structural bias", sub: "one per relation", pos: [-2.4, 2.4, -0.4] },
    { id: "attn", label: "attention", sub: "content + Σ λᵣ Bᵣ", pos: [-0.6, 1.5, 0], kind: "model", size: 1.3 },
    { id: "ws", label: "workspace", sub: "Hₜ, recurrent", pos: [0.9, 0.1, 0], kind: "store", size: 1.3 },
    { id: "prop", label: "proposal", sub: "op · operands · ready?", pos: [2.5, 1.8, -0.4] },
    { id: "gate", label: "admissibility gate", pos: [4.2, 1.2, 0], kind: "check" },
    { id: "exec", label: "exact executor", sub: "protected", pos: [3.6, -1.3, 0.4] },
    { id: "ret", label: "return encoder", pos: [1.6, -2.5, 0.8] },
    { id: "policy", label: "policy", sub: "compute · reuse · probe · stop", pos: [-0.9, -2.3, -0.8], kind: "model" },
    { id: "util", label: "task utility", sub: "verified success − cost", pos: [-2.9, -3.1, -0.6], kind: "check" },
  ],
  edges: [
    { from: "tok", to: "attn", bend: 0.25 },
    { from: "graph", to: "bind", bend: 0.15 },
    { from: "bind", to: "bias", bend: -0.25 },
    { from: "bias", to: "attn", bend: 0.15 },
    { from: "attn", to: "ws", bend: 0.15 },
    { from: "ws", to: "bind", bend: 0.3 },
    { from: "ws", to: "prop", bend: 0.15 },
    { from: "prop", to: "gate", bend: 0.15 },
    { from: "gate", to: "exec", bend: -0.25 },
    { from: "exec", to: "graph", bend: 0.9 },
    { from: "exec", to: "ret", bend: -0.2 },
    { from: "ret", to: "ws", bend: -0.2 },
    { from: "ws", to: "policy", bend: 0.2 },
    { from: "policy", to: "util", bend: 0.15 },
  ],
  phases: [
    { label: "Tokens attend to each other by content, as in any transformer.", edges: ["tok>attn"] },
    { label: "A declared entity graph adds a structural term: soft bindings map tokens to entities, and each relation becomes a bias on attention. Remove or permute it to test whether it mattered.", edges: ["graph>bind", "bind>bias", "bias>attn"] },
    { label: "The workspace updates and re-grounds itself: an entity's changing identity can select a new neighbourhood.", edges: ["attn>ws", "ws>bind"] },
    { label: "Recurrent microsteps propose an operation, its operands and whether it is ready. A gate admits only legal, ready proposals.", edges: ["ws>prop", "prop>gate"] },
    { label: "Execution is exact and protected. It advances the symbolic store, not the weights.", edges: ["gate>exec", "exec>graph"] },
    { label: "The typed result is encoded back into the workspace. Dropping, shuffling or corrupting it tests whether anything downstream reads it.", edges: ["exec>ret", "ret>ws"] },
    { label: "In the later worlds a policy decides whether to compute, retrieve, validate, reuse or stop, scored by verified success minus cost.", edges: ["ws>policy", "policy>util"] },
  ],
};
