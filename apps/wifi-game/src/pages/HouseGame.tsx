import { useState, Suspense, useRef, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MapView } from "../components/MapView";
import { RouterMapView } from "../components/RouterMapView";
import { InterpretationPanel } from "../components/InterpretationPanel";

const BASE_URL = import.meta.env.BASE_URL;

interface Props { onBack: () => void; }

/* ─── House bounds (world XZ): approx ─────────────────────── */
const HOUSE = { xMin:-7, xMax:7, zMin:-3, zMax:11 };
const HOUSE_BOUNDS = { xMin:-6.5, xMax:6.5, zMin:-2.5, zMax:10.5 }; // Walkable area with wall buffer
const ROUTER = { x:0, z:2 }; // router position in world

function calcSignal(x: number, z: number) {
  const d = Math.sqrt((x - ROUTER.x) ** 2 + (z - ROUTER.z) ** 2);
  return Math.max(4, Math.min(100, Math.round(102 - d * 9)));
}
function sigColor(v: number) {
  if (v >= 75) return "#56d490";
  if (v >= 50) return "#d4c040";
  if (v >= 30) return "#d07830";
  return "#d04040";
}
function sigLabel(v: number) {
  if (v >= 75) return "Excellent";
  if (v >= 50) return "Good";
  if (v >= 30) return "Fair";
  return "Weak";
}
function sigBars(v: number) {
  const filled = v >= 75 ? 4 : v >= 50 ? 3 : v >= 30 ? 2 : 1;
  return filled;
}

/* ─── Apartment model ─────────────────────────────────────── */
function HouseModel() {
  const gltf = useGLTF(`${BASE_URL}apartment.glb`);
  const ref  = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(ref.current);
    ref.current.position.sub(box.getCenter(new THREE.Vector3()));
    ref.current.position.y = -1;
  }, [gltf]);
  return <primitive ref={ref} object={gltf.scene} />;
}

