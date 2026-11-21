import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SectionHead } from "./ui";

// original mini-games and a drawing toy, switchable (?game=overprint|fold|draw|shepherd|register|blot); loaded only when the section comes near
const games = { overprint: lazy(() => import("./game/Overprint")), fold: lazy(() => import("./game/Fold")), draw: lazy(() => import("./game/Draw")), shepherd: lazy(() => import("./game/Shepherd")), register: lazy(() => import("./game/Register")), blot: lazy(() => import("./game/Blot")) };
type Game = keyof typeof games;

function Games() {
  const [game, setGame] = useState<Game>(() => { const g = new URLSearchParams(location.search).get("game"); return g && g in games ? (g as Game) : "overprint"; });
  const [near, setNear] = useState(false);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);
  const Play = games[game];
  return (
    <section ref={box} id="play" className="mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 max-w-6xl scroll-mt-16">
      <SectionHead n="03·b" title="Play" />
      <nav aria-label="Games" className="mb-8 flex flex-wrap justify-center gap-2">
        {(Object.keys(games) as Game[]).map((g) => (
          <button key={g} onClick={() => setGame(g)} aria-pressed={g === game} className={`capitalize ${g === game ? "pill-dark" : "pill-light"}`}>{g}</button>
        ))}
      </nav>
      <div className="min-h-[70vh]">{near && <Suspense fallback={null}><Play /></Suspense>}</div>
    </section>
  );
}

export default Games;
