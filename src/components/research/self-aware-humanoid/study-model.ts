export const ASSET_ROOT = "/research/self-aware-humanoid";
export const REPLAY_ROOT = `${ASSET_ROOT}/data/replays`;
export const SOURCE_ROOT =
  "https://github.com/JacobFV/jvboid.dev/tree/main/public/research/self-aware-humanoid";

export const FULL_BLEED =
  "relative left-1/2 my-12 w-[min(96vw,1480px)] -translate-x-1/2 overflow-hidden rounded-[28px] border border-white/10 bg-[#080a0e] text-[#edf2f7] shadow-[0_30px_100px_rgba(0,0,0,0.32)]";

export type ScenarioId =
  | "stationary"
  | "actuator_drift"
  | "sensor_corruption"
  | "memory_lesion"
  | "update_mutation"
  | "composite";

export type PolicyName = "G+" | "SA" | "SA gate-off";
export type Vec3 = [number, number, number];
export type Tone = "positive" | "negative" | "null" | "uncertain";

export type Summary = {
  policy: string;
  scenario: ScenarioId;
  seed: number;
  severity: number;
  completed: boolean;
  completion_time: number;
  collisions: number;
  interventions: number;
  path_length: number;
  energy: number;
  final_distance: number;
  motor_estimation_error: number;
};

export type Frame = {
  t: number;
  position: Vec3;
  yaw: number;
  metaAction: string;
  faultActive: boolean;
  aux: number[];
  ranges: number[];
  joints: Record<string, Vec3>;
};

export type PolicyReplay = {
  summary: Summary;
  firstIntervention: { t: number; action: string } | null;
  frames: Frame[];
};

export type ReplayMeta = {
  scenario: ScenarioId;
  selection: {
    model_seed: number;
    seed: number;
    severity: number;
    SA_minus_Gplus: number;
    median_contrast: number;
  };
  dt: number;
  obstacles: [number, number, number, number][];
  targetA: Vec3;
  targetB: Vec3;
  console: Vec3;
  jointOrder: string[];
  policies: Record<PolicyName, string>;
};

export type Replay = Omit<ReplayMeta, "policies"> & {
  policies: Record<PolicyName, PolicyReplay>;
};

export type ScenarioMeta = {
  id: ScenarioId;
  title: string;
  short: string;
  verdict: string;
  result: string;
  delta: number;
  ci: [number, number];
  tone: Tone;
  signature: string;
  question: string;
  href: string;
};

export const POLICY_COLORS: Record<PolicyName, string> = {
  "G+": "#52c7e2",
  SA: "#f1b74c",
  "SA gate-off": "#e26571",
};

export const scenarios: ScenarioMeta[] = [
  {
    id: "stationary",
    title: "Stationary control",
    short: "no fault",
    verdict: "Null result",
    result:
      "Explicit self-modeling produces no measurable benefit when neither the world nor the learner changes.",
    delta: -0.002,
    ci: [-0.09, 0.081],
    tone: "null",
    signature: "The useful metacognitive action is no action at all.",
    question:
      "Can a learned invocation gate remove the small false-positive intervention cost?",
    href: "/posts/self-aware-humanoid-methods",
  },
  {
    id: "actuator_drift",
    title: "Actuator drift",
    short: "motor fault",
    verdict: "No distinct advantage",
    result:
      "SA identifies motor uncertainty, but ordinary closed-loop adaptation is already sufficient and the probe adds delay.",
    delta: -0.085,
    ci: [-0.207, 0.039],
    tone: "uncertain",
    signature: "The robot pauses, excites the leg, and updates its actuator estimate.",
    question:
      "Would the probe become useful under irreversible falls, payload changes, or tighter stability margins?",
    href: "/posts/self-aware-humanoid-actuator-drift",
  },
  {
    id: "sensor_corruption",
    title: "Sensor corruption",
    short: "perception fault",
    verdict: "Conditional advantage",
    result:
      "SA forecasts that its current observations will corrupt future control and initiates a reference sweep earlier.",
    delta: 0.266,
    ci: [0.13, 0.409],
    tone: "positive",
    signature:
      "It actively moves its head to acquire evidence about the reliability of its own perception.",
    question:
      "Does the advantage survive without privileged telemetry and with learned diagnostic actions?",
    href: "/posts/self-aware-humanoid-sensor-corruption",
  },
  {
    id: "memory_lesion",
    title: "Memory lesion",
    short: "memory fault",
    verdict: "Over-intervention",
    result:
      "The explicit self-model is causally necessary inside SA, yet it refreshes memory too often and loses to G+ on net utility.",
    delta: -0.358,
    ci: [-0.433, -0.278],
    tone: "negative",
    signature:
      "The robot returns to an external console to reconstruct a damaged task state.",
    question:
      "Can uncertainty-aware stopping prevent recursive self-confirmation and repeated refreshes?",
    href: "/posts/self-aware-humanoid-memory-lesion",
  },
  {
    id: "update_mutation",
    title: "Learning-rule mutation",
    short: "update fault",
    verdict: "Attribution failure",
    result:
      "SA recognizes abnormal future error but often assigns it to the actuator rather than the changed update operator.",
    delta: -0.106,
    ci: [-0.218, 0.018],
    tone: "uncertain",
    signature: "A metacognitive response occurs, but the inferred cause is wrong.",
    question:
      "Which interventions make update-rule failure causally identifiable from motor failure?",
    href: "/posts/self-aware-humanoid-update-mutation",
  },
  {
    id: "composite",
    title: "Held-out composite",
    short: "multiple faults",
    verdict: "Strongest positive result",
    result:
      "SA completes every evaluation when actuator drift and sensor corruption occur together; G+ completes 85%.",
    delta: 1.643,
    ci: [0.056, 3.244],
    tone: "positive",
    signature:
      "The robot composes learned self-diagnostics under a fault combination absent from training.",
    question:
      "The interval is wide: does the gain persist across more models, bodies, and fault combinations?",
    href: "/posts/self-aware-humanoid-composite-fault",
  },
];

