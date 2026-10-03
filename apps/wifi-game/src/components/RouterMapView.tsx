import { useRef, Suspense, useEffect, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const BASE_URL = import.meta.env.BASE_URL;

interface Props { onClose: () => void; }

/* ─────── Floor Plan Drawing Helper ─────────────────────── */
function FloorPlanOverlay({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const HOUSE = { xMin: -7, xMax: 7, zMin: -3, zMax: 11 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const scale = Math.min(width, height) / 15;
    const offsetX = width / 2;
    const offsetY = height / 2;

    const worldToCanvas = (wx: number, wz: number) => {
      return { x: offsetX + wx * scale, y: offsetY - wz * scale };
    };

    ctx.strokeStyle = "rgba(200, 120, 60, 0.5)";
    ctx.lineWidth = 2.5;

    // Boundary
    ctx.strokeRect(
      worldToCanvas(HOUSE.xMin, HOUSE.zMin).x,
      worldToCanvas(HOUSE.xMax, HOUSE.zMax).y,
      (HOUSE.xMax - HOUSE.xMin) * scale,
      (HOUSE.zMax - HOUSE.zMin) * scale
    );

    // Internal walls
    ctx.beginPath();
    ctx.moveTo(worldToCanvas(0, HOUSE.zMin).x, worldToCanvas(0, HOUSE.zMin).y);
    ctx.lineTo(worldToCanvas(0, 2).x, worldToCanvas(0, 2).y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(worldToCanvas(HOUSE.xMin, 3.5).x, worldToCanvas(HOUSE.xMin, 3.5).y);
    ctx.lineTo(worldToCanvas(HOUSE.xMax, 3.5).x, worldToCanvas(HOUSE.xMax, 3.5).y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(worldToCanvas(-0.5, 3.5).x, worldToCanvas(-0.5, 3.5).y);
    ctx.lineTo(worldToCanvas(-0.5, 8).x, worldToCanvas(-0.5, 8).y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(worldToCanvas(HOUSE.xMin, 8).x, worldToCanvas(HOUSE.xMin, 8).y);
    ctx.lineTo(worldToCanvas(HOUSE.xMax, 8).x, worldToCanvas(HOUSE.xMax, 8).y);
    ctx.stroke();
  }, [width, height]);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }} />;
}

const ROOMS = [
  { id:"living",  label:"Living Room", x:-3.5, z: 0.5 },
  { id:"kitchen", label:"Kitchen",     x: 3.0, z:-1.0 },
  { id:"bed1",    label:"Bedroom 1",   x:-3.5, z: 5.5 },
  { id:"bed2",    label:"Bedroom 2",   x: 3.0, z: 5.0 },
  { id:"bath",    label:"Bathroom",    x: 3.0, z: 9.0 },
];

function signal(rx: number, rz: number, wx: number, wz: number) {
  const d = Math.sqrt((wx - rx) ** 2 + (wz - rz) ** 2);
  return Math.max(8, Math.min(99, Math.round(100 - d * 10)));
}
function equityScore(rx: number, rz: number) {
  const s = ROOMS.map(r => signal(r.x, r.z, rx, rz));
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  const sd   = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
  return Math.max(0, Math.round(100 - sd * 2));
}
function sigColor(v: number) {
  if (v >= 80) return "#82c46a";
  if (v >= 60) return "#d4a840";
  if (v >= 40) return "#d07830";
  return "#c04030";
}

/* ─── Heatmap canvas texture ─────────────────────────────── */
function buildHeatmap(canvas: HTMLCanvasElement, rx: number, rz: number) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const WORLD = 22;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const wx = (px / W - 0.5) * WORLD;
      const wz = (py / H - 0.5) * WORLD;
      const d  = Math.sqrt((wx - rx) ** 2 + (wz - rz) ** 2);
      const s  = Math.max(0, 1 - (d / (WORLD * 0.65)) ** 1.3);
      const i  = (py * W + px) * 4;
      img.data[i]   = Math.round(s * 200 + 18);
      img.data[i+1] = Math.round(s * 120 + 8);
      img.data[i+2] = Math.round(s * 12);
      img.data[i+3] = Math.round(s * 160 + 20);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ─── Orthographic camera ────────────────────────────────── */
function TopDownCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const zoom = 38;
    cam.left = -size.width / 2 / zoom; cam.right = size.width / 2 / zoom;
    cam.top  =  size.height / 2 / zoom; cam.bottom = -size.height / 2 / zoom;
    cam.near = 0.1; cam.far = 300;
    cam.position.set(0, 40, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* ─── Apartment model ─────────────────────────────────────── */
function HouseModel() {
  const gltf = useGLTF(`${BASE_URL}apartment.glb`);
  const ref  = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(ref.current);
    ref.current.position.sub(box.getCenter(new THREE.Vector3()));
    ref.current.position.y = 0;
  }, [gltf]);
  return <primitive ref={ref} object={gltf.scene} />;
}

/* ─── Heatmap mesh ───────────────────────────────────────── */
function Heatmap({ routerPos }: { routerPos: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasEl = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 512; return c;
  }, []);
  const texRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    buildHeatmap(canvasEl, routerPos.x, routerPos.z);
    if (!texRef.current) texRef.current = new THREE.CanvasTexture(canvasEl);
    else texRef.current.needsUpdate = true;
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.map = texRef.current; mat.needsUpdate = true;
    }
  }, [routerPos, canvasEl]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <planeGeometry args={[22, 22]} />
      <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ─── Signal wave rings ──────────────────────────────────── */
