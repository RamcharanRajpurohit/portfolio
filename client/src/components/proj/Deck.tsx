import projects from "../../data/project_data";
import { memo, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type MutableRefObject, type PointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Github, RotateCcw, Shuffle } from "lucide-react";

// "See all projects" as a deck of printed trading cards. The top card can be dragged and thrown (it pivots on the
// grab point, keeps the release velocity, springs back if the throw is weak), clicked to flip, and the deck can be
// riffle-shuffled and dealt again. Every motion is transform/opacity on layers that never repaint.

type Project = (typeof projects)[number];
type Phase = "pile" | "split" | "riffle" | "fan";
type Refs<T> = MutableRefObject<(T | null)[]>;

const N = projects.length;
const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const ACCENT = [[FOREST, CREAM], [ORANGE, INK], [INK, CREAM], [MUSTARD, INK]];
const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (v: number, a: number) => Math.max(-a, Math.min(a, v));
const rm = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// seeded from the title, so each card's print run is always the same
function seeded(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return () => {
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), h | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const star = (cx: number, cy: number, R: number, r: number, n = 5) =>
    Array.from({ length: n * 2 }, (_, k) => {
        const a = (Math.PI * k) / n - Math.PI / 2, d = k % 2 ? r : R;
        return `${k ? "L" : "M"}${(cx + d * Math.cos(a)).toFixed(1)} ${(cy + d * Math.sin(a)).toFixed(1)}`;
    }).join("") + "Z";
const spark = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

// one engraved motif per project, drawn as [ink key plate (cream fills knock out the background), colour plate]
// in a 200 x 130 box; o / g are orange and forest halftone fills
type Motif = (o: string, g: string) => [ReactNode, ReactNode];
const tree = [[100, 24], [66, 54], [134, 54], [48, 90], [84, 90], [116, 90], [152, 90]];
const candles = [[88, 80, 70, 96], [80, 86, 72, 92], [86, 72, 66, 90], [72, 60, 52, 76], [60, 66, 54, 72], [66, 48, 42, 70], [48, 54, 40, 60], [54, 32, 26, 58]];
const tokens = [[30, 22, 40, 26], [24, 44, 20, 34], [36, 26, 30, 28]];
const tagged: Record<string, string> = { "0-2": ORANGE, "1-1": FOREST, "2-0": MUSTARD, "2-3": ORANGE };
const MOTIFS: Record<string, Motif> = {
    DyPol: (o) => [<>
        <rect x="58" y="20" width="66" height="90" rx="4" fill={CREAM} />
        <path d="M68 34H104M68 44H92M68 54H99M68 64H88M68 74H97M68 84H84M68 94H96" strokeWidth="1.6" />
        <circle cx="126" cy="66" r="25" fill={CREAM} />
        <path d="M110 58H142M108 68H134M112 78H130" strokeWidth="3.2" />
        <circle cx="126" cy="66" r="20" strokeWidth=".8" />
        <path d="M144 84 163 103" strokeWidth="8" />
        <path d="M147 88 160 101" stroke={CREAM} strokeWidth="1.4" />
    </>, <>
        <rect x="63" y="25" width="66" height="90" rx="4" fill={o} />
        <circle cx="126" cy="66" r="25" fill={MUSTARD} />
    </>],
    AlgoLab: (_, g) => [<>
        <path d="M100 24 66 54 48 90M66 54 84 90M100 24 134 54 116 90M134 54 152 90" />
        {tree.map(([x, y], k) => <circle key={k} cx={x} cy={y} r="11" fill={CREAM} />)}
        {tree.map(([x, y], k) => <path key={k} d={`M${x - 4} ${y}h8`} strokeWidth="1.6" />)}
    </>, <>
        {tree.map(([x, y], k) => <circle key={k} cx={x} cy={y} r="11" fill={[0, 2, 6].includes(k) ? ORANGE : k % 2 ? g : MUSTARD} />)}
        <path d="M100 24 134 54 152 90" stroke={ORANGE} strokeWidth="4" fill="none" />
    </>],
    "Dev Plaza": (o, g) => [<>
        <path d="M42 106H158" />
        {[34, 58, 44, 74].map((h, k) => <rect key={k} x={52 + k * 26} y={106 - h} width="20" height={h} fill={CREAM} />)}
        <path d="M134 50h8M134 58h8M134 66h8" strokeWidth="1.2" />
        <path d={star(140, 18, 10, 4.4)} fill={CREAM} />
    </>, <>
        {[34, 58, 44, 74].map((h, k) => <rect key={k} x={52 + k * 26} y={106 - h} width="20" height={h} fill={k % 2 ? g : MUSTARD} />)}
        <path d={star(140, 18, 10, 4.4)} fill={ORANGE} />
        <rect x="128" y="32" width="20" height="74" fill={o} />
    </>],
    WalletWhiz: (_, g) => [<>
        <circle cx="84" cy="42" r="22" fill={CREAM} />
        <path d="M84 42V20M84 42 104.7 49.5" />
        <rect x="52" y="50" width="96" height="60" rx="9" fill={CREAM} />
        <path d="M52 66H148" strokeWidth="1.6" />
        <rect x="57" y="55" width="86" height="50" rx="6" strokeWidth=".9" strokeDasharray="3 3" />
        <rect x="120" y="72" width="34" height="22" rx="6" fill={CREAM} />
        <circle cx="132" cy="83" r="4" fill={INK} />
    </>, <>
        <circle cx="84" cy="42" r="22" fill={MUSTARD} />
        <path d="M84 42V20A22 22 0 0 1 104.7 49.5Z" fill={ORANGE} />
        <rect x="52" y="50" width="96" height="60" rx="9" fill={g} />
        <rect x="120" y="72" width="34" height="22" rx="6" fill={MUSTARD} />
    </>],
    "Quiet Hours Scheduler": () => [<>
        <path d="M76 26C76 50 95 56 95 65C95 74 76 80 76 104H124C124 80 105 74 105 65C105 56 124 50 124 26Z" fill={CREAM} />
        <rect x="68" y="18" width="64" height="8" rx="3" fill={CREAM} /><rect x="68" y="104" width="64" height="8" rx="3" fill={CREAM} />
        <path d="M83 42Q100 46 117 42C114 53 104 58 100 62C96 58 86 53 83 42ZM80 103Q100 82 120 103M100 62V96" strokeWidth="1.2" />
        <path d="M156 16A17 17 0 1 0 174 40A13 13 0 1 1 156 16Z" fill={CREAM} />
        <path d={spark(40, 30, 6) + spark(52, 96, 4) + spark(150, 92, 5)} strokeWidth="1.2" />
    </>, <>
        <path d="M83 42Q100 46 117 42C114 53 104 58 100 62C96 58 86 53 83 42ZM80 103Q100 82 120 103Z" fill={ORANGE} />
        <path d="M156 16A17 17 0 1 0 174 40A13 13 0 1 1 156 16Z" fill={MUSTARD} />
    </>],
    "Pac-Man Terminal Game": (_, g) => [<>
        <rect x="34" y="18" width="132" height="94" rx="7" fill={CREAM} />
        <path d="M34 32H166" />
        {[44, 52, 60].map((x) => <circle key={x} cx={x} cy="25" r="2" fill={INK} stroke="none" />)}
        <rect x="42" y="40" width="116" height="64" rx="3" strokeWidth="1.2" />
        <path d="M74 70 88 62A16 16 0 1 0 88 78Z" fill={CREAM} />
        <circle cx="76" cy="61" r="1.8" fill={INK} stroke="none" />
        {[102, 114, 126, 138].map((x) => <circle key={x} cx={x} cy="70" r="2.4" fill={INK} stroke="none" />)}
        <circle cx="150" cy="70" r="4.5" fill={CREAM} />
        <path d="M48 92l5 3.5-5 3.5M57 99h8" strokeWidth="1.6" />
    </>, <>
        <rect x="42" y="40" width="116" height="64" rx="3" fill={g} />
        <path d="M74 70 88 62A16 16 0 1 0 88 78Z" fill={MUSTARD} />
        <circle cx="150" cy="70" r="4.5" fill={ORANGE} />
    </>],
    "Password Manager": (o) => [<>
        <path d="M78 60V44a22 22 0 0 1 44 0V60" strokeWidth="7" />
        <path d="M78 60V44a22 22 0 0 1 44 0V60" stroke={CREAM} strokeWidth="2" />
        <rect x="66" y="58" width="68" height="50" rx="7" fill={CREAM} />
        <circle cx="100" cy="78" r="6" fill={INK} /><path d="M97 80 95 96H105L103 80Z" fill={INK} />
        {[[73, 65], [127, 65], [73, 101], [127, 101]].map(([x, y]) => <circle key={x * y} cx={x} cy={y} r="1.6" fill={INK} stroke="none" />)}
        <circle cx="154" cy="46" r="10" fill={CREAM} /><circle cx="154" cy="46" r="3.5" strokeWidth="1.4" />
        <path d="M154 56V104M154 90h8v6M154 98h6" />
    </>, <>
        <rect x="66" y="58" width="68" height="50" rx="7" fill={MUSTARD} />
        <circle cx="154" cy="46" r="10" fill={o} />
    </>],
    "Named Entity Recognition": () => {
        const ink: ReactNode[] = [], col: ReactNode[] = [];
        tokens.forEach((row, r) => {
            let x = 30;
            row.forEach((w, k) => {
                const y = 28 + r * 30, c = tagged[`${r}-${k}`];
                ink.push(<rect key={`${r}${k}`} x={x} y={y} width={w} height="18" rx="4" fill={CREAM} />,
                    <path key={`l${r}${k}`} d={`M${x + 5} ${y + 9}H${x + w - 5}`} strokeWidth="1.4" strokeDasharray={c ? "none" : "3 2"} />);
                if (c) {
                    ink.push(<path key={`b${r}${k}`} d={`M${x} ${y - 3}V${y - 7}H${x + w}V${y - 3}`} strokeWidth="1.2" />);
                    col.push(<rect key={`${r}${k}`} x={x} y={y} width={w} height="18" rx="4" fill={c} />);
                }
                x += w + 7;
            });
        });
        return [ink, col];
    },
    ChadWallet: (o, g) => [<>
        <path d="M34 110H166" />
        <path d="M36 104 164 22" strokeWidth="1" strokeDasharray="4 4" />
        {candles.map(([, , hi, lo], k) => <path key={k} d={`M${48 + k * 15} ${hi}V${lo}`} strokeWidth="1.4" />)}
        {candles.map(([op, cl], k) => <rect key={k} x={43 + k * 15} y={Math.min(op, cl)} width="10" height={Math.abs(op - cl)} fill={CREAM} strokeWidth="1.6" />)}
    </>, <>
        {candles.map(([op, cl], k) => <rect key={k} x={43 + k * 15} y={Math.min(op, cl)} width="10" height={Math.abs(op - cl)} fill={cl < op ? g : ORANGE} />)}
        <path d="M34 110H166V116H34Z" fill={o} />
    </>],
    "ChatGPT Side Panel": (_, g) => [<>
        <rect x="26" y="18" width="148" height="94" rx="7" fill={CREAM} />
        <path d="M26 32H174M120 32V112" />
        {[36, 44, 52].map((x) => <circle key={x} cx={x} cy="25" r="2" fill={INK} stroke="none" />)}
        <rect x="62" y="21" width="70" height="8" rx="4" strokeWidth="1.2" />
        <path d="M36 46H108M36 54H100M36 62H106M36 76H90M36 84H104M36 92H96" strokeWidth="1.4" />
        <rect x="126" y="40" width="40" height="14" rx="6" fill={CREAM} strokeWidth="1.6" />
        <rect x="132" y="60" width="34" height="12" rx="6" fill={CREAM} strokeWidth="1.6" />
        <rect x="126" y="78" width="40" height="16" rx="6" fill={CREAM} strokeWidth="1.6" />
        <rect x="126" y="100" width="40" height="7" rx="3.5" strokeWidth="1.2" />
    </>, <>
        <rect x="120" y="32" width="54" height="80" fill={g} />
        <rect x="126" y="40" width="40" height="14" rx="6" fill={MUSTARD} />
        <rect x="132" y="60" width="34" height="12" rx="6" fill={ORANGE} />
        <rect x="126" y="78" width="40" height="16" rx="6" fill={MUSTARD} />
    </>],
    InternOrbit: (o, g) => [<>
        <ellipse cx="100" cy="66" rx="56" ry="38" transform="rotate(28 100 66)" strokeWidth="1" />
        <ellipse cx="100" cy="66" rx="74" ry="20" transform="rotate(-14 100 66)" strokeWidth="1.4" />
        <circle cx="100" cy="66" r="22" fill={CREAM} />
        <path d="M80 58Q100 52 120 58M79 70Q100 76 121 70" strokeWidth="1.2" />
        <path d="M174 66A74 20 0 0 1 26 66" transform="rotate(-14 100 66)" strokeWidth="1.4" />
        <g transform="rotate(-14 100 66)"><circle cx="164.9" cy="75.6" r="5" fill={CREAM} /><circle cx="33.9" cy="57.2" r="4" fill={CREAM} /></g>
        <circle cx="120.3" cy="30.6" r="4" fill={CREAM} />
        <path d={spark(160, 22, 6) + spark(40, 100, 4)} strokeWidth="1.2" />
    </>, <>
        <circle cx="100" cy="66" r="22" fill={ORANGE} />
        <circle cx="104" cy="70" r="22" fill={g} />
        <g transform="rotate(-14 100 66)"><circle cx="164.9" cy="75.6" r="5" fill={MUSTARD} /></g>
        <circle cx="120.3" cy="30.6" r="4" fill={o} />
    </>],
};
const medal: Motif = (_, g) => [<>
    <circle cx="100" cy="66" r="32" fill={CREAM} /><circle cx="100" cy="66" r="25" strokeWidth="1" />
    <path d={star(100, 66, 16, 7)} fill={CREAM} />
</>, <><circle cx="100" cy="66" r="32" fill={g} /><path d={star(100, 66, 16, 7)} fill={ORANGE} /></>];

// the card art: paper, a seeded background plate (engraved rings, a sunburst or a halftone wash), a halftone sun and
// hill, the motif's ink plate, then its colour plate printed slightly out of register, all blended with multiply
const Art = memo(function Art({ title, i }: { title: string; i: number }) {
    const r = seeded(title), id = `dk${i}`;
    const ang = [15, 45, 75][(r() * 3) | 0], kind = (r() * 3) | 0;
    const sx = 30 + r() * 140, sy = 20 + r() * 30;
    const mis = () => ((r() < 0.5 ? -1 : 1) * (0.8 + r() * 1.4)).toFixed(1);
    const [ink, colour] = (MOTIFS[title] ?? medal)(`url(#${id}o)`, `url(#${id}g)`);
    const hill = `M0 ${108 + r() * 6}Q${40 + r() * 40} ${96 + r() * 8} 100 ${106 + r() * 4}T200 ${102 + r() * 8}V130H0Z`;
    const mult = { mixBlendMode: "multiply" } as const;
    return (
        <svg viewBox="0 0 200 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
                <pattern id={`${id}m`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${ang})`}><circle cx="2" cy="2" r="1.1" fill={MUSTARD} /></pattern>
                <pattern id={`${id}o`} width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform={`rotate(${ang + 30})`}><circle cx="1.7" cy="1.7" r="1.05" fill={ORANGE} /></pattern>
                <pattern id={`${id}g`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform={`rotate(${ang + 60})`}><circle cx="1.5" cy="1.5" r=".9" fill={FOREST} /></pattern>
                <radialGradient id={`${id}f`} cx={sx / 200} cy={sy / 130} r=".9"><stop offset=".1" stopColor="#fff" /><stop offset="1" stopColor="#000" /></radialGradient>
                <mask id={`${id}k`}><rect width="200" height="130" fill={`url(#${id}f)`} /></mask>
            </defs>
            <rect width="200" height="130" fill={CREAM} />
            <g style={mult}>
                {kind === 0 && <g fill="none" stroke={MUSTARD} strokeWidth="2.6">{Array.from({ length: 22 }, (_, k) => <circle key={k} cx={sx} cy={sy} r={8 + k * 8} />)}</g>}
                {kind === 1 && <path fill={MUSTARD} d={Array.from({ length: 18 }, (_, k) => {
                    const a = (k * Math.PI) / 9, b = a + Math.PI / 18;
                    return `M${sx} ${sy}L${(sx + 300 * Math.cos(a)).toFixed(0)} ${(sy + 300 * Math.sin(a)).toFixed(0)}L${(sx + 300 * Math.cos(b)).toFixed(0)} ${(sy + 300 * Math.sin(b)).toFixed(0)}Z`;
                }).join("")} />}
                {kind === 2 && <rect width="200" height="130" fill={`url(#${id}m)`} mask={`url(#${id}k)`} />}
                <circle cx={sx} cy={sy} r="20" fill={`url(#${id}o)`} transform={`translate(${mis()} ${mis()})`} />
                <path d={hill} fill={`url(#${id}g)`} />
            </g>
            <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{ink}</g>
            <g style={mult} transform={`translate(${mis()} ${mis()})`}>{colour}</g>
            <g transform="translate(189 119)" stroke={INK} strokeWidth=".6" fill="none" opacity=".6"><circle r="3.2" /><path d="M-6 0H6M0-6V6" /></g>
        </svg>
    );
});

type FaceProps = { p: Project; i: number; on: boolean; hide: boolean };
const panel = "rounded-[.3em] border border-[#26201a]/40 bg-[#f7eed6]";

function NameBar({ p }: { p: Project }) {
    return (
        <div className={`${panel} px-[.6em] py-[.32em]`}>
            <h4 className="whitespace-nowrap font-extrabold leading-tight tracking-[-0.03em]" style={{ fontSize: `${Math.min(1.4, 27 / p.title.length)}em` }}>{p.title}</h4>
        </div>
    );
}

const Front = memo(function Front({ p, i, on, hide, sheens, fronts }: FaceProps & { sheens: Refs<HTMLDivElement>; fronts: Refs<HTMLButtonElement> }) {
    const [bg, fg] = ACCENT[i % 4], more = p.tech_stack.length - 3;
    return (
        <div className="dk-face" aria-hidden={!on} data-hide={hide || undefined}>
            <div className="dk-frame" style={{ backgroundColor: bg }}>
                <NameBar p={p} />
                <div className="relative mt-[.4em] min-h-0 flex-1 overflow-hidden rounded-[.3em] border-2 border-[#26201a]">
                    <Art title={p.title} i={i} />
                    <div className="dk-holo" />
                </div>
                <div className={`${panel} mt-[.4em] flex items-center justify-between gap-[.5em] px-[.6em] py-[.3em]`}>
                    <span className="truncate text-[.6em] font-bold uppercase tracking-[.12em]">{p.tech_stack.slice(0, 3).join(" · ")}{more > 0 && ` +${more}`}</span>
                    <svg viewBox="0 0 12 12" className="h-[.8em] w-[.8em] shrink-0" aria-hidden><path d="M6 .8 11.2 6 6 11.2.8 6Z" fill={bg} stroke={INK} strokeWidth="1" /><circle cx="6" cy="6" r="1.4" fill={fg} /></svg>
                </div>
                <div className={`${panel} mt-[.4em] px-[.7em] py-[.55em]`}>
                    <p className="text-[.84em] font-semibold leading-snug">{p.subtitle}</p>
                </div>
                <div className="mt-[.35em] flex items-center justify-between px-[.3em] text-[.56em] font-bold uppercase tracking-[.14em]" style={{ color: fg }}>
                    <span className="tabular-nums">{pad(i + 1)} / {pad(N)}</span>
                    <span className="flex items-center gap-[.4em]"><RotateCcw size="1.1em" aria-hidden /> Flip</span>
                </div>
            </div>
            <div className="dk-sheen" ref={(el) => { sheens.current[i] = el; }} />
            <button type="button" className="dk-cover" ref={(el) => { fronts.current[i] = el; }} tabIndex={on ? 0 : -1} aria-label={`${p.title}: ${p.subtitle}. Flip`} />
        </div>
    );
});

const Back = memo(function Back({ p, i, on, hide, backs }: FaceProps & { backs: Refs<HTMLDivElement> }) {
    const [bg, fg] = ACCENT[i % 4], t = on ? 0 : -1, small = "!px-[.95em] !py-[.5em] !text-[.7em] !gap-[.45em]";
    return (
        <div className="dk-face dk-back" aria-hidden={!on} data-hide={hide || undefined} ref={(el) => { backs.current[i] = el; }}>
            <div className="dk-frame" style={{ backgroundColor: bg }}>
                <NameBar p={p} />
                <div className={`${panel} dk-fit mt-[.4em] flex min-h-0 flex-1 flex-col px-[.75em] pb-[.6em] pt-[.55em]`}>
                    <p className="text-[.74em] leading-[1.4]">{p.description}</p>
                    <ul className="mt-[.5em] border-t border-[#26201a]/20">
                        {p.highlights.map((h) => (
                            <li key={h} className="flex gap-[.55em] border-b border-[#26201a]/15 py-[.26em] text-[.68em] leading-snug">
                                <span className="mt-[.5em] h-[.42em] w-[.42em] shrink-0 rotate-45 border border-[#26201a]/60" style={{ background: bg === INK ? ORANGE : bg }} />{h}
                            </li>
                        ))}
                    </ul>
                    <ul className="mt-[.5em] flex flex-wrap gap-[.28em]">
                        {p.tech_stack.map((s) => <li key={s} className="rounded-full border border-[#26201a]/30 px-[.6em] py-[.08em] text-[.58em] font-semibold">{s}</li>)}
                    </ul>
                    <div className="mt-auto flex items-center gap-[.4em] pt-[.55em]">
                        <a className={`pill-light ${small}`} href={p.github_repo} target="_blank" rel="noopener noreferrer" tabIndex={t}><Github size="1.15em" aria-hidden /> GitHub</a>
                        {p.web_url && <a className={`pill-dark ${small}`} href={p.web_url} target="_blank" rel="noopener noreferrer" tabIndex={t}><ExternalLink size="1.15em" aria-hidden /> Live demo</a>}
                        <button type="button" tabIndex={t} aria-label="Flip" className="ml-auto grid h-[2.1em] w-[2.1em] place-items-center rounded-full border border-[#26201a]/30"><RotateCcw size="1em" aria-hidden /></button>
                    </div>
                </div>
                <div className="mt-[.35em] px-[.3em] text-[.56em] font-bold uppercase tracking-[.14em] tabular-nums" style={{ color: fg }}>{pad(i + 1)} / {pad(N)}</div>
            </div>
        </div>
    );
});

// a real riffle (Gilbert–Shannon–Reeds: drop from the bottom of either half in proportion to its size), then a cut
function riffle(order: number[]) {
    const a = order.slice(0, Math.ceil(N / 2)), b = order.slice(Math.ceil(N / 2)), out: number[] = [];
    while (a.length || b.length) out.unshift((Math.random() < a.length / (a.length + b.length) ? a : b).pop()!);
    const c = 2 + ((Math.random() * (N - 3)) | 0), res = [...out.slice(c), ...out.slice(0, c)];
    return res[0] === order[0] ? [...res.slice(1), res[0]] : res;
}
const jit = (i: number) => ((i * 37) % 11) / 11 - 0.5;
const STACK = [[0, 0], [-4, -2.2], [5, 1.8], [-2, -1]];

export default function Deck() {
    const wrap = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
    const drags = useRef<(HTMLDivElement | null)[]>([]), tilts = useRef<(HTMLDivElement | null)[]>([]), flips = useRef<(HTMLDivElement | null)[]>([]);
    const sheens = useRef<(HTMLDivElement | null)[]>([]), backs = useRef<(HTMLDivElement | null)[]>([]), fronts = useRef<(HTMLButtonElement | null)[]>([]);
    const [size, setSize] = useState({ w: 1000, vw: 1200, vh: 900 });
    const [order, setOrder] = useState(() => projects.map((_, i) => i));
    const [flipped, setFlipped] = useState(false);
    const [phase, setPhase] = useState<Phase>(rm ? "fan" : "pile");
    const [deal, setDeal] = useState(false);
    const [fade, setFade] = useState(false);
    const timers = useRef<number[]>([]), pending = useRef<"front" | "back" | null>(null);
    // drag state: translation from home (x, y), rotation r, lift l, bank angles bx/by, grab point q in card space
    const g = useRef({ id: -1, f0x: 0, f0y: 0, qx: 0, qy: 0, r0: 0, hx: 0, hy: 0, lys: 1, lx: 0, moved: false, suppress: false, anim: false, flying: false, raf: 0, x: 0, y: 0, r: 0, l: 0, bx: 0, by: 0, s: [] as { t: number; x: number; y: number; r: number }[] });
    const hov = useRef<{ x: number; y: number; raf: number; r: DOMRect | null }>({ x: 0, y: 0, raf: 0, r: null });
    const busy = phase !== "fan" || deal || fade;
    const live = useRef({ order, flipped, busy });
    live.current = { order, flipped, busy };

    useLayoutEffect(() => {
        const el = wrap.current!, f = () => setSize({ w: el.clientWidth, vw: document.documentElement.clientWidth, vh: innerHeight });
        f();
        const ro = new ResizeObserver(f);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const later = (f: () => void, ms: number) => { timers.current.push(window.setTimeout(f, ms)); };
    const dealOut = () => { setPhase("fan"); setDeal(true); later(() => setDeal(false), N * 45 + 900); };
    useEffect(() => {
        let r2 = 0;
        const r1 = rm ? 0 : requestAnimationFrame(() => { r2 = requestAnimationFrame(dealOut); });
        const t = timers.current, s = g.current;
        return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); cancelAnimationFrame(s.raf); t.forEach(clearTimeout); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // keyboard focus follows the card it was on
    useEffect(() => {
        const f = pending.current, i = order[0];
        pending.current = null;
        if (f === "front") fronts.current[i]?.focus({ preventScroll: true });
        if (f === "back") backs.current[i]?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
    }, [order, flipped]);

    // each back sets its type as large as its own text allows (a short text reads bigger, a long one never clips)
    useLayoutEffect(() => {
        for (const b of backs.current) {
            const el = b?.querySelector<HTMLElement>(".dk-fit");
            if (!el?.offsetParent) continue;
            let f = 1.2;
            do el.style.fontSize = `${(f -= 0.05).toFixed(2)}em`; while (el.scrollHeight > el.clientHeight && f > 0.75);
        }
    }, [order, size]);

    // geometry: desktop fans the deck in an arc behind the top card; phones get a stack
    const mobile = size.vw < 640;
    const cw = mobile ? Math.min(330, size.vw - 60) : Math.round(Math.min(340, Math.max(260, (size.vh - 330) / 1.4)));
    const ch = Math.round(cw * 1.4), fs = 0.6, ps = mobile ? 0.86 : 0.74;
    const T = mobile ? 0 : Math.round(ch * fs * 0.27 + 8), H = T + ch + (mobile ? 56 : 30);
    const th = (20 * Math.PI) / 180, R = Math.max(0, Math.min(size.w / 2 - (cw * fs) / 2 - 8, 440)) / Math.sin(th);

    function place(i: number, slot: number): [string, number, string, number] {
        let t: string, z: number, tr = "transform 700ms cubic-bezier(.2,.8,.2,1)", d = 0, op = 1;
        if (phase === "fan") {
            if (slot === 0) { t = `translate(0px,${T}px)`; z = 100; }
            else if (mobile) { const k = Math.min(slot, 3); t = `translate(${STACK[k][0]}px,${k * 20}px) rotate(${STACK[k][1]}deg) scale(${1 - k * 0.04})`; z = 50 - slot; op = slot > 3 ? 0 : 1; }
            else { const a = ((slot - 1) / (N - 2) - 0.5) * 2 * th; t = `translate(${(R * Math.sin(a)).toFixed(1)}px,${(8 + (ch * fs) / 2 - ch / 2 + R * (1 - Math.cos(a))).toFixed(1)}px) rotate(${a.toFixed(4)}rad) scale(${fs})`; z = slot; }
            if (deal) d = slot === 0 ? (N - 1) * 45 + 80 : (slot - 1) * 45;
        } else {
            const left = slot < Math.ceil(N / 2), h = phase === "split" ? (left ? Math.ceil(N / 2) - 1 : N - 1) - slot : N - 1 - slot;
            const x = phase === "split" ? (left ? -1 : 1) * cw * (mobile ? 0.24 : 0.62) : jit(i) * 6;
            const rot = phase === "split" ? (left ? -6 : 6) + jit(i) * 3 : jit(i) * 5;
            t = `translate(${x.toFixed(1)}px,${T - h * 1.4 + (phase === "pile" ? 40 : 0)}px) rotate(${rot.toFixed(2)}deg) scale(${phase === "split" && mobile ? 0.64 : ps})`;
            z = 60 - slot;
            if (phase === "split") { tr = "transform 420ms cubic-bezier(.3,.7,.2,1)"; d = h * 14; }
            else if (phase === "riffle") { tr = "transform 320ms cubic-bezier(.5,0,.3,1)"; d = (N - 1 - slot) * 42; }
            else tr = "none";
        }
        return [t, z, rm ? "opacity 200ms" : `${tr} ${d}ms, opacity 300ms`, op];
    }

    // ---- motion -------------------------------------------------------------------------------------------------
    const apply = (i: number) => {
        const s = g.current, d = drags.current[i], t = tilts.current[i], sh = sheens.current[i];
        if (d) d.style.transform = `translate(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px) rotate(${s.r.toFixed(2)}deg) scale(${(1 + 0.04 * s.l).toFixed(4)})`;
        if (t) t.style.transform = `perspective(1400px) rotateX(${s.bx.toFixed(2)}deg) rotateY(${s.by.toFixed(2)}deg)`;
        if (sh) { sh.style.transform = `translate(${(s.by * 2.4).toFixed(1)}%,${(-s.bx * 2.4).toFixed(1)}%)`; sh.style.opacity = Math.min(1, (Math.abs(s.by) + Math.abs(s.bx)) / 8).toFixed(2); }
    };
    const reset = (i: number) => {
        Object.assign(g.current, { x: 0, y: 0, r: 0, l: 0, bx: 0, by: 0, anim: false, flying: false });
        drags.current[i]?.classList.remove("dk-lift");
        for (const el of [drags.current[i], tilts.current[i], sheens.current[i]]) if (el) { el.style.transform = ""; el.style.opacity = ""; }
    };
    const bank = (vx: number, vy: number) => { g.current.by = clamp(vx * 9, 16); g.current.bx = clamp(-vy * 7, 12); };
    // flip with a lift toward the viewer and a small overshoot, like a card turned between two fingers
    const turn = (i: number, to: boolean) => {
        const el = flips.current[i];
        if (!el || rm) return;
        const a = to ? 0 : 180, b = to ? 180 : 0, o = b > a ? 9 : -9;
        el.animate([
            { transform: `translateZ(0px) rotateY(${a}deg)` }, { transform: `translateZ(70px) rotateY(${(a + b) / 2}deg)`, offset: 0.4 },
            { transform: `translateZ(4px) rotateY(${b + o}deg)`, offset: 0.76 }, { transform: `translateZ(0px) rotateY(${b}deg)` },
        ], { duration: 800, easing: "cubic-bezier(.35,.05,.25,1)" });
    };
    const focusIn = () => !!stage.current?.contains(document.activeElement);
    const flip = () => {
        const { order: o, flipped: f, busy: b } = live.current;
        if (b || g.current.flying) return;
        if (focusIn()) pending.current = f ? "front" : "back";
        turn(o[0], !f);
        setFlipped(!f);
    };
    const bring = (i: number) => {
        const { order: o, flipped: f, busy: b } = live.current;
        if (b || g.current.flying || o[0] === i) return;
        if (focusIn()) pending.current = "front";
        if (f) turn(o[0], false);
        cancelAnimationFrame(g.current.raf);
        reset(o[0]);
        const k = o.indexOf(i);
        setOrder([...o.slice(k), ...o.slice(0, k)]);
        setFlipped(false);
    };
    // the thrown card swings back to the bottom of the deck
    const home = (i: number) => {
        const d = drags.current[i], t = tilts.current[i], from = d?.style.transform, fromT = t?.style.transform;
        reset(i);
        if (!rm && from && fromT) {
            d!.animate([{ transform: from }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.4,0,.2,1)" });
            t!.animate([{ transform: fromT }, { transform: "perspective(1400px)" }], { duration: 650, easing: "ease-out" });
        }
        if (focusIn()) pending.current = "front";
        if (live.current.flipped) turn(i, false);
        setOrder((o) => [...o.slice(1), o[0]]);
        setFlipped(false);
    };
    // ballistic flight with air drag; angular velocity from the grab lever
    const fling = (i: number, vx: number, vy: number, vr: number) => {
        const s = g.current, sp = Math.hypot(vx, vy), dist = Math.hypot(s.x, s.y);
        if (rm) { home(i); return; }
        const [ux, uy] = sp > 0.3 ? [vx / sp, vy / sp] : dist > 1 ? [s.x / dist, s.y / dist] : [1, 0];
        const v = Math.max(sp, 1.7);
        vx = ux * v; vy = uy * v; vr = clamp(vr + vx * s.lys * 0.05, 0.8);
        Object.assign(s, { anim: true, flying: true, l: 1 });
        drags.current[i]?.classList.add("dk-lift");
        let last = performance.now();
        const t0 = last;
        const step = (now: number) => {
            const dt = Math.min(48, now - last), f = Math.exp(-dt / 240);
            last = now;
            s.x += vx * dt; s.y += vy * dt; s.r += vr * dt;
            vx *= f; vy *= f; vr *= f;
            bank(vx, vy);
            apply(i);
            if (Math.hypot(vx, vy) < 0.4 || now - t0 > 520) home(i);
            else s.raf = requestAnimationFrame(step);
        };
        s.raf = requestAnimationFrame(step);
    };
    // damped spring back to rest (tension 280, friction 22, in per-second units: about 6 % overshoot)
    const spring = (i: number, vx: number, vy: number, vr: number) => {
        const s = g.current, K = 0.00028, C = 0.022;
        if (rm) { reset(i); return; }
        let vl = 0, last = performance.now();
        s.anim = true;
        const step = (now: number) => {
            let dt = Math.min(48, now - last);
            last = now;
            while (dt > 0) {
                const h = Math.min(4, dt);
                dt -= h;
                vx += (-K * s.x - C * vx) * h; s.x += vx * h;
                vy += (-K * s.y - C * vy) * h; s.y += vy * h;
                vr += (-K * s.r - C * vr) * h; s.r += vr * h;
                vl += (-K * s.l - C * vl) * h; s.l += vl * h;
            }
            bank(vx, vy);
            apply(i);
            if (Math.abs(s.x) + Math.abs(s.y) + Math.abs(s.r) < 0.3 && Math.abs(vx) + Math.abs(vy) < 0.01 && Math.abs(s.l) < 0.01) reset(i);
            else s.raf = requestAnimationFrame(step);
        };
        s.raf = requestAnimationFrame(step);
    };
    const vel = (now: number) => {
        const a = g.current.s, f = a[0], l = a[a.length - 1], dt = l.t - f.t;
        return dt < 8 || now - l.t > 70 ? { x: 0, y: 0, r: 0 } : { x: (l.x - f.x) / dt, y: (l.y - f.y) / dt, r: (l.r - f.r) / dt };
    };

    // ---- pointer ------------------------------------------------------------------------------------------------
    const down = (e: PointerEvent<HTMLDivElement>, i: number) => {
        const s = g.current;
        if (i !== live.current.order[0] || live.current.busy || s.flying || e.button > 0 || (e.target as Element).closest("a")) return;
        cancelAnimationFrame(s.raf);
        s.anim = false;
        e.currentTarget.setPointerCapture(e.pointerId);
        const sr = stage.current!.getBoundingClientRect();
        s.hx = sr.left + sr.width / 2; s.hy = sr.top + T + ch / 2;
        // the grab point in card space, so the card pivots exactly where it is held
        const a = (-s.r * Math.PI) / 180, sc = 1 + 0.04 * s.l, dx = (e.clientX - s.hx - s.x) / sc, dy = (e.clientY - s.hy - s.y) / sc;
        s.qx = dx * Math.cos(a) - dy * Math.sin(a); s.qy = dx * Math.sin(a) + dy * Math.cos(a);
        const ly = clamp(-s.qy / (ch / 2), 1);
        s.lys = (ly >= 0 ? 1 : -1) * (0.35 + 0.65 * Math.abs(ly)); s.lx = clamp(s.qx / (cw / 2), 1);
        Object.assign(s, { id: e.pointerId, f0x: e.clientX, f0y: e.clientY, r0: s.r, moved: false, suppress: false, s: [{ t: e.timeStamp, x: e.clientX, y: e.clientY, r: s.r }] });
        if (tilts.current[i]) tilts.current[i]!.style.transition = "none";
    };
    const move = (e: PointerEvent<HTMLDivElement>, i: number) => {
        const s = g.current;
        if (s.id !== e.pointerId) { hover(e, i); return; }
        const dx = e.clientX - s.f0x, dy = e.clientY - s.f0y;
        if (!s.moved) {
            if (dx * dx + dy * dy < 36) return;
            s.moved = true;
            drags.current[i]?.classList.add("dk-lift");
        }
        // holding the top and pulling right turns the card clockwise; holding the bottom, the other way
        s.r = s.r0 + clamp((dx / cw) * 26 * s.lys + (dy / ch) * 16 * s.lx, 30);
        s.l = 1;
        const a = (s.r * Math.PI) / 180, sc = 1.04;
        s.x = e.clientX - sc * (s.qx * Math.cos(a) - s.qy * Math.sin(a)) - s.hx;
        s.y = e.clientY - sc * (s.qx * Math.sin(a) + s.qy * Math.cos(a)) - s.hy;
        s.s.push({ t: e.timeStamp, x: e.clientX, y: e.clientY, r: s.r });
        while (s.s.length > 2 && e.timeStamp - s.s[0].t > 100) s.s.shift();
        const v = vel(e.timeStamp);
        bank(v.x, v.y);
        apply(i);
    };
    const up = (e: PointerEvent<HTMLDivElement>, i: number, cancel: boolean) => {
        const s = g.current;
        if (s.id !== e.pointerId) return;
        s.id = -1;
        if (!s.moved) { if (s.x || s.y || s.r || s.l) spring(i, 0, 0, 0); return; }
        s.suppress = true;
        const v = vel(e.timeStamp), sp = Math.hypot(v.x, v.y), dist = Math.hypot(s.x, s.y);
        const out = !cancel && ((sp > 0.55 && v.x * s.x + v.y * s.y > 0) || dist > cw * 0.42);
        if (out) fling(i, v.x, v.y, v.r); else spring(i, v.x, v.y, v.r);
    };
    // mouse hover: the card tilts toward the pointer and the varnish catches the light
    const hover = (e: PointerEvent<HTMLDivElement>, i: number) => {
        const h = hov.current;
        if (rm || e.pointerType !== "mouse" || i !== live.current.order[0]) return;
        h.x = e.clientX; h.y = e.clientY;
        if (!h.raf) h.raf = requestAnimationFrame(() => { h.raf = 0; tiltTo(i); });
    };
    const tiltTo = (i: number) => {
        const s = g.current, t = tilts.current[i], sh = sheens.current[i], h = hov.current;
        if (live.current.busy || s.anim || s.id !== -1 || !t || !sh) return;
        const sr = (h.r ??= stage.current!.getBoundingClientRect()); // read once per hover, not every frame
        const px = (h.x - sr.left - sr.width / 2) / cw, py = (h.y - sr.top - T - ch / 2) / ch;
        t.style.transition = "transform .3s ease-out";
        t.style.transform = `perspective(1400px) rotateX(${(-py * 12).toFixed(2)}deg) rotateY(${(px * 14).toFixed(2)}deg)`;
        sh.style.transform = `translate(${(-px * 70).toFixed(1)}%,${(-py * 50).toFixed(1)}%)`;
        sh.style.opacity = "1";
        const holo = sh.parentElement?.querySelector<HTMLElement>(".dk-holo");
        if (holo) { holo.style.transform = `translate(${(px * 30).toFixed(1)}%,${(py * 30).toFixed(1)}%)`; holo.style.opacity = "1"; }
    };
    const leave = (i: number) => {
        const s = g.current, t = tilts.current[i], sh = sheens.current[i];
        cancelAnimationFrame(hov.current.raf);
        Object.assign(hov.current, { raf: 0, r: null });
        if (s.anim || s.id !== -1 || !t || !sh) return;
        t.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1)";
        t.style.transform = "";
        sh.style.opacity = "";
        const holo = sh.parentElement?.querySelector<HTMLElement>(".dk-holo");
        if (holo) holo.style.opacity = "";
    };
    const click = (e: MouseEvent, i: number) => {
        if (i !== live.current.order[0] || (e.target as Element).closest("a")) return;
        if (g.current.suppress) { g.current.suppress = false; return; }
        flip();
    };

    // ---- controls -----------------------------------------------------------------------------------------------
    const next = () => {
        const { order: o, busy: b } = live.current, s = g.current;
        if (b || s.flying) return;
        if (rm) { bring(o[1]); return; }
        cancelAnimationFrame(s.raf);
        s.lys = 1;
        if (focusIn()) pending.current = "front";
        fling(o[0], 2.2, -0.35, 0.05);
    };
    const prev = () => bring(live.current.order[N - 1]);
    const shuffle = () => {
        const { order: o, flipped: f, busy: b } = live.current;
        if (b || g.current.flying) return;
        if (f) { turn(o[0], false); setFlipped(false); }
        const n = riffle(o);
        if (rm) { setFade(true); later(() => { setOrder(n); setFade(false); }, 200); return; }
        setPhase("split");
        later(() => { setOrder(n); setPhase("riffle"); later(dealOut, N * 42 + 420); }, 520);
    };
    const key = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };

    const top = order[0];
    return (
        <div ref={wrap} className={`dk-root ${rm ? "dk-rm" : ""}`}>
            <style>{CSS}</style>
            <div style={{ width: size.vw, marginLeft: (size.w - size.vw) / 2, overflowX: "clip" }}>
                <div ref={stage} className="relative mx-auto" style={{ width: size.w, height: H }} onKeyDown={key}>
                    <div className="cloth dk-mat" aria-hidden style={mobile ? { inset: "-12px -8px 8px" } : { inset: `${Math.round(T * 0.55)}px 0 -8px` }}>
                        {!mobile && <div className="dk-zone" style={{ width: cw + 16, height: ch + 16, top: T - Math.round(T * 0.55) - 8, marginLeft: -(cw + 16) / 2 }} />}
                    </div>
                    {projects.map((p, i) => {
                        const slot = order.indexOf(i), isTop = slot === 0 && phase === "fan";
                        const [t, z, tr, op] = place(i, slot);
                        return (
                            <div key={p.title} className={`dk-slot ${!isTop && !mobile && phase === "fan" ? "dk-fan" : ""} ${slot === 0 || slot === N - 1 ? "dk-3d" : ""}`}
                                style={{ width: cw, height: ch, marginLeft: -cw / 2, transform: t, zIndex: z, transition: tr, opacity: fade ? 0 : op, fontSize: (cw / 340) * 16 }}
                                aria-hidden={!isTop} onClick={isTop ? undefined : () => bring(i)}>
                                <div className={`dk-drag ${isTop ? "dk-grab" : ""}`} ref={(el) => { drags.current[i] = el; }}
                                    onPointerDown={(e) => down(e, i)} onPointerMove={(e) => move(e, i)} onPointerUp={(e) => up(e, i, false)}
                                    onPointerCancel={(e) => up(e, i, true)} onPointerLeave={() => leave(i)} onClick={(e) => click(e, i)}>
                                    <div className="dk-shadow" />
                                    <div className="dk-tilt" ref={(el) => { tilts.current[i] = el; }}>
                                        <div className="dk-flip" ref={(el) => { flips.current[i] = el; }} style={!rm && isTop && flipped ? { transform: "rotateY(180deg)" } : undefined}>
                                            <Front p={p} i={i} on={isTop && !flipped} hide={isTop && flipped} sheens={sheens} fronts={fronts} />
                                            <Back p={p} i={i} on={isTop && flipped} hide={!(isTop && flipped)} backs={backs} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="relative z-10 mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                    <button type="button" className="pill-light !px-3" onClick={prev} aria-label="Previous card"><ChevronLeft size={18} aria-hidden /></button>
                    <span className="eyebrow w-16 text-center tabular-nums text-paragraph" aria-hidden>{pad(top + 1)} / {pad(N)}</span>
                    <button type="button" className="pill-light !px-3" onClick={next} aria-label="Next card"><ChevronRight size={18} aria-hidden /></button>
                </div>
                <div className="flex items-center gap-2.5">
                    <button type="button" className="pill-light" onClick={flip}><RotateCcw size={16} aria-hidden /> Flip</button>
                    <button type="button" className="pill-dark" onClick={shuffle}><Shuffle size={16} aria-hidden /> Shuffle</button>
                </div>
            </div>
            <p className="sr-only" aria-live="polite">{`${pad(top + 1)} / ${pad(N)}: ${projects[top].title}`}</p>
            <ol className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-1.5" aria-label="Projects">
                {projects.map((p, i) => (
                    <li key={p.title}>
                        <button type="button" onClick={() => bring(i)} aria-current={i === top || undefined}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${i === top ? "bg-primary text-btn" : "border border-stroke/20 text-paragraph hover:text-heading"}`}>
                            <span className="tabular-nums opacity-60">{pad(i + 1)}</span> {p.title}
                        </button>
                    </li>
                ))}
            </ol>
        </div>
    );
}

const CSS = `
.dk-root :focus-visible{outline:3px solid #ff6509;outline-offset:2px}
.dk-mat{position:absolute;border-radius:28px;pointer-events:none;box-shadow:inset 0 0 0 10px rgb(0 0 0/.06),inset 0 0 0 11px rgb(255 245 220/.28),0 22px 44px -26px rgb(0 0 0/.6)}
.dk-zone{position:absolute;left:50%;border-radius:18px;border:1.5px dashed rgb(255 245 220/.35)}
.dk-slot{position:absolute;top:0;left:50%;color:${INK};--btn:36 73 58;--btn-text:255 245 220;--btn-bg:255 245 220;--headline:38 32 26;--stroke:38 32 26;--paragraph:84 66 34}
.dk-fan{cursor:pointer}
.dk-drag,.dk-tilt,.dk-flip,.dk-face,.dk-shadow{position:absolute;inset:0}
.dk-grab{cursor:grab;touch-action:pan-y;will-change:transform}
.dk-grab.dk-lift{cursor:grabbing}
.dk-fan .dk-drag{transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.dk-fan:hover .dk-drag{transform:translateY(-7%)}
.dk-3d .dk-tilt{transform:perspective(1400px);transform-style:preserve-3d}
.dk-3d .dk-flip{transform-style:preserve-3d}
.dk-slot:not(.dk-3d) .dk-back{display:none}
.dk-3d .dk-face{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.dk-face{border-radius:4.6%/3.3%;overflow:hidden;padding:.5em;
  background:${CREAM} url(/art/paper.webp) 0 0/384px;background-blend-mode:overlay;border:1px solid rgb(38 32 26/.45);
  box-shadow:0 1px 0 rgb(38 32 26/.25),0 14px 26px -16px rgb(30 20 0/.75)}
.dk-back{transform:rotateY(180deg)}
.dk-frame{display:flex;flex-direction:column;height:100%;border-radius:.55em;padding:.4em;background-image:url(/art/paper.webp);background-size:384px;background-blend-mode:overlay;box-shadow:inset 0 0 0 1px rgb(38 32 26/.55)}
.dk-shadow{border-radius:4.6%/3.3%;box-shadow:0 34px 46px -18px rgb(20 12 0/.6);opacity:0;transition:opacity .3s}
.dk-lift .dk-shadow{opacity:1}
.dk-cover{position:absolute;inset:0;border-radius:inherit}
.dk-cover:focus-visible{outline-offset:-6px}
.dk-sheen{position:absolute;inset:0;pointer-events:none;opacity:0;mix-blend-mode:soft-light;transition:opacity .4s,transform .3s ease-out;
  background:linear-gradient(110deg,transparent 30%,rgb(255 255 245/.9) 46%,rgb(255 240 200/.6) 52%,transparent 66%)}
.dk-holo{position:absolute;inset:-30%;pointer-events:none;opacity:0;mix-blend-mode:overlay;transition:opacity .4s,transform .3s ease-out;
  background:repeating-linear-gradient(120deg,transparent 0,rgb(255 236 170/.7) 2.5%,transparent 5%,rgb(255 101 9/.35) 7.5%,transparent 10%,rgb(140 200 170/.4) 12.5%,transparent 15%)}
.dk-grab .dk-tilt,.dk-grab .dk-sheen,.dk-grab .dk-holo{will-change:transform,opacity}
.dk-rm .dk-back{transform:none}
.dk-rm .dk-face{transition:opacity .25s}
.dk-rm .dk-face[data-hide]{opacity:0}
`;
