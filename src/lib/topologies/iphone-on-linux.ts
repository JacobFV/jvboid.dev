import type { Topology } from "@/lib/topology-types";

// Checked against JacobFV/behavioral-iphone-inferno (private): companion/
// prepare-profile.py and the os-image staging tools, companion/ipa-demo and
// APP_IMPORT.md (apps built on Linux, imported as IPAs), qmp_control.py and the
// virtual multitouch path, the VNC observation runner, and the strict-journey
// evidence records in companion/evidence.
export const iphoneOnLinuxTopology: Topology = {
  id: "iphone-on-linux",
  title:
    "Real iOS on Linux: Apple's own firmware and apps built on Linux are staged into disk images; QEMU emulates an iPhone 11 that boots unmodified iOS 14; an agent drives it headlessly through a control channel and virtual multitouch, sees frames back, and every action leaves a reviewed, hashed record",
  camera: [0, 1.5, 10.5],
  nodes: [
    { id: "ipsw", label: "Apple IPSW", sub: "iOS 14, user-supplied", pos: [-4.7, 2.2, 0], kind: "store" },
    { id: "build", label: "Linux clang build", sub: "UIKit headers · stubs", pos: [-4.7, -0.4, 0.4] },
    { id: "stage", label: "disk staging", sub: "volumes · import", pos: [-2.9, 0.5, 0] },
    { id: "qemu", label: "Inferno (QEMU)", sub: "emulated iPhone 11", pos: [-0.5, 1.1, 0], kind: "model", size: 1.5 },
    { id: "ios", label: "real iOS 14", sub: "unmodified", pos: [-0.2, 3, -0.8], kind: "store" },
    { id: "app", label: "the app", sub: "a real IPA", pos: [2, 3.2, -0.4], kind: "io" },
    { id: "agent", label: "agent", sub: "or operator", pos: [4.7, 0.9, 0], kind: "io", size: 1.1 },
    { id: "runner", label: "companion runner", pos: [3.2, -0.9, 0.6] },
    { id: "qmp", label: "control channel", sub: "QMP", pos: [1.4, -2.3, 0.8] },
    { id: "touch", label: "virtual multitouch", pos: [-0.9, -1.3, 0.9] },
    { id: "frames", label: "frames", sub: "headless display", pos: [1.9, 1.7, 1] },
    { id: "review", label: "before / after review", pos: [3.4, 2.6, 0.8], kind: "check" },
    { id: "record", label: "evidence record", sub: "hashes · transcripts", pos: [-2.7, -2.7, -0.3], kind: "store" },
  ],
  edges: [
    { from: "ipsw", to: "stage", bend: 0.15 },
    { from: "build", to: "stage", bend: -0.15 },
    { from: "stage", to: "qemu", bend: 0.1 },
    { from: "qemu", to: "ios", bend: 0.2 },
    { from: "ios", to: "app", bend: 0.2 },
    { from: "agent", to: "runner", bend: 0.2 },
    { from: "runner", to: "qmp", bend: 0.15 },
    { from: "qmp", to: "touch", bend: 0.15 },
    { from: "touch", to: "qemu", bend: 0.25 },
    { from: "qemu", to: "frames", bend: -0.15 },
    { from: "frames", to: "review", bend: -0.15 },
    { from: "review", to: "agent", bend: 0.2 },
    { from: "runner", to: "record", bend: 0.5 },
    { from: "review", to: "record", bend: -1.2 },
  ],
  phases: [
    { label: "Apple's own firmware is staged into disk images on Linux. Nothing in iOS is re-implemented, and nothing Apple ships is redistributed.", edges: ["ipsw>stage", "stage>qemu"] },
    { label: "Apps are built on Linux with clang against UIKit headers, then imported into the image as real IPAs.", edges: ["build>stage"] },
    { label: "QEMU emulates an iPhone 11. Real iOS 14 boots to SpringBoard and launches the app.", edges: ["qemu>ios", "ios>app"] },
    { label: "An agent drives it headlessly: taps and swipes go through a control channel into a virtual multitouch device.", edges: ["agent>runner", "runner>qmp", "qmp>touch", "touch>qemu"] },
    { label: "Frames come back from the emulated display. Every action is captured before and after, and reviewed.", edges: ["qemu>frames", "frames>review", "review>agent"] },
    { label: "Each run leaves a record (commands, transcripts, hashes, screenshots), so a pass can be checked by someone who wasn't there.", edges: ["runner>record", "review>record"] },
  ],
};
