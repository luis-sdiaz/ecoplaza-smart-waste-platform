import { Component, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera } from "@react-three/drei";
import {
  CurvePath,
  CylinderGeometry,
  LineCurve3,
  MeshStandardMaterial,
  Path,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { Group } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

function canAnimate() {
  return !window.matchMedia(motionQuery).matches && !document.hidden;
}

function createResources() {
  const body = new RoundedBoxGeometry(1.5, 2, 1.14, 4, 0.12);
  const vertices = body.attributes.position;
  for (let index = 0; index < vertices.count; index += 1) {
    const taper = 0.935 + vertices.getY(index) * 0.065;
    vertices.setX(index, vertices.getX(index) * taper);
    vertices.setZ(index, vertices.getZ(index) * taper);
  }
  body.computeVertexNormals();

  // Geometric strokes traced from the installed Lucide Recycle icon (ISC).
  const recyclePaths = [
    new Path().moveTo(7, 19).lineTo(4.815, 19)
      .quadraticCurveTo(3.7, 19, 3.245, 18.119)
      .quadraticCurveTo(2.7, 17.23, 3.241, 16.335).lineTo(7.196, 9.5),
    new Path().moveTo(11, 19).lineTo(19.203, 19)
      .quadraticCurveTo(20.3, 19, 20.759, 18.11)
      .quadraticCurveTo(21.3, 17.23, 20.759, 16.335).lineTo(19.533, 14.215),
    new Path().moveTo(14, 16).lineTo(11, 19).lineTo(14, 22),
    new Path().moveTo(8.293, 13.596).lineTo(7.196, 9.5).lineTo(3.1, 10.598),
    new Path().moveTo(9.344, 5.811).lineTo(10.437, 3.919)
      .quadraticCurveTo(11, 3, 11.985, 3)
      .quadraticCurveTo(13, 3, 13.531, 3.888).lineTo(17.474, 10.731),
    new Path().moveTo(13.378, 9.633).lineTo(17.474, 10.731).lineTo(18.571, 6.635),
  ];
  const strokes = recyclePaths.map((path) => {
    const points = path.getPoints(6).map(({ x, y }) => new Vector3((x - 12) / 24, (12 - y) / 24, 0));
    const curve = new CurvePath<Vector3>();
    points.slice(1).forEach((point, index) => curve.add(new LineCurve3(points[index], point)));
    return new TubeGeometry(curve, Math.max(16, points.length * 3), 0.031, 6, false);
  });
  const recycle = mergeGeometries(strokes);
  strokes.forEach((stroke) => stroke.dispose());

  return {
    body,
    rounded: new RoundedBoxGeometry(1, 1, 1, 3, 0.09),
    recycle,
    cylinder: new CylinderGeometry(1, 1, 1, 20),
    dot: new SphereGeometry(1, 12, 8),
    arc: new TorusGeometry(1, 0.085, 6, 20, Math.PI / 2),
    ring: new TorusGeometry(1, 0.075, 6, 32),
    shell: new MeshStandardMaterial({ color: "#296f51", roughness: 0.48, metalness: 0.12 }),
    dark: new MeshStandardMaterial({ color: "#1a3a2e", roughness: 0.65, metalness: 0.1 }),
    panel: new MeshStandardMaterial({ color: "#1c573d", roughness: 0.55, metalness: 0.1 }),
    edge: new MeshStandardMaterial({ color: "#42886b", roughness: 0.38, metalness: 0.42 }),
    icon: new MeshStandardMaterial({ color: "#ccf0dc", roughness: 0.45, metalness: 0.1 }),
    led: new MeshStandardMaterial({
      color: "#6fdfac",
      emissive: "#2cb67d",
      emissiveIntensity: 0.65,
      roughness: 0.4,
    }),
  };
}

type Resources = ReturnType<typeof createResources>;

function SmartContainer({ resources: r, animate }: { resources: Resources; animate: boolean }) {
  const group = useRef<Group>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (animate) time.current += Math.min(delta, 0.05);
    group.current.rotation.y = -0.12 + (animate ? Math.sin(time.current * 0.3) * 0.12 : 0);
    group.current.position.y = animate ? Math.sin(time.current * 0.75) * 0.025 : 0;
  });

  return (
    <group ref={group} rotation={[0, -0.12, 0]}>
      <mesh geometry={r.body} material={r.shell} castShadow receiveShadow />
      <mesh geometry={r.rounded} material={r.dark} position={[0, 0.98, 0]} scale={[1.52, 0.095, 1.16]} />
      <mesh geometry={r.rounded} material={r.shell} position={[0, 1.095, 0]} scale={[1.64, 0.19, 1.28]} castShadow receiveShadow />
      <mesh geometry={r.rounded} material={r.edge} position={[0, 1.196, 0.08]} scale={[1.39, 0.018, 0.98]} />
      <mesh geometry={r.rounded} material={r.shell} position={[0, 1.208, 0.08]} scale={[1.34, 0.024, 0.93]} />

      {[-0.24, 0.24].map((x) => (
        <mesh key={x} geometry={r.rounded} material={r.dark} position={[x, 1.275, 0.17]} scale={[0.075, 0.13, 0.11]} castShadow />
      ))}
      <mesh geometry={r.rounded} material={r.dark} position={[0, 1.35, 0.17]} scale={[0.55, 0.075, 0.11]} castShadow />

      {/* The front insert sits just above the tapered shell. */}
      <group position={[0, -0.09, 0.552]} rotation={[0.065, 0, 0]}>
        <mesh geometry={r.rounded} material={r.edge} scale={[1.11, 1.12, 0.035]} />
        <mesh geometry={r.rounded} material={r.panel} position={[0, 0, 0.02]} scale={[1.07, 1.08, 0.035]} />
        <mesh geometry={r.recycle} material={r.icon} position={[0, 0.055, 0.065]} scale={0.94} />
        <mesh geometry={r.rounded} material={r.edge} position={[-0.14, -0.385, 0.043]} scale={[0.3, 0.023, 0.012]} />
        <mesh geometry={r.rounded} material={r.led} position={[0.19, -0.385, 0.043]} scale={[0.15, 0.023, 0.012]} />
      </group>

      <group position={[0, 0.745, 0.566]}>
        <mesh geometry={r.rounded} material={r.dark} scale={[0.63, 0.185, 0.052]} />
        <mesh geometry={r.dot} material={r.led} position={[-0.195, 0, 0.038]} scale={0.033} />
        <mesh geometry={r.rounded} material={r.edge} position={[0.055, 0.019, 0.029]} scale={[0.25, 0.021, 0.012]} />
        <mesh geometry={r.rounded} material={r.edge} position={[0.015, -0.027, 0.029]} scale={[0.17, 0.013, 0.012]} />
      </group>

      {/* Recessed side grip and three short ventilation slots. */}
      <mesh geometry={r.rounded} material={r.dark} position={[0.716, 0.54, -0.005]} scale={[0.026, 0.135, 0.38]} />
      {[-0.51, -0.63, -0.75].map((y) => (
        <mesh key={y} geometry={r.rounded} material={r.dark} position={[0.7 + y * 0.048, y, -0.04]} scale={[0.019, 0.034, 0.37]} />
      ))}
      <mesh geometry={r.rounded} material={r.dark} position={[0, -0.985, 0]} scale={[1.3, 0.13, 0.98]} />
      {[-0.64, 0.64].map((x) => (
        <group key={x} position={[x, -1.115, -0.27]} rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={r.cylinder} material={r.dark} scale={[0.19, 0.135, 0.19]} castShadow />
          <mesh geometry={r.cylinder} material={r.edge} scale={[0.094, 0.14, 0.094]} />
          <mesh geometry={r.cylinder} material={r.dark} scale={[0.033, 0.145, 0.033]} />
        </group>
      ))}
      {[-0.49, 0.49].map((x) => (
        <mesh key={x} geometry={r.rounded} material={r.dark} position={[x, -1.075, 0.35]} scale={[0.13, 0.18, 0.19]} castShadow />
      ))}
    </group>
  );
}

