import { useEffect, useRef, useState } from "react";

interface Props {
  onEnterHouse: () => void;
  onEnterHacker: () => void;
}

export function LandingPage({ onEnterHouse, onEnterHacker }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodes: { x: number; y: number; vx: number; vy: number; r: number; a: number; gray: boolean }[] = [];
    for (let i = 0; i < 70; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.4,
        a: Math.random() * 0.4 + 0.1,
        gray: Math.random() > 0.5,
      });
    }

    let id: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(155,120,75,${(1 - d / 150) * 0.15})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x = canvas.width;
        if (n.x > canvas.width) n.x = 0;
        if (n.y < 0) n.y = canvas.height;
        if (n.y > canvas.height) n.y = 0;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.gray
          ? `rgba(130,120,110,${n.a})`
          : `rgba(185,135,70,${n.a})`;
        ctx.fill();
      }
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="scanlines bg-grid relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(60,38,14,0.38) 0%, rgba(12,9,5,0.92) 100%)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center max-w-3xl w-full">

        <div className={`flex items-center gap-3 ${loaded ? "anim-0" : "opacity-0"}`}>
          <div className="relative flex items-center justify-center w-8 h-8">
            <div className="absolute inset-0 rounded-full" style={{ border: "1px solid rgba(170,120,55,0.30)" }} />
            <div className="pulse-dot w-2 h-2 rounded-full" style={{ background: "#b07830" }} />
          </div>
          <span className="panel-title">Signal // Breach · IEEE 802.11 Simulation</span>
          <div className="h-px w-12" style={{ background: "rgba(170,120,55,0.20)" }} />
        </div>

        <div className={loaded ? "anim-1" : "opacity-0"}>
          <h1
            className="glitch-text font-black uppercase leading-none select-none"
            style={{ fontSize: "clamp(52px, 9vw, 110px)", letterSpacing: "-0.02em" }}
          >
            WIFI HACKER
          </h1>
          <p className="mt-4 text-sm tracking-widest uppercase" style={{ color: "rgba(165,140,100,0.60)" }}>
            Penetration · Signal Analysis · RF Engineering
          </p>
        </div>

        <div className={`grid grid-cols-2 gap-4 w-full max-w-md ${loaded ? "anim-2" : "opacity-0"}`}>
          <button
            className="btn-primary flex flex-col items-center gap-2 py-5"
            onClick={onEnterHouse}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>House WiFi</span>
            <span style={{ fontSize: 10, opacity: 0.60, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>Signal Mapping</span>
          </button>

          <button
            className="btn-primary flex flex-col items-center gap-2 py-5"
            onClick={onEnterHacker}
            style={{ background: "linear-gradient(135deg, #3e3530, #252018)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            <span>Hacker Room</span>
            <span style={{ fontSize: 10, opacity: 0.60, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>Password Intercept</span>
          </button>
        </div>

        <div className={`flex gap-8 ${loaded ? "anim-3" : "opacity-0"}`}>
          {[
            { label: "RF Law", val: "Beer-Lambert" },
            { label: "Protocol", val: "802.11" },
            { label: "Mode", val: "Simulation" },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <div className="text-xs uppercase tracking-widest" style={{ color: "rgba(160,130,85,0.48)" }}>{label}</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: "rgba(220,195,148,0.88)" }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
