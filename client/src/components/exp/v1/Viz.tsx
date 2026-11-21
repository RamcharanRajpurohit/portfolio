import { useId, type CSSProperties, type JSX, type ReactNode } from "react";

// Living diagrams for the chapter-02 "plate" faces. Ink = currentColor (cream on the plate), gold = --highlight.
// Motion is CSS only: each moving piece reads its start/end from --x0/--y0/--x1/--y1 and its loop from --d/--w.

type P = [number, number];
const GOLD = "rgb(var(--highlight))";
const ORANGE = "#ff6509";
const PLATE = "#24493a";

// a piece that travels a -> b (via m on ship slips); r = where it rests when motion is reduced (0..1 along a -> b)
const go = (a: P, b: P, d: number, w: number, r = 0.5, m: P = a) => ({
    "--x0": `${a[0]}px`, "--y0": `${a[1]}px`, "--x1": `${b[0]}px`, "--y1": `${b[1]}px`, "--xm": `${m[0]}px`, "--ym": `${m[1]}px`,
    "--d": `${d}s`, "--w": `${w}s`, "--r": r,
}) as CSSProperties;
const loop = (d: number, w: number) => ({ "--d": `${d}s`, "--w": `${w}s` }) as CSSProperties;

// halftone dots in ink; ids from useId so repeated diagrams on one page don't clash
function Frame({ children }: { children: (dots: string) => ReactNode }) {
    const id = "v1viz" + useId().replace(/[^\w-]/g, "");
    return (
        <svg viewBox="0 0 320 240" className="v1viz w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <style>{css}</style>
            <defs>
                <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1" fill="currentColor" opacity=".35" /></pattern>
            </defs>
            <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children(`url(#${id})`)}</g>
        </svg>
    );
}

const Label = ({ x, y, children }: { x: number; y: number; children: string }) => <text x={x} y={y} textAnchor="middle" stroke="none">{children}</text>;
const Slip = ({ fill = "currentColor" }: { fill?: string }) => <rect x="-5" y="-3.5" width="10" height="7" rx="1" fill={fill} stroke={PLATE} strokeWidth="1" />;
const Tick = () => <path d="M-3.6 .2-1 2.8 3.8-2.6" stroke={PLATE} strokeWidth="2.2" />;

/* 1. Agent team: builders hand work to the reviewer, the scout reports what it finds, the reviewer passes it to the browser tester */
const S: P = [160, 192], F: P = [48, 48], B: P = [48, 120], A: P = [48, 192], R: P = [168, 100], T: P = [238, 128];
const glyph: Record<string, ReactNode> = {
    Flutter: <path d="M-5 1 4-8M-1 5 4 10M-1 5 4 0" strokeWidth="2.2" />,
    Backend: <><ellipse cx="0" cy="-5" rx="6.5" ry="2.6" /><path d="M-6.5-5v10a6.5 2.6 0 0 0 13 0v-10M-6.5 0a6.5 2.6 0 0 0 13 0" /></>,
    "AI service": <path d="M0-8C1-2 2-1 8 0 2 1 1 2 0 8-1 2-2 1-8 0-2-1-1-2 0-8Z" fill={GOLD} strokeWidth="1.4" />,
    Reviewer: <><circle cx="-2" cy="-2" r="5" /><path d="M2 2 7 7" strokeWidth="2.4" /></>,
    Scout: <path d="M-4 8V-8h9l-2.5 3.5L5-1h-9" />,
};
function Node({ at, name, label, below = 30 }: { at: P; name: string; label: string; below?: number }) {
    return (
        <g transform={`translate(${at[0]} ${at[1]})`}>
            <circle cx="2.5" cy="2.5" r="15" fill={GOLD} stroke="none" opacity=".85" />
            <circle r="15" fill={PLATE} strokeWidth="2" />
            {glyph[name]}
            <Label x={0} y={below}>{label}</Label>
        </g>
    );
}

