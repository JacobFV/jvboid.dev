"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  ScrollControls,
  Text,
  useScroll,
} from "@react-three/drei";
import * as THREE from "three";

export type Panel = { title: string; body: string };

type Props = {
  panels: Panel[];
};

// The vision room: dark, foggy, dolly along a bezier path past floating
// panels. Driven entirely by scroll. WebGL fallback is the parent's job.
export function VisionRoomScene({ panels }: Props) {
  const pages = Math.max(2, panels.length + 1);

  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ fov: 38, position: [0, 1.4, 7] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fog attach="fog" args={["#08090B", 6, 30]} />
      <color attach="background" args={["#08090B"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 4]} intensity={0.7} />
      <pointLight position={[-6, -2, -8]} intensity={0.4} color="#FF6B35" />

      <Suspense fallback={null}>
        <ScrollControls pages={pages} damping={0.18}>
          {/* Start ~half a panel in so the first beat is partly visible
              without the reader having to scroll first. */}
          <InitialScroll offset={0.5 / pages} />
          <CameraDolly panels={panels} />
          <Panels panels={panels} />
          <Floor />
        </ScrollControls>
      </Suspense>
    </Canvas>
  );
}

function InitialScroll({ offset }: { offset: number }) {
  const scroll = useScroll();
  useEffect(() => {
    const el = scroll.el;
    if (!el) return;
    el.scrollTop = (el.scrollHeight - el.clientHeight) * offset;
  }, [scroll, offset]);
  return null;
}

// Cubic-Bezier path along the +z axis with a soft S-curve in x.
function makePath(panelCount: number) {
  const segments = Math.max(panelCount, 2);
  const start = new THREE.Vector3(0, 1.6, 8);
  const end = new THREE.Vector3(0, 1.4, -segments * 4 - 2);
  const c1 = new THREE.Vector3(2.4, 1.8, 4);
  const c2 = new THREE.Vector3(-2.4, 1.2, -segments * 2);
  return new THREE.CubicBezierCurve3(start, c1, c2, end);
}

function CameraDolly({ panels }: { panels: Panel[] }) {
  const path = useMemo(() => makePath(panels.length), [panels.length]);
  const scroll = useScroll();
  const lookAhead = useRef(new THREE.Vector3());

  useFrame((state) => {
    const t = THREE.MathUtils.clamp(scroll.offset, 0, 1);
    const pos = path.getPointAt(t);
    state.camera.position.lerp(pos, 0.12);

    // Look slightly ahead along the path so the camera tracks forward.
    const ahead = path.getPointAt(Math.min(1, t + 0.04));
    lookAhead.current.lerp(ahead, 0.18);
    state.camera.lookAt(lookAhead.current);
  });
  return null;
}

function Panels({ panels }: { panels: Panel[] }) {
  return (
    <>
      {panels.map((p, i) => {
        const z = -i * 4 - 2;
        const x = i % 2 === 0 ? 1.2 : -1.2;
        return (
          <Float
            key={i}
            position={[x, 1.4, z]}
            rotation={[0, i % 2 === 0 ? -0.18 : 0.18, 0]}
            speed={0.6}
            rotationIntensity={0.18}
            floatIntensity={0.4}
          >
            <PanelMesh title={p.title} body={p.body} />
          </Float>
        );
      })}
    </>
  );
}

function PanelMesh({ title, body }: { title: string; body: string }) {
  // Frosted-glass plane. MeshTransmissionMaterial would be richer but
  // costs significantly more frame time; standard material with low
  // opacity reads close enough at the design's sober tempo.
  return (
    <group>
      <mesh>
        <planeGeometry args={[3.2, 2]} />
        <meshStandardMaterial
          color="#0E1014"
          transparent
          opacity={0.62}
          metalness={0.05}
          roughness={0.85}
        />
      </mesh>
      <Text
        position={[-1.45, 0.78, 0.02]}
        fontSize={0.16}
        color="#F2F4F8"
        anchorX="left"
        anchorY="top"
        maxWidth={2.9}
      >
        {title}
      </Text>
      <Text
        position={[-1.45, 0.5, 0.02]}
        fontSize={0.094}
        color="#9097A3"
        anchorX="left"
        anchorY="top"
        maxWidth={2.9}
        lineHeight={1.5}
      >
        {body}
      </Text>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -8]}>
      <planeGeometry args={[60, 80]} />
      <meshStandardMaterial color="#04050A" roughness={0.95} />
    </mesh>
  );
}
