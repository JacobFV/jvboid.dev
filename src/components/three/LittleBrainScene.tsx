"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * My Little Brain's brain, on the project page.
 *
 * A port of the app's own scene (JacobFV/my-little-brain, packages/brain/src/
 * model.ts and anatomy.ts), not a lookalike: the cortex and subcortex are the
 * app's 28 template meshes (fsaverage pial surfaces and ENIGMA subcortical
 * surfaces, see public/assets/media/my-little-brain/anatomy/README.txt), and
 * the eyes, optic nerves and cervical cord are its stylized character
 * attachments, rebuilt from the same numbers.
 *
 * What it does here is a smaller set than in the app: the eyes follow the
 * reader's pointer and blink, the brain breathes, a drag turns it and it eases
 * back to face forward, and "inside" makes the cortex translucent to show the
 * nuclei. Nothing in it depicts measured activity.
 */

const BASE = "/assets/media/my-little-brain/anatomy";
const CORTEX = "#df9ca3";

const PALETTE: Record<string, string> = {
  accumbens: "#cfa269",
  amygdala: "#ce8587",
  caudate: "#79a399",
  hippocampus: "#bc97b1",
  pallidum: "#bda75f",
  putamen: "#8e9cbd",
  thalamus: "#d29b76",
  ventricle: "#89bcca",
  cerebellum: "#c58c9a",
  brainstem: "#d4a59c",
  ventral: "#c5ad84",
  white: "#e8d9d0",
  corpus: "#ead7b3",
  third: "#89bcca",
  fourth: "#89bcca",
};

function decodeAnatomy(buffer: ArrayBuffer): THREE.BufferGeometry {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12 || view.getUint32(0, true) !== 0x314e5242) throw new Error("bad anatomy mesh");
  const vertices = view.getUint32(4, true);
  const triangles = view.getUint32(8, true);
  if (buffer.byteLength !== 12 + vertices * 16 + triangles * 12) throw new Error("bad anatomy mesh size");
  const positions = new Float32Array(buffer, 12, vertices * 3);
  const shades = new Float32Array(buffer, 12 + vertices * 12, vertices);
  const indices = new Uint32Array(buffer, 12 + vertices * 16, triangles * 3);
  const colors = new Float32Array(vertices * 3);
  for (let i = 0; i < vertices; i++) colors.fill(shades[i], i * 3, i * 3 + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

type Loaded = { cortex: THREE.Group; subcortex: THREE.Group };

async function loadAnatomy(signal: AbortSignal): Promise<Loaded> {
  const cortex = new THREE.Group();
  const subcortex = new THREE.Group();
  const res = await fetch(`${BASE}/manifest.json`, { signal });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  const manifest = (await res.json()) as { meshes: Array<{ name: string; file: string; kind: string }> };
  await Promise.all(
    manifest.meshes.map(async (entry) => {
      if (!/^[a-z-]+\.bin$/.test(entry.file)) throw new Error("bad anatomy path");
      const r = await fetch(`${BASE}/${entry.file}`, { signal });
      if (!r.ok) throw new Error(`${entry.file} ${r.status}`);
      const isCortex = entry.kind === "cortex";
      const mesh = new THREE.Mesh(
        decodeAnatomy(await r.arrayBuffer()),
        new THREE.MeshPhysicalMaterial({
          color: isCortex ? CORTEX : PALETTE[entry.name.split("-")[0]] || "#bcaaa0",
          vertexColors: isCortex,
          roughness: isCortex ? 0.66 : 0.48,
          metalness: 0,
          clearcoat: isCortex ? 0.06 : 0.1,
        }),
      );
      mesh.name = entry.name;
      mesh.userData.kind = entry.kind;
      (isCortex ? cortex : subcortex).add(mesh);
    }),
  );
  return { cortex, subcortex };
}

/** The app's setAnatomyMode: translucent cortex and visible nuclei when inside. */
function setInside({ cortex, subcortex }: Loaded, inside: boolean) {
  subcortex.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const kind = o.userData.kind as string;
    o.visible = inside || kind === "hindbrain";
    const m = o.material as THREE.MeshPhysicalMaterial;
    const translucent = kind === "white-matter" || (kind === "ventricle" && inside);
    m.transparent = translucent;
    m.opacity = kind === "white-matter" ? 0.11 : translucent ? 0.4 : 1;
    m.depthWrite = !translucent;
    m.needsUpdate = true;
  });
  cortex.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const m = o.material as THREE.MeshPhysicalMaterial;
    m.transparent = inside;
    m.opacity = inside ? 0.16 : 1;
    m.depthWrite = !inside;
    m.needsUpdate = true;
  });
}

function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 60) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 7, false), material);
}