export function AgentNet(): JSX.Element {
    return (
        <Frame>
            {(dots) => <>
                <path d={`M${S[0]} ${S[1]}L${R[0]} ${R[1]}`} strokeWidth="1.4" strokeDasharray="1 5" />
                {[F, B, A].map((p) => <path key={p[1]} d={`M${p[0]} ${p[1]}L${R[0]} ${R[1]}`} />)}
                <path d={`M${R[0]} ${R[1]}L${T[0]} ${T[1]}`} stroke={GOLD} strokeWidth="2.4" />
                {/* work in flight */}
                {[0, 1].map((i) => <g key={`s${i}`} className="v1viz-pk" style={go(S, R, 2.4, -i * 1.2, 0.35 + i * 0.3)}><circle r="2.6" fill="currentColor" stroke="none" /></g>)}
                {[F, B, A].map((p, i) => <g key={`b${i}`} className="v1viz-pk" style={go(p, R, 3, -0.5 - i, i ? 0.5 : 0.3)}><Slip /></g>)}
                <g className="v1viz-pk" style={go(R, T, 2, -0.3)}><Slip fill={GOLD} /></g>
                {/* now and then the reviewer sends a change back */}
                <g className="v1viz-pk v1viz-rare" style={go(R, F, 7, -2, 0.68)}><Slip fill={ORANGE} /></g>
                <circle className="v1viz-ping" cx={R[0]} cy={R[1]} r="15" stroke={GOLD} style={loop(3, -0.5)} />
                <Node at={S} name="Scout" label="SCOUT" />
                <Node at={F} name="Flutter" label="FLUTTER" />
                <Node at={B} name="Backend" label="BACKEND" />
                <Node at={A} name="AI service" label="AI SERVICE" />
                <Node at={R} name="Reviewer" label="REVIEWER" below={-25} />
                {/* browser tester: a little browser window with a cursor, proving the change */}
                <g transform={`translate(${T[0]} ${T[1] - 22})`}>
                    <rect x="3" y="3" width="62" height="46" rx="4" fill={GOLD} stroke="none" opacity=".85" />
                    <rect width="62" height="46" rx="4" fill={PLATE} strokeWidth="2" />
                    <rect x="1" y="11" width="60" height="34" fill={dots} stroke="none" />
                    <path d="M0 11H62" /><circle cx="7" cy="5.5" r="1.4" fill="currentColor" /><circle cx="13" cy="5.5" r="1.4" fill="currentColor" />
                    <path d="M10 20H36M10 28H28" strokeWidth="2.6" />
                    <path className="v1viz-nudge" d="M38 26v11l3-3 2.5 5 2-1-2.5-5h4.5Z" fill="currentColor" stroke={PLATE} strokeWidth="1" style={loop(2, -0.3)} />
                    <Label x={31} y={64}>BROWSER</Label>
                    <Label x={31} y={77}>TESTER</Label>
                    <g className="v1viz-pulse" transform="translate(62 0)" style={loop(2, -0.3)}>
                        <circle r="9.5" fill={GOLD} stroke={PLATE} strokeWidth="1.5" /><Tick />
                    </g>
                </g>
            </>}
        </Frame>
    );
}

/* 2. Playwright testing: one AI tester per device walks the same journey, at its own pace, ticking steps */
const STEPS = [0.2, 0.4, 0.6, 0.8], X0 = 92, X1 = 300, WALK = 0.85;
const lanes: { y: number; label: string; d: number; w: number; device: ReactNode }[] = [
    { y: 46, label: "PHONE", d: 3.6, w: -0.4, device: <><rect x="-8" y="-15" width="16" height="28" rx="3" /><path d="M-2-11h4" /></> },
    { y: 122, label: "TABLET", d: 5.2, w: -2.1, device: <><rect x="-16" y="-12" width="32" height="24" rx="3" /><circle cx="12" cy="0" r=".8" fill="currentColor" /></> },
    { y: 198, label: "DESKTOP", d: 4.3, w: -1.2, device: <><rect x="-19" y="-14" width="38" height="24" rx="2" /><path d="M-6 16h12M0 10v6" /></> },
];