export const scenarioById = Object.fromEntries(
  scenarios.map((item) => [item.id, item]),
) as Record<ScenarioId, ScenarioMeta>;

export function toneColor(tone: Tone) {
  if (tone === "positive") return "#f1b74c";
  if (tone === "negative") return "#e26571";
  if (tone === "uncertain") return "#52c7e2";
  return "#9aa6b4";
}

export function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

export function utility(summary: Summary) {
  return (
    10 * Number(summary.completed) -
    0.18 * summary.completion_time -
    0.65 * summary.collisions -
    0.14 * summary.interventions -
    0.025 * summary.energy -
    0.22 * summary.final_distance
  );
}

export function frameAt(replay: PolicyReplay | undefined, time: number) {
  if (!replay?.frames.length) return undefined;
  let low = 0;
  let high = replay.frames.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (replay.frames[mid].t <= time) low = mid;
    else high = mid - 1;
  }
  return replay.frames[low];
}

type RawFrame = [
  number,
  number,
  number,
  number,
  number,
  string,
  number,
  number[],
  number[],
  number[],
];

type RawPolicyReplay = {
  summary: Summary;
  firstIntervention: { t: number; action: string } | null;
  frames: RawFrame[];
};

type RawReplay = Omit<ReplayMeta, "policies"> & {
  policies: Record<PolicyName, RawPolicyReplay>;
};

function decodePolicy(raw: RawPolicyReplay, jointOrder: string[]): PolicyReplay {
  return {
    summary: raw.summary,
    firstIntervention: raw.firstIntervention,
    frames: raw.frames.map((row) => {
      const joints: Record<string, Vec3> = {};
      for (let index = 0; index < jointOrder.length; index += 1) {
        const offset = index * 3;
        joints[jointOrder[index]] = [
          row[9][offset] ?? 0,
          row[9][offset + 1] ?? 0,
          row[9][offset + 2] ?? 0,
        ];
      }
      return {
        t: row[0],
        position: [row[1], row[2], row[3]],
        yaw: row[4],
        metaAction: row[5],
        faultActive: Boolean(row[6]),
        aux: row[7],
        ranges: row[8],
        joints,
      };
    }),
  };
}

let archivePromise: Promise<Record<ScenarioId, RawReplay>> | null = null;
const replayCache = new Map<ScenarioId, Promise<Replay>>();

async function loadArchive() {
  if (archivePromise) return archivePromise;
  archivePromise = Promise.all(
    [0, 1, 2, 3].map(async (index) => {
      const response = await fetch(`${ASSET_ROOT}/data/replays.${index}.b64`);
      if (!response.ok) throw new Error(`Replay archive request failed: ${response.status}`);
      return response.text();
    }),
  )
    .then(async (parts) => {
      const binary = atob(parts.join(""));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      if (typeof DecompressionStream === "undefined") {
        throw new Error("This browser cannot decode the replay archive.");
      }
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream("gzip"));
      const text = await new Response(stream).text();
      return JSON.parse(text) as Record<ScenarioId, RawReplay>;
    })
    .catch((error) => {
      archivePromise = null;
      throw error;
    });
  return archivePromise;
}

export function loadReplay(scenario: ScenarioId): Promise<Replay> {
  const cached = replayCache.get(scenario);
  if (cached) return cached;

  const request = loadArchive()
    .then((archive) => {
      const raw = archive[scenario];
      if (!raw) throw new Error(`Replay not found: ${scenario}`);
      return {
        ...raw,
        policies: Object.fromEntries(
          (Object.entries(raw.policies) as [PolicyName, RawPolicyReplay][]).map(
            ([policy, replay]) => [policy, decodePolicy(replay, raw.jointOrder)],
          ),
        ) as Record<PolicyName, PolicyReplay>,
      };
    })
    .catch((error) => {
      replayCache.delete(scenario);
      throw error;
    });

  replayCache.set(scenario, request);
  return request;
}
