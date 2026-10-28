import type { Topology } from "@/lib/topology-types";

// Checked against JacobFV/phys-0: src/lib/backend (the shared tool registry,
// 84 tools from listTools() at runtime), src/apps/mcp-node, src/apps/phys0-cli,
// src/apps/electron (console, Virtual World editor on three.js + Rapier),
// src/apps/python-bridge and src/lib/phys0 (LeRobot, OpenCV vial/pH, placo IK),
// and the SQLite store.
export const phys0Topology: Topology = {
  id: "phys-0",
  title:
    "phys-0: an agent, the Electron console, an MCP client or the CLI all call one backend tool registry; tools write every action to SQLite, drive virtual worlds with Rapier physics, or reach the real SO-101 arm and camera through a Python bridge, whose vision reads pH back into the record",
  camera: [0, 1.5, 10.5],
  nodes: [
    { id: "agent", label: "LLM agent", sub: "plans, calls tools", pos: [-4.6, 2.2, 0], kind: "model" },
    { id: "console", label: "Lab Console", sub: "Electron", pos: [-4.6, 0.5, 0.6], kind: "io" },
    { id: "mcp", label: "MCP clients", pos: [-4.6, -1.2, 0], kind: "io" },
    { id: "cli", label: "phys0 CLI", pos: [-3.6, -2.7, -0.4], kind: "io" },
    { id: "registry", label: "tool registry", sub: "84 typed tools", pos: [-1.6, 0.4, 0], kind: "module", size: 1.4 },
    { id: "db", label: "experiment record", sub: "SQLite + artifacts", pos: [-0.4, -2.6, 0.6], kind: "store" },
    { id: "worlds", label: "virtual worlds", sub: "three.js · Rapier", pos: [1.3, 2.5, -0.4] },
    { id: "bridge", label: "Python bridge", sub: "LeRobot · placo IK", pos: [1.3, -0.4, 0.4] },
    { id: "arm", label: "SO-101 arm", sub: "Feetech servos", pos: [3.9, 0.6, 0.6], kind: "io", size: 1.2 },
    { id: "cam", label: "USB camera", pos: [3.9, -1.6, 0.2], kind: "io" },
    { id: "vision", label: "vial vision", sub: "OpenCV · dye → pH", pos: [2.1, -2.6, -0.4], kind: "check" },
  ],
  edges: [
    { from: "agent", to: "registry", bend: 0.2 },
    { from: "console", to: "registry", bend: 0.1 },
    { from: "mcp", to: "registry", bend: -0.1 },
    { from: "cli", to: "registry", bend: -0.2 },
    { from: "registry", to: "db", bend: -0.2 },
    { from: "registry", to: "worlds", bend: 0.2 },
    { from: "registry", to: "bridge", bend: 0.1 },
    { from: "bridge", to: "arm", bend: 0.2 },
    { from: "cam", to: "vision", bend: 0.2 },
    { from: "vision", to: "db", bend: 0.15 },
    { from: "arm", to: "cam", bend: 0.5 },
  ],
  phases: [
    { label: "Four ways in, one door: the agent, the Lab Console, any MCP client and the CLI all call the same typed tools.", edges: ["agent>registry", "console>registry", "mcp>registry", "cli>registry"] },
    { label: "Every call is validated and written down: experiments, observations, interventions and artifacts land in a local SQLite record.", edges: ["registry>db"] },
    { label: "Virtual worlds are built and simulated from the same tools: real SO-101 meshes, glassware, cameras and Rapier physics.", edges: ["registry>worlds"] },
    { label: "Real hardware goes through a Python bridge: LeRobot for the servos, placo for inverse kinematics.", edges: ["registry>bridge", "bridge>arm"] },
    { label: "The camera closes the loop: OpenCV finds each vial, reads its indicator dye, and records an estimated pH.", edges: ["arm>cam", "cam>vision", "vision>db"] },
  ],
};
