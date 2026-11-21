import projects from "../../data/project_data";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Github, ExternalLink, Volume2, VolumeX } from "lucide-react";

// "See all projects" as a printed capsule vending machine: pick a slot (or drop a coin for a random one),
// the capsule wobbles loose, falls with gravity into the tray, bounces and rolls; open it to read the project.
// Printed like the v1 computer: ink key lines in register, colour plates a little off, halftone dots.

type P = (typeof projects)[number];
const INK = "#26201a", CREAM = "#f3e6c4", ORANGE = "#ff6509", FOREST = "#24493a", MUSTARD = "#ecba2a";
const CAPS = [ORANGE, FOREST, MUSTARD];
// selection buttons: tech names grouped as they appear in tech_stack; a group shows only if a project uses it
const GROUPS = ([
    ["React / Next.js", /^(React|Next)/], ["TypeScript", /^TypeScript$/], ["JavaScript", /^JavaScript$/], ["Node.js", /^Node/],
    ["Python", /^(Python|FastAPI)$/], ["C / C++", /^C(\+\+)?$/], ["PostgreSQL", /^PostgreSQL$/], ["MongoDB", /^MongoDB$/],
] as [string, RegExp][]).filter(([, re]) => projects.some((p) => p.tech_stack.some((t) => re.test(t))));
const uses = (p: P, g: number | null) => g !== null && p.tech_stack.some((t) => GROUPS[g][1].test(t));

// physics, in px and seconds: hard plastic on a metal tray loses a little over half its speed per bounce
const G = 3000, E = 0.42, REST = 110, ROLL = 2.4, STEP = 1 / 120;

let ac: AudioContext | null = null;
function tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine", at = 0) {
    ac ??= new AudioContext();
    const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}

const css = `
.vm{--vwin:#ead7a4}
[data-theme="dark"] .vm{--vwin:#f6e3b0}
[data-theme="dark"] .vm .shell{filter:brightness(.72) saturate(.9)}
[data-theme="dark"] .vm>.relative{box-shadow:0 0 90px -20px rgb(236 186 42/.35)}
.vm .bay{background:linear-gradient(rgb(38 32 26/.13),rgb(38 32 26/.04) 40%,transparent)}
.vm .key{box-shadow:inset 0 0 0 2.5px ${INK}}
.vm .paper{background-image:url("/art/paper.webp");background-size:512px;background-blend-mode:overlay}
.vm .slot:focus-visible,.vm button:focus-visible,.vm a:focus-visible{outline:3px solid ${ORANGE};outline-offset:2px}
.vm .slot:active .push,.vm .sel:active .face{transform:translateY(3px)}
.vm .push,.vm .face,.vm .dim{transition:transform .08s,opacity .25s}
.vm .lift{transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
@media (hover:hover){.vm .slot:hover .lift{transform:translateY(-4px) rotate(-5deg)}}
.vm .glow,.vm .lamp,.vm .lit{transition:opacity .2s}
.vm.run .bulb{animation:vm-chase .5s steps(1) infinite}
@keyframes vm-chase{50%{opacity:.25}}
.vm [data-side=l] .tag{right:calc(100% + 6px)}.vm [data-side=r] .tag{left:calc(100% + 6px)}
.vm .bob{animation:vm-bob 2.4s ease-in-out 3}
@keyframes vm-bob{0%,80%,100%{transform:none}86%{transform:rotate(-7deg)}93%{transform:rotate(5deg)}}
@media (prefers-reduced-motion:reduce){.vm .bob,.vm.run .bulb{animation:none}}
`;

function Capsule({ color, code }: { color: string; code: string }) {
    return (
        <svg viewBox="-31 -31 62 62" className="block w-full h-full overflow-visible" aria-hidden>
            <g className="top">
                <path d="M-27 0A27 27 0 0 1 27 0Z" fill={color} transform="translate(1.6 -1.2)" />
                <path d="M-27 0A27 27 0 0 1 27 0Z" fill="none" stroke={INK} strokeWidth="2.4" />
                <path d="M-17-13Q-8-21 4-22" stroke="#fff" strokeOpacity=".55" strokeWidth="3.2" strokeLinecap="round" fill="none" />
            </g>
            <g className="bot">
                <path d="M-27 0A27 27 0 0 0 27 0Z" fill={CREAM} />
                <path d="M-27 0H27A27 27 0 0 1-27 0Z" fill="none" stroke={INK} strokeWidth="2.4" />
                <text y="16" textAnchor="middle" fontSize="12" fontWeight="800" fill={INK}>{code}</text>
            </g>
            <g clipPath="url(#vm-clip)"><path d="M-27 0a27 27 0 1 0 54 0a27 27 0 1 0-54 0M-35-7a27 27 0 1 0 54 0a27 27 0 1 0-54 0" fillRule="evenodd" fill="url(#vm-dots)" /></g>
            <path d="M-27 0H27M-27 3H27" stroke={INK} strokeWidth="1.6" />
        </svg>
    );
}

