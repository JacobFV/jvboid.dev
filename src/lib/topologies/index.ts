import type { Topology } from "@/lib/topology-types";
import { ibm1Topology } from "./ibm-1";
import { symbolicAiHarness, symbolicAiWorkspace } from "./symbolic-ai-models";
import { tensegraTopology } from "./tensegra";
import { tensorComputerTopology } from "./tensor-computer";
import { tcnTopology } from "./typed-crystallization-networks";

/** Every <Topology3D id="…"> figure on the site, by id. One file per project. */
export const TOPOLOGIES: Record<string, Topology> = Object.fromEntries(
  [symbolicAiHarness, symbolicAiWorkspace, tcnTopology, tensorComputerTopology, ibm1Topology, tensegraTopology].map((t) => [t.id, t]),
);
