"use client";

import { Canvas } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import {
  POLICY_COLORS,
  frameAt,
  utility,
  type Frame,
  type PolicyName,
  type Replay,
  type Vec3,
} from "./study-model";

function Limb({
  a,
  b,
  color,
  radius = 0.045,
}: {
  a: Vec3;
  b: Vec3;
  color: string;
  radius?: number;
}) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const length = Math.max(direction.length(), 0.001);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  return (
    <mesh position={midpoint} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.18} />
    </mesh>
  );
}

const limbPairs = [
  ["pelvis", "chest"],
  ["chest", "neck"],
  ["neck", "head"],
  ["chest", "l_shoulder"],
  ["l_shoulder", "l_elbow"],
  ["l_elbow", "l_hand"],
  ["chest", "r_shoulder"],
  ["r_shoulder", "r_elbow"],
  ["r_elbow", "r_hand"],
  ["pelvis", "l_hip"],
  ["l_hip", "l_knee"],
  ["l_knee", "l_ankle"],
  ["pelvis", "r_hip"],
  ["r_hip", "r_knee"],
  ["r_knee", "r_ankle"],
] as const;

function SensorRays({ frame, color }: { frame: Frame; color: string }) {
  const head = frame.joints.head;
  const offsets = [-0.9, -0.45, 0, 0.45, 0.9];
  return (
    <group>
      {offsets.map((offset, index) => {
        const distance = frame.ranges[index] ?? 0;
        const angle = frame.yaw + offset;
        const end: Vec3 = [
          head[0] + distance * Math.cos(angle),
          0.12,
          head[2] + distance * Math.sin(angle),
        ];
        return (
          <Line
            key={offset}
            points={[head, end]}
            color={color}
            transparent
            opacity={0.35}
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}

function Humanoid({ frame, color }: { frame: Frame; color: string }) {
  const joints = frame.joints;
  return (
    <group>
      {limbPairs.map(([a, b]) => (
        <Limb key={`${a}-${b}`} a={joints[a]} b={joints[b]} color={color} />
      ))}
      {Object.entries(joints).map(([name, point]) => (
        <mesh key={name} position={point} castShadow>
          <sphereGeometry
            args={[
              name === "head"
                ? 0.13
                : name === "chest" || name === "pelvis"
                  ? 0.09
                  : 0.06,
              14,
              10,
            ]}
          />
          <meshStandardMaterial
            color={name === "head" ? "#f4f7fa" : color}
            roughness={0.28}
            metalness={0.22}
          />
        </mesh>
      ))}
      {frame.metaAction !== "continue" ? (
        <mesh position={joints.chest} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.24, 0.27, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {frame.metaAction === "sensor_sweep" ? (
        <SensorRays frame={frame} color={color} />
      ) : null}
    </group>
  );
}

function Beacon({ point, color }: { point: Vec3; color: string }) {
  return (
    <group position={point}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.76, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.09, 18, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.81, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.155, 36]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.14, 28]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function World({
  data,
  frame,
  policy,
  orbit,
}: {
  data: Replay;
  frame: Frame | undefined;
  policy: PolicyName;
  orbit: boolean;
}) {
  const color = POLICY_COLORS[policy];
  const trail = useMemo(() => {
    if (!frame) return [] as Vec3[];
    const frames = data.policies[policy].frames;
    const index = Math.max(
      0,
      frames.findIndex((candidate) => candidate.t >= frame.t),
    );
    return frames
      .slice(Math.max(0, index - 70), index + 1)
      .map((item) => [item.position[0], 0.035, item.position[2]] as Vec3);
  }, [data, frame, policy]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.45]}
      camera={{ position: [9.8, 8.2, 11.2], fov: 35, near: 0.1, far: 80 }}
    >
      <color attach="background" args={["#0b0f14"]} />
      <fog attach="fog" args={["#0b0f14", 12, 25]} />
      <ambientLight intensity={1.45} />
      <directionalLight
        position={[5, 11, 5]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-5, 4, -4]} color="#52c7e2" intensity={0.7} />
      <pointLight position={[5, 3, 5]} color="#f1b74c" intensity={0.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#111820" roughness={0.96} />
      </mesh>
      <gridHelper args={[14, 14, "#354455", "#202a35"]} position={[0, 0.008, 0]} />
      {data.obstacles.map(([xmin, xmax, zmin, zmax], index) => {
        const unexpected = index === 3;
        return (
          <mesh
            key={`${xmin}-${zmin}`}
            position={[(xmin + xmax) / 2, 0.42, (zmin + zmax) / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[xmax - xmin, 0.84, zmax - zmin]} />
            <meshStandardMaterial
              color={unexpected ? "#35232a" : "#403a35"}
              emissive={unexpected ? "#6d2235" : "#000000"}
              emissiveIntensity={unexpected ? 0.18 : 0}
              roughness={0.77}
            />
          </mesh>
        );
      })}
      <Beacon point={data.targetA} color="#6ecff6" />
      <Beacon point={data.targetB} color="#5cd199" />
      <Beacon point={data.console} color="#f1b74c" />
      {trail.length > 1 ? (
        <Line points={trail} color={color} transparent opacity={0.45} lineWidth={2} />
      ) : null}
      {frame ? <Humanoid frame={frame} color={color} /> : null}
      {orbit ? (
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={8}
          maxDistance={18}
          minPolarAngle={0.72}
          maxPolarAngle={1.25}
          target={[0, 0.8, 0]}
        />
      ) : null}
    </Canvas>
  );
}

export function RobotViewport({
  data,
  policy,
  time,
  orbit = true,
}: {
  data: Replay;
  policy: PolicyName;
  time: number;
  orbit?: boolean;
}) {
  const frame = frameAt(data.policies[policy], time);
  return <World data={data} frame={frame} policy={policy} orbit={orbit} />;
}

function MetricBar({
  label,
  value,
  color,
  invert = false,
}: {
  label: string;
  value: number;
  color: string;
  invert?: boolean;
}) {
  const normalized = Math.max(0, Math.min(1, value));
  const width = `${100 * (invert ? 1 - normalized : normalized)}%`;
  return (
    <div className="grid grid-cols-[104px_1fr_38px] items-center gap-2 font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.08em] text-[#84909f]">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full" style={{ width, background: color }} />
      </span>
      <span className="text-right text-[#dfe5ec]">{normalized.toFixed(2)}</span>
    </div>
  );
}

export function Telemetry({ frame, policy }: { frame: Frame | undefined; policy: PolicyName }) {
  if (!frame) return null;
  const color = POLICY_COLORS[policy];
  if (policy === "G+") {
    return (
      <div className="space-y-2">
        {frame.aux.slice(0, 4).map((value, index) => (
          <MetricBar
            key={index}
            label={`latent ${String(index + 1).padStart(2, "0")}`}
            value={1 / (1 + Math.exp(-value))}
            color={color}
          />
        ))}
      </div>
    );
  }
  const aux = [...frame.aux, 1, 1, 1, 1, 1, 1, 0, 0];
  return (
    <div className="space-y-2">
      <MetricBar label="motor health" value={(aux[0] + aux[1]) / 2} color={color} />
      <MetricBar label="sensor trust" value={aux[2]} color={color} />
      <MetricBar label="memory" value={aux[3]} color={color} />
      <MetricBar label="update" value={aux[4]} color={color} />
      <MetricBar label="future error" value={aux[6]} color={color} invert />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[82px] rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <div className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.12em] text-[#778392]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

export function ReplayPanel({
  data,
  policy,
  time,
  compact = false,
}: {
  data: Replay;
  policy: PolicyName;
  time: number;
  compact?: boolean;
}) {
  const replay = data.policies[policy];
  const frame = frameAt(replay, time);
  const color = POLICY_COLORS[policy];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1218]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <div
            className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.14em]"
            style={{ color }}
          >
            {policy === "G+"
              ? "generic recurrent policy"
              : policy === "SA"
                ? "predictive self-model"
                : "self-model causally disabled"}
          </div>
          <div className="mt-1 text-sm font-medium text-white">{policy}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 font-[family-name:var(--font-mono)] text-[9px] uppercase text-[#96a2b1]">
          {frame?.metaAction.replaceAll("_", " ") ?? "loading"}
        </div>
      </div>
      <div className={compact ? "h-[270px] sm:h-[330px]" : "h-[330px] sm:h-[390px]"}>
        <RobotViewport data={data} policy={policy} time={time} orbit={!compact} />
      </div>
      <div className="grid gap-4 border-t border-white/8 p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-3 font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-[0.14em] text-[#778392]">
            {policy === "G+" ? "unstructured auxiliary state" : "prospective cognitive state"}
          </div>
          <Telemetry frame={frame} policy={policy} />
        </div>
        <div className="grid grid-cols-3 gap-2 self-end sm:grid-cols-1">
          <Stat label="time" value={`${replay.summary.completion_time.toFixed(1)}s`} />
          <Stat label="tests" value={String(replay.summary.interventions)} />
          <Stat label="utility" value={utility(replay.summary).toFixed(2)} />
        </div>
      </div>
    </div>
  );
}