function Waves({ routerPos }: { routerPos: THREE.Vector3 }) {
  const N = 6;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.55 + i / N) % 1;
      const s = 1 + phase * 13;
      m.scale.set(s, s, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.38;
    });
  });
  return (
    <>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={el => { refs.current[i] = el; }}
          position={[routerPos.x, 0.08, routerPos.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.88, 1.0, 64]} />
          <meshBasicMaterial color="#c08030" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

/* ─── Animated DATA PACKETS (InstancedMesh — GPU-efficient) ─ */
const PACKET_COLORS = ["#60d0a8", "#a060d0", "#d09040", "#6090d0", "#d06090"];
const MAX_PACKETS   = 80;

interface Slot { active: boolean; roomIdx: number; t: number; speed: number; }

function DataPackets({ routerPos, roomSignals }: {
  routerPos: THREE.Vector3;
  roomSignals: { x: number; z: number; sig: number }[];
}) {
  const meshRef  = useRef<THREE.InstancedMesh>(null);
  const dummy    = useMemo(() => new THREE.Object3D(), []);
  const slots    = useRef<Slot[]>(
    Array.from({ length: MAX_PACKETS }, () => ({ active:false, roomIdx:0, t:0, speed:0.3 }))
  );
  const timer    = useRef(0);
  const colorObjs = useMemo(() => PACKET_COLORS.map(c => new THREE.Color(c)), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    timer.current += delta;
    if (timer.current > 0.12) {
      timer.current = 0;
      const ri = Math.floor(Math.random() * roomSignals.length);
      const free = slots.current.findIndex(s => !s.active);
      if (free >= 0) slots.current[free] = { active:true, roomIdx:ri, t:0, speed:0.35 + Math.random()*0.30 };
    }

    for (let i = 0; i < MAX_PACKETS; i++) {
      const s = slots.current[i];
      if (!s.active) {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      s.t += s.speed * delta;
      if (s.t >= 1) { s.active = false; dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); continue; }

      const room  = roomSignals[s.roomIdx];
      const tx    = routerPos.x + (room.x - routerPos.x) * s.t;
      const tz    = routerPos.z + (room.z - routerPos.z) * s.t;
      const alpha = s.t < 0.12 ? s.t / 0.12 : s.t > 0.82 ? (1 - s.t) / 0.18 : 1;
      dummy.position.set(tx, 0.30, tz);
      dummy.scale.setScalar(alpha * 0.22);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colorObjs[s.roomIdx % colorObjs.length]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PACKETS]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial emissiveIntensity={3.0} toneMapped={false} />
    </instancedMesh>
  );
}

/* ─── Router sphere ──────────────────────────────────────── */
function RouterDot({ pos }: { pos: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.12;
      meshRef.current.scale.setScalar(s);
    }
  });
  return (
    <mesh ref={meshRef} position={[pos.x, 0.30, pos.z]}>
      <sphereGeometry args={[0.28, 16, 16]} />
      <meshStandardMaterial color="#f0b050" emissive="#c07010" emissiveIntensity={2.2} />
    </mesh>
  );
}

