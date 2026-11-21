import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, type TransitionEvent } from "react";
import { Github, ExternalLink, X } from "lucide-react";
import projects from "../../data/project_data";

// "Desk of papers": every project is a different printed paper object lying on a cloth blotter. Papers are dragged with
// pin physics (the paper swings to trail the finger, then coasts), a brass loupe magnifies what passes under it (a scaled
// clone of the papers inside a round clip, so moving anything is a transform), Enter/click lifts a paper into a full view.
// On phones the papers are dealt onto a pile as you scroll (sticky stack). Only transform and opacity ever animate.

type P = (typeof projects)[number];
const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const KINDS = ["postcard", "polaroid", "ticket", "receipt", "index", "stamp", "telegram", "punch", "tag", "bookmark", "envelope"] as const;
type Kind = (typeof KINDS)[number];
const SIZE: Record<Kind, [number, number]> = {
    postcard: [300, 200], polaroid: [190, 236], ticket: [310, 124], receipt: [184, 300], index: [280, 180], stamp: [168, 204],
    telegram: [290, 186], punch: [310, 144], tag: [160, 262], bookmark: [92, 292], envelope: [284, 180],
};
const kindOf = (i: number) => KINDS[i % KINDS.length];
const nn = (i: number) => String(i + 1).padStart(2, "0");
const N = projects.length, LOUPE = N, LW = 210, LC = 74, LR = 64, MAG = 1.9; // loupe box, lens centre, lens radius, zoom

const css = `
.dk-stock{background:var(--s,${CREAM}) url(/art/paper.webp) 0 0/512px;background-blend-mode:overlay;color:${INK}}
.dk-mono{font-family:ui-monospace,"Courier New",monospace}
.dk-dots{background-image:radial-gradient(circle,var(--c) 0 1.25px,#0000 1.6px);background-size:5px 5px}
.dk-perf{-webkit-mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle var(--p,4px),#0000 96%,#000) calc(var(--t,12px)/-2) calc(var(--t,12px)/-2)/var(--t,12px) var(--t,12px);
 mask:linear-gradient(#000 0 0) content-box,radial-gradient(circle var(--p,4px),#0000 96%,#000) calc(var(--t,12px)/-2) calc(var(--t,12px)/-2)/var(--t,12px) var(--t,12px)}
.dk-desk{position:relative;overflow:hidden;border-radius:20px;height:clamp(560px,calc(100vh - 170px),760px);touch-action:pan-y;
 background:rgb(var(--cloth)) url(/art/paper.webp) 0 0/512px;background-blend-mode:overlay;
 box-shadow:inset 0 0 0 1px rgb(0 0 0/.35),inset 0 0 0 8px rgb(0 0 0/.12),inset 0 0 0 9px rgb(255 245 220/.22),inset 0 0 90px rgb(0 0 0/.35),0 30px 60px -28px rgb(40 30 0/.65)}
.dk-desk::before{content:"";position:absolute;inset:0;pointer-events:none;
 background:linear-gradient(135deg,rgb(0 0 0/.28) 0 64px,#0000 0) 0 0,linear-gradient(225deg,rgb(0 0 0/.28) 0 64px,#0000 0) 100% 0,linear-gradient(45deg,rgb(0 0 0/.28) 0 64px,#0000 0) 0 100%,linear-gradient(315deg,rgb(0 0 0/.28) 0 64px,#0000 0) 100% 100%;
 background-size:91px 91px;background-repeat:no-repeat}
.dk-it{position:absolute;left:0;top:0;will-change:transform;transform-origin:center;cursor:grab;touch-action:none;outline:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.dk-it.dk-lift{cursor:grabbing}
.dk-sh{position:absolute;inset:3px;border-radius:3px;box-shadow:0 7px 16px rgb(12 8 0/.5);opacity:.55;transform:translate(1px,3px);will-change:transform,opacity;transition:transform .22s,opacity .22s}
.dk-lift .dk-sh{opacity:1;transform:translate(12px,24px) scale(1.03)}
.dk-b{position:relative;width:100%;height:100%;transition:transform .22s cubic-bezier(.3,1.4,.5,1)}
.dk-lift .dk-b{transform:scale(1.045)}
.dk-it:focus-visible .dk-b,.dk-dr:focus-visible .dk-b{outline:3px solid ${ORANGE};outline-offset:6px;border-radius:4px}
.dk-tw{transition:transform .85s cubic-bezier(.2,.85,.25,1) var(--d,0s),opacity .5s var(--d,0s)}
.dk-gone{opacity:0}
[data-theme=dark] .dk-f{filter:brightness(.84) saturate(.92)}
[data-theme=dark] .dk-desk::before{opacity:.6}
.dk-lens{position:absolute;left:${LC - LR}px;top:${LC - LR}px;width:${LR * 2}px;height:${LR * 2}px;border-radius:50%;overflow:hidden;z-index:0;
 background:rgb(var(--cloth)) url(/art/paper.webp) 0 0/${512 * MAG}px;background-blend-mode:overlay}
.dk-mag{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.dk-mag .dk-it{cursor:inherit}
.dk-dlg{padding:0;border:0;background:none;max-width:none;max-height:none;overflow:visible;color:inherit}
.dk-dlg::backdrop{background:rgb(20 14 6/.66)}
@media (max-width:1023px){.dk-dlg::backdrop{background:rgb(20 14 6/.8)}}
.dk-dlg[open]::backdrop{animation:dk-fade .35s}
.dk-det{animation:dk-up .5s .12s cubic-bezier(.2,.8,.2,1) both}
@keyframes dk-fade{from{opacity:0}}
@keyframes dk-up{from{opacity:0;transform:translateY(16px)}}
.dk-slot{will-change:transform}
.dk-dr{position:relative;transform:rotate(var(--r)) scale(var(--sc));transform-origin:top center}
@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){
 .dk-dr{animation:dk-deal linear both;animation-timeline:view();animation-range:entry 0% entry 100%}}}
@keyframes dk-deal{from{transform:translate(var(--fx),80px) rotate(calc(var(--r) * -4)) scale(var(--sc));opacity:.4}}
@media (prefers-reduced-motion:reduce){.dk-tw{transition:opacity .3s}.dk-sh,.dk-b{transition:none}.dk-det,.dk-dlg[open]::backdrop{animation:none}}
`;