export function TesterLanes(): JSX.Element {
    return (
        <Frame>
            {(dots) => <>
                {lanes.map((l) => (
                    <g key={l.label} style={loop(l.d, l.w)}>
                        <g transform={`translate(38 ${l.y})`}>
                            <g transform="translate(2.5 2.5)" stroke={GOLD} opacity=".85">{l.device}</g>
                            <g fill={dots}>{l.device}</g>
                            <Label x={0} y={30}>{l.label}</Label>
                        </g>
                        <path d={`M${X0} ${l.y + 2}H${X1}`} stroke={GOLD} strokeWidth="1.6" strokeDasharray="1 6" opacity=".9" />
                        <path d={`M${X0} ${l.y}H${X1}`} strokeDasharray="1 6" />
                        <circle cx={X0} cy={l.y} r="4" fill="currentColor" />
                        {STEPS.map((f) => {
                            const x = X0 + (X1 - X0) * f;
                            return (
                                <g key={f} transform={`translate(${x} ${l.y})`}>
                                    <circle r="7" fill={PLATE} />
                                    <g className={`v1viz-step v1viz-t${f * 100}`}><circle r="7.5" fill={GOLD} stroke={PLATE} strokeWidth="1" /><Tick /></g>
                                </g>
                            );
                        })}
                        <path d={`M${X1} ${l.y + 8}V${l.y - 12}l9 3.5-9 3.5`} fill={l.y === 122 ? ORANGE : GOLD} strokeWidth="1.8" />
                        <g className="v1viz-pk v1viz-walk" style={go([X0, l.y], [X1, l.y], l.d, l.w, 0.92)}>
                            <path d="M0 0v14l3.6-3.4 2.8 5.6 2.4-1.2-2.8-5.4H11Z" fill="currentColor" stroke={PLATE} strokeWidth="1.2" />
                        </g>
                    </g>
                ))}
            </>}
        </Frame>
    );
}

/* 3. Parallel accounts: four terminals type at their own rhythm, share one agents & skills block, and send finished slips to Ship */
const WIN = [{ d: 3.4, w: -0.2 }, { d: 4.4, w: -2.6 }, { d: 2.9, w: -1.1 }, { d: 3.9, w: -3.1 }];
const BARS = [30, 22, 38];

export function Sessions(): JSX.Element {
    return (
        <Frame>
            {(dots) => <>
                {/* shared block + ship tray */}
                <rect x="63" y="121" width="200" height="34" rx="5" fill={GOLD} stroke="none" opacity=".85" />
                <rect x="60" y="118" width="200" height="34" rx="5" fill={PLATE} strokeWidth="2" />
                <rect x="62" y="120" width="196" height="30" rx="4" fill={dots} stroke="none" />
                <Label x={160} y={139}>AGENTS &amp; SKILLS</Label>
                <path d="M122 196h76l-7 22h-62Z" fill={PLATE} strokeWidth="2" />
                <path d="M134 196l2-6h48l2 6M138 190l2-5h40l2 5" strokeWidth="1.4" />
                <path d="M124 202h72" stroke={GOLD} />
                <Label x={160} y={213}>SHIP</Label>
                <path d="M197 196v-24l10 4-10 4" fill={ORANGE} strokeWidth="1.6" />
                {WIN.map(({ d, w }, i) => {
                    const x = 14 + i * 76, cx = x + 33;
                    return (
                        <g key={i} style={loop(d, w)}>
                            <path d={`M${cx} 82V118`} strokeWidth="1.4" strokeDasharray="1 5" />
                            <path d={`M${cx} 152L160 ${190}`} strokeWidth="1.2" strokeDasharray="1 5" opacity=".6" />
                            <rect x={x + 3} y="17" width="66" height="64" rx="4" fill={GOLD} stroke="none" opacity=".85" />
                            <rect x={x} y="14" width="66" height="64" rx="4" fill={PLATE} strokeWidth="2" />
                            <path d={`M${x} 28H${x + 66}`} />
                            <text x={x + 8} y="25" stroke="none" style={{ fontSize: 10, letterSpacing: 0 }}>{i + 1}</text>
                            <circle cx={x + 52} cy="21" r="1.6" fill="currentColor" /><circle cx={x + 58} cy="21" r="1.6" fill="currentColor" />
                            {BARS.map((bw, k) => (
                                <rect key={k} className={`v1viz-type v1viz-b${k}`} x={x + 8} y={36 + k * 10} width={(bw + i * 7) % 44 + 10} height="5" rx="1" fill={k === 1 ? GOLD : "currentColor"} stroke="none" />
                            ))}
                            <rect className="v1viz-blink" x={x + 8} y="66" width="6" height="7" fill="currentColor" stroke="none" />
                            <g className="v1viz-pk v1viz-ship" style={go([cx, 84], [146 + i * 9, 192], d, w, 0.12, [cx * 0.4 + 96, 136])}><Slip fill={i === 1 ? GOLD : "currentColor"} /></g>
                        </g>
                    );
                })}
            </>}
        </Frame>
    );
}