const chips = [
  { kind: "wifi", position: [-1.48, 0.7, 0.1], phase: 0 },
  { kind: "bars", position: [1.48, 0.35, 0.05], phase: 2.1 },
  { kind: "sensor", position: [-1.22, -0.78, 0.42], phase: 4.2 },
] as const;

function IoTChip({ chip, resources: r, animate }: {
  chip: (typeof chips)[number];
  resources: Resources;
  animate: boolean;
}) {
  const group = useRef<Group>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (animate) time.current += Math.min(delta, 0.05);
    const phase = time.current * 0.38 + chip.phase;
    group.current.position.set(
      chip.position[0] + (animate ? Math.cos(phase) * 0.075 : 0),
      chip.position[1] + (animate ? Math.sin(phase) * 0.055 : 0),
      chip.position[2] + (animate ? Math.sin(phase) * 0.1 : 0),
    );
    group.current.rotation.z = animate ? Math.sin(phase) * 0.055 : 0;
  });

  return (
    <group ref={group} position={[...chip.position]} rotation={[0, 0.3, 0]}>
      <mesh geometry={r.rounded} material={r.edge} scale={[0.48, 0.48, 0.09]} />
      <mesh geometry={r.rounded} material={r.panel} position={[0, 0, 0.018]} scale={[0.455, 0.455, 0.08]} />
      <group position={[0, 0, 0.071]}>
        {chip.kind === "wifi" && (
          <>
            {[0.11, 0.19].map((radius) => (
              <mesh key={radius} geometry={r.arc} material={r.icon} position={[0, -0.085, 0]} rotation={[0, 0, Math.PI / 4]} scale={radius} />
            ))}
            <mesh geometry={r.dot} material={r.led} position={[0, -0.085, 0]} scale={0.024} />
          </>
        )}
        {chip.kind === "bars" && [0.085, 0.15, 0.23].map((height, index) => (
          <mesh key={height} geometry={r.rounded} material={index === 2 ? r.led : r.icon} position={[(index - 1) * 0.095, height / 2 - 0.115, 0]} scale={[0.049, height, 0.025]} />
        ))}
        {chip.kind === "sensor" && (
          <>
            <mesh geometry={r.ring} material={r.icon} scale={0.135} />
            <mesh geometry={r.ring} material={r.edge} scale={0.078} />
            <mesh geometry={r.dot} material={r.led} scale={0.026} />
          </>
        )}
      </group>
    </group>
  );
}

