import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { company, chapters, pipelines } from "../../data/experience_data";

// Experience v4: "the travelling computer". A vintage-print computer rides an ink line down the page,
// tilting to the line's direction (tangent-angle trick: codrops "Animate Anything Along an SVG Path").
// Original idea: "proof to print run". Through chapter 01 the computer is a one-colour ink proof; at the
// step up its colour plates (green screen, orange lamp, halftone shade) slide in misregistered and snap
// into register, with printer's registration marks, so the lead chapter is the finished full-colour print.

const [intern, lead] = chapters;
const systems = (no: string) => pipelines.filter((p) => p.chapter === no);
const INK = "#26201a";

type Anchor = { x: number; y: number };
// cosine ease between anchors, so the line leaves and meets each stop vertically
function along(a: Anchor[], y: number) {
    let i = 0;
    while (i < a.length - 2 && y > a[i + 1].y) i++;
    const [p, q] = [a[i], a[i + 1]];
    const u = Math.min(1, Math.max(0, (y - p.y) / (q.y - p.y)));
    return { x: p.x + ((q.x - p.x) * (1 - Math.cos(Math.PI * u))) / 2, u };
}
// the v2 "snake": a hand-drawn wiggle that fades to zero at each stop (so rings sit on the anchors), plus a slight hand shake
const snake = (a: Anchor[], y: number) => {
    const { x, u } = along(a, y);
    return x + Math.sin(Math.PI * u) * (16 * Math.sin(y / 42) + Math.sin(y * 0.31) * 0.8);
};

// --m (0 = in register, 1 = off) drives each colour plate; offsets differ per plate like a real misprint
const plate = (dx: number, dy: number): CSSProperties => ({ transform: `translate(calc(var(--m) * ${dx}px), calc(var(--m) * ${dy}px))`, opacity: "calc(var(--reg) * 3)", mixBlendMode: "multiply" });

function Computer({ label }: { label: string }) {
    const mark = (x: number, y: number) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="1.2" fill="none">
            <circle r="6" /><path d="M-10 0H10M0-10V10" />
        </g>
    );
    return (
        <div className="relative w-full aspect-[26/25]">
            <svg viewBox="0 0 260 250" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
                <defs>
                    <pattern id="v4dots" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill="#8a6326" /></pattern>
                    <pattern id="v4fine" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2" cy="2" r=".7" fill="#a57f38" /></pattern>
                    <pattern id="v4keys" width="11" height="7" patternUnits="userSpaceOnUse" patternTransform="skewX(-42)"><rect x="1.2" y="1.2" width="8.4" height="4.6" rx="1" fill="none" stroke={INK} strokeWidth=".9" /></pattern>
                </defs>
                <ellipse cx="122" cy="234" rx="104" ry="8" fill={INK} opacity=".18" />
                {/* paper stock */}
                <g fill="#f3e6c4">
                    <path d="M46 30 76 10H210L180 30Z" /><path d="M180 30 210 10V150L180 170Z" /><rect x="40" y="30" width="140" height="140" rx="10" />
                    <path d="M30 210 50 188H200L185 210Z" /><path d="M30 210H185V218H30Z" /><path d="M185 210 200 188V196L185 218Z" />
                </g>
                {/* colour plates */}
                <g style={plate(10, 14)}>
                    <path d="M180 30 210 10V150L180 170Z" fill="url(#v4dots)" /><rect x="40" y="30" width="140" height="140" rx="10" fill="url(#v4fine)" />
                    <path d="M30 210H185V218H30ZM185 210 200 188V196L185 218Z" fill="url(#v4dots)" />
                </g>
                <g style={plate(-8, -14)}><rect x="55" y="45" width="110" height="82" rx="8" fill="#d6c08a" /><path d="M46 30 76 10H210L180 30Z" fill="#e9cf86" /></g>
                <g style={plate(-16, 10)}><rect x="63" y="52" width="94" height="68" rx="6" fill="#24493a" /></g>
                <g style={plate(14, -12)}><circle cx="62" cy="148" r="5" fill="#ff6509" /><path d="M50 188H200L185 210H30Z" fill="#f0c43a" opacity=".55" /></g>
                {/* key plate (ink), always in register */}
                <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
                    <path d="M46 30 76 10H210L180 30M180 30 210 10V150L180 170" /><rect x="40" y="30" width="140" height="140" rx="10" />
                    <rect x="55" y="45" width="110" height="82" rx="8" strokeWidth="1.6" /><rect x="63" y="52" width="94" height="68" rx="6" />
                    <circle cx="62" cy="148" r="5" strokeWidth="1.6" /><path d="M64 158v7M70 158v7M76 158v7M82 158v7M88 158v7" strokeWidth="1.4" />
                    <path d="M30 210 50 188H200L185 210ZM30 210V218H185L200 196V188M185 210V218" />
                    <path d="M57 192H184L176 205H48Z" fill="url(#v4keys)" stroke="none" />
                </g>
                <rect x="118" y="144" width="48" height="5" rx="2" fill={INK} />
                <g className="v4-marks">{[mark(14, 16), mark(246, 16), mark(14, 236), mark(246, 236)]}</g>
            </svg>
            {/* live screen: shows the stop the reader is at */}
            <div className="v4-screen absolute font-mono leading-tight" style={{ left: "26%", top: "22.5%", width: "33%", height: "24.5%" }}>
                <span key={label} className="v4-flick block">&gt; {label}<i className="v4-caret">_</i></span>
            </div>
            {/* printer's job tag: what state this print is in */}
            <div className="v4-tag absolute left-1/2 -bottom-1 -translate-x-1/2 whitespace-nowrap eyebrow text-[10px] text-heading"><span>1-colour proof</span><span>Full-colour print</span></div>
        </div>
    );
}

