import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const BASE_URL = import.meta.env.BASE_URL;

interface Props { onClose: () => void; }

/* ─── Floor Plan Drawing Helper ─────────────────────────── */
function FloorPlanOverlay({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const HOUSE = { xMin: -7, xMax: 7, zMin: -3, zMax: 11 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    // Calculate scale and offset for world to canvas
    const scale = Math.min(width, height) / 15; // Fit house in view
    const offsetX = width / 2;
    const offsetY = height / 2;

    const worldToCanvas = (wx: number, wz: number) => {
      return { x: offsetX + wx * scale, y: offsetY - wz * scale };
    };

    // Draw floor plan walls
    ctx.strokeStyle = "rgba(200, 120, 60, 0.6)";
    ctx.lineWidth = 3;

    // Boundary walls
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

const ROOM_DATA = [
  { id: "living",   label: "Living Room",  wifi: 95, wallThickness: "15 cm", wallMaterial: "Drywall",            attenuation: "3 dB"  },
  { id: "kitchen",  label: "Kitchen",      wifi: 78, wallThickness: "20 cm", wallMaterial: "Concrete",           attenuation: "9 dB"  },
  { id: "bedroom1", label: "Bedroom 1",    wifi: 58, wallThickness: "25 cm", wallMaterial: "Brick",              attenuation: "14 dB" },
  { id: "bedroom2", label: "Bedroom 2",    wifi: 42, wallThickness: "30 cm", wallMaterial: "Concrete Block",     attenuation: "18 dB" },
  { id: "bathroom", label: "Bathroom",     wifi: 28, wallThickness: "35 cm", wallMaterial: "Ceramic + Concrete", attenuation: "24 dB" },
];

function sigColor(v: number): string {
  if (v >= 80) return "#82c46a";
  if (v >= 60) return "#d4a840";
  if (v >= 40) return "#d07830";
  return "#c04030";
}
function sigLabel(v: number): string {
  if (v >= 80) return "Excellent";
  if (v >= 60) return "Good";
  if (v >= 40) return "Fair";
  return "Weak";
}

function TopDownCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const zoom = 38;
    cam.left = -size.width / 2 / zoom; cam.right = size.width / 2 / zoom;
    cam.top = size.height / 2 / zoom;  cam.bottom = -size.height / 2 / zoom;
    cam.near = 0.1; cam.far = 300;
    cam.position.set(0, 40, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function HouseTopView() {
  const gltf = useGLTF(`${BASE_URL}apartment.glb`);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    /* keep original model colours */
    const box = new THREE.Box3().setFromObject(ref.current);
    ref.current.position.sub(box.getCenter(new THREE.Vector3()));
    ref.current.position.y = 0;
  }, [gltf]);
  return <primitive ref={ref} object={gltf.scene} />;
}

export function MapView({ onClose }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const selected = ROOM_DATA.find(r => r.id === selectedId);

  useEffect(() => {
    if (viewportRef.current) {
      setViewportSize({ width: viewportRef.current.clientWidth, height: viewportRef.current.clientHeight });
    }
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-5"
      style={{ background: "rgba(8,6,3,0.93)", backdropFilter: "blur(16px)" }}>
      <div className="w-full max-w-6xl h-full max-h-[90vh] flex gap-5">

        {/* 3D top-down */}
        <div ref={viewportRef} className="flex-1 relative panel overflow-hidden">
          <div className="absolute top-3 left-4 z-10">
            <span className="panel-title">Top View — Floor Plan</span>
          </div>
          <Canvas orthographic style={{ width: "100%", height: "100%" }} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ position: [0, 40, 0], near: 0.1, far: 300 }}>
            <color attach="background" args={["#1a1a2e"]} />
            <TopDownCamera />
            <ambientLight intensity={2} color="#ffffff" />
            <directionalLight position={[10, 40, 10]} intensity={1} color="#ffffff" />
            <Suspense fallback={null}><HouseTopView /></Suspense>
          </Canvas>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-4">
          <div className="panel p-4 flex-1 overflow-y-auto">
            <div className="panel-title mb-3">Room WiFi Data</div>
            <div className="flex flex-col gap-2">
              {ROOM_DATA.map(room => (
                <button key={room.id}
                  onClick={() => setSelectedId(room.id === selectedId ? null : room.id)}
                  className="w-full text-left p-3 rounded transition-all"
                  style={{
                    background: selectedId === room.id ? "rgba(100,65,20,0.50)" : "rgba(35,26,14,0.50)",
                    border: `1px solid ${selectedId === room.id ? "rgba(170,120,55,0.65)" : "rgba(100,72,35,0.28)"}`,
                    cursor: "pointer",
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: "#e8d5b0" }}>{room.label}</span>
                    <span className="text-xs font-bold" style={{ color: sigColor(room.wifi) }}>{room.wifi}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(60,40,14,0.50)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${room.wifi}%`, background: sigColor(room.wifi) }} />
                  </div>
                  <div className="mt-1 text-xs" style={{ color: sigColor(room.wifi), opacity: 0.85 }}>{sigLabel(room.wifi)}</div>
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="panel p-4">
              <div className="panel-title mb-2">Room Details</div>
              <div className="font-bold mb-3" style={{ color: "#e8d5b0" }}>{selected.label}</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "WiFi Signal", v: `${selected.wifi}%` },
                  { k: "Strength",    v: sigLabel(selected.wifi) },
                  { k: "Wall Width",  v: selected.wallThickness },
                  { k: "Material",    v: selected.wallMaterial },
                  { k: "Attenuation", v: selected.attenuation },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <div className="text-xs uppercase tracking-wider" style={{ color: "rgba(170,130,75,0.58)" }}>{k}</div>
                    <div className="text-sm font-semibold mt-0.5" style={{ color: "#dcc898" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="btn-secondary w-full" onClick={onClose}>Close Map</button>
        </div>
      </div>
    </div>
  );
}