// ---------- printed bits ----------
const Waves = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 90 40" className={`absolute ${className}`} fill="none" stroke={INK} strokeWidth="1.3" opacity=".55" aria-hidden>
        {[6, 14, 22, 30].map((y) => <path key={y} d={`M0 ${y}q7.5-5 15 0t15 0 15 0 15 0 15 0 15 0`} />)}
    </svg>
);
const MiniStamp = ({ className = "", tone = ORANGE }: { className?: string; tone?: string }) => (
    <div className={`dk-perf absolute bg-[#f8f1e0] p-[4px] ${className}`} style={{ width: 48, height: 60, "--t": "8px", "--p": "2.6px" } as CSSProperties}>
        <div className="relative h-full" style={{ background: FOREST }}>
            <div className="absolute inset-0 dk-dots" style={{ "--c": "#3f6e57" } as CSSProperties} />
            <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: tone }} />
            <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: MUSTARD }} />
        </div>
    </div>
);
// a barcode drawn from the title's own character codes
const Barcode = ({ text, h = 26 }: { text: string; h?: number }) => {
    let x = 0; const bars: ReactNode[] = [];
    for (const ch of text) { const c = ch.charCodeAt(0), w = (c % 3) + 1; bars.push(<rect key={x} x={x} width={w} height={h} />); x += w + ((c >> 2) % 2) + 1; }
    return <svg viewBox={`0 0 ${x} ${h}`} width="100%" height={h} preserveAspectRatio="none" fill={INK} aria-hidden>{bars}</svg>;
};
// IBM punch-card (Hollerith) rows for a character: rows are 12, 11, 0, 1..9 from the top
function holes(ch: string): number[] {
    const c = ch.toUpperCase(), a = c.charCodeAt(0);
    if (c >= "0" && c <= "9") return [+c + 2];
    if (c >= "A" && c <= "I") return [0, a - 62];
    if (c >= "J" && c <= "R") return [1, a - 71];
    if (c >= "S" && c <= "Z") return [2, a - 79];
    return c === "-" ? [1] : [];
}
const fit = (t: string, w: number, max: number) => Math.min(max, w / (t.length * 0.56));
// the subtitle cut into typed telegram strips of up to 30 characters
function strips(s: string) {
    const out = [""];
    for (const word of s.toUpperCase().split(" ")) {
        const next = `${out[out.length - 1]} ${word}`.trim();
        if (next.length > 30) out.push(word); else out[out.length - 1] = next;
    }
    return out;
}