const Chips = ({ items }: { items: string[] }) => (
    <ul className="mt-5 flex flex-wrap gap-1.5">
        {items.map((s) => <li key={s} className="rounded-full border border-stroke/30 px-2.5 py-1 text-[11px] font-semibold text-heading">{s}</li>)}
    </ul>
);

function ChapterCard({ c, print }: { c: typeof intern; print?: boolean }) {
    return (
        <article className={`${print ? "plate" : "card"} p-7 sm:p-9 text-heading`} data-screen={`${c.no} ${print ? "Lead" : "Intern"}`}>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 eyebrow text-paragraph">
                <span>{company.name} · {company.product}</span><span className="text-tertiary">{c.period}</span>
            </div>
            <div className="mt-6 flex items-center gap-4">
                <span className="grid place-items-center w-12 h-12 shrink-0 rounded-full border border-stroke/40 text-sm font-bold">{c.no}</span>
                <h4 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.045em] leading-[1.02]">{c.role}</h4>
            </div>
            {print && <p className="mt-5 text-xl font-bold tracking-[-0.02em] leading-snug">{c.points[0]}</p>}
            <p className="mt-4 text-paragraph leading-relaxed">{c.summary}</p>
            <Chips items={c.stack} />
            <div className="ruler mt-6 text-heading" />
        </article>
    );
}

function Systems({ no, from, to, print }: { no: string; from: number; to?: number; print?: boolean }) {
    const list = systems(no).slice(from, to);
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {list.map((s, i) => (
                <article key={s.title} data-screen={s.title} className={`${print ? "plate" : "card"} p-6 text-heading ${list.length % 2 && i === list.length - 1 ? "sm:col-span-2" : ""}`}>
                    <div className="flex justify-between eyebrow text-[10px] text-paragraph"><span>System</span><span>{no} / {String(from + i + 1).padStart(2, "0")}</span></div>
                    <h5 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">{s.title}</h5>
                    <ul className="mt-3 space-y-1.5">
                        {s.cards.map((l) => <li key={l} className="flex gap-2 text-sm leading-snug text-paragraph"><span className="text-highlight">—</span>{l}</li>)}
                    </ul>
                </article>
            ))}
        </div>
    );
}

function StepUp() {
    return (
        <div data-screen="LEVEL UP" className="relative rounded-2xl border border-dashed border-stroke/40 bg-base p-6 sm:p-8 text-heading">
            <span className="eyebrow text-tertiary">Level up · 01 → 02</span>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div className="card p-5"><div className="eyebrow text-[10px] text-paragraph">Proof</div><div className="mt-1 font-bold leading-tight">{intern.role}</div><div className="mt-1 text-xs text-paragraph">{intern.period}</div></div>
                <svg viewBox="0 0 60 70" className="hidden sm:block w-14 mb-2" aria-hidden><path d="M4 66H18V48H32V30H46V12" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M38 14 46 4 54 14" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>
                <div className="plate px-6 py-6 -translate-y-7"><div className="eyebrow text-[10px] text-paragraph">Print run</div><div className="mt-1 font-bold leading-tight text-heading">{lead.role}</div><div className="mt-1 text-xs text-paragraph">{lead.period}</div></div>
            </div>
            <div className="v4-static mt-6 mx-auto w-48"><Computer label="LEVEL UP" /></div>
        </div>
    );
}

