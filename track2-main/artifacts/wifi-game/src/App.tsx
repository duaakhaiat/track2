import { useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { HouseGame } from "./pages/HouseGame";
import { HackerRoom } from "./pages/HackerRoom";

export type GameScene = "landing" | "house" | "hacker";

export default function App() {
  const [scene, setScene] = useState<GameScene>("landing");

  if (scene === "house") return <HouseGame onBack={() => setScene("landing")} />;
  if (scene === "hacker") return <HackerRoom onBack={() => setScene("landing")} />;
  return <LandingPage onEnterHouse={() => setScene("house")} onEnterHacker={() => setScene("hacker")} />;
}