function Face({ p, i }: { p: P; i: number }) {
    const k = kindOf(i), [w, h] = SIZE[k];
    const box: CSSProperties = { width: w, height: h };
    switch (k) {
        case "postcard": return (
            <div className="dk-f dk-stock flex gap-[10px] p-[10px]" style={box}>
                <div className="relative flex-[1.3] overflow-hidden" style={{ background: FOREST }}>
                    <div className="absolute inset-0 dk-dots" style={{ "--c": "#3c6a54" } as CSSProperties} />
                    <div className="absolute rounded-full" style={{ width: 74, height: 74, right: 14, top: 14, background: ORANGE, opacity: .92 }} />
                    <div className="absolute inset-x-0 bottom-0 h-[36%]" style={{ background: MUSTARD }}><div className="absolute inset-0 dk-dots" style={{ "--c": "#c8941c" } as CSSProperties} /></div>
                    <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-extrabold tracking-[-0.05em] leading-none"
                        style={{ fontSize: fit(p.title, 150, 50), color: CREAM, WebkitTextStroke: `1.6px ${INK}`, paintOrder: "stroke fill", textShadow: `3px 3px 0 ${ORANGE}` }}>{p.title}</span>
                </div>
                <div className="w-px my-2" style={{ background: "rgb(38 32 26/.35)" }} />
                <div className="relative flex-1">
                    <MiniStamp className="right-0 top-0" />
                    <Waves className="right-6 top-3 w-[84px]" />
                    <p className="absolute inset-x-0 bottom-1 text-[10.5px] font-semibold leading-[19px]"
                        style={{ backgroundImage: "linear-gradient(#0000 18px,rgb(38 32 26/.4) 0)", backgroundSize: "100% 19px" }}>{p.subtitle}</p>
                </div>
            </div>);
        case "polaroid": return (
            <div className="dk-f dk-stock px-3 pt-3" style={{ ...box, "--s": "#f8f2e3" } as CSSProperties}>
                <div className="relative overflow-hidden" style={{ height: w - 24, background: FOREST, boxShadow: "inset 0 0 24px rgb(0 0 0/.45)" }}>
                    <div className="absolute inset-0 dk-dots" style={{ "--c": "#8a6c1f", opacity: .55 } as CSSProperties} />
                    <svg viewBox="0 0 166 166" className="absolute inset-0 h-full w-full" aria-hidden>
                        <g stroke={ORANGE} strokeWidth="2.4" transform="translate(2 2)" opacity=".8"><path d="M83 34 45 78M83 34l38 44M45 78l-20 46M45 78l20 46M121 78l-20 46M121 78l20 46" /></g>
                        <g stroke={CREAM} strokeWidth="2.4"><path d="M83 34 45 78M83 34l38 44M45 78l-20 46M45 78l20 46M121 78l-20 46M121 78l20 46" /></g>
                        {[[83, 34], [45, 78], [121, 78], [25, 124], [65, 124], [101, 124], [141, 124]].map(([x, y], j) =>
                            <circle key={j} cx={x} cy={y} r="11" fill={j === 2 ? ORANGE : CREAM} stroke={INK} strokeWidth="2" />)}
                    </svg>
                </div>
                <p className="mt-2 text-center text-[19px] font-extrabold tracking-[-0.03em] -rotate-2" style={{ color: FOREST }}>{p.title}</p>
                <p className="text-center text-[8.5px] font-semibold leading-tight opacity-70">{p.subtitle}</p>
            </div>);
        case "ticket": {
            const notch = "radial-gradient(circle 9px at 232px 0,#0000 96%,#000) top/100% 51% no-repeat,radial-gradient(circle 9px at 232px 100%,#0000 96%,#000) bottom/100% 51% no-repeat";
            return (
                <div className="dk-f dk-stock flex" style={{ ...box, "--s": MUSTARD, WebkitMask: notch, mask: notch } as CSSProperties}>
                    <div className="relative m-2 mr-0 flex w-[216px] flex-col justify-center border-[1.5px] px-3" style={{ borderColor: INK }}>
                        <div className="absolute inset-[3px] border" style={{ borderColor: "rgb(38 32 26/.4)" }} />
                        <div className="absolute inset-x-0 bottom-0 h-5 dk-dots" style={{ "--c": ORANGE } as CSSProperties} />
                        <p className="relative font-extrabold leading-none tracking-[-0.04em]" style={{ fontSize: fit(p.title, 190, 30) }}>{p.title}</p>
                        <p className="relative mt-1.5 text-[9.5px] font-semibold leading-tight">{p.subtitle}</p>
                    </div>
                    <div className="ml-[15px] flex flex-1 items-center justify-center border-l-2 border-dotted" style={{ borderColor: INK }}>
                        <span className="dk-mono -rotate-90 text-[30px] font-bold" style={{ color: ORANGE, WebkitTextStroke: `1px ${INK}` }}>{nn(i)}</span>
                    </div>
                </div>);
        }
        case "receipt": {
            const zig = "conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) 50%/10px 100%";
            return (
                <div className="dk-f dk-stock dk-mono px-4 pt-4 text-[10px] leading-[15px]" style={{ ...box, "--s": "#f7f0de", WebkitMask: zig, mask: zig } as CSSProperties}>
                    <p className="text-center text-[13px] font-bold uppercase tracking-wider">{p.title}</p>
                    <p className="mt-1 text-center text-[8.5px] leading-[11px] opacity-75">{p.subtitle}</p>
                    <div className="my-2 border-t border-dashed" style={{ borderColor: INK }} />
                    <ul>{p.tech_stack.slice(0, 9).map((t, j) => <li key={t} className="flex gap-2"><span className="opacity-60">{nn(j)}</span><span className="truncate">{t}</span></li>)}</ul>
                    <div className="my-2 border-t border-dashed" style={{ borderColor: INK }} />
                    <Barcode text={p.title} />
                </div>);
        }
        case "index": return (
            <div className="dk-f dk-stock px-4" style={{ ...box, "--s": "#f8f2e2",
                backgroundImage: `linear-gradient(#0000 41px,${ORANGE} 0 42.5px,#0000 0),repeating-linear-gradient(#0000 0 59px,rgb(36 73 58/.45) 59px 60px,#0000 60px 78px),url(/art/paper.webp)` } as CSSProperties}>
                <p className="pt-3 font-extrabold leading-[26px] tracking-[-0.03em]" style={{ fontSize: fit(p.title, 250, 20) }}>{p.title}</p>
                <ul className="mt-[16px] text-[10px] font-semibold leading-[18px]" style={{ color: FOREST }}>
                    {p.highlights.slice(0, 6).map((t) => <li key={t} className="truncate">– {t}</li>)}
                </ul>
            </div>);
        case "stamp": return (
            <div className="dk-f dk-perf bg-[#f8f1e0] p-[6px]" style={box}>
                <div className="relative h-full border-[5px] border-[#f8f1e0]" style={{ background: FOREST }}>
                    <div className="absolute inset-0 dk-dots" style={{ "--c": "#3c6a54" } as CSSProperties} />
                    <svg viewBox="0 0 146 182" className="absolute inset-0 h-full w-full" aria-hidden>
                        <path d="M60 58a30 30 0 1 0 0 52L36 84Z" transform="translate(4 3)" fill={ORANGE} opacity=".85" />
                        <path d="M60 58a30 30 0 1 0 0 52L36 84Z" fill={MUSTARD} stroke={INK} strokeWidth="2" />
                        <circle cx="30" cy="70" r="3" fill={INK} />
                        {[76, 92, 108].map((x) => <circle key={x} cx={x} cy="84" r="3.5" fill={CREAM} />)}
                        <path d="M112 112v-22a14 14 0 0 1 28 0v22l-4.6-5-4.7 5-4.7-5-4.7 5-4.6-5Z" fill={ORANGE} stroke={INK} strokeWidth="2" transform="translate(-6 -22)" />
                    </svg>
                    <span className="absolute left-2 top-1 text-[20px] font-extrabold" style={{ color: CREAM }}>{nn(i)}</span>
                    <p className="absolute inset-x-2 bottom-2 text-[9px] font-bold uppercase leading-[11px] tracking-[0.1em]" style={{ color: CREAM }}>{p.title}</p>
                </div>
            </div>);
        case "telegram": return (
            <div className="dk-f dk-stock relative" style={{ ...box, "--s": "#eadcb5",
                backgroundImage: "repeating-linear-gradient(#0000 0 21px,rgb(38 32 26/.18) 21px 22px),url(/art/paper.webp)" } as CSSProperties}>
                <div className="relative flex h-[26px] items-center gap-2 px-3" style={{ background: FOREST, boxShadow: `inset 0 -3px 0 ${MUSTARD}` }}>
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: ORANGE, boxShadow: `0 0 0 2px ${CREAM}` }} />
                    <span className="h-[5px] flex-1 border-y" style={{ borderColor: "rgb(243 230 196/.7)" }} />
                </div>
                <div className="dk-mono px-4 pt-4 uppercase">
                    <p className="inline-block -rotate-[0.6deg] px-2 py-[3px] text-[13px] font-bold shadow-sm" style={{ background: "#f8f3e6" }}>{p.title}</p>
                    {strips(p.subtitle).map((s, j) => <p key={j} className={`mt-2 w-fit px-2 py-[2px] text-[10px] shadow-sm ${j % 2 ? "rotate-[0.5deg]" : "-rotate-[0.3deg]"}`} style={{ background: "#f8f3e6" }}>{s}</p>)}
                </div>
                <span className="absolute bottom-3 right-4 grid h-[46px] w-[46px] -rotate-12 place-items-center rounded-full border-[2.5px] text-[15px] font-extrabold"
                    style={{ borderColor: ORANGE, color: ORANGE, boxShadow: `inset 0 0 0 3px #eadcb5,inset 0 0 0 4.5px ${ORANGE}`, opacity: .85 }}>{nn(i)}</span>
            </div>);
        case "punch": {
            const t = p.title.slice(0, 27), xs = [...t].map((_, c) => 16 + c * 10).join(" ");
            return (
                <div className="dk-f dk-stock" style={{ ...box, "--s": "#efe2bd", clipPath: "polygon(16px 0,100% 0,100% 100%,0 100%,0 16px)" } as CSSProperties}>
                    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="dk-mono" aria-hidden>
                        <defs>{Array.from({ length: 10 }, (_, d) => <pattern key={d} id={`dk-pd${d}`} width="10" height="10" patternUnits="userSpaceOnUse" x="12">
                            <text x="5" y="7.5" textAnchor="middle" fontSize="6.5" fill={FOREST} opacity=".75">{d}</text></pattern>)}</defs>
                        <rect x="0" y="0" width={w} height="5" fill={FOREST} opacity=".85" />
                        <text x={xs} y="21" fontSize="10" fontWeight="700" fill={INK}>{t}</text>
                        {Array.from({ length: 10 }, (_, d) => <rect key={d} x="12" y={24 + (d + 2) * 10} width={280} height="10" fill={`url(#dk-pd${d})`} />)}
                        {[...t].flatMap((ch, c) => holes(ch).map((r) => <rect key={`${c}-${r}`} x={13 + c * 10} y={25 + r * 10} width="5" height="8" rx="1" fill="#1c1712" />))}
                    </svg>
                </div>);
        }
        case "tag": return (
            <div className="dk-f relative" style={box}>
                <svg className="absolute overflow-visible" width="1" height="1" style={{ left: w / 2, top: 30 }} aria-hidden>
                    <path d="M0 0c-6-24-30-40-52-52s-34-22-38-34" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                <div className="dk-stock relative h-full px-3 pt-14" style={{ "--s": "#d9b06c", clipPath: "polygon(30px 0,calc(100% - 30px) 0,100% 30px,100% 100%,0 100%,0 30px)" } as CSSProperties}>
                    <span className="absolute left-1/2 top-[30px] h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{ background: "#1c1712", boxShadow: `0 0 0 5px ${MUSTARD},0 0 0 6.5px ${INK}` }} />
                    <p className="text-[11px] font-bold opacity-70">{nn(i)}</p>
                    <p className="font-extrabold leading-[1.05] tracking-[-0.04em]" style={{ fontSize: fit(p.title, 130, 24) }}>{p.title}</p>
                    <p className="mt-2 text-[9.5px] font-semibold leading-tight">{p.subtitle}</p>
                    <div className="mt-3 space-y-[13px]">{[0, 1, 2].map((j) => <div key={j} className="h-px" style={{ background: "rgb(38 32 26/.45)" }} />)}</div>
                    <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: FOREST }}><div className="absolute inset-0 dk-dots" style={{ "--c": ORANGE, opacity: .8 } as CSSProperties} /></div>
                </div>
            </div>);
        case "bookmark": return (
            <div className="dk-f relative" style={box}>
                <svg className="absolute overflow-visible" width="1" height="1" style={{ left: w / 2, top: 22 }} aria-hidden>
                    <path d="M0 0c4-20 18-30 12-50s8-26 20-30" fill="none" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                <div className="dk-stock relative h-full" style={{ "--s": FOREST, color: CREAM, clipPath: "polygon(0 0,100% 0,100% 100%,50% calc(100% - 22px),0 100%)" } as CSSProperties}>
                    <span className="absolute left-1/2 top-[22px] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "#1c1712", boxShadow: `0 0 0 2px ${CREAM}` }} />
                    <div className="absolute inset-[6px] bottom-[16px] border" style={{ borderColor: "rgb(243 230 196/.6)" }} />
                    <p className="absolute left-1/2 top-[34px] -translate-x-1/2 text-[12px] font-extrabold" style={{ color: MUSTARD }}>{nn(i)}</p>
                    <p className="absolute left-1/2 top-[58px] -translate-x-1/2 rotate-180 font-extrabold tracking-[-0.02em] [writing-mode:vertical-rl]" style={{ fontSize: fit(p.title, 200, 18) }}>{p.title}</p>
                    <div className="absolute inset-x-[6px] bottom-[30px] h-[52px] dk-dots" style={{ "--c": MUSTARD, opacity: .7 } as CSSProperties} />
                </div>
            </div>);
        default: return (
            <div className="dk-f p-[7px]" style={{ ...box, background: `repeating-linear-gradient(135deg,${ORANGE} 0 10px,${CREAM} 0 20px,${FOREST} 0 30px,${CREAM} 0 40px)` }}>
                <div className="dk-stock relative h-full px-4" style={{ "--s": "#eedfb9" } as CSSProperties}>
                    <MiniStamp className="right-2 top-2" tone={MUSTARD} />
                    <Waves className="right-10 top-4 w-[90px]" />
                    <p className="pt-3 text-[11px] font-bold opacity-70">{nn(i)}</p>
                    <div className="absolute inset-x-4 bottom-4">
                        <p className="font-extrabold leading-none tracking-[-0.04em]" style={{ fontSize: fit(p.title, 220, 24) }}>{p.title}</p>
                        <p className="mt-1.5 border-b pb-1.5 text-[10px] font-semibold leading-tight" style={{ borderColor: "rgb(38 32 26/.45)" }}>{p.subtitle}</p>
                        <div className="mt-[13px] h-px" style={{ background: "rgb(38 32 26/.45)" }} />
                    </div>
                </div>
            </div>);
    }
}

