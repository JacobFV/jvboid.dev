import type { Topology, Vec3 } from "@/lib/topology-types";

// Checked against Super-Cognition-Labs/IBM-1: site/data/releases.js (the
// curriculum16 kernel), scripts/train_curriculum.py (replicas, Procrustes
// alignment every 500 steps), docs/ARCHITECTURE.md §7 (materialize) and
// docs/EMBODIMENT.md (the afferent → cortex → cord → plant loop, γ edge).
const MATS: { id: string; label: string; sub?: string }[] = [
  { id: "viseeg", label: "image → EEG" },
  { id: "audmeg", label: "speech → MEG" },
  { id: "video", label: "next frame" },
  { id: "av", label: "audio-visual" },
  { id: "optic", label: "optic nerve" },
  { id: "coch", label: "cochlear nerve" },
  { id: "subj", label: "10 subjects" },
];

// A fan over the kernel, facing the reader: every model in sight of it, and
// none hiding behind another or behind the kernel's own label.
const ring = (i: number): Vec3 => {
  const a = Math.PI * (0.92 - (0.84 * i) / (MATS.length - 1));
  return [3.6 * Math.cos(a), 0.6 + 2.3 * Math.sin(a), i % 2 ? -0.6 : 0.6];
};

export const ibm1Topology: Topology = {
  id: "ibm-1",
  title:
    "IBM-1: one implicit kernel of 30,000 cortical sites is materialized into sixteen models, each training its own replica that is aligned and averaged back into the kernel, while the same cortex closes a sensorimotor loop through afferents, spinal cord and a musculoskeletal body",
  camera: [0, 2.4, 10.5],
  nodes: [
    { id: "k", label: "implicit kernel", sub: "30,000 sites × 128 = 3.84M", pos: [0, 0, 0], kind: "model", size: 1.9 },
    ...MATS.map((m, i) => ({ id: m.id, label: m.label, sub: m.sub, pos: ring(i), size: 0.8 })),
    { id: "post", label: "postcentral sites", sub: "somatosensory", pos: [-1.8, -1.1, 1.2] },
    { id: "pre", label: "precentral sites", sub: "motor", pos: [1.8, -1.1, 1.2] },
    { id: "cord", label: "spinal cord", sub: "reflex arcs", pos: [3.3, -2.7, -0.2] },
    { id: "plant", label: "body", sub: "musculoskeletal", pos: [0, -4, -1.2], kind: "io", size: 1.2 },
    { id: "aff", label: "afferents", sub: "498 sensory ports", pos: [-3.3, -2.7, -0.2] },
  ],
  edges: [
    ...MATS.flatMap((m) => [
      { from: "k", to: m.id, bend: 0.25 },
      { from: m.id, to: "k", bend: -0.25 },
    ]),
    { from: "plant", to: "aff", bend: -0.3 },
    { from: "aff", to: "post", bend: -0.2 },
    { from: "post", to: "k", bend: -0.2 },
    { from: "k", to: "pre", bend: -0.2 },
    { from: "pre", to: "cord", bend: -0.2 },
    { from: "cord", to: "plant", bend: -0.3 },
    { from: "cord", to: "aff", bend: 0.9 },
  ],
  phases: [
    { label: "Materialize: sixteen models are built from the one shared kernel (vision to EEG, speech to MEG, video, audio-visual, optic and cochlear nerves, ten subjects), each only as far as its target can reach.", edges: MATS.map((m) => `k>${m.id}`), ms: 3800 },
    { label: "Every 500 steps the replicas are Procrustes-aligned, averaged back into the kernel and reset. Heads are never shared, only the kernel is.", edges: MATS.map((m) => `${m.id}>k`), ms: 3600 },
    { label: "The body feels: spindles and Golgi organs report muscle length and velocity through afferent ports to postcentral cortex.", edges: ["plant>aff", "aff>post", "post>k"] },
    { label: "Precentral sites issue muscle commands through the cord's reflex arcs to the musculoskeletal body.", edges: ["k>pre", "pre>cord", "cord>plant"] },
    { label: "A γ efferent edge resets spindle gain: the first closed cycle in the declared graph.", edges: ["cord>aff"] },
  ],
};