function Scene({ animate }: { animate: boolean }) {
  const resources = useMemo(() => createResources(), []);
  const { gl, invalidate } = useThree();

  useEffect(() => () => {
    Object.values(resources).forEach((resource) => resource.dispose());
  }, [resources]);

  useEffect(() => {
    // Let the browser restore the context after a temporary GPU interruption.
    const onContextLost = (event: Event) => event.preventDefault();
    const onContextRestored = () => invalidate();
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [gl, invalidate]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[3.3, 2.35, 6.7]} fov={26} near={0.1} far={30} onUpdate={(camera) => camera.lookAt(0, 0.04, 0)} />
      <ambientLight intensity={1.2} color="#f1f8f4" />
      <directionalLight
        position={[-3, 6, 5]}
        intensity={2.4}
        color="#fffdf7"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-normalBias={0.035}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[3, 2, -3]} intensity={2} color="#9bdfbd" />
      <SmartContainer resources={resources} animate={animate} />
      {chips.map((chip) => <IoTChip key={chip.kind} chip={chip} resources={resources} animate={animate} />)}
      <ContactShadows position={[0, -1.33, 0]} frames={1} resolution={256} blur={2.5} opacity={0.3} far={3} scale={5} color="#082d20" />
    </>
  );
}

function ContainerFallback() {
  return (
    <svg aria-hidden="true" viewBox="0 0 420 340" width="100%" height="100%">
      <ellipse cx="221" cy="294" rx="89" ry="12" fill="#082d20" opacity=".3" />
      <path d="m154 92 117 16-10 171-98-16z" fill="#1f7a4d" stroke="#42886b" />
      <path d="m271 108 43-29-13 169-40 31z" fill="#155d3a" />
      <path d="m146 77 45-24 128 18-48 34z" fill="#42886b" />
      <path d="m146 77 125 18 48-24v16l-47 33-126-18z" fill="#1f7a4d" stroke="#102e24" />
      <path d="m201 64 3-11 35 5v10" fill="none" stroke="#102e24" strokeWidth="7" strokeLinejoin="round" />
      <path d="m175 153 73 9-4 74-66-9z" fill="#155d3a" stroke="#42886b" />
      <g fill="none" stroke="#ccf0dc" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m202 183 9-14 11 21m-8-1 9 2 3-9M230 202l6 14h-22m5-6-6 7 6 6M197 216h-15l11-22m-9 2 10-3 2 10" />
      </g>
      <path d="m184 128 52 7" stroke="#102e24" strokeWidth="12" strokeLinecap="round" />
      <circle cx="187" cy="128" r="3" fill="#6fdfac" />
      <path d="m174 267 1 14m79-4-1 14" stroke="#102e24" strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ContainerFallback /> : this.props.children;
  }
}

export default function EcoContainer3D() {
  const animate = useSyncExternalStore(subscribeToMotion, canAnimate, () => false);

  return (
    <SceneBoundary>
      <Canvas
        aria-hidden="true"
        dpr={[1, 1.5]}
        frameloop={animate ? "always" : "demand"}
        shadows
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        fallback={<ContainerFallback />}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <Scene animate={animate} />
      </Canvas>
    </SceneBoundary>
  );
}
