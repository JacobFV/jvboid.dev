import type { Topology } from "@/lib/topology-types";

// Checked against JacobFV/symbolic-ai-models: symbolic_ai_data (vendored
// langcurriculum @504e118), symbolic_ai_core/data/term_graph.py, floors.py,
// shortcuts.py, invariance.py, cost.py, and symbolic_ai_models/train.py.
export const symbolicAiHarness: Topology = {
  id: "symbolic-ai-harness",
  title:
    "The symbolic-ai-models harness: one generated episode becomes prose for next-token prediction and a masked term graph for node prediction, every model reads both through one head, and scores are lifts over floors, checked by renaming every symbol",
  camera: [0, 1.4, 10],
  nodes: [
    { id: "seed", label: "seed", sub: "179 lessons", pos: [-5.3, 0.1, 0], kind: "io" },
    { id: "gen", label: "generator", sub: "langcurriculum", pos: [-3.6, 1.6, 0] },
    { id: "term", label: "typed term", sub: "answer built in", pos: [-1.9, 0.5, 0], kind: "store" },
    { id: "render", label: "renderer", sub: "term → prose", pos: [-0.5, 2.3, 0.7] },
    { id: "tok", label: "tokenizer", sub: "symbol-aware", pos: [1.1, 2.3, 0.7] },
    { id: "graph", label: "term graph", sub: "typed edges", pos: [-0.9, -0.5, -0.7], kind: "store" },
    { id: "mask", label: "masker", sub: "15% hidden", pos: [1.3, -0.5, -0.7] },
    { id: "rename", label: "renaming", sub: "every symbol swapped", pos: [-0.6, -2.3, 1.2], kind: "check" },
    { id: "model", label: "model zoo", sub: "neural + rule-based", pos: [2.7, 0.9, 0], kind: "model", size: 1.6 },
    { id: "floors", label: "floors", sub: "incl. best shortcut", pos: [1.9, -2.7, 1.1], kind: "check" },
    { id: "score", label: "lift over floor", pos: [4.2, -0.4, 0], kind: "check" },
    { id: "cost", label: "$ per solved episode", pos: [4.8, -1.9, -0.4], kind: "io" },
  ],
  edges: [
    { from: "seed", to: "gen", bend: 0.1 },
    { from: "gen", to: "term", bend: 0.1 },
    { from: "term", to: "render" },
    { from: "render", to: "tok", bend: 0.15 },
    { from: "term", to: "graph", bend: -0.35 },
    { from: "graph", to: "mask", bend: -0.15 },
    { from: "tok", to: "model" },
    { from: "mask", to: "model", bend: -0.35 },
    { from: "term", to: "rename", bend: -0.5 },
    { from: "rename", to: "model", bend: -0.6 },
    { from: "model", to: "score" },
    { from: "floors", to: "score", bend: 0.2 },
    { from: "score", to: "cost", bend: 0.2 },
  ],
  phases: [
    { label: "A seed picks a lesson and the generator builds a typed term. The answer is computed from the construction, never annotated.", edges: ["seed>gen", "gen>term"] },
    { label: "The term is rendered as prose and tokenized for next-token prediction.", edges: ["term>render", "render>tok"] },
    { label: "The same term becomes a graph with 15% of its nodes hidden, for masked-node prediction.", edges: ["term>graph", "graph>mask"] },
    { label: "Every architecture, neural or rule-based, reads both views through one shared output head.", edges: ["tok>model", "mask>model"] },
    { label: "No raw accuracy is reported: each score is a lift over floors, including the best shortcut a cheater could take.", edges: ["model>score", "floors>score"] },
    { label: "The renaming control swaps every symbol. A skill that disappears was memorised vocabulary.", edges: ["term>rename", "rename>model"] },
    { label: "Lift is priced: dollars per episode solved above the floor.", edges: ["score>cost"] },
  ],
};

// symbolic_ai_models/models/workspace_001/model.py and runs/both/workspace/rules.txt.
const CODELETS = ["mirror", "peer", "echo", "parent", "sibling", "frame"] as const;
const ring = (i: number): [number, number, number] => {
  // A ring facing the reader, with a little depth so it doesn't read flat.
  const a = (i / CODELETS.length) * Math.PI * 2 + Math.PI / 2;
  return [0.4 + 1.55 * Math.cos(a), 1.55 * Math.sin(a), 0.5 * Math.sin(2 * a)];
};

export const symbolicAiWorkspace: Topology = {
  id: "symbolic-ai-workspace",
  title:
    "Inside the workspace model: a hidden node's goal signature selects codelet strengths from a learned policy, six codelets propose fillers in parallel, and their agreement sets a temperature that decides between committing and deferring to a back-off prior",
  camera: [0, 1.2, 9.5],
  nodes: [
    { id: "hole", label: "hidden node", pos: [-4.7, 1, 0], kind: "io" },
    { id: "sig", label: "goal signature", sub: "region · parent · slot", pos: [-2.6, 0, 0] },
    { id: "policy", label: "learned policy", sub: "84 signatures → hit rates", pos: [-1.4, 2.4, -0.8], kind: "store" },
    { id: "mem", label: "region memory", sub: "one per top-level field", pos: [-1.4, -2.3, 0.8], kind: "store" },
    ...CODELETS.map((c, i) => ({ id: c, label: c, pos: ring(i), size: 0.75 })),
    { id: "temp", label: "temperature", sub: "codelet agreement", pos: [2.8, 0, 0], kind: "check" },
    { id: "commit", label: "commit", sub: "cold: settled", pos: [4.5, 1.1, 0], kind: "io" },
    { id: "prior", label: "back-off prior", sub: "hot: unsettled", pos: [4.5, -1.1, 0], kind: "io" },
  ],
  edges: [
    { from: "hole", to: "sig", bend: 0.1 },
    { from: "sig", to: "policy", bend: 0.3 },
    ...CODELETS.flatMap((c) => [
      { from: "policy", to: c, bend: 0.2 },
      { from: "mem", to: c, bend: -0.2 },
      { from: c, to: "temp", bend: 0.15 },
    ]),
    { from: "temp", to: "commit", bend: 0.15 },
    { from: "temp", to: "prior", bend: -0.15 },
  ],
  phases: [
    { label: "Walk up from the hidden node to its goal signature: which region, under what parent type, in which slot.", edges: ["hole>sig"] },
    { label: "The learned policy maps the signature to how often each codelet has been right there before.", edges: ["sig>policy", ...CODELETS.map((c) => `policy>${c}`)] },
    { label: "Six codelets search the region memory in parallel, each proposing a filler with a strength.", edges: CODELETS.map((c) => `mem>${c}`) },
    { label: "Their agreement sets the temperature of the workspace.", edges: CODELETS.map((c) => `${c}>temp`) },
    { label: "A cold, settled workspace commits its answer.", edges: ["temp>commit"] },
    { label: "A hot one defers to the back-off prior instead of guessing.", edges: ["temp>prior"] },
  ],
};
