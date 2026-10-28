"use client";

import { useEffect, useMemo, useRef } from "react";
import type React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { edgeKey, type TopoKind, type Topology } from "@/lib/topology-types";

export type TopologyPalette = { ink: string; dim: string; accent: string; bg: string };

type Props = {
  topology: Topology;
  palette: TopologyPalette;
  /** Index of the phase being played. */
  phase: number;
  /** ms timestamp (performance.now) at which `phase` began. */
  phaseStart: number;
  /** Reduced motion: no pulses, no auto-rotation, render on demand. */
  still: boolean;
  /** Offscreen: stop rendering altogether. */
  visible: boolean;
};

const PULSES_PER_EDGE = 3;

// The 3D figure behind <Topology3D>. Everything that moves is derived from
// (phase, phaseStart) and the clock, so the parent owns time and can pause,
// skip or step it without the scene keeping its own idea of where it is.
export function TopologyScene({ topology, palette, phase, phaseStart, still, visible }: Props) {
  const cam = topology.camera ?? [0, 1.6, 9.5];
  // Frame the layout's own centre, not the origin: authored layouts are
  // rarely symmetric, and fitting around (0,0,0) wastes half the canvas.
  const target = useMemo(() => {
    const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
    const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const n of topology.nodes) {
      const p = new THREE.Vector3(...n.pos);
      lo.min(p);
      hi.max(p);
    }
    return lo.add(hi).multiplyScalar(0.5);
  }, [topology]);
  return (
    <Canvas
      frameloop={visible && !still ? "always" : "demand"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 40, position: cam }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 6]} intensity={0.9} />
      <Sway still={still}>
        <Graph topology={topology} palette={palette} phase={phase} phaseStart={phaseStart} still={still} />
      </Sway>
      {/* Drag orbits, but only so far: these layouts are authored to be read
          from the front, and from behind every label reads backwards into
          its neighbour. */}
      <OrbitControls
        target={target}
        enableZoom={false}
        enablePan={false}
        minAzimuthAngle={-0.45}
        maxAzimuthAngle={0.45}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.62}
      />
      <FitCamera topology={topology} target={target} />
      <Invalidate deps={[phase, palette, still]} />
    </Canvas>
  );
}

/**
 * Pull the camera back (along the spec's own viewing direction) until every
 * node and its label fits the canvas at the widest sway, for this aspect
 * ratio. Layouts are authored once; the figure is read at phone width and at
 * desktop width, and a fixed camera crops one of them.
 */
function FitCamera({ topology, target }: { topology: Topology; target: THREE.Vector3 }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const sway = 0.25;
    // Half-extents of the layout around its own centre, with a world-space
    // margin for the HTML labels (above each node) and their widths.
    let ex = 0;
    let eyUp = 0;
    let eyDown = 0;
    let ez = 0;
    for (const n of topology.nodes) {
      const r = 0.2 * (n.size ?? 1);
      const [x, y, z] = [n.pos[0] - target.x, n.pos[1] - target.y, n.pos[2] - target.z];
      ex = Math.max(ex, Math.abs(x) * Math.cos(sway) + Math.abs(z) * Math.sin(sway) + 1.15);
      eyUp = Math.max(eyUp, y + r + 0.55);
      eyDown = Math.max(eyDown, -y + r + 0.15);
      ez = Math.max(ez, Math.abs(z));
    }
    const ey = Math.max(eyUp, eyDown);
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const aspect = size.width / Math.max(1, size.height);
    const d = Math.max(ex / (t * aspect), ey / t) * 1.02 + ez * 0.6;
    const dir = new THREE.Vector3(...(topology.camera ?? [0, 1.6, 9.5])).normalize();
    cam.position.copy(target.clone().add(dir.multiplyScalar(d)));
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, topology, target]);
  return null;
}

/** A slow ±14° sway, so depth reads without the figure ever turning its back. */
function Sway({ still, children }: { still: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || still) return;
    ref.current.rotation.y = 0.25 * Math.sin(clock.elapsedTime * 0.18);
  });
  return <group ref={ref}>{children}</group>;
}

function Invalidate({ deps }: { deps: unknown[] }) {
  const invalidate = useThree((s) => s.invalidate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => invalidate(), deps);
  return null;
}

type Built = {
  curves: Map<string, THREE.QuadraticBezierCurve3>;
  points: Map<string, THREE.Vector3[]>;
};

