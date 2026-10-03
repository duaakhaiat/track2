import { useState } from "react";

interface Props { onClose: () => void; }

const MATERIALS = [
  { id: "drywall",  label: "Drywall",      sigma: 0.016, mu: 1.0, thickness: 0.015 },
  { id: "concrete", label: "Concrete",     sigma: 0.01,  mu: 1.0, thickness: 0.20  },
  { id: "brick",    label: "Brick",        sigma: 0.02,  mu: 1.0, thickness: 0.25  },
  { id: "metal",    label: "Metal Sheet",  sigma: 1.0e6, mu: 1.0, thickness: 0.002 },
  { id: "glass",    label: "Glass",        sigma: 1e-12, mu: 1.0, thickness: 0.012 },
];

const FREQS = [
  { label: "2.4 GHz", f: 2.4e9 },
  { label: "5.0 GHz", f: 5.0e9 },
  { label: "6.0 GHz", f: 6.0e9 },
];

function skinDepth(f: number, mu: number, sigma: number): number {
  const omega = 2 * Math.PI * f;
  const mu0 = 4 * Math.PI * 1e-7;
  return Math.sqrt(2 / (omega * mu0 * mu * sigma));
}

export function ShadowWallPanel({ onClose }: Props) {
  const [matId, setMatId]     = useState("concrete");
  const [freqIdx, setFreqIdx] = useState(0);
  const [thickness, setThickness] = useState(0.20);

  const mat   = MATERIALS.find(m => m.id === matId)!;
  const freq  = FREQS[freqIdx];

  const delta          = skinDepth(freq.f, mat.mu, mat.sigma);
  const alpha          = 1 / delta;
  const transmission   = Math.exp(-alpha * thickness) * 100;
  const blocked        = thickness > 5 * delta;
  const attenuationDb  = -20 * Math.log10(Math.max(transmission / 100, 1e-20));

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-5"
      style={{ background: "rgba(10,6,2,0.93)", backdropFilter: "blur(16px)" }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <div>
            <div className="panel-title">Shadow Wall — Signal Attenuation</div>
            <div className="text-xl font-bold mt-1" style={{ color: "#f0ddb0" }}>
              Will the signal pass through the wall?
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        {/* Plain-language intro */}
        <div className="panel p-4 text-sm leading-relaxed" style={{ color: "rgba(230,200,150,0.8)" }}>
          Every material slows down a WiFi signal differently. The thicker and denser the wall, the weaker
          the signal that comes out the other side. Below you can pick the wall material, its thickness,
          and the WiFi frequency to see exactly how much signal survives.
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Left: controls */}
          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <div className="panel-title mb-3">Wall Material</div>
              <div className="flex flex-col gap-2">
                {MATERIALS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMatId(m.id); setThickness(m.thickness); }}
                    className="text-left px-3 py-2 rounded text-sm transition-all"
                    style={{
                      background: matId === m.id ? "rgba(120,70,20,0.55)" : "rgba(40,22,8,0.4)",
                      border: `1px solid ${matId === m.id ? "rgba(200,140,60,0.7)" : "rgba(120,80,30,0.25)"}`,
                      color: matId === m.id ? "#f5e6ce" : "rgba(210,175,125,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel p-4">
              <div className="panel-title mb-3">WiFi Frequency</div>
              <div className="flex gap-2">
                {FREQS.map((fr, i) => (
                  <button
                    key={i}
                    onClick={() => setFreqIdx(i)}
                    className="flex-1 py-2 rounded text-xs font-bold transition-all"
                    style={{
                      background: freqIdx === i ? "rgba(120,70,20,0.6)" : "rgba(40,22,8,0.4)",
                      border: `1px solid ${freqIdx === i ? "rgba(200,140,60,0.7)" : "rgba(120,80,30,0.25)"}`,
                      color: freqIdx === i ? "#f5e6ce" : "rgba(210,175,125,0.7)",
                      cursor: "pointer",
                    }}
                  >
                    {fr.label}
                  </button>
                ))}
              </div>
              <div className="text-xs mt-2" style={{ color: "rgba(200,150,80,0.55)" }}>
                Higher frequency = more easily blocked by walls
              </div>
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-col gap-4">
            <div className="panel p-4">
              <div className="panel-title mb-2">Wall Thickness</div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(200,150,80,0.6)" }}>
                <span>{(thickness * 100).toFixed(0)} cm</span>
                <span>Critical limit: {(5 * delta * 100).toFixed(3)} cm</span>
              </div>
              <input
                type="range" min={0.001} max={0.5} step={0.001}
                value={thickness}
                onChange={e => setThickness(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "#c08030" }}
              />
              <div className="text-xs mt-1" style={{ color: "rgba(200,150,80,0.5)" }}>
                Slide to change wall thickness
              </div>
            </div>

            <div className="panel p-4 flex flex-col gap-3">
              <div className="panel-title">Results</div>
              {[
                { k: "Signal lost",         v: `${attenuationDb.toFixed(1)} dB` },
                { k: "Signal that survives", v: `${transmission.toFixed(2)}%`   },
                { k: "Skin depth (δ)",       v: `${(delta * 100).toFixed(4)} cm` },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: "rgba(200,150,80,0.6)" }}>{k}</span>
                  <span className="text-sm font-bold" style={{ color: "#e8d0a0" }}>{v}</span>
                </div>
              ))}

              <div
                className="mt-1 p-3 rounded-md text-sm font-bold text-center"
                style={{
                  background: blocked ? "rgba(180,30,20,0.15)" : "rgba(60,130,40,0.15)",
                  border: `1px solid ${blocked ? "rgba(220,70,60,0.4)" : "rgba(120,200,80,0.4)"}`,
                  color: blocked ? "#e07060" : "#a8d878",
                }}
              >
                {blocked
                  ? "Signal BLOCKED — wall too thick to pass through"
                  : "Signal PASSES — weak but still detectable"}
              </div>

              <div className="text-xs leading-relaxed" style={{ color: "rgba(200,160,100,0.65)" }}>
                {blocked
                  ? "The wall is thicker than 5× the skin depth. The signal is absorbed before it exits."
                  : `${transmission.toFixed(1)}% of the original signal makes it through. An attacker nearby could still detect it.`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
