import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const BASE_URL = import.meta.env.BASE_URL;

interface Props { onClose: () => void; }

/* ─── Floor Plan Drawing for Hacker Room ─────────────────────── */
function HackerRoomFloorPlan({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ROOM = { xMin: -8, xMax: 8, zMin: -3, zMax: 10 }; // Hacker room bounds

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "rgba(20, 20, 40, 0.8)";
    ctx.fillRect(0, 0, width, height);

    // Helper to convert world coords to canvas
    function worldToCanvas(wx: number, wz: number) {
      const px = ((wx - ROOM.xMin) / (ROOM.xMax - ROOM.xMin)) * width;
      const py = ((wz - ROOM.zMin) / (ROOM.zMax - ROOM.zMin)) * height;
      return { px, py };
    }

    // Draw room boundary
    ctx.strokeStyle = "rgba(102, 91, 255, 0.6)";
    ctx.lineWidth = 2;
    const { px: x1, py: y1 } = worldToCanvas(ROOM.xMin, ROOM.zMin);
    const { px: x2, py: y2 } = worldToCanvas(ROOM.xMax, ROOM.zMin);
    const { px: x3, py: y3 } = worldToCanvas(ROOM.xMax, ROOM.zMax);
    const { px: x4, py: y4 } = worldToCanvas(ROOM.xMin, ROOM.zMax);
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.stroke();

    // Draw 4 corner pillars
    const pillars = [
      { x: -7.5, z: -2.5 },
      { x: 7.5, z: -2.5 },
      { x: -7.5, z: 9.5 },
      { x: 7.5, z: 9.5 }
    ];
    ctx.fillStyle = "rgba(124, 92, 255, 0.5)";
    pillars.forEach(p => {
      const { px, py } = worldToCanvas(p.x, p.z);
      ctx.fillRect(px - 15, py - 15, 30, 30);
    });

    // Draw center desk/console
    ctx.fillStyle = "rgba(100, 120, 200, 0.4)";
    ctx.fillRect(width / 2 - 50, height / 2 - 30, 100, 60);
    ctx.strokeStyle = "rgba(150, 150, 220, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(width / 2 - 50, height / 2 - 30, 100, 60);

  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    />
  );
}

/* ─── Top-down camera ─────────────────────────────────────────── */
function TopDownCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const zoom = 32;
    cam.left = -size.width / 2 / zoom;
    cam.right = size.width / 2 / zoom;
    cam.top = size.height / 2 / zoom;
    cam.bottom = -size.height / 2 / zoom;
    cam.near = 0.1;
    cam.far = 300;
    cam.position.set(0, 30, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* ─── Hacker Room Model ──────────────────────────────────────── */
function HackerRoomModel() {
  const gltf = useGLTF(`${BASE_URL}hackerroom.glb`);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    const box = new THREE.Box3().setFromObject(ref.current);
    ref.current.position.sub(box.getCenter(new THREE.Vector3()));
    ref.current.position.y = -0.5;
  }, [gltf]);
  return <primitive ref={ref} object={gltf.scene} />;
}

/* ─── Main Plan View Modal ───────────────────────────────────── */
export function HackerRoomPlanView({ onClose }: Props) {
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      setViewportSize({
        width: viewportRef.current.clientWidth,
        height: viewportRef.current.clientHeight,
      });
    }
  }, []);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-5"
      style={{ background: "rgba(8,6,3,0.93)", backdropFilter: "blur(16px)" }}
    >
      <div className="w-full max-w-4xl h-full max-h-[90vh] flex flex-col gap-4">
        {/* Close button */}
        <div className="flex justify-between items-center">
          <h2 className="panel-title">Hacker Room — Plan View</h2>
          <button
            className="btn-secondary text-sm px-4 py-2"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* 3D top-down view */}
        <div
          ref={viewportRef}
          className="flex-1 relative panel overflow-hidden rounded"
        >
          <Canvas
            orthographic
            style={{ width: "100%", height: "100%" }}
            gl={{ antialias: true }}
          >
            <color attach="background" args={["#1a1a2e"]} />
            <TopDownCamera />
            <ambientLight intensity={2.5} color="#ffffff" />
            <directionalLight
              position={[10, 40, 10]}
              intensity={1.2}
              color="#ffffff"
            />
            <directionalLight
              position={[-10, 40, -10]}
              intensity={0.8}
              color="#ffffff"
            />
            <Suspense fallback={null}>
              <HackerRoomModel />
            </Suspense>
          </Canvas>
          <HackerRoomFloorPlan
            width={viewportSize.width}
            height={viewportSize.height}
          />
        </div>
      </div>
    </div>
  );
}
