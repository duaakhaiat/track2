import { useState, Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { InterpretationPanel } from "../components/InterpretationPanel";
import { ShadowWallPanel } from "../components/ShadowWallPanel";

const BASE_URL = import.meta.env.BASE_URL;

interface Props { onBack: () => void; }

function CameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 1.5, 5);
    camera.lookAt(0, 0.5, 0);
  }, [camera]);
  return null;
}

function HackerModel() {
  const gltf = useGLTF(`${BASE_URL}hackerroom.glb`);
  const ref  = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!ref.current) return;
    /* preserve original model materials — no overrides */
    const box    = new THREE.Box3().setFromObject(ref.current);
    const center = box.getCenter(new THREE.Vector3());
    ref.current.position.sub(center);
    ref.current.position.y = -0.5;
  }, [gltf]);
  return <primitive ref={ref} object={gltf.scene} />;
}

type Panel = "none" | "shadow" | "interpretation";

export function HackerRoom({ onBack }: Props) {
  const [activePanel, setActivePanel] = useState<Panel>("none");
  const [phase,   setPhase]   = useState<"idle" | "cracking" | "done">("idle");
  const [fakePass, setFakePass] = useState("");
  const [progress, setProgress] = useState(0);

  const startCrack = () => {
    if (phase !== "idle") return;
    setPhase("cracking");
    setProgress(0);
    const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    const target = ["W","i","F","i","_","H","4","c","k","3","r","!"];
    let step = 0;
    const iv = setInterval(() => {
      step++;
      const pct      = step / 80;
      setProgress(Math.min(pct, 1));
      const revealed = Math.floor(pct * target.length);
      let p = target.slice(0, revealed).join("");
      for (let i = revealed; i < target.length; i++) p += chars[Math.floor(Math.random() * chars.length)];
      setFakePass(p);
      if (step >= 80) { clearInterval(iv); setFakePass(target.join("")); setPhase("done"); setProgress(1); }
    }, 60);
  };

  const toggle = (p: Panel) => setActivePanel(prev => prev === p ? "none" : p);

  return (
    /* dark background with purple hacker vibe */
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#0a0410" }}>
      <Canvas camera={{ fov: 55 }} style={{ width:"100%", height:"100%" }} gl={{ antialias:false, powerPreference:"high-performance" }}>
        <CameraSetup />
        {/* Purple and blue hacker lighting */}
        <ambientLight intensity={1} color="#6b5bff" />
        <directionalLight position={[6, 12, 6]} intensity={1} color="#7c5cff" castShadow />
        <pointLight position={[0, 4, 0]} intensity={1} color="#00d9ff" distance={20} />
        <Suspense fallback={<ModelLoadingFallback />}><HackerModel /></Suspense>
        <OrbitControls enablePan maxPolarAngle={Math.PI / 2 + 0.2} minDistance={2} maxDistance={20} />
      </Canvas>

      {/* purple grid overlay for hacker vibe */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:"linnull,255,0.065) 1px,transparent 1px),linear-gradient(90deg,rgba(107,91,255,0.065) 1px,transparent 1px)",
        backgroundSize:"40px 40px",
      }} />

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
          <span className="panel-title">Hacker Room — Password Intercept</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute top-5 right-5 z-30 flex flex-col gap-2">
        <button className={activePanel === "shadow"         ? "btn-active" : "btn-secondary"} onClick={() => toggle("shadow")}>Shadow Wall</button>
        <button className={activePanel === "interpretation" ? "btn-active" : "btn-secondary"} onClick={() => toggle("interpretation")}>Explanation</button>
      </div>

      {/* Phone UI */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
        <div className="phone-tilt panel flex flex-col items-center gap-3 px-6 py-5" style={{ width: 200 }}>
          <div className="panel-title">Target Phone</div>
          <div className="w-full rounded text-center py-2 font-mono text-sm" style={{
            background: "#090a0c",
            border: "1px solid rgba(82,84,94,0.35)",
            color: phase === "done" ? "#d4b060" : "#8a9aaa",
            letterSpacing: "0.1em", minHeight: 34,
          }}>
            {fakePass || "••••••••••••"}
          </div>
          {phase !== "idle" && (
            <div className="w-full" style={{ height: 4, background: "rgba(50,52,62,0.55)", borderRadius: 2 }}>
              <div className="h-full rounded transition-all" style={{
                width: `${progress * 100}%`,
                background: progress === 1 ? "#d4a840" : "#5a6a7a",
              }} />
            </div>
          )}
          {phase === "idle"     && <button className="btn-primary text-xs px-3 py-2 w-full" onClick={startCrack}>Intercept</button>}
          {phase === "cracking" && <div className="text-xs animate-pulse" style={{ color:"#8a9aaa" }}>Cracking…</div>}
          {phase === "done"     && <div className="text-xs font-bold" style={{ color:"#d4b060" }}>Compromised!</div>}
        </div>
        <span className="panel-title opacity-35">Drag to rotate · Scroll to zoom</span>
      </div>

      {activePanel === "shadow"         && <ShadowWallPanel onClose={() => setActivePanel("none")} />}
      {activePanel === "interpretation" && <InterpretationPanel onClose={() => setActivePanel("none")} scene="hacker" />}
    </div>
  );
}