// the brass loupe: ring, ferrule and a green handle; the lens itself is a div so its contents stay a compositor layer
const LoupeArt = () => (
    <svg viewBox={`0 0 ${LW} ${LW}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs><pattern id="dk-brass" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2" cy="2" r=".9" fill="#a8761a" /></pattern></defs>
        <path d="M142 142l50 50" stroke={INK} strokeWidth="27" strokeLinecap="round" />
        <path d="M142 142l50 50" stroke={FOREST} strokeWidth="22" strokeLinecap="round" />
        <path d="M150 146l38 38" stroke={CREAM} strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
        <path d="M124 124l22 22" stroke={INK} strokeWidth="22" /><path d="M125 125l20 20" stroke={MUSTARD} strokeWidth="18" /><path d="M125 125l20 20" stroke="url(#dk-brass)" strokeWidth="18" />
        <circle cx={LC} cy={LC} r={LR + 6} fill="none" stroke={MUSTARD} strokeWidth="13" />
        <circle cx={LC} cy={LC} r={LR + 6} fill="none" stroke="url(#dk-brass)" strokeWidth="13" />
        <circle cx={LC} cy={LC} r={LR + 12.5} fill="none" stroke={INK} strokeWidth="2.4" />
        <circle cx={LC} cy={LC} r={LR} fill="none" stroke={INK} strokeWidth="2" />
        <path d={`M${LC - 44} ${LC - 22}a50 50 0 0 1 38-26`} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".35" />
        <circle cx={LC} cy={LC} r={LR - 1} fill="none" stroke="#fff" strokeWidth="3" opacity=".18" />
    </svg>
);

// ---------- layouts ----------
type Body = { x: number; y: number; r: number; s: number; vx: number; vy: number; vr: number; w: number; h: number };
type Spot = { x: number; y: number; r: number; s: number };
const sizeOf = (i: number): [number, number] => (i === LOUPE ? [LW, LW] : SIZE[kindOf(i)]);
const rng = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const byArea = [...Array(N + 1).keys()].sort((a, b) => sizeOf(b)[0] * sizeOf(b)[1] - sizeOf(a)[0] * sizeOf(a)[1]);

// scatter: best-candidate sampling, so the papers spread over the desk but still overlap like a real one
function scatter(W: number, H: number, seed: number) {
    const R = rng(seed), out: Spot[] = [], pad = 12;
    for (const i of byArea) {
        const [w, h] = sizeOf(i);
        let best = { x: W / 2, y: H / 2, score: -1 };
        for (let c = 0; c < 40; c++) {
            const x = pad + w / 2 + R() * Math.max(0, W - 2 * pad - w), y = pad + h / 2 + R() * Math.max(0, H - 2 * pad - h);
            const score = Math.min(1e9, ...out.map((o, j) => { const [ow, oh] = sizeOf(byArea[j]); return Math.hypot(o.x - x, o.y - y) / (w + h + ow + oh); }));
            if (score > best.score) best = { x, y, score };
        }
        out.push({ x: best.x, y: best.y, r: i === LOUPE ? 0 : (R() - 0.5) * (h > 1.4 * w ? 34 : 24), s: 1 });
    }
    return byArea.map((_, k) => out[byArea.indexOf(k)]);
}
// tidy: knolling, rows of straight papers (tallest first); when the desk is small the rows are packed for the
// shrunk size, so the whole set scales down evenly instead of leaving empty sides
function tidy(W: number, H: number) {
    const gap = 22, pad = 26, order = [...Array(N + 1).keys()].sort((a, b) => sizeOf(b)[1] - sizeOf(a)[1]);
    for (let k = 1; ; k -= 0.02) {
        const rows: number[][] = [[]];
        let rw = 0;
        for (const i of order) {
            const w = sizeOf(i)[0];
            if (rw && rw + gap + w > (W - 2 * pad) / k) { rows.push([]); rw = 0; }
            rows[rows.length - 1].push(i); rw += (rw ? gap : 0) + w;
        }
        const rh = rows.map((r) => Math.max(...r.map((i) => sizeOf(i)[1]))), total = rh.reduce((a, b) => a + b, 0) + gap * (rows.length - 1);
        if (total * k > H - 2 * pad && k > 0.4) continue;
        const out: Spot[] = [];
        let y = H / 2 - (total * k) / 2;
        rows.forEach((r, ri) => {
            const width = r.reduce((a, i) => a + sizeOf(i)[0], 0) + gap * (r.length - 1);
            let x = W / 2 - (width * k) / 2;
            for (const i of r) { const [w] = sizeOf(i); out[i] = { x: x + (w * k) / 2, y: y + (rh[ri] * k) / 2, r: 0, s: k }; x += (w + gap) * k; }
            y += (rh[ri] + gap) * k;
        });
        return out;
    }
}

function useMedia(q: string) {
    const [m, setM] = useState(() => matchMedia(q).matches);
    useEffect(() => { const mq = matchMedia(q), f = () => setM(mq.matches); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
    return m;
}

type Open = (i: number, el: HTMLElement, r: number, s: number) => void;

// ---------- the desk (tablet and up) ----------
function Table({ reduce, onOpen, openIdx }: { reduce: boolean; onOpen: Open; openIdx: number | null }) {
    const desk = useRef<HTMLDivElement>(null), mag = useRef<HTMLDivElement>(null);
    const els = useRef<(HTMLDivElement | null)[]>([]), cls = useRef<(HTMLDivElement | null)[]>([]);
    const S = useRef({
        B: [...Array(N + 1).keys()].map((i) => ({ x: 0, y: 0, r: 0, s: 1, vx: 0, vy: 0, vr: 0, w: sizeOf(i)[0], h: sizeOf(i)[1] }) as Body),
        W: 0, H: 0, mode: "scatter" as "scatter" | "tidy", seed: 7, z: 20, raf: 0, last: 0, moving: new Set<number>(),
        drag: null as null | { i: number; id: number; gx: number; gy: number; px: number; py: number; cx: number; cy: number; moved: boolean; w: number; pts: { x: number; y: number; t: number }[] },
    }).current;

    const nodes = (i: number) => [els.current[i], i === LOUPE ? mag.current : cls.current[i]] as HTMLElement[];
    const put = (i: number) => {
        const b = S.B[i], t = `translate3d(${b.x - b.w / 2}px,${b.y - b.h / 2}px,0) rotate(${b.r}deg) scale(${b.s})`;
        els.current[i]!.style.transform = t;
        // the lens shows the desk point under its centre, MAG times larger on screen (the loupe itself may be scaled by b.s)
        if (i === LOUPE) { const m = MAG / b.s; mag.current!.style.transform = `translate3d(${LR - (b.x + (LC - LW / 2) * b.s) * m}px,${LR - (b.y + (LC - LW / 2) * b.s) * m}px,0) scale(${m})`; }
        else cls.current[i]!.style.transform = t;
    };
    const top = (i: number) => { if (i !== LOUPE) for (const n of nodes(i)) n.style.zIndex = String(++S.z); };
    // a paper caught mid-tween: read where it is on screen now, so grabbing it doesn't jump
    const settle = (i: number) => {
        const ns = nodes(i);
        if (!ns[0].classList.contains("dk-tw")) return;
        const m = new DOMMatrix(getComputedStyle(ns[0]).transform), b = S.B[i];
        b.s = Math.hypot(m.a, m.b); b.r = (Math.atan2(m.b, m.a) * 180) / Math.PI; b.x = m.e + b.w / 2; b.y = m.f + b.h / 2;
        ns.forEach((n) => n.classList.remove("dk-tw")); put(i);
    };

    const layout = (tween: boolean, enter = false) => {
        const L = S.mode === "tidy" ? tidy(S.W, S.H) : scatter(S.W, S.H, S.seed);
        S.moving.clear(); S.drag = null;
        L.forEach((l, i) => {
            const b = S.B[i], ns = nodes(i);
            Object.assign(b, l, { vx: 0, vy: 0, vr: 0 });
            if (enter && !reduce) { // dropped onto the desk: start a little above and larger, transparent
                b.y -= 70; b.s *= 1.12; put(i); b.y += 70; b.s /= 1.12;
                ns.forEach((n) => (n.style.opacity = "0")); ns[0].getBoundingClientRect(); ns.forEach((n) => (n.style.opacity = ""));
            }
            if (tween) ns.forEach((n) => { n.style.setProperty("--d", `${enter ? 120 + byArea.indexOf(i) * 55 : (i * 37) % 260}ms`); n.classList.add("dk-tw"); });
            put(i);
        });
        if (S.mode === "scatter") byArea.forEach((i) => top(i));
    };
    // tween classes come off once the throw has landed
    const endTween = (e: TransitionEvent) => { if (e.propertyName === "transform") (e.target as HTMLElement).classList.remove("dk-tw"); };

    useLayoutEffect(() => {
        const el = desk.current!;
        const ro = new ResizeObserver(() => {
            const W = el.clientWidth, H = el.clientHeight;
            if (Math.abs(W - S.W) < 2 && Math.abs(H - S.H) < 2) return;
            const first = !S.W; S.W = W; S.H = H;
            mag.current!.style.width = `${W}px`; mag.current!.style.height = `${H}px`;
            layout(first, first);
        });
        ro.observe(el);
        return () => { ro.disconnect(); cancelAnimationFrame(S.raf); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tick = (t: number) => {
        const dt = Math.min(0.034, (t - S.last) / 1000 || 0.016); S.last = t;
        const d = S.drag;
        if (d?.moved) {
            const b = S.B[d.i], a0 = d.pts[0], a1 = d.pts[d.pts.length - 1], span = Math.max(0.016, (a1.t - a0.t) / 1000);
            const vx = (a1.x - a0.x) / span, vy = (a1.y - a0.y) / span;
            if (d.i !== LOUPE && !reduce) {
                // pin drag: friction acts at the centre, so the paper swings round to trail behind the finger
                const rx = b.x - d.px, ry = b.y - d.py;
                d.w = Math.max(-5, Math.min(5, (-0.35 * (rx * vy - ry * vx)) / (rx * rx + ry * ry + 1600)));
                b.r += d.w * dt * 57.3;
            }
            const a = (b.r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
            b.x = d.px - (d.gx * c - d.gy * s) * b.s; b.y = d.py - (d.gx * s + d.gy * c) * b.s;
            put(d.i);
        }
        for (const i of S.moving) {
            const b = S.B[i], k = Math.pow(i === LOUPE ? 0.0015 : 0.005, dt);
            b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
            b.vx *= k; b.vy *= k; b.vr *= Math.pow(0.02, dt);
            if (b.x < 20 || b.x > S.W - 20) { b.x = Math.max(20, Math.min(S.W - 20, b.x)); b.vx *= -0.35; }
            if (b.y < 20 || b.y > S.H - 20) { b.y = Math.max(20, Math.min(S.H - 20, b.y)); b.vy *= -0.35; }
            put(i);
            if (Math.hypot(b.vx, b.vy) < 6 && Math.abs(b.vr) < 2) S.moving.delete(i);
        }
        S.raf = d?.moved || S.moving.size ? requestAnimationFrame(tick) : 0;
    };
    const run = () => { if (!S.raf) { S.last = performance.now(); S.raf = requestAnimationFrame(tick); } };

    const at = (e: PointerEvent) => { const r = desk.current!.getBoundingClientRect(); return [Math.max(0, Math.min(S.W, e.clientX - r.left)), Math.max(0, Math.min(S.H, e.clientY - r.top))]; };
    const down = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || S.drag) return;
        settle(i); S.moving.delete(i); top(i);
        const b = S.B[i], [px, py] = at(e), a = (-b.r * Math.PI) / 180, dx = (px - b.x) / b.s, dy = (py - b.y) / b.s;
        e.currentTarget.setPointerCapture(e.pointerId);
        S.drag = { i, id: e.pointerId, gx: dx * Math.cos(a) - dy * Math.sin(a), gy: dx * Math.sin(a) + dy * Math.cos(a), px, py, cx: e.clientX, cy: e.clientY, moved: false, w: 0, pts: [{ x: px, y: py, t: e.timeStamp }] };
    };
    const move = (e: PointerEvent) => {
        const d = S.drag;
        if (!d || e.pointerId !== d.id) return;
        [d.px, d.py] = at(e);
        d.pts.push({ x: d.px, y: d.py, t: e.timeStamp });
        while (d.pts.length > 2 && e.timeStamp - d.pts[0].t > 90) d.pts.shift();
        if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 4) { d.moved = true; nodes(d.i).forEach((n) => n.classList.add("dk-lift")); }
        if (d.moved) run();
    };
    const up = (e: PointerEvent) => {
        const d = S.drag;
        if (!d || e.pointerId !== d.id) return;
        S.drag = null;
        if (!d.moved) { if (e.type === "pointerup" && d.i !== LOUPE) onOpen(d.i, els.current[d.i]!, S.B[d.i].r, S.B[d.i].s); return; }
        nodes(d.i).forEach((n) => n.classList.remove("dk-lift"));
        const b = S.B[d.i], a0 = d.pts[0], a1 = d.pts[d.pts.length - 1], span = (a1.t - a0.t) / 1000;
        if (!reduce && span > 0 && e.timeStamp - a1.t < 60) {
            b.vx = (a1.x - a0.x) / span; b.vy = (a1.y - a0.y) / span; b.vr = d.w * 57.3 * 0.6;
            S.moving.add(d.i); run();
        }
    };
    const key = (i: number) => (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? 60 : 16, mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (mv[e.key]) {
            e.preventDefault(); settle(i);
            const b = S.B[i]; b.x = Math.max(20, Math.min(S.W - 20, b.x + mv[e.key][0])); b.y = Math.max(20, Math.min(S.H - 20, b.y + mv[e.key][1])); put(i);
        } else if (i !== LOUPE && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(i, e.currentTarget, S.B[i].r, S.B[i].s); }
    };
    const arrange = (mode: "scatter" | "tidy") => { S.mode = mode; if (mode === "scatter") S.seed = (S.seed * 48271) % 2147483647; layout(true); };

    const paper = (p: P, i: number, live: boolean) => {
        const [w, h] = SIZE[kindOf(i)];
        return (
            <div key={p.title} ref={(el) => { (live ? els : cls).current[i] = el; }} className={`dk-it${openIdx === i ? " dk-gone" : ""}`} style={{ width: w, height: h }}
                onTransitionEnd={endTween}
                {...(live && { role: "button", tabIndex: 0, "aria-label": `${p.title}, ${p.subtitle}`, onPointerDown: down(i), onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key(i), onFocus: () => top(i) })}>
                <div className="dk-sh" /><div className="dk-b"><Face p={p} i={i} /></div>
            </div>);
    };

    return (
        <div className="xl:-mx-16">
            <div className="mb-5 flex justify-center gap-3">
                <button type="button" className="pill-light" onClick={() => arrange("tidy")}>Tidy up</button>
                <button type="button" className="pill-dark" onClick={() => arrange("scatter")}>Scatter</button>
            </div>
            <div ref={desk} className="dk-desk">
                {projects.map((p, i) => paper(p, i, true))}
                <div ref={(el) => { els.current[LOUPE] = el; }} className="dk-it" style={{ width: LW, height: LW, zIndex: 5000 }} role="button" tabIndex={0} aria-label="Magnifier"
                    onTransitionEnd={endTween} onPointerDown={down(LOUPE)} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key(LOUPE)}>
                    <svg viewBox={`0 0 ${LW} ${LW}`} className="dk-sh !inset-0 overflow-visible !rounded-none !shadow-none" aria-hidden>
                        <g fill="rgb(12 8 0/.45)" style={{ filter: "blur(5px)" }}><circle cx={LC} cy={LC} r={LR + 13} /><path d="M120 120l72 72" stroke="rgb(12 8 0/.45)" strokeWidth="26" strokeLinecap="round" /></g>
                    </svg>
                    <div className="dk-b">
                        <div className="dk-lens" inert>
                            <div ref={mag} className="dk-mag" onTransitionEnd={endTween}>{projects.map((p, i) => paper(p, i, false))}</div>
                        </div>
                        <LoupeArt />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------- phones: a pile you deal through as you scroll ----------
function Drawer({ onOpen, openIdx }: { onOpen: Open; openIdx: number | null }) {
    const [vw, setVw] = useState(() => innerWidth);
    useEffect(() => { const f = () => setVw(innerWidth); addEventListener("resize", f); return () => removeEventListener("resize", f); }, []);
    return (
        <div className="cloth relative -mx-1 rounded-[20px] px-3 pb-10 pt-8 [overflow-x:clip]" style={{ boxShadow: "inset 0 0 0 8px rgb(0 0 0/.12),inset 0 0 60px rgb(0 0 0/.35)" }}>
            {projects.map((p, i) => {
                const [w, h] = SIZE[kindOf(i)], sc = Math.min(1.25, (vw - 72) / w, 330 / h), r = ((i * 7) % 5) - 2;
                return (
                    <div key={p.title} className="dk-slot sticky flex justify-center" style={{ top: 88 + i * 6, height: h * sc + 44 }}>
                        <div role="button" tabIndex={0} aria-label={`${p.title}, ${p.subtitle}`} className={`dk-dr${openIdx === i ? " dk-gone" : ""}`}
                            style={{ width: w, height: h, "--r": `${r}deg`, "--sc": sc, "--fx": `${i % 2 ? 40 : -40}px` } as CSSProperties}
                            onClick={(e) => onOpen(i, e.currentTarget, r, sc)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(i, e.currentTarget, r, sc); } }}>
                            <div className="dk-sh" /><div className="dk-b"><Face p={p} i={i} /></div>
                        </div>
                    </div>);
            })}
        </div>
    );
}

// ---------- the lifted paper with everything on it ----------
export default function Desk() {
    const phone = useMedia("(max-width: 639px)"), stack = useMedia("(max-width: 1023px)"), reduce = useMedia("(prefers-reduced-motion: reduce)");
    const dlg = useRef<HTMLDialogElement>(null), big = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState<null | { i: number; el: HTMLElement; r: number; s: number }>(null);
    const i = open?.i ?? 0, p = projects[i], [w, h] = SIZE[kindOf(i)];
    const S = stack ? Math.min((innerWidth - 56) / w, (phone ? 300 : 380) / h, 1.9) : Math.min(430 / w, 440 / h, 2);
    const onOpen: Open = (i, el, r, s) => setOpen({ i, el, r, s });

    // flight between the paper on the desk and its lifted place (centres are rotation-proof, so FLIP is one translate)
    const fly = (back: boolean) => {
        const el = big.current!, a = open!.el.getBoundingClientRect(), b = el.getBoundingClientRect();
        const from = `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px,${a.top + a.height / 2 - (b.top + b.height / 2)}px) rotate(${open!.r}deg) scale(${open!.s})`;
        const to = `rotate(-2deg) scale(${S})`;
        return el.animate(reduce ? [{ opacity: back ? 1 : 0 }, { opacity: back ? 0 : 1 }] : [{ transform: back ? to : from }, { transform: back ? from : to }],
            { duration: reduce ? 200 : back ? 380 : 560, easing: back ? "cubic-bezier(.5,0,.75,.4)" : "cubic-bezier(.2,.9,.25,1.05)", fill: back ? "forwards" : "none" });
    };
    useLayoutEffect(() => {
        if (!open) return;
        dlg.current!.showModal(); document.body.style.overflow = "hidden";
        fly(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const close = () => {
        if (!open || !dlg.current?.open) return;
        dlg.current.querySelector(".dk-det")?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" });
        fly(true).finished.then(() => dlg.current?.close());
    };
    const closed = () => { document.body.style.overflow = ""; open?.el.focus({ preventScroll: true }); setOpen(null); };

    return (<>
        <style>{css}</style>
        {phone ? <Drawer onOpen={onOpen} openIdx={open?.i ?? null} /> : <Table reduce={reduce} onOpen={onOpen} openIdx={open?.i ?? null} />}
        <dialog ref={dlg} className={`dk-dlg ${stack ? "m-0 h-[100dvh] w-screen overflow-y-auto overscroll-contain" : ""}`} aria-label={p.title}
            onCancel={(e) => { e.preventDefault(); close(); }} onClose={closed} onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.close != null) close(); }}>
            {open && (
                <div data-close className={stack ? "flex min-h-full flex-col items-center px-4 pb-6 pt-16" : "flex items-center gap-12 p-6"}>
                    <button type="button" aria-label="Close" onClick={close} className="pill-light fixed right-4 top-4 z-10 !p-3"><X size={18} /></button>
                    <div className="grid shrink-0 place-items-center" style={{ width: w * S + 20, height: h * S + 20 }}>
                        <div ref={big} className="relative" style={{ width: w, height: h, transform: `rotate(-2deg) scale(${S})` }}>
                            <div className="dk-sh" style={{ opacity: 1, transform: "translate(8px,16px)" }} /><div className="dk-b"><Face p={p} i={i} /></div>
                        </div>
                    </div>
                    <div className={`dk-det card p-6 text-heading sm:p-8 ${stack ? "mt-6 w-full max-w-[560px]" : "max-h-[calc(100dvh-48px)] w-[440px] overflow-y-auto"}`}>
                        <p className="eyebrow text-paragraph">{nn(i)} · {p.subtitle}</p>
                        <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{p.title}</h2>
                        <p className="mt-4 text-sm leading-relaxed text-paragraph">{p.description}</p>
                        <ul className="mt-5 border-t border-stroke/15">{p.highlights.map((t) => <li key={t} className="border-b border-stroke/15 py-2 text-sm">{t}</li>)}</ul>
                        <div className="mt-5 flex flex-wrap gap-2">{p.tech_stack.map((t) => <span key={t} className="rounded-full border border-stroke/20 px-3 py-1 text-xs font-medium">{t}</span>)}</div>
                        <div className="mt-7 grid grid-cols-2 gap-3">
                            <a className={`pill-light ${p.web_url ? "" : "col-span-2"}`} href={p.github_repo} target="_blank" rel="noopener noreferrer"><Github size={16} /> GitHub</a>
                            {p.web_url && <a className="pill-dark" href={p.web_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Live demo</a>}
                        </div>
                    </div>
                </div>
            )}
        </dialog>
    </>);
}