/** The character attachments, from the app's createBrain(). */
function createCharacter() {
  const group = new THREE.Group();
  const skin = new THREE.MeshPhysicalMaterial({ color: "#e8a3aa", roughness: 0.52, clearcoat: 0.12, clearcoatRoughness: 0.65 });
  const nerve = new THREE.MeshStandardMaterial({ color: "#ecc4b4", roughness: 0.7 });
  const bone = new THREE.MeshStandardMaterial({ color: "#f1dfc7", roughness: 0.64 });
  const eyeWhite = new THREE.MeshPhysicalMaterial({ color: "#fffdf4", roughness: 0.23, clearcoat: 0.7 });
  const irisMat = new THREE.MeshStandardMaterial({ color: "#887649", roughness: 0.55 });
  const irisDark = new THREE.MeshStandardMaterial({ color: "#3d4030", roughness: 0.65 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: "#182322" });
  const glintMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const eyes: THREE.Group[] = [];
  const eyeRoots: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const root = new THREE.Group();
    root.position.set(side * 0.47, -0.43, 1.06);
    const ball = new THREE.Group();
    ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.255, 40, 32), eyeWhite));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), irisMat);
    iris.scale.z = 0.2;
    iris.position.z = 0.243;
    ball.add(iris);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.107, 0.009, 8, 48), irisDark);
    ring.position.z = 0.252;
    ball.add(ring);
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      ball.add(
        tube(
          [
            new THREE.Vector3(Math.cos(a) * 0.051, Math.sin(a) * 0.051, 0.266),
            new THREE.Vector3(Math.cos(a + 0.045) * 0.08, Math.sin(a + 0.045) * 0.08, 0.264),
            new THREE.Vector3(Math.cos(a) * 0.103, Math.sin(a) * 0.103, 0.257),
          ],
          0.0019,
          irisDark,
          5,
        ),
      );
    }
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.058, 24, 20), pupilMat);
    pupil.scale.z = 0.15;
    pupil.position.z = 0.269;
    ball.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 12), glintMat);
    glint.scale.z = 0.3;
    glint.position.set(-0.037, 0.041, 0.28);
    ball.add(glint);
    root.add(ball);
    group.add(root);
    eyes.push(ball);
    eyeRoots.push(root);
    for (let k = 0; k < 8; k++) {
      const o = (k - 3.5) * 0.015;
      group.add(
        tube(
          [new THREE.Vector3(side * 0.24 + o, -0.46, 0.1), new THREE.Vector3(side * 0.35 + o, -0.59, 0.37), new THREE.Vector3(side * 0.47 + o, -0.44 + o, 0.91)],
          0.013,
          nerve,
          20,
        ),
      );
    }
  }
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.008, -0.88, -0.397),
    new THREE.Vector3(0.005, -1.02, -0.37),
    new THREE.Vector3(0.018, -1.29, -0.3),
    new THREE.Vector3(0.008, -1.54, -0.235),
    new THREE.Vector3(0, -1.75, -0.22),
  ]);
  const cordGeo = new THREE.TubeGeometry(curve, 56, 1, 16, false);
  const pos = cordGeo.attributes.position;
  for (let row = 0; row <= 56; row++) {
    const t = row / 56;
    const c = curve.getPointAt(t);
    const r = 0.085 * (1 - 0.5 * t) + 0.023 * Math.exp(-Math.pow((t - 0.2) * 5, 2));
    for (let col = 0; col <= 16; col++) {
      const i = row * 17 + col;
      pos.setXYZ(i, c.x + (pos.getX(i) - c.x) * r, c.y + (pos.getY(i) - c.y) * r, c.z + (pos.getZ(i) - c.z) * r);
    }
  }
  cordGeo.computeVertexNormals();
  group.add(new THREE.Mesh(cordGeo, skin));
  for (let row = 0; row < 7; row++) {
    const t = 0.15 + row * 0.11;
    const c = curve.getPointAt(t);
    for (const side of [-1, 1])
      for (const ant of [-1, 1])
        for (let q = 0; q < 3; q++) {
          const o = (q - 1) * 0.013;
          group.add(
            tube(
              [
                new THREE.Vector3(c.x + side * 0.07, c.y + o, c.z + ant * 0.025),
                new THREE.Vector3(side * 0.15, c.y - 0.025 + o, c.z + ant * 0.04),
                new THREE.Vector3(side * (0.29 - row * 0.013), c.y - 0.09, c.z + ant * 0.07),
                new THREE.Vector3(side * (0.36 - row * 0.015), c.y - 0.13, c.z + 0.015),
              ],
              0.0065,
              nerve,
              20,
            ),
          );
        }
  }
  for (let i = 0; i < 4; i++) {
    const c = curve.getPointAt(0.57 + i * 0.115);
    const v = new THREE.Group();
    v.position.copy(c);
    v.position.z -= 0.015;
    v.rotation.x = -0.12;
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.12 - i * 0.007, 0.03, 10, 28, Math.PI * 1.8), bone);
    arch.rotation.x = Math.PI / 2;
    v.add(arch);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 14), bone);
    body.scale.set(1.35, 0.52, 0.7);
    body.position.z = 0.115;
    v.add(body);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), bone);
      wing.scale.set(1.7, 0.45, 0.65);
      wing.position.set(side * 0.135, 0, -0.01);
      v.add(wing);
    }
    group.add(v);
  }
  return { group, eyes, eyeRoots };
}

