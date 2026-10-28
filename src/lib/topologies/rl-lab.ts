import type { Topology } from "@/lib/topology-types";

// Checked against JacobFV/rl-lab README and packages/core: the run document
// (agents / robots / participants), lidar and foveated eyes, the Laplace
// channel action space, exact SAT physics, per-run learning written to
// memory, and searches whose genes are dotted paths into the base run.
export const rlLabTopology: Topology = {
  id: "rl-lab",
  title:
    "RL Lab: a run document binds minds to bodies; in the arena, lidar and foveated eyes feed a policy that sets each joint channel's Laplace transfer function, exact physics advances the world, and scores feed per-run learning and population search",
  camera: [0, 1.5, 10.5],
  nodes: [
    { id: "doc", label: "run document", sub: "one JSON file", pos: [-4.8, 1.2, 0], kind: "store", size: 1.1 },
    { id: "agent", label: "agent", sub: "mind · weights · memory", pos: [-3.1, 2.6, -0.4], kind: "model" },
    { id: "robot", label: "robot", sub: "segments · legs · wheels", pos: [-3.1, -0.2, 0.4], kind: "io" },
    { id: "part", label: "participant", sub: "agent + robot + team", pos: [-1.6, 1.2, 0] },
    { id: "physics", label: "exact physics", sub: "SAT · impulses", pos: [0.6, -0.9, 0], kind: "module", size: 1.3 },
    { id: "lidar", label: "lidar ring", pos: [0.3, 2.9, -0.8] },
    { id: "eyes", label: "eyes", sub: "foveated cone", pos: [1.6, 2.2, 0.8] },
    { id: "policy", label: "policy", sub: "neural · scripted · LLM", pos: [3, 2.9, 0], kind: "model" },
    { id: "laplace", label: "Laplace channels", sub: "9 numbers each", pos: [4.4, 1.2, 0] },
    { id: "motors", label: "joint motors", pos: [3.3, -0.6, 0.8] },
    { id: "score", label: "score", pos: [1.1, -3, 0.6], kind: "check" },
    { id: "learn", label: "learning", sub: "(1+1)-ES · reflect", pos: [-1.6, -2.6, -0.4] },
    { id: "search", label: "search", sub: "genes = dotted paths", pos: [-4.4, -1.5, 0.4] },
  ],
  edges: [
    { from: "doc", to: "agent", bend: 0.2 },
    { from: "doc", to: "robot", bend: -0.2 },
    { from: "agent", to: "part", bend: 0.15 },
    { from: "robot", to: "part", bend: -0.15 },
    { from: "part", to: "physics", bend: 0.2 },
    { from: "physics", to: "lidar", bend: 0.3 },
    { from: "physics", to: "eyes", bend: -0.2 },
    { from: "lidar", to: "policy", bend: 0.2 },
    { from: "eyes", to: "policy", bend: 0.1 },
    { from: "policy", to: "laplace", bend: 0.15 },
    { from: "laplace", to: "motors", bend: 0.2 },
    { from: "motors", to: "physics", bend: 0.15 },
    { from: "physics", to: "score", bend: 0.15 },
    { from: "score", to: "learn", bend: -0.15 },
    { from: "learn", to: "agent", bend: -0.9 },
    { from: "score", to: "search", bend: 0.5 },
    { from: "search", to: "doc", bend: -0.3 },
  ],
  phases: [
    { label: "A run document binds a mind to a body. The same agent can drive a hexapod in one binding and a rover in the next.", edges: ["doc>agent", "doc>robot", "agent>part", "robot>part", "part>physics"] },
    { label: "Two kinds of sight: a cheap lidar ring that sees everywhere and resolves nothing, and steerable, foveated eyes that see densely where they look.", edges: ["physics>lidar", "physics>eyes"] },
    { label: "The policy decides at its own rate: decisions are asynchronous, so even an LLM at 4 Hz can drive 120 Hz physics.", edges: ["lidar>policy", "eyes>policy"] },
    { label: "It doesn't output torques. It sets each channel's Laplace transfer function, nine numbers, and the channel shapes a sine into the joint command.", edges: ["policy>laplace", "laplace>motors"] },
    { label: "Exact polygon physics: concave outlines split into convex pieces, SAT contact manifolds, sequential impulses.", edges: ["motors>physics"] },
    { label: "After every run an agent can learn, by hill-climbing its own coefficients or weights or writing itself one lesson. Only its memory is written back.", edges: ["physics>score", "score>learn", "learn>agent"] },
    { label: "A search breeds runs. Genes are dotted paths into the document, so anything numeric is searchable, and neuroevolution is the same machinery.", edges: ["score>search", "search>doc"] },
  ],
};
