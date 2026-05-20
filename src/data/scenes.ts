// Hand-curated panel content per vision sceneId. Each scene is a small
// number of short panels — the 3D room is for impression, not reading.
// The full text remains available via "skip to text".

import type { Panel } from "@/components/three/VisionRoomScene";

export const scenes: Record<string, Panel[]> = {
  "focus-statement": [
    {
      title: "Everything Everywhere All At Once",
      body: "We're inside the steepest technoevolutionary leap in the observable universe. Most people don't even notice — and most of the leap is locked behind a price tag.",
    },
    {
      title: "A takeoff for the few isn't a takeoff",
      body: "The strongest models are gated. The first humanoids cost more than houses. If only a minority is hanging ten, this isn't the future we were promised — it's just the same hierarchy with better tools.",
    },
    {
      title: "A $1,000 general-purpose humanoid",
      body: "Vertically integrated hydraulic actuators. A self-built prime mover. ML architectures designed for the hardware they run on. The whole stack, owned end to end, so the cost floor can fall.",
    },
    {
      title: "Why the cost floor matters",
      body: "Below the median household budget, embodied intelligence stops being a luxury and starts being infrastructure. The question of who benefits stops being a question — it becomes the default.",
    },
    {
      title: "On-demand swarm",
      body: "An Uber-shaped utility model: people request a robot when they need one, it returns to its owner when they don't. One robot per customer keeps demand bounded and access fair while the supply ramps.",
    },
    {
      title: "What I've already built",
      body: "Six months of prototyping — low-pressure hydraulic valves, custom actuators, a manufacturable prime mover. 10× cost reductions where the market said it couldn't be done. Prototype 3 is being assembled now.",
    },
    {
      title: "The next milestone",
      body: "Finish Prototype 3. Raise the run for batches of 100 (looking $100k–$1M). Deploy under real households in real time. The first units don't have to be perfect — they have to be honest.",
    },
    {
      title: "The bigger story",
      body: "If capital is no longer constrained by labor, the size of the economy stops having an obvious ceiling. We'll need to redesign more than a few heuristics. I'd rather we do that on purpose, together, than have it happen to us.",
    },
    {
      title: "What I'm looking for",
      body: "Investors who think in decades. Engineers who can hold a CAD file and a control loop in the same head. Users who'll tell me what they actually want a robot to do. Advocates who'll help carry this further than I can alone.",
    },
  ],
};

export function panelsFor(sceneId: string | undefined): Panel[] | null {
  if (!sceneId) return null;
  return scenes[sceneId] ?? null;
}