function Coin({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
            <circle r="10.5" fill={MUSTARD} transform="translate(.8 .6)" /><circle r="10.5" fill="url(#vm-dots)" opacity=".5" />
            <circle r="10.5" fill="none" stroke={INK} strokeWidth="1.8" /><circle r="6.5" fill="none" stroke={INK} strokeWidth="1.1" />
        </svg>
    );
}

export default function Vending() {
    const [phone, setPhone] = useState(() => matchMedia("(max-width: 767px)").matches);
    const calm = useRef(matchMedia("(prefers-reduced-motion: reduce)").matches).current;
    const [tech, setTech] = useState<number | null>(null);
    const [spin, setSpin] = useState<number | null>(null);     // roulette lamp after a coin
    const [held, setHeld] = useState<number | null>(null);     // the capsule out of its slot
    const [phase, setPhase] = useState<"idle" | "fall" | "tray" | "open">("idle");
    const [sound, setSound] = useState(false);
    const root = useRef<HTMLDivElement>(null), win = useRef<HTMLDivElement>(null), tray = useRef<HTMLDivElement>(null);
    const capA = useRef<HTMLDivElement>(null), capB = useRef<HTMLButtonElement>(null), flap = useRef<HTMLDivElement>(null);
    const coin = useRef<HTMLDivElement>(null), card = useRef<HTMLElement>(null), slots = useRef<(HTMLButtonElement | null)[]>([]);
    const body = useRef<HTMLDivElement>(null), busy = useRef(false), timers = useRef<number[]>([]);
    const cols = phone ? 3 : 4, code = (i: number) => `${"ABCD"[Math.floor(i / cols)]}${(i % cols) + 1}`;
    const sfx = (f: () => void) => { if (sound) try { f(); } catch { /* no audio */ } };
    const later = (f: () => void, ms: number) => timers.current.push(window.setTimeout(f, ms));

    useEffect(() => {
        const mq = matchMedia("(max-width: 767px)"), on = () => setPhone(mq.matches);
        mq.addEventListener("change", on);
        return () => { mq.removeEventListener("change", on); timers.current.forEach(clearTimeout); };
    }, []);

    const restock = (i: number) => {
        const s = slots.current[i]?.querySelector(".cap");
        if (s && !calm) s.animate([{ transform: "translateY(-40%) scale(.6)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.3,1.6,.5,1)" });
    };

    function vend(i: number) {
        if (busy.current || phase === "open") return;
        if (held === i && phase === "tray") return open();
        busy.current = true;
        if (held !== null) restock(held);
        setHeld(i); setPhase("idle"); setSpin(null);
        capB.current!.style.opacity = "0";
        sfx(() => tone(900, 500, 0.04, 0.08, "square"));
        const slot = slots.current[i]!, cap = slot.querySelector<HTMLElement>(".cap")!, gate = slot.querySelector<HTMLElement>(".gate")!;
        root.current!.classList.add("run");
        tray.current!.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
        if (calm) return land(null);
        cap.animate([{ transform: "none" }, { transform: "rotate(-10deg)" }, { transform: "rotate(9deg)" }, { transform: "rotate(-7deg)" }, { transform: "rotate(5deg) translateY(-6%)" }], { duration: 420, easing: "ease-in-out" });
        gate.animate([{ transform: "none" }, { transform: "scaleX(.12)", offset: 0.3 }, { transform: "scaleX(.12)", offset: 0.8 }, { transform: "none" }], { duration: 900, delay: 300, easing: "ease-in-out" });
        // root-relative, as the page may scroll to the tray meanwhile
        const c = cap.getBoundingClientRect(), R = root.current!.getBoundingClientRect(), from = new DOMRect(c.left - R.left, c.top - R.top, c.width, c.height);
        later(() => land(from), 400);
    }

    // the drop: fixed-step gravity, bounces with restitution E, tray side walls, rolling friction once it rests.
    // The whole drop is simulated first and played as keyframes, so it runs on the compositor with no work per frame.
    function land(from: DOMRect | null) {
        const R = root.current!.getBoundingClientRect(), W = win.current!.getBoundingClientRect(), T = tray.current!.getBoundingClientRect();
        const a = capA.current!, b = capB.current!, rot = (el: HTMLElement) => el.querySelector<HTMLElement>(".rot")!;
        const r = b.offsetWidth / 2, wx = W.left - R.left, wy = W.top - R.top, tx = T.left - R.left, ty = T.top - R.top;
        const floor = T.bottom - R.top - 10 - r, left = tx + 12 + r, right = T.right - R.left - 12 - r;
        const settle = (x: number, ang: number) => {
            Object.assign(b.style, { left: `${((x - tx) / T.width) * 100}%`, top: `${floor - ty}px`, opacity: "1" });
            rot(b).style.transform = `rotate(${ang % 360}deg)`;
            b.dataset.side = x - tx > T.width * 0.6 ? "l" : "r";
            a.style.opacity = "0";
            [a, b, rot(a), rot(b)].forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
            root.current!.classList.remove("run");
            busy.current = false; setPhase("tray");
            later(() => b.focus({ preventScroll: true }), 50);
        };
        if (!from) {
            b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
            return settle(tx + T.width / 2, 0);
        }
        setPhase("fall");
        // starts where the slot's capsule sat before its wobble
        let x = from.left + r, y = from.top + r, vx = (Math.random() - 0.5) * 40, vy = -160, w = 140, ang = 0, t = 0, flapAt = -1;
        const path: number[][] = [], bumps: number[][] = [];
        for (let k = 0; k < 2400; k++, t += STEP) {
            if (k % 2 === 0) path.push([x, y, ang]);  // a keyframe every 1/60 s
            if (!(y >= floor && vy === 0)) vy += G * STEP;
            x += vx * STEP; y += vy * STEP;
            if (y + r > ty && flapAt < 0) flapAt = t;
            if (y > ty) {  // inside the tray: walls and floor
                if (x < left) { x = left; vx = -vx * 0.5; } else if (x > right) { x = right; vx = -vx * 0.5; }
                if (y >= floor) {
                    y = floor;
                    if (vy > REST) {
                        if (!bumps.length) vx += (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 120);
                        bumps.push([t, Math.min(1, vy / 1800)]);
                        vy = -vy * E;
                    } else vy = 0;
                }
            }
            if (y >= floor && vy === 0) vx *= Math.exp(-ROLL * STEP);
            if (y >= floor) w = (vx / r) * 57.3;  // on the floor it rolls without slipping
            ang += w * STEP;
            if (y >= floor && vy === 0 && Math.abs(vx) < 5) break;
        }
        path.push([x, y, ang]);
        const opts = { duration: ((path.length - 1) * 1000) / 60, easing: "linear", fill: "forwards" as const };
        const spin = path.map(([, , g]) => ({ transform: `rotate(${g}deg)` }));
        a.style.opacity = b.style.opacity = "1";
        Object.assign(b.style, { left: "0", top: "0" });
        a.animate(path.map(([px, py]) => ({ transform: `translate3d(${px - wx}px,${py - wy}px,0)` })), opts);
        b.animate(path.map(([px, py]) => ({ transform: `translate3d(${px - tx}px,${py - ty}px,0)` })), opts);
        rot(a).animate(spin, opts);
        rot(b).animate(spin, opts).onfinish = () => settle(x, ang);
        flap.current!.animate([{ transform: "none" }, { transform: "rotateX(-60deg)", offset: 0.25 }, { transform: "rotateX(14deg)", offset: 0.6 }, { transform: "none" }], { duration: 560, delay: flapAt * 1000, easing: "ease-out" });
        // one squash track for all the bounces (separate animations on one element can't all run on the compositor)
        b.firstElementChild!.animate([{ transform: "none" }, ...bumps.flatMap(([bt, hard], n) => [
            { transform: "none", offset: (bt * 1000 - 1) / opts.duration },
            { transform: `scale(${1 + 0.22 * hard},${1 - 0.22 * hard})`, offset: (bt * 1000) / opts.duration },
            { transform: "none", offset: Math.min(bumps[n + 1]?.[0] ?? 1e9, bt + 0.17) * 1000 / opts.duration - 0.002 },
        ]).filter((k) => k.offset > 0 && k.offset < 1), { transform: "none" }], { duration: opts.duration, easing: "ease-out" });
        bumps.forEach(([bt, hard], n) => {
            sfx(() => tone(160, 55, 0.18, 0.5 * hard + 0.05, "triangle", bt));
            if (!n) body.current!.animate([{ transform: "none" }, { transform: "translate(0,3px) rotate(.25deg)" }, { transform: "translate(0,-2px) rotate(-.2deg)" }, { transform: "translate(0,1px)" }, { transform: "none" }], { duration: 300, delay: bt * 1000, easing: "ease-out" });
        });
    }

    function surprise() {
        if (busy.current || phase === "open") return;
        let pick = Math.floor(Math.random() * projects.length);
        if (pick === held) pick = (pick + 1) % projects.length;
        sfx(() => { tone(2300, 2200, 0.12, 0.12); tone(3000, 2900, 0.18, 0.1, "sine", 0.09); });
        if (calm) return vend(pick);
        busy.current = true;
        coin.current!.animate([{ transform: "translateY(-150%)", opacity: 0 }, { transform: "translateY(-60%)", opacity: 1, offset: 0.3 }, { transform: "translateY(0) scaleX(.25)", offset: 0.65 }, { transform: "translateY(90%) scaleX(.25)", opacity: 1 }], { duration: 560, easing: "cubic-bezier(.5,0,.9,.5)" });
        // roulette: the lamp runs along the slots and slows to a stop on the pick
        const n = projects.length, start = Math.floor(Math.random() * n), steps = 12 + ((((pick - start - 12) % n) + n) % n);
        let t = 520;
        for (let s = 0; s <= steps; s++) {
            const k = (start + s) % n;
            t += 45 + 140 * (s / steps) ** 3;
            later(() => { setSpin(k); sfx(() => tone(1400, 1300, 0.025, 0.04, "square")); }, t);
        }
        later(() => { busy.current = false; vend(pick); }, t + 260);
    }

    function open() {
        if (held === null) return;
        const b = capB.current!, svg = b.querySelector("svg")!;
        sfx(() => tone(700, 1400, 0.09, 0.12));
        setPhase("open");
        if (!calm) {
            svg.querySelector(".top")!.animate([{ transform: "none" }, { transform: "translate(-8px,-22px) rotate(-40deg)", opacity: 0 }], { duration: 320, easing: "ease-out", fill: "forwards" });
            svg.querySelector(".bot")!.animate([{ transform: "none" }, { transform: "translate(6px,10px) rotate(15deg)", opacity: 0 }], { duration: 320, easing: "ease-out", fill: "forwards" });
        }
        requestAnimationFrame(() => {
            const c = card.current!, cr = c.getBoundingClientRect(), br = b.getBoundingClientRect();
            const dx = br.left + br.width / 2 - (cr.left + cr.width / 2), dy = br.top + br.height / 2 - (cr.top + cr.height / 2);
            if (calm) c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
            else c.animate([
                { transform: `translate(${dx}px,${dy}px) scale(.06) rotate(-12deg)`, opacity: 0 },
                { transform: `translate(${dx * 0.15}px,${dy * 0.15}px) perspective(1400px) rotateX(-75deg) scale(.75)`, opacity: 1, offset: 0.45 },
                { transform: "perspective(1400px) rotateX(6deg)", offset: 0.8 },
                { transform: "none", opacity: 1 },
            ], { duration: 720, easing: "cubic-bezier(.25,.8,.3,1)" });
            c.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
            c.querySelector<HTMLElement>("h4")!.focus({ preventScroll: true });
        });
    }

    function back() {
        const i = held!;
        capB.current!.style.opacity = "0";
        capB.current!.querySelectorAll("g").forEach((g) => g.getAnimations().forEach((an) => an.cancel()));
        setPhase("idle"); setHeld(null); restock(i);
        requestAnimationFrame(() => slots.current[i]?.focus({ preventScroll: true }));
    }

    const p = held === null ? null : projects[held];
    const capStyle: CSSProperties = { position: "absolute", left: 0, top: 0, opacity: 0, width: "var(--cap)", height: "var(--cap)", margin: "calc(var(--cap) / -2)", willChange: "transform" };
    const heldCap = <Capsule color={CAPS[(held ?? 0) % 3]} code={held === null ? "" : code(held)} />;
    return (
        <div ref={root} className="vm relative mx-auto max-w-[900px] [--cap:54px] md:[--cap:74px]" onKeyDown={(e) => { if (e.key === "Escape" && phase === "open") back(); }}>
            <style>{css}</style>
            <svg width="0" height="0" className="absolute" aria-hidden>
                <defs>
                    <pattern id="vm-dots" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2" cy="2" r="1.1" fill={INK} /></pattern>
                    <pattern id="vm-big" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.9" fill={INK} /></pattern>
                    <pattern id="vm-floor" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1.3" fill={CREAM} /></pattern>
                    <clipPath id="vm-clip"><circle r="27" /></clipPath>
                </defs>
            </svg>

            <div ref={body} inert={phase === "open"} className="relative select-none rounded-[34px_34px_16px_16px] will-change-transform">
                {/* body: cream stock, orange plate printed slightly off register, halftone on the shaded side, ink key line */}
                <div className="paper absolute inset-0 rounded-[34px_34px_16px_16px]" style={{ backgroundColor: CREAM }} />
                <div className="shell paper absolute inset-0 rounded-[34px_34px_16px_16px]" style={{ backgroundColor: ORANGE, transform: "translate(5px,4px)", mixBlendMode: "multiply" }} />
                <svg className="absolute inset-0 h-full w-full rounded-[34px_34px_16px_16px]" style={{ mixBlendMode: "multiply" }} aria-hidden>
                    <rect width="100%" height="100%" fill="url(#vm-dots)" opacity=".1" /><rect x="91%" width="9%" height="100%" fill="url(#vm-big)" opacity=".35" />
                </svg>
                <div className="key absolute inset-0 rounded-[34px_34px_16px_16px] pointer-events-none" />

                <div className="relative p-3 sm:p-5 md:p-6">
                    {/* marquee lamps: they chase while a capsule is on its way */}
                    <div className="mb-3 md:mb-4 flex items-center justify-center gap-[3%] rounded-full px-4 py-2" style={{ background: INK }} aria-hidden>
                        {Array.from({ length: 9 }, (_, k) => (
                            <span key={k} className="bulb h-2.5 w-2.5 md:h-3 md:w-3 rounded-full" style={{ background: k % 2 ? MUSTARD : CREAM, animationDelay: `${(k % 2) * 0.25}s` }} />
                        ))}
                    </div>

                    <div className="grid gap-3 md:gap-5 md:grid-cols-[1fr_200px]">
                        {/* the window */}
                        <div ref={win} className="key relative rounded-2xl p-2 md:p-3 overflow-hidden" style={{ background: "var(--vwin)" }}>
                            <svg className="absolute inset-x-0 top-0 h-10 w-full" style={{ mixBlendMode: "multiply" }} aria-hidden><rect width="100%" height="100%" fill="url(#vm-dots)" opacity=".22" /></svg>
                            <ul className="relative grid grid-cols-3 md:grid-cols-4 gap-x-1.5 gap-y-2 md:gap-x-3 md:gap-y-3" aria-label="Projects">
                                {projects.map((pr, i) => {
                                    const on = uses(pr, tech) || spin === i, dim = tech !== null && !uses(pr, tech);
                                    return (
                                        <li key={pr.title}>
                                            <button ref={(el) => { slots.current[i] = el; }} className="slot relative flex h-full w-full flex-col items-center rounded-lg text-left" onClick={() => vend(i)}
                                                aria-label={`${code(i)}: ${pr.title}, ${pr.subtitle}`}>
                                                <span className="bay relative flex w-full justify-center rounded-t-lg pt-2.5 pb-1">
                                                    <span className="glow pointer-events-none absolute inset-0 rounded-t-lg" style={{ background: `radial-gradient(closest-side, ${MUSTARD}, transparent)`, opacity: on ? 1 : 0 }} />
                                                    <span className={`dim lift relative ${dim ? "opacity-35" : ""}`} style={{ width: "var(--cap)", height: "var(--cap)" }}>
                                                        <span className="cap block h-full w-full" style={{ opacity: held === i ? 0 : 1, transformOrigin: "50% 90%" }}>
                                                            <Capsule color={CAPS[i % 3]} code={code(i)} />
                                                        </span>
                                                    </span>
                                                </span>
                                                <span className="gate relative z-[1] h-[4px] w-[78%] rounded-full" style={{ background: INK }} />
                                                {/* shelf label: slot code, the title and its push button */}
                                                <span className={`dim key relative mt-1.5 flex flex-1 w-full flex-wrap md:flex-nowrap items-center gap-x-1.5 gap-y-1 rounded-md px-1.5 py-1 ${dim ? "opacity-50" : ""}`} style={{ background: CREAM, color: INK }}>
                                                    <span className="shrink-0 rounded px-1 text-[10px] font-extrabold leading-4" style={{ background: INK, color: CREAM }}>{code(i)}</span>
                                                    <span className="order-3 md:order-2 min-w-0 basis-full md:basis-auto md:flex-1 text-[11px] md:text-[12.5px] font-bold leading-[1.15] md:min-h-[2.3em] [overflow-wrap:anywhere]">{pr.title}</span>
                                                    <span className="push order-2 md:order-3 ml-auto relative grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ background: INK }}>
                                                        <span className="lamp h-2.5 w-2.5 rounded-full" style={{ background: ORANGE, opacity: on || held === i ? 1 : 0.25 }} />
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                                {Array.from({ length: (cols - (projects.length % cols)) % cols }, (_, k) => (
                                    <li key={`e${k}`} aria-hidden className="flex flex-col items-center">
                                        <span className="bay w-full rounded-t-lg pt-2.5 pb-1"><span className="block" style={{ height: "var(--cap)" }} /></span>
                                        <span className="h-[4px] w-[78%] rounded-full" style={{ background: INK }} />
                                    </li>
                                ))}
                            </ul>
                            <div className="pointer-events-none absolute inset-0" aria-hidden><div ref={capA} style={capStyle}><div className="rot h-full w-full">{heldCap}</div></div></div>
                            {/* glass */}
                            <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
                                <path d="M8 0H20L0 30V14ZM28 0H33L0 52V44Z M100 64V76L78 100H70Z" fill="#fff" opacity=".22" />
                            </svg>
                        </div>

                        {/* control panel: coin slot, selection buttons */}
                        <div className="paper key relative grid content-start gap-3 rounded-2xl p-3 md:pb-12" style={{ backgroundColor: FOREST, color: CREAM }}>
                            <div className="flex md:flex-col items-center gap-3 md:gap-2">
                                <div className="relative h-16 w-12 rounded-lg" style={{ background: CREAM, boxShadow: `inset 0 0 0 2px ${INK}` }} aria-hidden>
                                    <div className="absolute left-1/2 top-[22%] h-[56%] w-[5px] -translate-x-1/2 rounded-full" style={{ background: INK }} />
                                    <div className="absolute inset-x-0 -top-8 bottom-1/2 overflow-hidden"><div ref={coin} className="absolute bottom-0 left-1/2 -ml-[13px] h-[26px] w-[26px] opacity-0"><Coin className="h-full w-full" /></div></div>
                                </div>
                                <button className="sel relative rounded-full text-[12px] font-bold whitespace-nowrap" onClick={surprise}>
                                    <span className="absolute inset-0 translate-y-[3px] rounded-full" style={{ background: INK }} />
                                    <span className="face relative flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: MUSTARD, color: INK, boxShadow: `inset 0 0 0 2px ${INK}` }}><Coin className="h-4 w-4" />Surprise me</span>
                                </button>
                            </div>
                            <div role="group" aria-label="Filter by tech" className="grid grid-cols-2 md:grid-cols-1 gap-x-2 gap-y-2.5">
                                {GROUPS.map(([label], g) => (
                                    <button key={label} aria-pressed={tech === g} className="sel relative rounded-md text-[11px] font-bold leading-tight" onClick={() => { setTech(tech === g ? null : g); sfx(() => tone(900, 600, 0.03, 0.06, "square")); }}>
                                        <span className="absolute inset-0 translate-y-[3px] rounded-md" style={{ background: INK }} />
                                        <span className="face relative flex items-center gap-1.5 rounded-md px-2 py-1.5" style={{ background: CREAM, color: INK, boxShadow: `inset 0 0 0 2px ${INK}`, transform: tech === g ? "translateY(2px)" : undefined }}>
                                            <span className="relative h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: INK }}><span className="lit absolute inset-[1.5px] rounded-full" style={{ background: ORANGE, opacity: tech === g ? 1 : 0 }} /></span>
                                            <span className="truncate">{label}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button className="absolute right-3 top-3 md:top-auto md:bottom-3 grid h-7 w-7 place-items-center rounded-full" style={{ color: CREAM, boxShadow: `inset 0 0 0 1.5px ${CREAM}80` }} aria-label="Sound" aria-pressed={sound} onClick={() => setSound((s) => !s)}>
                                {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* the tray, with its swing flap */}
                    <div ref={tray} className="relative mt-3 md:mt-5 h-[100px] md:h-[124px] overflow-hidden rounded-xl" style={{ background: INK, perspective: "500px" }}>
                        <svg className="absolute inset-x-0 bottom-0 h-3/5 w-full" aria-hidden><rect width="100%" height="100%" fill="url(#vm-floor)" opacity=".16" /></svg>
                        <button ref={capB} tabIndex={phase === "tray" ? 0 : -1} disabled={phase !== "tray"} onClick={open} style={capStyle}
                            className="rounded-full" aria-label={p ? `Open ${p.title}` : "Open"}>
                            <div className="h-full w-full" style={{ transformOrigin: "50% 100%" }}><div className={`h-full w-full ${phase === "tray" ? "bob" : ""}`}><div className="rot h-full w-full">{heldCap}</div></div></div>
                            {phase === "tray" && <span className="tag absolute top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: CREAM, color: INK }}>Open</span>}
                        </button>
                        <div ref={flap} className="shell paper absolute inset-x-2 top-0 h-[38%] rounded-b-lg pointer-events-none" style={{ backgroundColor: ORANGE, boxShadow: `inset 0 0 0 2.5px ${INK}`, transformOrigin: "50% 0" }} aria-hidden>
                            <div className="absolute inset-x-[30%] bottom-2 h-[4px] rounded-full" style={{ background: INK }} />
                        </div>
                    </div>
                </div>
            </div>
            {/* feet */}
            <div className="flex justify-between px-[8%]" aria-hidden><span className="h-3 w-12 rounded-b-md" style={{ background: INK }} /><span className="h-3 w-12 rounded-b-md" style={{ background: INK }} /></div>

            {/* the paper inside the capsule */}
            {phase === "open" && p && held !== null && (
                <div className="absolute inset-0 z-10 flex items-end justify-center p-2 sm:p-6 pb-6">
                    <div className="absolute inset-0 rounded-[34px_34px_16px_16px] bg-[rgb(var(--bg)/.7)]" onClick={back} />
                    <article ref={card} role="dialog" aria-modal aria-labelledby="vm-title" className="card relative w-full max-w-[600px] p-6 sm:p-8 text-heading" style={{ transformOrigin: "50% 0" }}>
                        <div className="flex items-start justify-between gap-4">
                            <p className="eyebrow text-paragraph">{code(held)} · {p.subtitle}</p>
                            <button onClick={back} className="pill-light !px-3 !py-1 shrink-0">Back</button>
                        </div>
                        <h4 id="vm-title" tabIndex={-1} className="mt-3 text-3xl sm:text-4xl font-bold tracking-[-0.04em] outline-none">{p.title}</h4>
                        <p className="mt-4 text-sm leading-relaxed text-paragraph">{p.description}</p>
                        <ul className="mt-5 border-t border-stroke/15">
                            {p.highlights.map((h) => <li key={h} className="py-2 border-b border-stroke/15 text-sm text-center">{h}</li>)}
                        </ul>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {p.tech_stack.map((t) => <span key={t} className="px-3 py-1 text-xs font-medium rounded-full border border-stroke/20">{t}</span>)}
                        </div>
                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <a className={`pill-light ${p.web_url ? "" : "col-span-2"}`} href={p.github_repo} target="_blank" rel="noopener noreferrer"><Github size={16} /> GitHub</a>
                            {p.web_url && <a className="pill-dark" href={p.web_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Live demo</a>}
                        </div>
                    </article>
                </div>
            )}
        </div>
    );
}