/* ─── Router beacon: glowing sphere + animated rings ─────── */
function RouterBeacon() {
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    rings.current.forEach((m, i) => {
      if (!m) return;
      const phase = (t * 0.42 + i / 4) % 1;
      m.scale.set(1 + phase * 5, 1, 1 + phase * 5);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.55;
    });
  });
  return (
    <group position={[ROUTER.x, 1.7, ROUTER.z]}>
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#f0b040" emissive="#c07010" emissiveIntensity={3.2} />
      </mesh>
      {[0,1,2,3].map(i => (
        <mesh key={i} ref={el => { rings.current[i] = el; }} rotation={[-Math.PI/2,0,0]}>
          <ringGeometry args={[0.45, 0.55, 48]} />
          <meshBasicMaterial color="#e0a820" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Camera position tracker (inside Canvas) ───────────── */
function CameraTracker({ onUpdate }: { onUpdate: (x: number, z: number) => void }) {
  const { camera } = useThree();
  const tick = useRef(0);
  useFrame(() => {
    tick.current++;
    if (tick.current % 5 === 0) onUpdate(camera.position.x, camera.position.z);
  });
  return null;
}

/* ─── Wall collision helper ─────────────────────────────── */
const isWallCollision = (x: number, z: number): boolean => {
  const wallBuffer = 0.5; // collision sphere radius
  
  // OUTER boundary walls only - tight enforcement
  if (x < HOUSE_BOUNDS.xMin + wallBuffer || x > HOUSE_BOUNDS.xMax - wallBuffer) return true;
  if (z < HOUSE_BOUNDS.zMin + wallBuffer || z > HOUSE_BOUNDS.zMax - wallBuffer) return true;
  
  // Inner walls disabled - can walk through them
  return false;
};

/* ─── FPS controller ─────────────────────────────────────── */
function FPSController() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(Math.PI); // Facing left

  useEffect(() => {
    camera.position.set(1.5, 1.1, 2);
    
    const onKD = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const onKU = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };

    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);
    return () => {
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const k = keys.current;
    
    // Handle rotation with left/right or A/D
    if (k["arrowleft"] || k["a"]) yaw.current += 2 * delta;
    if (k["arrowright"] || k["d"]) yaw.current -= 2 * delta;
    
    // Set camera rotation
    camera.rotation.set(0, yaw.current, 0, "YXZ");
    
    // Calculate movement direction
    const speed = 4;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    
    // Calculate desired position
    let newX = camera.position.x;
    let newZ = camera.position.z;
    
    if (k["w"] || k["arrowup"])   { newX += forward.x * speed * delta; newZ += forward.z * speed * delta; }
    if (k["s"] || k["arrowdown"]) { newX -= forward.x * speed * delta; newZ -= forward.z * speed * delta; }
    
    // Only update position if no collision
    if (!isWallCollision(newX, newZ)) {
      camera.position.x = newX;
      camera.position.z = newZ;
    }
    
    camera.position.y = 1.1;
  });

  return null;
}

/* ─── 2D Heatmap overlay canvas ─────────────────────────── */
const MAP_W = 175;
const MAP_H = 195;
const ROOMS_2D = [
  { label:"Living",  x:-3.5, z:0.5  },
  { label:"Kitchen", x: 3.0, z:-1.0 },
  { label:"Bed 1",   x:-3.5, z: 5.5 },
  { label:"Bed 2",   x: 3.0, z: 5.0 },
  { label:"Bath",    x: 3.0, z: 9.0 },
];

function worldToMap(wx: number, wz: number) {
  const px = ((wx - HOUSE.xMin) / (HOUSE.xMax - HOUSE.xMin)) * MAP_W;
  const py = ((wz - HOUSE.zMin) / (HOUSE.zMax - HOUSE.zMin)) * MAP_H;
  return { px, py };
}

function HeatmapOverlay({ camX, camZ }: { camX: number; camZ: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with semi-transparent background
    ctx.fillStyle = "rgba(15, 16, 20, 0.70)";
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    
    const imgData = ctx.createImageData(MAP_W, MAP_H);
    for (let py = 0; py < MAP_H; py++) {
      for (let px = 0; px < MAP_W; px++) {
        const wx = HOUSE.xMin + (px / MAP_W) * (HOUSE.xMax - HOUSE.xMin);
        const wz = HOUSE.zMin + (py / MAP_H) * (HOUSE.zMax - HOUSE.zMin);
        const sig = calcSignal(wx, wz) / 100;
        const i   = (py * MAP_W + px) * 4;
        // Green (strong) → yellow → orange → red (weak)
        if (sig >= 0.75) {
          imgData.data[i]   = Math.round((1 - sig) * 4 * 240);
          imgData.data[i+1] = Math.round(sig * 200 + 55);
          imgData.data[i+2] = 50;
        } else if (sig >= 0.50) {
          imgData.data[i]   = Math.round(210 + (0.75 - sig) * 4 * 30);
          imgData.data[i+1] = Math.round(sig * 160 + 80);
          imgData.data[i+2] = 20;
        } else {
          imgData.data[i]   = Math.round(200 + (0.50 - sig) * 4 * 55);
          imgData.data[i+1] = Math.round(sig * 120);
          imgData.data[i+2] = 20;
        }
        imgData.data[i+3] = 205;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // House border
    ctx.strokeStyle = "rgba(200,200,210,0.55)";
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(0.75, 0.75, MAP_W - 1.5, MAP_H - 1.5);

    // Draw room dividing walls (floor plan)
    ctx.strokeStyle = "rgba(150,150,170,0.70)";
    ctx.lineWidth   = 2.5;
    
    // Vertical wall between living room and kitchen
    ctx.beginPath();
    ctx.moveTo(worldToMap(0, HOUSE.zMin).px, worldToMap(0, HOUSE.zMin).py);
    ctx.lineTo(worldToMap(0, 2).px, worldToMap(0, 2).py);
    ctx.stroke();
    
    // Horizontal wall separating bedrooms from living/kitchen
    ctx.beginPath();
    ctx.moveTo(worldToMap(HOUSE.xMin, 3.5).px, worldToMap(HOUSE.xMin, 3.5).py);
    ctx.lineTo(worldToMap(HOUSE.xMax, 3.5).px, worldToMap(HOUSE.xMax, 3.5).py);
    ctx.stroke();
    
    // Vertical wall between bed 1 and bed 2
    ctx.beginPath();
    ctx.moveTo(worldToMap(-0.5, 3.5).px, worldToMap(-0.5, 3.5).py);
    ctx.lineTo(worldToMap(-0.5, 8).px, worldToMap(-0.5, 8).py);
    ctx.stroke();
    
    // Horizontal wall before bathroom
    ctx.beginPath();
    ctx.moveTo(worldToMap(HOUSE.xMin, 8).px, worldToMap(HOUSE.xMin, 8).py);
    ctx.lineTo(worldToMap(HOUSE.xMax, 8).px, worldToMap(HOUSE.xMax, 8).py);
    ctx.stroke();

    // Room dots
    ROOMS_2D.forEach(r => {
      const { px, py } = worldToMap(r.x, r.z);
      ctx.fillStyle = "rgba(220,220,228,0.50)";
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(200,200,210,0.55)";
      ctx.font = "8px Inter, sans-serif";
      ctx.fillText(r.label, px + 4, py + 3);
    });

    // Router dot
    const rp = worldToMap(ROUTER.x, ROUTER.z);
    ctx.fillStyle = "#f0b040";
    ctx.beginPath(); ctx.arc(rp.px, rp.py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,200,80,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(rp.px, rp.py, 9, 0, Math.PI * 2); ctx.stroke();

    // Player dot
    const pp = worldToMap(camX, camZ);
    const color = sigColor(calcSignal(camX, camZ));
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(pp.px, pp.py, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pp.px, pp.py, 8, 0, Math.PI * 2); ctx.stroke();
    // crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pp.px - 12, pp.py); ctx.lineTo(pp.px + 12, pp.py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pp.px, pp.py - 12); ctx.lineTo(pp.px, pp.py + 12); ctx.stroke();
  }, [camX, camZ]);

  return (
    <div
      className="absolute bottom-5 left-5 z-20"
      style={{
        background:"rgba(10,11,14,0.88)",
        border:"1px solid rgba(78,80,92,0.40)",
        borderRadius:8,
        overflow:"hidden",
        boxShadow:"0 4px 24px rgba(0,0,0,0.55)",
      }}
    >
      <div className="px-2 pt-2 pb-1 flex items-center justify-between">
        <span className="panel-title">WiFi Heatmap</span>
        <div className="flex items-center gap-3 text-xs" style={{ color:"rgba(140,142,150,0.55)" }}>
          <span style={{ color:"#f0b040" }}>● Router</span>
          <span style={{ color:"#ffffff" }}>● You</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={{ display:"block" }}
      />
    </div>
  );
}

/* ─── Signal HUD (bottom-right, always visible) ──────────── */
function SignalHUD({ camX, camZ }: { camX: number; camZ: number }) {
  const sig    = calcSignal(camX, camZ);
  const color  = sigColor(sig);
  const label  = sigLabel(sig);
  const bars   = sigBars(sig);
  const dist   = Math.sqrt((camX - ROUTER.x)**2 + (camZ - ROUTER.z)**2);

  return (
    <div className="absolute bottom-5 right-5 z-20" style={{
      background:"rgba(10,11,14,0.90)",
      border:"1px solid rgba(78,80,92,0.38)",
      borderRadius:8,
      padding:"12px 16px",
      minWidth:150,
      backdropFilter:"blur(12px)",
    }}>
      <div className="panel-title mb-2">Your WiFi Signal</div>

      {/* signal bars */}
      <div className="flex items-end gap-1 mb-2">
        {[1,2,3,4].map(b => (
          <div key={b} style={{
            width:8,
            height: 6 + b * 5,
            borderRadius:2,
            background: b <= bars ? color : "rgba(60,62,72,0.50)",
            transition:"background 0.4s",
          }} />
        ))}
        <span className="ml-2 text-lg font-black" style={{ color, lineHeight:1 }}>{sig}%</span>
      </div>

      <div className="text-xs font-bold mb-1" style={{ color }}>{label}</div>
      <div className="text-xs" style={{ color:"rgba(130,132,142,0.60)" }}>
        {dist.toFixed(1)} m from router
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
type Panel = "none" | "map" | "router" | "interpretation";

export function HouseGame({ onBack }: Props) {
  const [activePanel, setActivePanel]  = useState<Panel>("none");
  const [showHeatmap, setShowHeatmap]  = useState(false);
  const [camPos, setCamPos] = useState({ x: -3, z: 1 });
  const camPosRef = useRef({ x: -3, z: 1 });

  const handleCamUpdate = useCallback((x: number, z: number) => {
    camPosRef.current = { x, z };
    setCamPos({ x, z });
  }, []);

  const toggle = (p: Panel) => setActivePanel(prev => prev === p ? "none" : p);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background:"#0b0c0e", cursor:"crosshair" }}>
      <div className="absolute top-5 right-5 z-30 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm font-medium text-white shadow-lg">
        Player: <span className="font-semibold text-amber-300">swaswa</span>
      </div>
      <Canvas camera={{ fov: 70 }} style={{ width:"100%", height:"100%" }} gl={{ antialias:false, powerPreference:"high-performance" }}>
        <ambientLight intensity={0.8} color="#ffffff" />
        <directionalLight position={[10,20,10]} intensity={1.3} color="#ffffff" castShadow />
        <Suspense fallback={<ModelLoadingFallback />}>
          <HouseModel />
          <RouterBeacon />
        </Suspense>
        <FPSController />
        <CameraTracker onUpdate={handleCamUpdate} />
        <fog attach="fog" arnull />
      </Canvas>

      {/* grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:"linear-gradient(rgba(78,80,92,0.036) 1px,transparent 1px),linear-gradient(90deg,rgba(78,80,92,0.036) 1px,transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

      {/* Crosshair */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.70)" />
          <line x1="10" y1="0"  x2="10" y2="5"  stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>
          <line x1="10" y1="15" x2="10" y2="20" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>
          <line x1="0"  y1="10" x2="5"  y2="10" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>
          <line x1="15" y1="10" x2="20" y2="10" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2"/>
        </svg>
      </div>

      {/* Back */}
      <button className="btn-secondary absolute top-5 left-5 z-30 flex items-center gap-2" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30">
        <div className="panel px-4 py-2 flex items-center gap-3">
          <div className="pulse-dot w-2 h-2 rounded-full" style={{ background:"#b07830" }} />
          <span className="panel-title">Apartment WiFi — First Person View</span>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute top-5 right-5 z-30 flex flex-col gap-2">
        <button className={activePanel==="map"            ? "btn-active" : "btn-secondary"} onClick={() => toggle("map")}>Map View</button>
        <button className={activePanel==="router"         ? "btn-active" : "btn-secondary"} onClick={() => toggle("router")}>Router Sim</button>
        <button className={activePanel==="interpretation" ? "btn-active" : "btn-secondary"} onClick={() => toggle("interpretation")}>Explanation</button>
        <div className="mt-1" />
        <button
          className={showHeatmap ? "btn-heatmap-active" : "btn-heatmap"}
          onClick={() => setShowHeatmap(v => !v)}
        >
          {showHeatmap ? "Hide Map" : "Heatmap"}
        </button>
      </div>

      {/* WASD hint bottom-center */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="panel px-4 py-2 flex items-center gap-3">
          <div className="grid grid-cols-3 gap-0.5 text-center" style={{ fontSize:9 }}>
            <span/><Key>W</Key><span/>
            <Key>A</Key><Key>S</Key><Key>D</Key>
          </div>
          <span className="text-xs" style={{ color:"rgba(130,132,142,0.62)" }}>
            Move · Click &amp; drag to look
          </span>
        </div>
      </div>

      {/* Heatmap overlay (bottom-left) */}
      {showHeatmap && <HeatmapOverlay camX={camPos.x} camZ={camPos.z} />}

      {/* Signal HUD (bottom-right) */}
      <SignalHUD camX={camPos.x} camZ={camPos.z} />

      {/* Full-screen panels */}
      {activePanel === "map"            && <MapView          onClose={() => setActivePanel("none")} />}
      {activePanel === "router"         && <RouterMapView    onClose={() => setActivePanel("none")} />}
      {activePanel === "interpretation" && <InterpretationPanel onClose={() => setActivePanel("none")} scene="house" />}
    </div>
  );
}

function Key({ children }: { children: string }) {
  return (
    <div className="px-1.5 py-0.5 rounded" style={{
      background:"rgba(60,62,72,0.50)",
      border:"1px solid rgba(100,102,115,0.35)",
      color:"rgba(195,197,206,0.80)",
    }}>
      {children}
    </div>
  );
}