export const vizFor: Record<string, () => JSX.Element> = { "Agent team": AgentNet, "Playwright testing": TesterLanes, "Parallel accounts": Sessions };

const pct = (n: number) => Math.round(n * 100);
const css = `
.v1viz text { font: 700 11px Manrope, ui-sans-serif, sans-serif; letter-spacing: .12em; fill: currentColor; }
.v1viz-pk { animation: v1viz-go var(--d) linear var(--w) infinite; }
.v1viz-rare { animation-name: v1viz-rare; }
.v1viz-walk { animation-name: v1viz-walk; }
.v1viz-ship { animation-name: v1viz-ship; animation-timing-function: ease-in-out; }
.v1viz-pulse { animation: v1viz-pulse var(--d) ease-out var(--w) infinite; }
.v1viz-ping { transform-box: fill-box; transform-origin: center; animation: v1viz-ping var(--d) ease-out var(--w) infinite; }
.v1viz-nudge { animation: v1viz-nudge var(--d) ease-in-out var(--w) infinite; }
.v1viz-step, .v1viz-type { transform-box: fill-box; transform-origin: center; animation: v1viz-t20 var(--d) linear var(--w) infinite; }
.v1viz-type { transform-origin: left; animation-timing-function: steps(5, end); }
.v1viz-blink { animation: v1viz-blink 1s steps(1) infinite; }
${STEPS.map((f) => `.v1viz-t${pct(f)} { animation-name: v1viz-t${pct(f)}; }`).join("\n")}
${[0, 1, 2].map((k) => `.v1viz-b${k} { animation-name: v1viz-b${k}; }`).join("\n")}
@keyframes v1viz-go { 0% { transform: translate(var(--x0), var(--y0)); opacity: 0; } 10%, 90% { opacity: 1; } 100% { transform: translate(var(--x1), var(--y1)); opacity: 0; } }
@keyframes v1viz-rare { 0%, 62% { transform: translate(var(--x0), var(--y0)); opacity: 0; } 65%, 85% { opacity: 1; } 88%, 100% { transform: translate(var(--x1), var(--y1)); opacity: 0; } }
@keyframes v1viz-walk { 0% { transform: translate(var(--x0), var(--y0)); opacity: 0; } 4% { opacity: 1; } ${WALK * 100}% { transform: translate(var(--x1), var(--y1)); opacity: 1; } 94%, 100% { transform: translate(var(--x1), var(--y1)); opacity: 0; } }
@keyframes v1viz-ship { 0%, 70% { transform: translate(var(--x0), var(--y0)); opacity: 0; } 73% { opacity: 1; } 84% { transform: translate(var(--xm), var(--ym)); } 96% { transform: translate(var(--x1), var(--y1)); opacity: 1; } 100% { transform: translate(var(--x1), var(--y1)); opacity: 0; } }
@keyframes v1viz-pulse { 0% { transform: translate(62px, 0) scale(1.35); } 20%, 100% { transform: translate(62px, 0) scale(1); } }
@keyframes v1viz-ping { 0% { transform: scale(1); opacity: .9; } 60%, 100% { transform: scale(1.8); opacity: 0; } }
@keyframes v1viz-nudge { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-14px, -9px); } }
@keyframes v1viz-blink { 50% { opacity: 0; } }
${STEPS.map((f) => { const p = pct(f * WALK); return `@keyframes v1viz-t${pct(f)} { 0%, ${p}% { opacity: 0; transform: scale(.3); } ${p + 3}% { opacity: 1; transform: scale(1.3); } ${p + 7}%, 93% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1); } }`; }).join("\n")}
${[0, 1, 2].map((k) => { const s = 4 + k * 22; return `@keyframes v1viz-b${k} { 0%, ${s}% { transform: scaleX(0); } ${s + 18}%, 94% { transform: scaleX(1); } 100% { transform: scaleX(0); } }`; }).join("\n")}
@media (prefers-reduced-motion: reduce) {
  .v1viz * { animation: none !important; }
  .v1viz-pk { transform: translate(calc(var(--x0) + (var(--x1) - var(--x0)) * var(--r)), calc(var(--y0) + (var(--y1) - var(--y0)) * var(--r))); }
  .v1viz-ping { opacity: 0; }
}`;