// stops alternate sides; the computer rides on the other side. UP = the step-up stop
const UP = 2;
const stops: { side: "L" | "R"; body: ReactNode }[] = [
    { side: "R", body: <ChapterCard c={intern} /> },
    { side: "L", body: <Systems no="01" from={0} /> },
    { side: "R", body: <StepUp /> },
    { side: "L", body: <ChapterCard c={lead} print /> },
    { side: "R", body: <Systems no="02" from={0} to={3} print /> },
    { side: "L", body: <Systems no="02" from={3} print /> },
];

export default function V4() {
    const box = useRef<HTMLDivElement>(null);
    const rider = useRef<HTMLDivElement>(null);
    const clip = useRef<SVGRectElement>(null);
    const [geo, setGeo] = useState({ w: 0, h: 0, d: "", pencil: "", ink: "", a: [] as Anchor[] });
    const [label, setLabel] = useState(`${intern.no} Intern`);

    // measure stops -> anchors + ink line (re-run whenever the section resizes)
    useEffect(() => {
        const el = box.current!;
        const measure = () => {
            const r = el.getBoundingClientRect(), wide = r.width >= 768;
            const a = [...el.querySelectorAll<HTMLElement>("[data-stop]")].map((s) => {
                const b = s.getBoundingClientRect();
                const left = s.dataset.stop === "R"; // content right -> computer left
                return { x: r.width * (wide ? (left ? 0.21 : 0.79) : left ? 0.32 : 0.68), y: b.top - r.top + b.height / 2 };
            });
            let d = "", pencil = "", ink = "";
            for (let y = a[0].y; y <= a[a.length - 1].y; y += 4) {
                const pt = `${snake(a, y).toFixed(1)} ${y.toFixed(0)}`;
                d += `${d ? "L" : "M"}${pt}`;
                if (y <= a[UP].y + 4) pencil += `${pencil ? "L" : "M"}${pt}`;
                if (y >= a[UP].y) ink += `${ink ? "L" : "M"}${pt}`;
            }
            setGeo({ w: r.width, h: r.height, d, pencil, ink, a });
        };
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // scroll -> rider position, tilt, registration (one rAF per frame; React renders only when the label changes)
    useEffect(() => {
        const a = geo.a;
        if (!a.length) return;
        let raf = 0;
        const frame = () => {
            raf = 0;
            const el = box.current!, r = el.getBoundingClientRect(), vh = innerHeight;
            const y = Math.min(a[a.length - 1].y, Math.max(a[0].y, vh * 0.55 - r.top));
            const x = snake(a, y), slope = (snake(a, y + 3) - snake(a, y - 3)) / 6;
            // plates come into register while the computer travels from the step-up stop to chapter 02
            const reg = Math.min(1, Math.max(0, ((y - a[UP].y) / (a[UP + 1].y - a[UP].y) - 0.1) / 0.55));
            const tilt = Math.max(-10, Math.min(10, ((Math.atan(slope) * 180) / Math.PI) * 0.25));
            const s = (r.width >= 768 ? 0.82 : 0.9) + 0.24 * reg;
            const rd = rider.current!;
            rd.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${tilt}deg) scale(${s})`;
            rd.style.setProperty("--reg", reg.toFixed(3));
            rd.style.setProperty("--m", (1 - reg).toFixed(3));
            rd.dataset.print = reg > 0.55 ? "1" : "0";
            clip.current?.setAttribute("height", String(y));
            el.querySelectorAll<SVGGElement>("[data-ring]").forEach((g) => g.classList.toggle("v4-on", Number(g.dataset.ring) <= y + 1));
            const seen = [...el.querySelectorAll<HTMLElement>("[data-screen]")].filter((n) => n.getBoundingClientRect().top < vh * 0.6);
            setLabel(seen.length ? seen[seen.length - 1].dataset.screen! : `${intern.no} Intern`);
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
        frame();
        addEventListener("scroll", onScroll, { passive: true });
        addEventListener("resize", onScroll);
        return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
    }, [geo]);

    return (
        <div ref={box} className="v4 relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-10">
            <style>{css}</style>
            <div className="v4-travel absolute inset-0 overflow-x-clip pointer-events-none" aria-hidden>
                <svg width={geo.w} height={geo.h} className="absolute inset-0 overflow-visible text-heading">
                    <defs>
                        <clipPath id="v4done"><rect ref={clip} x="0" y="0" width={geo.w} height="0" /></clipPath>
                        {/* pencil: graphite grain eats into the stroke; ink: a soft wobble. Both "boil" (noise re-rolled in steps). */}
                        <filter id="v4-pencil" filterUnits="userSpaceOnUse" x="-5%" y="-5%" width="110%" height="110%">
                            <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="1" result="g" />
                            <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -.9" result="m" />
                            <feComposite in="SourceGraphic" in2="m" operator="in" result="p" />
                            <feTurbulence type="turbulence" baseFrequency=".03" numOctaves="2" seed="1" result="w"><animate attributeName="seed" values="1;4;7;2" dur=".4s" calcMode="discrete" repeatCount="indefinite" /></feTurbulence>
                            <feDisplacementMap in="p" in2="w" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                        <filter id="v4-ink" filterUnits="userSpaceOnUse" x="-5%" y="-5%" width="110%" height="110%">
                            <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="3"><animate attributeName="seed" values="3;8;5;9" dur=".4s" calcMode="discrete" repeatCount="indefinite" /></feTurbulence>
                            <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                        <filter id="v4-bleed" x="-60%" y="-60%" width="220%" height="220%">
                            <feTurbulence type="fractalNoise" baseFrequency=".12" numOctaves="2" seed="5" />
                            <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                    <path d={geo.d} fill="none" stroke="rgb(var(--paragraph) / .3)" strokeWidth="1.2" strokeDasharray="1 6" strokeLinecap="round" />
                    <g clipPath="url(#v4done)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d={geo.pencil} stroke="rgb(var(--paragraph))" strokeWidth="2" filter="url(#v4-pencil)" />
                        <path d={geo.ink} stroke="rgb(var(--highlight))" strokeWidth="4" filter="url(#v4-ink)" />
                    </g>
                    {geo.a[UP] && (
                        <g data-ring={geo.a[UP].y} className="v4-blot" fill="rgb(var(--highlight))" filter="url(#v4-bleed)">
                            <circle cx={geo.a[UP].x} cy={geo.a[UP].y} r="14" /><circle cx={geo.a[UP].x - 16} cy={geo.a[UP].y + 10} r="2.4" /><circle cx={geo.a[UP].x + 13} cy={geo.a[UP].y + 15} r="1.7" />
                        </g>
                    )}
                    {geo.a.map((p, i) => i === UP ? null : (
                        <g key={i} data-ring={p.y} className="v4-ring">
                            <circle cx={p.x} cy={p.y} r="6" fill="rgb(var(--bg))" stroke={i > UP ? "rgb(var(--highlight))" : "rgb(var(--paragraph))"} strokeWidth={i > UP ? 2.2 : 1.3} />
                        </g>
                    ))}
                </svg>
                <div ref={rider} className="v4-rider absolute left-0 top-0 w-[150px] md:w-[300px]" style={{ willChange: "transform" }}>
                    <Computer label={label} />
                </div>
            </div>
            {stops.map((s, i) => (
                <div key={i} data-stop={s.side} className={`relative z-10 mb-[340px] md:mb-[34vh] last:mb-0 md:w-[56%] ${s.side === "R" ? "md:ml-auto" : ""}`}>
                    {s.body}
                </div>
            ))}
        </div>
    );
}

const css = `
.v4-screen { padding: 6% 7%; font-size: clamp(7px, 2.4vw, 11px); font-weight: 700; color: ${INK}; overflow: hidden; }
.v4-rider[data-print="1"] .v4-screen { color: #f6ecd2; text-shadow: 0 0 6px rgb(245 196 53 / .45); }
.v4-rider .v4-marks { opacity: calc(var(--reg) * (1 - var(--reg)) * 4); }
.v4-tag span + span, [data-print="1"] .v4-tag span:first-child, .v4-static .v4-tag span:first-child { display: none; }
[data-print="1"] .v4-tag span + span, .v4-static .v4-tag span + span { display: inline; }
.v4-static { display: none; --reg: 1; --m: 0; }
.v4-static .v4-marks { opacity: 0; }
.v4-static .v4-screen { color: #f6ecd2; }
.v4-ring, .v4-blot { transform-box: fill-box; transform-origin: center; transition: opacity .3s, transform .5s cubic-bezier(.2,1.6,.4,1); opacity: 0; transform: scale(.4); }
.v4-blot { transition: opacity .3s, transform .9s cubic-bezier(.2,.9,.3,1); transform: scale(0); }
.v4-ring.v4-on, .v4-blot.v4-on { opacity: 1; transform: none; }
.v4-caret { font-style: normal; animation: v4blink 1s steps(1) infinite; }
.v4-flick { animation: v4flick .35s steps(3); }
@keyframes v4blink { 50% { opacity: 0; } }
@keyframes v4flick { 0% { opacity: .1; transform: scaleY(.2); } 60% { opacity: .7; } }
@media (prefers-reduced-motion: reduce) {
  .v4-travel { display: none; }
  .v4-static { display: block; }
  .v4 [data-stop] { margin-bottom: 4rem; }
  .v4-caret, .v4-flick { animation: none; }
}`;
