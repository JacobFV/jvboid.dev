"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { nodeHref, type Edge, type Lane, type Node } from "@/lib/graph-types";

type LiteNode = Omit<Node, "body">;

type Props = {
  nodes: LiteNode[];
  edges: Edge[];
};

const SPHERE_RADIUS = 5;

const laneColor: Record<Lane, string> = {
  research: "#6FA8DC",
  building: "#93C47D",
  writing: "#C27BA0",
  personal: "#F1C232",
};

// Even distribution on a sphere — Fibonacci/golden-spiral lattice.
function fibonacciSphere(n: number, radius: number): THREE.Vector3[] {
  if (n <= 0) return [];
  const phi = Math.PI * (Math.sqrt(5) - 1);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = phi * i;
    out.push(
      new THREE.Vector3(
        Math.cos(theta) * r * radius,
        y * radius,
        Math.sin(theta) * r * radius,
      ),
    );
  }
  return out;
}

export function Hypersphere({ nodes }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stable assignment: sort by id, then drop onto the lattice.
  const homeMap = useMemo(() => {
    const sorted = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
    const lattice = fibonacciSphere(sorted.length, SPHERE_RADIUS);
    const map = new Map<string, THREE.Vector3>();
    sorted.forEach((n, i) => map.set(n.id, lattice[i]));
    return map;
  }, [nodes]);

  const selected = selectedId
    ? nodes.find((n) => n.id === selectedId) ?? null
    : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(ellipse at center, #0b0d12 0%, #04050a 70%)",
        cursor: "grab",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 48 }}
        gl={{ antialias: true }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <ambientLight intensity={0.6} />

        {/* Faint sphere wireframe — gives the eye a horizon to rotate against. */}
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, 24, 16]} />
          <meshBasicMaterial
            color="#1a1d24"
            wireframe
            transparent
            opacity={0.15}
          />
        </mesh>

        {nodes.map((n, i) => {
          const home = homeMap.get(n.id);
          if (!home) return null;
          return (
            <GraphNode
              key={n.id}
              node={n}
              home={home}
              phase={i * 0.713}
              isSelected={selectedId === n.id}
              isDimmed={selectedId !== null && selectedId !== n.id}
              onSelect={() =>
                setSelectedId((cur) => (cur === n.id ? null : n.id))
              }
            />
          );
        })}

        <OrbitControls
          enablePan={false}
          enableZoom
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          autoRotate={selectedId === null}
          autoRotateSpeed={0.35}
          minDistance={6}
          maxDistance={18}
        />
      </Canvas>

      {selected && <Tooltip node={selected} onClose={() => setSelectedId(null)} />}

      <CornerLegend />
    </div>
  );
}

// Each node: a tiny brutalist tile in HTML, mounted at a 3D position.
// Per-frame we wobble the home position (ocean spring) and update CSS
// blur/opacity from the node's depth relative to the camera.
function GraphNode({
  node,
  home,
  phase,
  isSelected,
  isDimmed,
  onSelect,
}: {
  node: LiteNode;
  home: THREE.Vector3;
  phase: number;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const tileRef = useRef<HTMLButtonElement>(null);

  useFrame(({ clock, camera }) => {
    const g = groupRef.current;
    if (!g) return;

    // Spring-like wobble — sums of out-of-phase sines, deterministic per node.
    const t = clock.elapsedTime;
    const amp = 0.18;
    g.position.set(
      home.x + Math.sin(t * 0.7 + phase) * amp,
      home.y + Math.cos(t * 0.83 + phase * 1.3) * amp,
      home.z + Math.sin(t * 0.55 + phase * 0.7) * amp,
    );

    const tile = tileRef.current;
    if (!tile) return;

    // "Front" of sphere → 1, "back" → 0, from camera's perspective.
    const camDir = camera.position.clone().normalize();
    const facing = g.position.dot(camDir) / SPHERE_RADIUS;
    const t01 = THREE.MathUtils.clamp((facing + 1) / 2, 0, 1);

    const blur = (1 - t01) * 5.5;
    const baseOpacity = 0.12 + t01 * 0.88;
    const opacity = isDimmed ? baseOpacity * 0.25 : baseOpacity;

    tile.style.filter = blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : "";
    tile.style.opacity = opacity.toFixed(3);
  });

  return (
    <group ref={groupRef}>
      <Html center distanceFactor={9} zIndexRange={[40, 0]}>
        <button
          ref={tileRef}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          aria-label={node.title}
          style={{
            position: "relative",
            display: "block",
            width: 14,
            height: 14,
            padding: 0,
            border: 0,
            borderRadius: 0,
            background: "#f2f4f8",
            cursor: "pointer",
            outline: isSelected
              ? "1px solid #ff6b35"
              : "1px solid transparent",
            outlineOffset: 3,
            transition: "outline-color 140ms ease",
          }}
        >
          {/* Lane stripe — the only chromatic cue, like in the small cards. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 3,
              height: "100%",
              background: laneColor[node.lane],
            }}
          />
        </button>
      </Html>
    </group>
  );
}

function Tooltip({
  node,
  onClose,
}: {
  node: LiteNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={node.title}
      style={{
        position: "fixed",
        left: "50%",
        bottom: 32,
        transform: "translateX(-50%)",
        width: "min(420px, calc(100vw - 32px))",
        background: "rgba(8, 9, 11, 0.92)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--color-bg-2)",
        padding: "14px 16px",
        zIndex: 50,
        fontFamily: "var(--font-mono)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 11,
          color: "var(--color-ink-mute)",
          marginBottom: 8,
        }}
      >
        <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {node.lane} · {node.kind}
        </span>
        <button
          onClick={onClose}
          aria-label="close"
          style={{
            background: "transparent",
            border: 0,
            color: "var(--color-ink-mute)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 19,
          letterSpacing: "-0.01em",
          color: "var(--color-ink)",
          marginBottom: 6,
          lineHeight: 1.2,
        }}
      >
        {node.title}
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--color-ink-dim)",
          margin: "0 0 12px 0",
        }}
      >
        {node.summary}
      </p>
      <Link
        href={nodeHref(node)}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--color-accent)",
          textDecoration: "none",
        }}
      >
        open →
      </Link>
    </div>
  );
}

function CornerLegend() {
  const items: { color: string; label: string }[] = [
    { color: laneColor.research, label: "research" },
    { color: laneColor.building, label: "building" },
    { color: laneColor.writing, label: "writing" },
    { color: laneColor.personal, label: "personal" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--color-ink-mute)",
        display: "grid",
        gap: 4,
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      {items.map((i) => (
        <div
          key={i.label}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              width: 8,
              height: 3,
              background: i.color,
            }}
          />
          <span>{i.label}</span>
        </div>
      ))}
      <div
        style={{
          marginTop: 8,
          opacity: 0.5,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: 10,
        }}
      >
        drag · scroll · tap
      </div>
    </div>
  );
}