function buildCurves(t: Topology): Built {
  const pos = new Map(t.nodes.map((n) => [n.id, new THREE.Vector3(...n.pos)]));
  const curves = new Map<string, THREE.QuadraticBezierCurve3>();
  const points = new Map<string, THREE.Vector3[]>();
  for (const e of t.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    // Bend perpendicular to the edge, in the plane that contains the up axis,
    // so arcs read the same from every orbit angle.
    const dir = b.clone().sub(a);
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3(0, 1, 0);
    side.normalize().multiplyScalar(e.bend ?? 0.35);
    const c = new THREE.QuadraticBezierCurve3(a, mid.add(side), b);
    curves.set(edgeKey(e), c);
    points.set(edgeKey(e), c.getPoints(32));
  }
  return { curves, points };
}

function Graph({
  topology,
  palette,
  phase,
  phaseStart,
  still,
}: Omit<Props, "visible">) {
  const built = useMemo(() => buildCurves(topology), [topology]);
  const current = topology.phases[phase];
  const active = useMemo(() => new Set(current?.edges ?? []), [current]);
  const activeNodes = useMemo(() => {
    const s = new Set<string>();
    for (const k of active) {
      const [from, to] = k.split(">");
      s.add(from);
      s.add(to);
    }
    return s;
  }, [active]);

  return (
    <group>
      {topology.edges.map((e) => {
        const k = edgeKey(e);
        const pts = built.points.get(k);
        if (!pts) return null;
        const on = active.has(k);
        return (
          <Line
            key={k}
            points={pts}
            color={on ? palette.accent : palette.dim}
            lineWidth={on ? 2.4 : 1}
            transparent
            opacity={on ? 0.95 : 0.35}
          />
        );
      })}
      {topology.nodes.map((n) => (
        <Node
          key={n.id}
          label={n.label}
          sub={n.sub}
          pos={n.pos}
          kind={n.kind ?? "module"}
          size={n.size ?? 1}
          on={activeNodes.has(n.id)}
          palette={palette}
        />
      ))}
      {!still &&
        [...active].map((k) => {
          const c = built.curves.get(k);
          if (!c) return null;
          return Array.from({ length: PULSES_PER_EDGE }, (_, i) => (
            <Pulse
              key={`${k}-${i}`}
              curve={c}
              offset={i / PULSES_PER_EDGE}
              phaseStart={phaseStart}
              color={palette.accent}
            />
          ));
        })}
    </group>
  );
}

function Pulse({
  curve,
  offset,
  phaseStart,
  color,
}: {
  curve: THREE.QuadraticBezierCurve3;
  offset: number;
  phaseStart: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const elapsed = (performance.now() - phaseStart) / 1000;
    const t = (elapsed * 0.7 + offset) % 1;
    curve.getPoint(t, tmp);
    m.position.copy(tmp);
    // Fade in from the source and out at the target so pulses read as
    // something travelling, not dots teleporting at the ends.
    const s = Math.sin(Math.PI * t);
    m.scale.setScalar(0.6 + 0.6 * s);
    (m.material as THREE.MeshBasicMaterial).opacity = s;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshBasicMaterial color={color} transparent />
    </mesh>
  );
}

function Shape({ kind, r }: { kind: TopoKind; r: number }) {
  switch (kind) {
    case "io":
      return <boxGeometry args={[r * 1.6, r * 1.6, r * 1.6]} />;
    case "store":
      return <cylinderGeometry args={[r, r, r * 1.5, 24]} />;
    case "model":
      return <icosahedronGeometry args={[r * 1.15, 0]} />;
    case "check":
      return <octahedronGeometry args={[r * 1.15, 0]} />;
    default:
      return <sphereGeometry args={[r, 24, 24]} />;
  }
}

function Node({
  label,
  sub,
  pos,
  kind,
  size,
  on,
  palette,
}: {
  label: string;
  sub?: string;
  pos: [number, number, number];
  kind: TopoKind;
  size: number;
  on: boolean;
  palette: TopologyPalette;
}) {
  const r = 0.2 * size;
  return (
    <group position={pos}>
      <mesh>
        <Shape kind={kind} r={r} />
        <meshStandardMaterial
          color={on ? palette.accent : palette.dim}
          emissive={on ? palette.accent : "#000000"}
          emissiveIntensity={on ? 0.6 : 0}
          roughness={0.55}
          metalness={0.05}
          flatShading={kind === "model" || kind === "check"}
        />
      </mesh>
      {/* HTML, not WebGL text: a fixed pixel size in the site's own face
          and colours, legible at every canvas width. */}
      <Html position={[0, r + 0.08, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div className={"topo-label" + (on ? " is-on" : "")}>
          <div className="topo-label__name">{label}</div>
          {sub && <div className="topo-label__sub">{sub}</div>}
        </div>
      </Html>
    </group>
  );
}
