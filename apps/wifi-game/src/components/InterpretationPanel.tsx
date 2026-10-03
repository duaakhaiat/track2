interface Props {
  onClose: () => void;
  scene: "house" | "hacker";
}

export function InterpretationPanel({ onClose, scene }: Props) {
  const isHouse = scene === "house";

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-5"
      style={{ background: "rgba(8,9,11,0.95)", backdropFilter: "blur(18px)" }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto pr-1">

        <div
          className="flex items-center justify-between sticky top-0 py-2"
          style={{ background: "rgba(8,9,11,0.98)" }}
        >
          <div>
            <div className="panel-title">Deep Physics Explanation</div>
            <div className="text-xl font-bold mt-1" style={{ color: "#f0ddb0" }}>
              {isHouse
                ? "How WiFi Physics Powers the Smart Router"
                : "How a Hacker Uses Physics to Steal Your Password"}
            </div>
          </div>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>

        {isHouse ? <HouseContent /> : <HackerContent />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HACKER SCENE — physics of attack + defence
═══════════════════════════════════════════════════════════ */
function HackerContent() {
  return (
    <div className="flex flex-col gap-4">

      <Callout icon="📡" color="#d07060">
        WiFi is radio. Radio goes through walls. An attacker does not need to be inside your home
        — they just need to be close enough to receive the signal.
      </Callout>

      <Section title="Step 1 — Signal always escapes through walls (physics reason)">
        <p>
          WiFi travels as an electromagnetic wave at 2.4 GHz or 5 GHz. When that wave hits a concrete
          wall, some of it is absorbed and some passes through. The Friis Transmission Equation tells us
          how strong the signal is at any distance:
        </p>
        <Formula>
          P_received = P_transmit × G_tx × G_rx × (λ / 4πd)²
        </Formula>
        <ul className="mt-2 space-y-1 text-sm" style={{ color: "rgba(210,205,195,0.85)" }}>
          <li><B>λ</B> = wavelength (2.4 GHz = 12.5 cm wave, 5 GHz = 6 cm wave)</li>
          <li><B>d</B> = distance between router and attacker</li>
          <li><B>G_rx</B> = gain of the attacker's antenna — a cheap directional antenna can multiply received signal by 100×</li>
        </ul>
        <Note>
          Even if the wall absorbs 99% of your signal, an attacker 10 m away with a directional antenna
          can still receive usable packets. The physics does not fully protect you — only encryption does.
        </Note>
      </Section>

      <Section title="Step 2 — Capturing the 4-Way Handshake (IEEE 802.11i)">
        <p>
          When your phone or laptop connects to your router, they perform a <B>4-Way Handshake</B>. This is
          the moment they prove to each other that they both know the password — without sending it in clear text.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { step: "Message 1", who: "Router → Device", what: "Sends a random number (ANonce)" },
            { step: "Message 2", who: "Device → Router", what: "Sends own random number (SNonce) + MIC (proof of password)" },
            { step: "Message 3", who: "Router → Device", what: "Sends encryption keys" },
            { step: "Message 4", who: "Device → Router", what: "Acknowledges — connection established" },
          ].map(({ step, who, what }) => (
            <div key={step} className="p-2 rounded" style={{ background:"rgba(28,30,36,0.80)", border:"1px solid rgba(80,82,90,0.25)" }}>
              <div className="text-xs font-bold" style={{ color:"#e8d098" }}>{step}</div>
              <div className="text-xs mt-0.5" style={{ color:"rgba(150,140,120,0.75)" }}>{who}</div>
              <div className="text-xs mt-1" style={{ color:"rgba(200,195,185,0.80)" }}>{what}</div>
            </div>
          ))}
        </div>
        <Note>
          The attacker records Messages 1 + 2 — that is all they need. They now have a "locked box" that
          can only be opened by the correct password. They take this home and crack it offline.
        </Note>
      </Section>

      <Section title="Step 3 — The MIC: What the Attacker Is Actually Cracking">
        <p>
          Inside Message 2 is a <B>MIC (Message Integrity Code)</B> computed using:
        </p>
        <Formula>
          PTK = PRF(PMK, ANonce, SNonce, MAC_AP, MAC_Client)
          MIC = HMAC-SHA1(PTK, Handshake_frame)
        </Formula>
        <p className="mt-2">
          <B>PMK = PBKDF2(password, SSID, 4096 iterations, 256 bits)</B> — this is the hashed version of your password.
        </p>
        <p className="mt-2">
          The attacker tries millions of passwords per second through this chain and checks: does the
          computed MIC match what they captured? If yes — they found your password.
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { hw: "CPU", speed: "~1,000 tries/s", color: "#82c46a" },
            { hw: "Mid GPU", speed: "~500,000 tries/s", color: "#d4a840" },
            { hw: "High-end GPU", speed: "~5,000,000 tries/s", color: "#d07030" },
          ].map(({ hw, speed, color }) => (
            <div key={hw} className="p-3 rounded text-center" style={{ background:"rgba(28,30,36,0.80)", border:`1px solid ${color}30` }}>
              <div className="text-xs font-bold" style={{ color }}>{hw}</div>
              <div className="text-xs mt-1" style={{ color:"rgba(200,195,185,0.75)" }}>{speed}</div>
            </div>
          ))}
        </div>
        <Note>
          A password like <code style={{ color:"#e8d098" }}>"wifi123"</code> exists in every wordlist.
          Cracked instantly. A password like <code style={{ color:"#82c46a" }}>"K#9mP!qz2Xr4"</code> has
          ~10⁶⁰ combinations — billions of years at GPU speed.
        </Note>
      </Section>

      <Section title="Step 4 — PMKID Attack (no handshake needed!)">
        <p>
          In 2018, a researcher discovered an even faster method: the router sends a <B>PMKID</B> in the very
          first beacon frame, even before the handshake. The formula:
        </p>
        <Formula>PMKID = HMAC-SHA1(PMK, "PMK Name" + AP_MAC + Client_MAC)</Formula>
        <p className="mt-2">
          Since PMK is derived directly from your password, an attacker can recover it from a single packet
          — no need to wait for a device to connect. This affects all WPA2 networks.
        </p>
      </Section>

      <Section title="How to Protect Yourself — Using the Same Physics">
        <div className="flex flex-col gap-2 mt-1">
          {[
            { tip:"Use WPA3 (SAE)", why:"Replaces the vulnerable handshake with Simultaneous Authentication of Equals — offline cracking is mathematically impossible.", color:"#82c46a" },
            { tip:"Long random password (20+ chars)", why:"Each extra character multiplies cracking time exponentially. 20 random chars = 10²⁰ combinations.", color:"#82c46a" },
            { tip:"Use 5 GHz or 6 GHz band", why:"Higher frequency = shorter wavelength = more absorption by walls (Beer-Lambert). Signal doesn't travel as far outside.", color:"#d4a840" },
            { tip:"Lower transmit power", why:"Reduce the P_transmit in the Friis equation. Less signal escaping your home = smaller attack surface.", color:"#d4a840" },
            { tip:"Directional antenna on router", why:"Focus signal toward living space, not toward exterior walls. Reduces G_tx in unwanted directions.", color:"#d07030" },
          ].map(({ tip, why, color }) => (
            <div key={tip} className="p-3 rounded" style={{ background:"rgba(22,24,28,0.85)", border:`1px solid ${color}28` }}>
              <div className="text-sm font-bold mb-0.5" style={{ color }}>{tip}</div>
              <div className="text-xs leading-relaxed" style={{ color:"rgba(195,190,178,0.75)" }}>{why}</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label:"WEP",  sub:"Broken",    note:"Cracked in < 60 seconds. RC4 stream cipher flaw.",   bad:true  },
          { label:"WPA2", sub:"At Risk",   note:"4-Way Handshake vulnerable to offline dictionary.",   warn:true },
          { label:"WPA3", sub:"Secure",    note:"SAE protocol. No offline crack possible.",             good:true },
        ].map(({ label, sub, note, bad, warn, good }) => (
          <div key={label} className="p-3 rounded" style={{
            background: bad?"rgba(100,20,15,0.18)":warn?"rgba(100,70,10,0.18)":"rgba(20,75,20,0.18)",
            border:`1px solid ${bad?"rgba(200,55,45,0.30)":warn?"rgba(195,145,35,0.30)":"rgba(90,185,65,0.30)"}`,
          }}>
            <div className="text-base font-black" style={{ color:"#f0ddb0" }}>{label}</div>
            <div className="text-xs font-bold" style={{ color:bad?"#e06050":warn?"#e0b040":"#90d060" }}>{sub}</div>
            <div className="text-xs mt-1" style={{ color:"rgba(195,190,178,0.68)" }}>{note}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   HOUSE SCENE — how physics builds a smart router
═══════════════════════════════════════════════════════════ */
function HouseContent() {
  return (
    <div className="flex flex-col gap-4">

      <Callout icon="📶" color="#82c46a">
        The same electromagnetic physics that makes WiFi hackable also gives engineers the tools to
        design routers that deliver strong, even, secure coverage across every room.
      </Callout>

      <Section title="The Core Problem: Why Signal Dies in Some Rooms">
        <p>
          WiFi energy decreases with distance and wall absorption. Two laws govern this:
        </p>
        <div className="grid grid-cols-1 gap-2 mt-2">
          <FormulaBlock label="Free Space Path Loss (Friis)">
            FSPL (dB) = 20 log₁₀(d) + 20 log₁₀(f) + 20 log₁₀(4π/c)
            <br />
            <small style={{ color:"rgba(180,170,148,0.60)" }}>Every time distance doubles → signal loses 6 dB (¼ of its power)</small>
          </FormulaBlock>
          <FormulaBlock label="Beer-Lambert Wall Attenuation">
            I = I₀ × e^(−α × thickness)
            <br />
            <small style={{ color:"rgba(180,170,148,0.60)" }}>α = 1/δ, where δ (skin depth) = √(2 / ωμσ) — determines how far the signal penetrates the material</small>
          </FormulaBlock>
        </div>
        <Note>
          The combined attenuation from distance + walls determines exactly how strong the signal is in
          each room. A smart router uses this to compensate automatically.
        </Note>
      </Section>

      <Section title="Technique 1 — Beamforming (IEEE 802.11ac / Wi-Fi 5+)">
        <p>
          A standard antenna radiates energy in all directions equally — most of it wasted on walls and
          empty space. Beamforming uses <B>multiple antennas (antenna array)</B> with carefully timed signals.
        </p>
        <Formula>
          Array factor: AF(θ) = Σ aₙ × e^(jnkd sin θ)
        </Formula>
        <p className="mt-2">
          By shifting the phase of each antenna, the router creates constructive interference in the
          direction of your device and destructive interference everywhere else.
          Result: up to <B>+10 dB gain</B> toward your device = signal is 10× stronger in that direction.
        </p>
        <Note>
          Every time your laptop moves, the router recalculates the phases in microseconds. This is why
          modern WiFi feels so much faster than older routers, even through walls.
        </Note>
      </Section>

      <Section title="Technique 2 — MU-MIMO (Multi-User Multiple Input Multiple Output)">
        <p>
          A classic router speaks to one device at a time (time-sharing). MU-MIMO exploits the spatial
          separation of devices to transmit to multiple clients <B>simultaneously on the same channel</B>,
          using spatial multiplexing:
        </p>
        <Formula>
          Capacity: C = B × log₂(det(I + (P/N₀) × H × H†))
        </Formula>
        <ul className="mt-2 space-y-1 text-sm" style={{ color:"rgba(210,205,195,0.85)" }}>
          <li><B>B</B> = channel bandwidth</li>
          <li><B>H</B> = channel matrix (describes the unique spatial path of each device)</li>
          <li>Wi-Fi 6 supports <B>8×8 MU-MIMO</B> — 8 devices at full speed simultaneously</li>
        </ul>
      </Section>

      <Section title="Technique 3 — Adaptive Frequency Selection">
        <p>
          The Beer-Lambert law shows that higher frequencies have a smaller skin depth — they are absorbed
          faster by walls. This is both a challenge and a tool:
        </p>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { freq:"2.4 GHz", delta:"~50 mm in concrete", range:"Long range, penetrates well", good:true },
            { freq:"5 GHz",   delta:"~22 mm in concrete", range:"Faster, shorter range", },
            { freq:"6 GHz",   delta:"~14 mm in concrete", range:"Ultra-fast, same room only", },
          ].map(({ freq, delta, range, good }) => (
            <div key={freq} className="p-3 rounded" style={{
              background:"rgba(22,24,28,0.85)",
              border:`1px solid ${good?"rgba(130,196,106,0.25)":"rgba(80,82,90,0.25)"}`,
            }}>
              <div className="text-sm font-bold" style={{ color:"#e8d098" }}>{freq}</div>
              <div className="text-xs mt-1" style={{ color:"rgba(155,150,140,0.70)" }}>Skin depth: {delta}</div>
              <div className="text-xs mt-1" style={{ color:"rgba(200,195,185,0.80)" }}>{range}</div>
            </div>
          ))}
        </div>
        <Note>
          A smart router continuously measures signal quality per device and switches them to the optimal
          band automatically — a process called <B>Band Steering</B>.
        </Note>
      </Section>

      <Section title="Technique 4 — Optimal Placement & Mesh Networks">
        <p>
          The Router Simulation above shows the <B>Coverage Equity Score</B>. The physics goal is to
          minimize path loss variance across all rooms. For a house with N rooms:
        </p>
        <Formula>
          Equity = 100 − σ × 2    (σ = standard deviation of room signal strengths)
        </Formula>
        <p className="mt-2">
          When one router cannot cover all rooms (too many walls or too large a space), a <B>Mesh Network</B>
          adds satellite nodes. Each node communicates with the others on a dedicated backhaul channel,
          seamlessly extending coverage without creating a second network.
        </p>
        <Note>
          The "Walk Inside" mode lets you experience this first-person — notice the glowing router beacon
          and how the house looks from a human perspective. The router should always be as central as possible.
        </Note>
      </Section>

    </div>
  );
}

/* ─── Small shared components ────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="text-sm font-bold mb-2" style={{ color:"#b8924a" }}>{title}</div>
      <div className="text-sm leading-relaxed" style={{ color:"rgba(215,210,198,0.88)" }}>{children}</div>
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color:"#e8d098" }}>{children}</strong>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded text-xs leading-relaxed" style={{
      background:"rgba(30,32,38,0.70)",
      border:"1px solid rgba(90,88,80,0.30)",
      color:"rgba(190,185,170,0.75)",
    }}>
      💡 {children}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 px-4 py-2.5 rounded font-mono text-sm" style={{
      background:"rgba(30,32,38,0.85)",
      border:"1px solid rgba(90,85,60,0.35)",
      color:"#d4c070",
      whiteSpace:"pre-wrap",
    }}>
      {children}
    </div>
  );
}

function FormulaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color:"rgba(155,148,128,0.60)" }}>{label}</div>
      <Formula>{children}</Formula>
    </div>
  );
}

function Callout({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg flex gap-3 items-start" style={{
      background:`${color}0f`,
      border:`1px solid ${color}35`,
    }}>
      <span className="text-xl mt-0.5">{icon}</span>
      <p className="text-sm leading-relaxed" style={{ color:"rgba(215,210,198,0.88)" }}>{children}</p>
    </div>
  );
}