/* ─── Room signal dot labels ─────────────────────────────── */
function RoomDots({ roomSignals }: { roomSignals: { x: number; z: number; sig: number; label: string }[] }) {
  return (
    <>
      {roomSignals.map((r, i) => (
        <mesh key={i} position={[r.x, 0.15, r.z]}>
          <sphereGeometry args={[0.20, 12, 12]} />
          <meshStandardMaterial color={sigColor(r.sig)} emissive={sigColor(r.sig)} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </>
  );
}

/* ─── Invisible drag plane ───────────────────────────────── */
function DragPlane({ onDrag }: { onDrag: (x: number, z: number) => void }) {
  const dragging = useRef(false);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}
      onPointerDown={e => { e.stopPropagation(); dragging.current = true; onDrag(clamp(e.point.x,-8,8), clamp(e.point.z,-4,12)); }}
      onPointerMove={e => { if (!dragging.current) return; e.stopPropagation(); onDrag(clamp(e.point.x,-8,8), clamp(e.point.z,-4,12)); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerLeave={() => { dragging.current = false; }}
    >
      <planeGeometry args={[30, 30]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

/* ─── Main export ─────────────────────────────────────────── */
export function RouterMapView({ onClose }: Props) {
  const [routerX, setRouterX] = useState(0);
  const [routerZ, setRouterZ] = useState(2);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleDrag = useCallback((x: number, z: number) => {
    setRouterX(x); setRouterZ(z); setIsDragging(true);
  }, []);

  useEffect(() => {
    if (viewportRef.current) {
      setViewportSize({ width: viewportRef.current.clientWidth, height: viewportRef.current.clientHeight });
    }
  }, []);

  const routerPos   = useMemo(() => new THREE.Vector3(routerX, 0, routerZ), [routerX, routerZ]);
  const equity      = equityScore(routerX, routerZ);
  const roomSignals = ROOMS.map(r => ({ ...r, sig: signal(r.x, r.z, routerX, routerZ) }));
  const equityColor = equity >= 70 ? "#82c46a" : equity >= 50 ? "#d4a840" : "#d07030";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-5"
      style={{ background:"rgba(6,7,9,0.95)", backdropFilter:"blur(18px)" }}>
      <div className="w-full max-w-6xl h-full max-h-[90vh] flex gap-5">

        {/* 3D viewport */}
        <div
          ref={viewportRef}
          className="flex-1 relative panel overflow-hidden"
          style={{ cursor: isDragging ? "grabbing" : "crosshair" }}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
        >
          <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
            <span className="panel-title">Router Placement — Click or drag the orange dot to move</span>
          </div>

          {/* Legend */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            {[
              { color:"#82c46a", label:"Strong" },
              { color:"#d4a840", label:"Good" },
              { color:"#d07830", label:"Fair" },
              { color:"#c04030", label:"Weak" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background:color }} />
                <span className="text-xs" style={{ color:"rgba(180,175,165,0.60)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Packet legend */}
          <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background:"#60d0a8", boxShadow:"0 0 6px #60d0a8" }} />
            <span className="panel-title" style={{ color:"rgba(160,205,190,0.70)" }}>
              Animated data packets — each colour = one room
            </span>
          </div>

          <Canvas orthographic style={{ width:"100%", height:"100%" }} gl={{ antialias:false, powerPreference:"high-performance" }}>
            <color attach="background" args={["#1a1a2e"]} />
            <TopDownCamera />
            <ambientLight intensity={2} color="#ffffff" />
            <directionalLight position={[10, 40, 10]} intensity={1} color="#ffffff" />
            <Suspense fallback={null}>
              <HouseModel />
              <Heatmap routerPos={routerPos} />
              <Waves  routerPos={routerPos} />
              <DataPackets routerPos={routerPos} roomSignals={roomSignals} />
              <RouterDot pos={routerPos} />
              <DragPlane onDrag={handleDrag} />
            </Suspense>
          </Canvas>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-4">

          {/* Equity */}
          <div className="panel p-4">
            <div className="panel-title mb-1">Coverage Equity Score</div>
            <div className="text-4xl font-black mt-1" style={{ color: equityColor }}>{equity}%</div>
            <div className="text-xs mt-1" style={{ color:"rgba(155,150,140,0.55)" }}>
              Measures how evenly WiFi is shared across all rooms
            </div>
            <div className="mt-3 w-full h-2 rounded-full overflow-hidden" style={{ background:"rgba(40,42,48,0.60)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width:`${equity}%`, background:equityColor }} />
            </div>
            <div className="mt-2 text-xs font-semibold" style={{ color: equity>=70 ? "#82c46a" : equity<50 ? "#d07030" : "#d4a840" }}>
              {equity>=70 ? "Excellent! All rooms covered." : equity<50 ? "Move the router toward the center." : "Getting better — try more central."}
            </div>
          </div>

          {/* Sliders */}
          <div className="panel p-4">
            <div className="panel-title mb-3">Position Sliders</div>
            <div className="flex flex-col gap-3">
              {[
                { label:"Left / Right", min:-8, max:8, step:0.25, val:routerX, set:setRouterX },
                { label:"Front / Back", min:-4, max:12, step:0.25, val:routerZ, set:setRouterZ },
              ].map(({ label, min, max, step, val, set }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1" style={{ color:"rgba(155,150,140,0.58)" }}>
                    <span>{label}</span><span>{val.toFixed(1)}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full" style={{ accentColor:"#a06820" }} />
                </div>
              ))}
            </div>
          </div>

          {/* Room signals */}
          <div className="panel p-4 flex-1 overflow-y-auto">
            <div className="panel-title mb-2">Signal per Room</div>
            <div className="flex flex-col gap-2.5">
              {roomSignals.map((r, i) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{
                        background: PACKET_COLORS[i % PACKET_COLORS.length],
                        boxShadow: `0 0 5px ${PACKET_COLORS[i % PACKET_COLORS.length]}`,
                      }} />
                      <span className="text-xs" style={{ color:"rgba(210,205,195,0.82)" }}>{r.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: sigColor(r.sig) }}>{r.sig}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background:"rgba(40,42,48,0.60)" }}>
                    <div className="h-full rounded-full transition-all duration-400"
                      style={{ width:`${r.sig}%`, background:sigColor(r.sig) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-secondary w-full" onClick={onClose}>Close Router Sim</button>
        </div>
      </div>
    </div>
  );
}