function dispose(o: THREE.Object3D) {
  o.traverse((x) => {
    if (x instanceof THREE.Mesh) {
      x.geometry.dispose();
      for (const m of Array.isArray(x.material) ? x.material : [x.material]) m.dispose();
    }
  });
}

type Status = "loading" | "ready" | "failed";

function Brain({ inside, still, onStatus }: { inside: boolean; still: boolean; onStatus: (s: Status) => void }) {
  const character = useMemo(createCharacter, []);
  const root = useRef<THREE.Group>(null);
  const [anatomy, setAnatomy] = useState<Loaded | null>(null);
  const pointer = useRef(new THREE.Vector2(0, 0));
  const drag = useRef({ on: false, x: 0, y: 0, yaw: 0, pitch: 0, last: 0 });
  const blink = useRef({ next: 2.5, start: -10 });
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const ac = new AbortController();
    onStatus("loading");
    loadAnatomy(ac.signal)
      .then((a) => {
        setAnatomy(a);
        onStatus("ready");
      })
      .catch((e) => {
        if (!ac.signal.aborted) {
          console.warn("my-little-brain anatomy:", e);
          onStatus("failed");
        }
      });
    return () => ac.abort();
  }, [onStatus]);

  useEffect(() => () => dispose(character.group), [character]);
  useEffect(() => () => { if (anatomy) { dispose(anatomy.cortex); dispose(anatomy.subcortex); } }, [anatomy]);
  useEffect(() => {
    if (anatomy) setInside(anatomy, inside);
    invalidate();
  }, [anatomy, inside, invalidate]);

  // The eyes follow the pointer anywhere on the page, not just over the
  // canvas: the brain is looking at the reader.
  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      const d = drag.current;
      if (d.on) {
        d.yaw += (e.clientX - d.x) * 0.008;
        d.pitch = THREE.MathUtils.clamp(d.pitch + (e.clientY - d.y) * 0.006, -0.6, 0.6);
        d.x = e.clientX;
        d.y = e.clientY;
        d.last = performance.now();
      }
      invalidate();
    };
    const onDown = (e: PointerEvent) => {
      Object.assign(drag.current, { on: true, x: e.clientX, y: e.clientY, last: performance.now() });
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      drag.current.on = false;
      drag.current.last = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, invalidate]);

  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const d = drag.current;
    // Four seconds after the last drag, ease back to face the reader, as the
    // app does.
    if (!d.on && performance.now() - d.last > 4000) {
      d.yaw *= still ? 0 : 0.94;
      d.pitch *= still ? 0 : 0.94;
    }
    g.rotation.y = d.yaw + (still ? 0 : 0.05 * Math.sin(t * 0.35));
    g.rotation.x = 0.045 + d.pitch;
    g.position.y = still ? 0 : 0.015 * Math.sin(t * 1.1);
    // Gaze: a point in front of the face, toward the pointer.
    target.set(pointer.current.x * 2.2, pointer.current.y * 1.6 + 0.2, 4.5);
    g.worldToLocal(target);
    const b = blink.current;
    if (!still && t > b.next) {
      b.start = t;
      b.next = t + 2.8 + Math.random() * 3.5;
    }
    const since = t - b.start;
    const lid = still ? 1 : since < 0.16 ? Math.max(0.08, Math.abs(1 - since / 0.08)) : 1;
    for (let i = 0; i < character.eyes.length; i++) {
      const dir = target.clone().sub(character.eyeRoots[i].position);
      character.eyes[i].rotation.set(
        THREE.MathUtils.clamp(-Math.atan2(dir.y, dir.z), -0.45, 0.45),
        THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -0.55, 0.55),
        0,
      );
      character.eyes[i].scale.y = lid;
    }
  });

  return (
    <group ref={root} position={[0, 0.25, 0]}>
      <primitive object={character.group} />
      {anatomy && <primitive object={anatomy.cortex} />}
      {anatomy && <primitive object={anatomy.subcortex} />}
    </group>
  );
}

export function LittleBrainScene({
  inside,
  still,
  visible,
  onStatus,
}: {
  inside: boolean;
  still: boolean;
  visible: boolean;
  onStatus: (s: Status) => void;
}) {
  return (
    <Canvas
      frameloop={visible && !still ? "always" : "demand"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 30, position: [0, 0, 7.4] }}
      style={{ position: "absolute", inset: 0, touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#fff7f2", "#dfe8d8", 0.6]} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.6} />
      <directionalLight position={[-4, 1, 2]} intensity={0.5} color="#fbe1ea" />
      <Brain inside={inside} still={still} onStatus={onStatus} />
    </Canvas>
  );
}
