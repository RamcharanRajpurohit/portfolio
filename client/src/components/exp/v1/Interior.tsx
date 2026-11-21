import { useId, type CSSProperties, type JSX, type ReactNode } from "react";

// Inside the machine: a vintage technical-manual cutaway of the computer's case, drawn as three parallax
// layers (back wall + boards, mid parts + the line, front framing). KEY plate = ink line work and one-colour
// halftone, always in register. COLOUR plates fade in with --reg and slide into register as --m goes to 0.

const INK = "rgb(var(--headline))", PAPER = "rgb(var(--secondary))", MUS = "rgb(var(--bg))", FOR = "rgb(var(--highlight))";
const ORA = "rgb(var(--tertiary))", DK = "rgb(var(--paragraph) / .35)", GLOW = "rgb(var(--v1i-glow))";
const OFF = { A: [12, -9], B: [-14, 10], C: [17, 13], D: [-9, -16] } as const;
type Pl = keyof typeof OFF;
const pl = (k: Pl): CSSProperties => ({ transform: `translate(calc(var(--m) * ${OFF[k][0]}px), calc(var(--m) * ${OFF[k][1]}px))`, opacity: "var(--reg)" });

// one-point perspective of the case: (X, Y) on the screen plane, z = depth (1 = screen, ZB = back wall)
type Pt = [number, number];
const VX = 880, VY = 430, ZB = 2.6, X0 = -200, X1 = 1800, Y0 = -150, Y1 = 1150;
const P = (X: number, Y: number, z: number): Pt => [VX + (X - VX) / z, VY + (Y - VY) / z];
const ln = (ps: Pt[]) => "M" + ps.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
const poly = (...ps: Pt[]) => ln(ps) + "Z";

const css = `
.v1i-layer{position:absolute;inset:-8%;pointer-events:none;--v1i-glow:255 228 168}
.v1i-board{fill-opacity:.85}
[data-theme="dark"] .v1i-board{fill-opacity:.28}
[data-theme="dark"] .v1i-shade{fill-opacity:.4}
.v1i-glow{opacity:var(--reg)}
[data-theme="dark"] .v1i-glow{opacity:calc(var(--reg) * .3)}
.v1i-layer>svg{display:block;width:100%;height:100%}
[data-theme="dark"] .v1i-layer{--v1i-glow:245 196 53}
.v1i-lamp{animation:v1i-blink 2.8s steps(1) infinite}
@keyframes v1i-blink{0%,62%{opacity:1}63%,100%{opacity:.25}}
@media (prefers-reduced-motion: reduce){.v1i-lamp{animation:none}}`;

// ---- back layer geometry -------------------------------------------------------------------------
const C0 = [P(X0, Y0, 1), P(X1, Y0, 1), P(X1, Y1, 1), P(X0, Y1, 1)];
const CB = [P(X0, Y0, ZB), P(X1, Y0, ZB), P(X1, Y1, ZB), P(X0, Y1, ZB)];
const wall = {
    ceil: poly(C0[0], C0[1], CB[1], CB[0]), right: poly(C0[1], C0[2], CB[2], CB[1]),
    floor: poly(C0[3], C0[2], CB[2], CB[3]), left: poly(C0[0], CB[0], CB[3], C0[3]), back: poly(...CB),
};
// moulded ribs: a U-shaped flange (left wall, ceiling, right wall) at depth z, flange depth `w`
const rib = (z: number, w: number) => poly(P(X0, Y1, z), P(X0, Y0, z), P(X1, Y0, z), P(X1, Y1, z), P(X1 - w, Y1, z), P(X1 - w, Y0 + w, z), P(X0 + w, Y0 + w, z), P(X0 + w, Y1, z));
const RIBS = [1.3, 1.75, 2.2];
// lines running along the walls toward the back (mould seams)
const seams = [
    ln([P(X0, 260, 1), P(X0, 260, ZB)]), ln([P(X0, 720, 1), P(X0, 720, ZB)]), ln([P(X1, 300, 1), P(X1, 300, ZB)]), ln([P(X1, 780, 1), P(X1, 780, ZB)]),
    ln([P(300, Y0, 1), P(300, Y0, ZB)]), ln([P(1400, Y0, 1), P(1400, Y0, ZB)]),
].join("");
// vent slots in the right wall: light leaks in
const vents = [0, 1, 2, 3, 4, 5].map((i) => { const z = 1.42 + i * 0.1; return poly(P(X1, 360, z), P(X1, 360, z + 0.05), P(X1, 560, z + 0.05), P(X1, 560, z)); }).join("");

// the floor board (perspective), standing a little proud of the floor
const FB = { x0: 120, x1: 1560, z0: 1.12, z1: 2.5, y: Y1 - 20 };
const fb = poly(P(FB.x0, FB.y, FB.z0), P(FB.x1, FB.y, FB.z0), P(FB.x1, FB.y, FB.z1), P(FB.x0, FB.y, FB.z1));
const fbEdge = poly(P(FB.x0, FB.y, FB.z0), P(FB.x1, FB.y, FB.z0), P(FB.x1, Y1, FB.z0), P(FB.x0, Y1, FB.z0));
// floor traces: runs of copper along the depth with jogs
const ftrace = (x: number, j: number, zj: number) => ln([P(x, FB.y, FB.z0 + 0.02), P(x, FB.y, zj), P(x + j, FB.y, zj + 0.12), P(x + j, FB.y, FB.z1 - 0.02)]);
const fTraces = [
    ...[0, 1, 2, 3, 4, 5].map((i) => ftrace(560 + i * 22, 160, 1.45 + i * 0.015)),
    ...[0, 1, 2, 3].map((i) => ftrace(1180 + i * 26, -120, 1.7 + i * 0.02)),
    ...[0, 1, 2].map((i) => ftrace(260 + i * 30, 90, 1.6)),
].join("");
const fDots = [[560, 1.12], [670, 1.12], [1180, 1.12], [1258, 1.12], [380, 1.8], [940, 1.9], [1060, 2.2], [1400, 1.5], [300, 1.35]].map(([x, z]) => P(x, FB.y, z));
// flat chips on the floor board: top face, front face, legs
const fchip = (x0: number, x1: number, z0: number, z1: number, h: number) => {
    const y = FB.y, t = y - h;
    const top = poly(P(x0, t, z0), P(x1, t, z0), P(x1, t, z1), P(x0, t, z1)), front = poly(P(x0, t, z0), P(x1, t, z0), P(x1, y, z0), P(x0, y, z0));
    const n = Math.round((x1 - x0) / 22), legs = Array.from({ length: n }, (_, i) => { const x = x0 + ((i + 0.5) * (x1 - x0)) / n; return ln([P(x, t + h * 0.4, z0), P(x, y, z0 - 0.025)]); }).join("");
    const side = x0 > VX ? poly(P(x0, t, z0), P(x0, t, z1), P(x0, y, z1), P(x0, y, z0)) : poly(P(x1, t, z0), P(x1, t, z1), P(x1, y, z1), P(x1, y, z0));
    return { top, front, legs, side };
};
const FCHIPS = [fchip(330, 560, 1.42, 1.56, 26), fchip(1210, 1420, 1.95, 2.1, 22), fchip(700, 860, 2.05, 2.18, 18)];

// the motherboard on the back wall (frontal)
const MB = { x: 500, y: 236, w: 700, h: 440 };
const trace = (pts: number[]) => "M" + pts.reduce<string[]>((a, v, i) => (i % 2 ? a : [...a, `${v} ${pts[i + 1]}`]), []).join("L");
const bus = (n: number, gap: number, f: (k: number) => number[]) => Array.from({ length: n }, (_, k) => trace(f(k * gap))).join("");
const MB_TRACES = [
    bus(6, 9, (o) => [760 + o, 372, 760 + o, 330 - o * 0.4, 640, 330 - o * 0.4, 640, 300 + o]),
    bus(5, 9, (o) => [900, 400 + o, 960 - o * 0.3, 400 + o, 960 - o * 0.3, 312 + o, 1010, 312 + o]),
    bus(5, 9, (o) => [900, 470 + o, 990 + o, 470 + o, 990 + o, 560, 1100, 560 + o * 0.2]),
    bus(4, 10, (o) => [800 + o, 520, 800 + o, 600, 600, 600 + o * 0.5]),
    bus(4, 9, (o) => [760, 440 + o, 690, 440 + o, 690 - o * 0.5, 520 + o * 0.6, 630, 520 + o * 0.6]),
    bus(3, 10, (o) => [1150, 290 + o, 1180, 290 + o, 1180, 640, 1100, 640]),
    trace([560, 260, 560, 650, 680, 650]), trace([1040, 600, 1040, 650, 960, 650]),
].join("");
const MB_DOTS: Pt[] = [[640, 300], [649, 309], [658, 318], [1010, 312], [1010, 330], [1100, 560], [600, 600], [630, 520], [1100, 640], [680, 650], [960, 650], [560, 260], [1180, 300], [600, 615], [1110, 562]];
const dip = (x: number, y: number, w: number, h: number, n: number) => {
    const legs = Array.from({ length: n }, (_, i) => { const lx = x + ((i + 0.5) * w) / n; return `M${lx} ${y - 7}V${y}M${lx} ${y + h}V${y + h + 7}`; }).join("");
    return { body: `M${x} ${y}h${w}v${h}h${-w}Z`, legs, notch: `M${x} ${y + h / 2 - 5}a5 5 0 0 1 0 10` };
};
const DIPS = [dip(1020, 300, 130, 34, 10), dip(1020, 372, 130, 34, 10), dip(1030, 444, 100, 28, 7), dip(560, 470, 90, 26, 7), dip(560, 530, 90, 26, 7)];
const QFP = { x: 770, y: 380, s: 130 };
const qfpLegs = Array.from({ length: 12 }, (_, i) => {
    const o = QFP.x + 12 + i * 9.6, p = QFP.y + 12 + i * 9.6, e = QFP.x + QFP.s, f = QFP.y + QFP.s;
    return `M${o} ${QFP.y - 9}V${QFP.y}M${o} ${f}V${f + 9}M${QFP.x - 9} ${p}H${QFP.x}M${e} ${p}H${e + 9}`;
}).join("");
const RES = [0, 1, 2, 3, 4].map((i) => ({ x: 600 + i * 22, y: 370 }));

// ---- mid layer geometry ----------------------------------------------------------------------------
// the CRT in profile: implosion band, glass bell, funnel, neck, electron gun, socket and neck board
const CRT_BELL = "M1440 40C1330 44 1258 196 1176 252L1176 330C1258 386 1330 538 1440 542Z";
const CRT_NECK = "M1176 254H1012Q996 254 996 270V314Q996 330 1012 330H1176Z";
const YOKE = "M1160 226L1242 176L1270 186V396L1242 406L1160 356Z";
const yokeTurns = Array.from({ length: 9 }, (_, i) => { const x = 1172 + i * 10, h = 66 + i * 6.4; return `M${x} ${291 - h}Q${x + 8} 291 ${x} ${291 + h}`; }).join("");
const gun = "M1030 276h28v30h-28zM1066 272h22v38h-22zM1096 278h40v26h-40zM1142 282h18v18h-18z";
const ANODE = "M1338 66C1300 -40 1560 -20 1580 200C1596 380 1420 470 1380 560C1340 650 1310 690 1296 730";

// capacitor (a standing cylinder): body, top, cylindrical shading, vent cross, sleeve stripe
const cap = (cx: number, base: number, w: number, h: number) => {
    const r = w / 2, e = w * 0.2, top = base - h;
    return {
        base, body: `M${cx - r} ${top}V${base}A${r} ${e} 0 0 0 ${cx + r} ${base}V${top}Z`, top: { cx, cy: top, rx: r, ry: e },
        shade: `M${cx + r * 0.35} ${top + e * 0.95}V${base + e * 0.95}A${r} ${e} 0 0 0 ${cx + r} ${base}V${top}A${r} ${e} 0 0 1 ${cx + r * 0.35} ${top + e * 0.95}Z`,
        vent: `M${cx - r * 0.55} ${top}H${cx + r * 0.55}M${cx} ${top - e * 0.6}V${top + e * 0.6}`,
        stripe: `M${cx - r * 0.75} ${top + e * 0.66}V${base + e * 0.66}h${r * 0.3}V${top + e * 0.9}Z`,
        sleeve: `M${cx - r} ${top + h * 0.12}A${r} ${e} 0 0 0 ${cx + r} ${top + h * 0.12}`,
    };
};
const CAPS = [cap(1012, 852, 58, 130), cap(1074, 862, 42, 84), cap(1350, 912, 76, 168), cap(612, 900, 50, 96)];

// heat sink: fins with their tops and left faces (they sit right of the vanishing point)
const HS = { x: 1400, w: 170, top: 640, base: 790, n: 8 };
const fins = Array.from({ length: HS.n }, (_, i) => {
    const x = HS.x + i * (HS.w / HS.n);
    return { front: `M${x} ${HS.top}h9V${HS.base}h-9Z`, side: `M${x} ${HS.top}l-8 -7V${HS.base - 7}l8 7Z`, top: `M${x} ${HS.top}l-8 -7h9l8 7Z` };
});
const HS_BASE = `M${HS.x - 10} ${HS.base}h${HS.w + 6}v34h${-HS.w - 6}Z`;
// flyback transformer: cylindrical body, ferrite core, copper turns
const FLY = cap(1220, 896, 150, 108);
const CORE = "M1172 800V708H1268V800H1250V726H1190V800Z";
const coilTurns = Array.from({ length: 9 }, (_, i) => `M1168 ${734 + i * 7}q22 4 26 0M1246 ${734 + i * 7}q22 4 26 0`).join("");

// the ribbon cable and the hanging harness on the calm left side
const RIBBON = "M690 -40C700 120 640 260 520 330C380 410 200 380 40 470C-20 505 -60 540 -80 560";
const HARNESS = ["M200 -40C180 160 300 300 330 470C350 590 300 720 380 860", "M224 -40C210 160 320 300 352 470C372 590 330 720 410 862", "M248 -40C240 150 344 300 376 470C396 590 360 720 440 864"];
const TIES = [[268, 280, 28], [352, 520, 6], [356, 700, -14]];

// THE line: graphite pencil, then ink, meandering in from the left edge and out on the right
const WIRE = "M-60 640C110 590 220 720 360 700C500 680 560 590 690 610C820 630 840 760 930 742C1010 726 1000 640 972 560C946 486 936 410 968 370C1004 326 1080 380 1108 470C1130 545 1080 610 1118 680C1160 754 1240 640 1320 660C1410 682 1380 790 1460 830C1530 866 1600 790 1700 820";
const BLOT = { x: 949, y: 417 };

// ---- front layer -----------------------------------------------------------------------------------
const FCABLES = [
    { d: "M-120 760C120 820 260 920 300 1120", w: 66 },
    { d: "M-120 860C40 900 120 980 140 1120", w: 44 },
    { d: "M1700 70C1560 30 1440 -10 1380 -120", w: 52 },
];

export function Interior(): JSX.Element {
    const u = useId().replace(/:/g, "");
    const id = (n: string) => `${u}${n}`, url = (n: string) => `url(#${u}${n})`;
    const dot = (n: string, size: number, r: number, fill: string, rot: number) => (
        <pattern id={id(n)} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${rot})`}><circle cx={size / 2} cy={size / 2} r={r} fill={fill} /></pattern>
    );
    const defs = (
        <defs>
            {dot("kd", 6, 0.9, INK, 45)}
            {dot("kD", 6, 1.75, INK, 45)}
            {dot("ad", 7, 2.3, MUS, 15)}
            {dot("bd", 6, 1.5, FOR, 75)}
            {dot("dd", 6, 2, "rgb(var(--paragraph) / .55)", 30)}
            <pattern id={id("kh")} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0V5" stroke={INK} strokeWidth="1" /></pattern>
            <pattern id={id("kx")} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0V6M0 0H6" stroke={INK} strokeWidth=".9" /></pattern>
            <radialGradient id={id("glow")} cx={VX} cy={VY - 40} r="820" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={GLOW} stopOpacity=".6" /><stop offset=".45" stopColor={GLOW} stopOpacity=".22" /><stop offset="1" stopColor={GLOW} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={id("vg")} cx={VX} cy={VY - 40} r="900" gradientUnits="userSpaceOnUse">
                <stop offset=".35" stopColor="#000" /><stop offset="1" stopColor="#fff" />
            </radialGradient>
            <radialGradient id={id("vg2")} cx={VX} cy={VY - 40} r="760" gradientUnits="userSpaceOnUse">
                <stop offset=".1" stopColor="#000" /><stop offset=".8" stopColor="#fff" />
            </radialGradient>
            <radialGradient id={id("neck")} cx="1050" cy="291" r="70" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={ORA} stopOpacity=".95" /><stop offset="1" stopColor={ORA} stopOpacity="0" />
            </radialGradient>
            <mask id={id("mv")}><rect x="-200" y="-200" width="2000" height="1400" fill={url("vg")} /></mask>
            <mask id={id("mv2")}><rect x="-200" y="-200" width="2000" height="1400" fill={url("vg2")} /></mask>
            <mask id={id("rib")}><path d={RIBBON} fill="none" stroke="#fff" strokeWidth="38" /><path d={RIBBON} fill="none" stroke="#000" strokeWidth="36.6" />
                {[30, 22, 14, 6].map((w) => <path key={w} d={RIBBON} fill="none" stroke="#fff" strokeWidth={w} />)}
                {[28.8, 20.8, 12.8, 4.8].map((w) => <path key={w} d={RIBBON} fill="none" stroke="#000" strokeWidth={w} />)}
            </mask>
            <clipPath id={id("bell")}><path d={CRT_BELL} /></clipPath>
        </defs>
    );
    const svg = (children: ReactNode, extra?: ReactNode) => (
        <svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden fill="none" strokeLinejoin="round" strokeLinecap="round">{defs}{children}{extra}</svg>
    );

    const back = (
        <>
            <rect x="-200" y="-200" width="2000" height="1400" fill={PAPER} />
            {/* walls: colour */}
            <path d={wall.left} fill={MUS} fillOpacity=".85" style={pl("A")} />
            <path d={wall.right} fill={MUS} fillOpacity=".75" style={pl("A")} />
            <path d={wall.ceil} fill={MUS} fillOpacity=".6" style={pl("A")} />
            <path d={wall.floor} fill={MUS} fillOpacity=".7" style={pl("A")} />
            <path d={wall.back} fill={MUS} fillOpacity=".45" style={pl("A")} />
            <path className="v1i-shade" d={wall.left + wall.ceil} fill={DK} style={pl("D")} />
            <path d={wall.right + wall.floor} fill={url("dd")} style={pl("D")} />
            <path d={vents} fill={PAPER} />
            {/* walls: key */}
            <path d={wall.left} fill={url("kD")} fillOpacity=".55" />
            <path d={wall.ceil} fill={url("kh")} fillOpacity=".45" />
            <path d={wall.right} fill={url("kd")} />
            <path d={wall.floor} fill={url("kd")} fillOpacity=".7" />
            <path d={seams} stroke={INK} strokeWidth="1.2" opacity=".55" />
            <path d={vents} stroke={INK} strokeWidth="1.6" />
            <path d={Object.values(wall).join("")} stroke={INK} strokeWidth="1.8" />
            {/* ribs, far to near */}
            {RIBS.slice().reverse().map((z) => (
                <g key={z}>
                    <path d={rib(z + 0.07, 70)} fill={PAPER} />
                    <path className="v1i-shade" d={rib(z + 0.07, 70)} fill={DK} style={pl("D")} />
                    <path d={rib(z + 0.07, 70)} fill={url("kx")} fillOpacity=".7" stroke={INK} strokeWidth="1.2" />
                    <path d={rib(z, 60)} fill={PAPER} />
                    <path d={rib(z, 60)} fill={MUS} style={pl("A")} />
                    <path d={rib(z, 60)} fill={url("kd")} fillOpacity=".5" stroke={INK} strokeWidth="1.8" />
                </g>
            ))}
            {/* the floor board */}
            <path d={fbEdge} fill={PAPER} /><path d={fbEdge} fill={url("kD")} stroke={INK} strokeWidth="1.8" />
            <path d={fb} fill={PAPER} />
            <path className="v1i-board" d={fb} fill={FOR} style={pl("B")} />
            <path d={fTraces} stroke={MUS} strokeWidth="4" style={pl("A")} />
            <path d={fb} fill={url("kd")} fillOpacity=".55" />
            <path d={fTraces} stroke={INK} strokeWidth="1.1" />
            {fDots.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="5" ry="2.6" fill={PAPER} stroke={INK} strokeWidth="1.2" />)}
            {FCHIPS.map((c, i) => (
                <g key={i}>
                    <path d={c.side + c.front} fill={PAPER} /><path d={c.top} fill={PAPER} />
                    <path d={c.top} fill={DK} style={pl("D")} />
                    <path d={c.front + c.side} fill={url("kD")} /><path d={c.top} fill={url("kh")} fillOpacity=".5" />
                    <path d={c.top + c.front + c.side} stroke={INK} strokeWidth="1.5" /><path d={c.legs} stroke={INK} strokeWidth="2.2" />
                </g>
            ))}
            <path d={fb} stroke={INK} strokeWidth="2" />
            {/* the motherboard on the back wall */}
            <rect x={MB.x + 8} y={MB.y + 10} width={MB.w} height={MB.h} rx="8" fill={url("kD")} fillOpacity=".6" />
            <rect x={MB.x} y={MB.y} width={MB.w} height={MB.h} rx="8" fill={PAPER} />
            <rect x={MB.x} y={MB.y} width={MB.w} height={MB.h} rx="8" className="v1i-board" fill={FOR} style={pl("B")} />
            <rect x={MB.x} y={MB.y} width={MB.w} height={MB.h} rx="8" className="v1i-board" fill={url("bd")} style={pl("B")} />
            <path d={MB_TRACES} stroke={MUS} strokeWidth="4" style={pl("A")} />
            <path d={MB_TRACES} stroke={INK} strokeWidth="1.1" />
            <rect x={MB.x} y={MB.y} width={MB.w} height={MB.h} rx="8" stroke={INK} strokeWidth="2" />
            {[[518, 254], [1182, 254], [518, 658], [1182, 658]].map(([x, y]) => <g key={x + y * 3} stroke={INK} strokeWidth="1.4"><circle cx={x} cy={y} r="8" fill={PAPER} /><path d={`M${x - 5} ${y - 5}l10 10`} /></g>)}
            {MB_DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={PAPER} stroke={INK} strokeWidth="1.2" />)}
            {/* header + edge fingers */}
            <rect x="620" y="282" width="160" height="16" fill={PAPER} stroke={INK} strokeWidth="1.6" />
            <path d={Array.from({ length: 16 }, (_, i) => `M${626 + i * 9.6} 290h2`).join("")} stroke={INK} strokeWidth="3" />
            <path d={Array.from({ length: 14 }, (_, i) => `M${880 + i * 14} 666h9v10h-9z`).join("")} fill={MUS} style={pl("A")} />
            <path d={Array.from({ length: 14 }, (_, i) => `M${880 + i * 14} 666h9v10h-9z`).join("")} stroke={INK} strokeWidth="1" />
            {/* chips */}
            {DIPS.map((c, i) => (
                <g key={i}>
                    <path d={c.legs} stroke={INK} strokeWidth="2.6" strokeLinecap="butt" />
                    <path d={c.body} fill={PAPER} /><path d={c.body} fill={DK} style={pl("D")} />
                    <path d={c.body} fill={url("kD")} fillOpacity=".8" stroke={INK} strokeWidth="1.8" /><path d={c.notch} fill={PAPER} stroke={INK} strokeWidth="1.2" />
                </g>
            ))}
            <path d={qfpLegs} stroke={INK} strokeWidth="3" strokeLinecap="butt" />
            <rect x={QFP.x} y={QFP.y} width={QFP.s} height={QFP.s} rx="4" fill={PAPER} />
            <rect x={QFP.x} y={QFP.y} width={QFP.s} height={QFP.s} rx="4" fill={DK} style={pl("D")} />
            <rect x={QFP.x} y={QFP.y} width={QFP.s} height={QFP.s} rx="4" fill={url("kx")} fillOpacity=".85" stroke={INK} strokeWidth="2" />
            <rect x={QFP.x + 22} y={QFP.y + 22} width={QFP.s - 44} height={QFP.s - 44} rx="3" fill={PAPER} stroke={INK} strokeWidth="1.4" />
            <rect x={QFP.x + 22} y={QFP.y + 22} width={QFP.s - 44} height={QFP.s - 44} rx="3" fill={MUS} fillOpacity=".8" style={pl("A")} />
            <rect x={QFP.x + 22} y={QFP.y + 22} width={QFP.s - 44} height={QFP.s - 44} rx="3" fill={url("kd")} stroke={INK} strokeWidth="1.4" />
            <circle cx={QFP.x + 14} cy={QFP.y + 14} r="4" fill={PAPER} stroke={INK} strokeWidth="1.2" />
            {/* crystal, resistors, small caps, the lamp */}
            <rect x="840" y="560" width="64" height="22" rx="11" fill={PAPER} stroke={INK} strokeWidth="1.6" />
            <path d="M848 566h40" stroke={INK} strokeWidth="1" opacity=".6" />
            {RES.map(({ x, y }, i) => (
                <g key={i}>
                    <path d={`M${x + 6} ${y - 14}v8M${x + 6} ${y + 38}v8`} stroke={INK} strokeWidth="1.6" />
                    <rect x={x} y={y - 6} width="12" height="44" rx="6" fill={PAPER} />
                    <rect x={x} y={y - 6} width="12" height="44" rx="6" fill={MUS} style={pl("A")} />
                    {i === 2 && <path d={`M${x} ${y + 6}h12`} stroke={ORA} strokeWidth="4" style={pl("C")} />}
                    <path d={`M${x} ${y + 6}h12M${x} ${y + 14}h12M${x} ${y + 22}h12`} stroke={INK} strokeWidth="2.2" strokeLinecap="butt" />
                    <rect x={x} y={y - 6} width="12" height="44" rx="6" stroke={INK} strokeWidth="1.4" />
                </g>
            ))}
            {[[1080, 610], [1124, 610], [700, 360]].map(([x, y]) => (
                <g key={x}>
                    <circle cx={x} cy={y} r="17" fill={PAPER} /><circle cx={x} cy={y} r="17" fill={MUS} style={pl("A")} />
                    <circle cx={x} cy={y} r="17" fill={url("kd")} stroke={INK} strokeWidth="1.6" /><path d={`M${x - 10} ${y}h20M${x} ${y - 10}v20`} stroke={INK} strokeWidth="1.2" />
                </g>
            ))}
            <g style={pl("C")}><circle className="v1i-lamp" cx="1170" cy="300" r="6" fill={ORA} /></g>
            <circle cx="1170" cy="300" r="6" stroke={INK} strokeWidth="1.4" />
            {/* warm light through the screen, and the halftone falloff into the corners */}
            <rect x="-200" y="-200" width="2000" height="1400" className="v1i-glow" fill={url("glow")} />
            <rect x="-200" y="-200" width="2000" height="1400" fill={url("kd")} mask={url("mv2")} opacity=".6" />
            <rect x="-200" y="-200" width="2000" height="1400" fill={url("kD")} mask={url("mv")} opacity=".8" />
        </>
    );

    const mid = (
        <>
            {/* the hanging harness and the ribbon cable (calm side) */}
            {HARNESS.map((d, i) => (
                <g key={i}>
                    <path d={d} stroke={INK} strokeWidth="12" /><path d={d} stroke={PAPER} strokeWidth="8.6" />
                    <path d={d} stroke={[FOR, MUS, DK][i]} strokeWidth="8.6" style={pl((["B", "A", "D"] as const)[i])} />
                    <path d={d} stroke={url("kd")} strokeWidth="8.6" />
                </g>
            ))}
            {TIES.map(([x, y, r]) => <rect key={y} x={x - 4} y={y - 6} width="62" height="12" rx="3" transform={`rotate(${r} ${x} ${y})`} fill={PAPER} stroke={INK} strokeWidth="1.6" />)}
            <path d={RIBBON} stroke={INK} strokeWidth="40" /><path d={RIBBON} stroke={PAPER} strokeWidth="37.2" />
            <path d={RIBBON} stroke={DK} strokeWidth="37.2" style={pl("D")} />
            <path d={RIBBON} stroke={ORA} strokeWidth="3" style={{ ...pl("C"), transform: `translate(calc(var(--m) * 17px - 14px), calc(var(--m) * 13px + 4px))` }} />
            <rect x="-200" y="-200" width="2000" height="1400" fill={INK} mask={url("rib")} />
            {/* capacitors at the back of the floor */}
            {CAPS.slice(0, 2).map((c, i) => <Cap key={i} c={c} url={url} />)}
            {/* the CRT: glass bell + funnel */}
            <path d={CRT_BELL} fill={PAPER} />
            <path d={CRT_BELL} fill={MUS} fillOpacity=".5" style={pl("A")} />
            <path d="M1440 40C1330 44 1258 196 1176 252V291H1440Z" fill={GLOW} fillOpacity=".7" style={pl("A")} />
            <g clipPath={url("bell")}>
                <path d="M1170 300H1460V560H1170Z" fill={url("kh")} fillOpacity=".7" />
                <path d="M1300 40H1460V560H1300C1340 400 1340 200 1300 40Z" fill={DK} style={pl("D")} />
                <path d="M1310 40H1460V560H1310C1350 400 1350 200 1310 40Z" fill={url("kD")} fillOpacity=".75" />
                <path d="M1404 70C1340 90 1280 170 1236 230" stroke={PAPER} strokeWidth="9" />
            </g>
            <path d={CRT_BELL} stroke={INK} strokeWidth="2.4" />
            <path d="M1300 52C1340 220 1340 360 1300 532" stroke={INK} strokeWidth="1.2" strokeDasharray="10 7" />
            {/* implosion band + mounting ear */}
            <path d="M1440 30H1490V552H1440Z" fill={PAPER} /><path d="M1440 30H1490V552H1440Z" fill={DK} style={pl("D")} />
            <path d="M1440 30H1490V552H1440Z" fill={url("kd")} stroke={INK} strokeWidth="2.2" /><path d="M1440 120H1490M1440 460H1490" stroke={INK} strokeWidth="1.4" />
            <path d="M1440 470L1404 520H1440" fill={PAPER} stroke={INK} strokeWidth="1.8" /><circle cx="1426" cy="510" r="5" stroke={INK} strokeWidth="1.4" />
            {/* the neck, the gun inside it, the orange heater glow */}
            <path d={CRT_NECK} fill={PAPER} />
            <path d={CRT_NECK} fill={url("neck")} style={pl("C")} />
            <path d={gun} fill={url("kh")} stroke={INK} strokeWidth="1.4" />
            <path d="M1030 291H996M1160 291h20" stroke={INK} strokeWidth="1.2" />
            <path d={CRT_NECK} stroke={INK} strokeWidth="2.2" /><path d="M1010 262H1170" stroke={PAPER} strokeWidth="3" />
            {/* the yoke: copper turns */}
            <path d={YOKE} fill={PAPER} /><path d={YOKE} fill={MUS} style={pl("A")} />
            <path d={YOKE} fill={url("dd")} style={pl("D")} />
            <path d={yokeTurns} stroke={INK} strokeWidth="1.3" /><path d="M1242 176V406" stroke={INK} strokeWidth="1.4" />
            <path d="M1242 176L1270 186V396L1242 406Z" fill={url("kx")} />
            <path d={YOKE} stroke={INK} strokeWidth="2.2" />
            {/* socket, pins and neck board */}
            <path d="M972 264h24v54h-24z" fill={PAPER} stroke={INK} strokeWidth="1.8" />
            <path d="M972 264h24v54h-24z" fill={url("kD")} fillOpacity=".7" />
            <path d="M952 220h20v142h-20z" fill={PAPER} /><path d="M952 220h20v142h-20z" fill={FOR} style={pl("B")} />
            <path d="M952 220h20v142h-20z" fill={url("kd")} stroke={INK} strokeWidth="1.8" />
            <path d="M952 236h-14M952 254h-14M952 330h-14M952 346h-14" stroke={INK} strokeWidth="2.4" />
            {/* the anode lead (behind the floor parts) and its suction cup */}
            <path d={ANODE} stroke={INK} strokeWidth="13" /><path d={ANODE} stroke={PAPER} strokeWidth="9.4" />
            <path d={ANODE} stroke={FOR} strokeWidth="9.4" style={pl("B")} />
            <path d={ANODE} stroke={url("kh")} strokeWidth="9.4" />
            <path d="M1312 76Q1338 40 1366 74Z" fill={PAPER} stroke={INK} strokeWidth="2" /><path d="M1312 76Q1338 40 1366 74Z" fill={DK} style={pl("D")} />
            {/* flyback transformer */}
            <path d={CORE} fill={PAPER} /><path d={CORE} fill={DK} style={pl("D")} /><path d={CORE} fill={url("kD")} stroke={INK} strokeWidth="1.8" />
            <path d="M1164 730h36v66h-36zM1240 730h36v66h-36z" fill={PAPER} />
            <path d="M1164 730h36v66h-36zM1240 730h36v66h-36z" fill={ORA} fillOpacity=".75" style={pl("C")} />
            <path d={coilTurns} stroke={INK} strokeWidth="1.3" /><path d="M1164 730h36v66h-36zM1240 730h36v66h-36z" stroke={INK} strokeWidth="1.6" />
            <Cap c={FLY} url={url} dark />
        </>
    );
    const midFront = (
        <>
            {/* heat sink + transistor */}
            <path d={HS_BASE} fill={PAPER} /><path d={HS_BASE} fill={url("kh")} stroke={INK} strokeWidth="1.8" />
            {fins.map((f, i) => (
                <g key={i}>
                    <path d={f.side + f.front} fill={PAPER} /><path d={f.front} fill={FOR} fillOpacity=".7" style={pl("B")} />
                    <path d={f.side} fill={url("kD")} /><path d={f.top} fill={PAPER} />
                    <path d={f.side + f.front + f.top} stroke={INK} strokeWidth="1.4" />
                </g>
            ))}
            <path d="M1450 700h50v56h-50z" fill={PAPER} /><path d="M1450 700h50v56h-50z" fill={DK} style={pl("D")} />
            <path d="M1450 700h50v56h-50z" fill={url("kD")} stroke={INK} strokeWidth="1.8" /><path d="M1454 676h42v26h-42z" fill={PAPER} stroke={INK} strokeWidth="1.6" />
            <circle cx="1475" cy="688" r="6" fill={PAPER} stroke={INK} strokeWidth="1.6" /><path d="M1462 756v40M1475 756v40M1488 756v40" stroke={INK} strokeWidth="2.6" />
            <Cap c={CAPS[3]} url={url} />
            {/* the line */}
            <path className="v1i-pencil" d={WIRE} stroke="rgb(var(--paragraph))" strokeWidth="2" strokeDasharray="80 5 34 3 140 6 50 4" />
            <path className="v1i-ink" d={WIRE} pathLength={1} stroke="rgb(var(--highlight))" strokeWidth="6" />
            <g className="v1i-blot" fill="rgb(var(--highlight))" transform={`translate(${BLOT.x} ${BLOT.y})`}>
                <path d="M-14 -4C-16 -16 -2 -20 6 -14C14 -20 22 -8 16 0C24 8 12 18 4 14C-2 22 -16 16 -12 6C-22 4 -20 -6 -14 -4Z" />
                <circle cx="24" cy="-16" r="4.5" /><circle cx="-22" cy="18" r="3" />
            </g>
            {/* the big capacitor, in front of the line */}
            <Cap c={CAPS[2]} url={url} />
        </>
    );

    const front = FCABLES.map((c, i) => (
        <g key={i}>
            <path d={c.d} stroke={INK} strokeWidth={c.w + 5} /><path d={c.d} stroke={PAPER} strokeWidth={c.w} />
            <path d={c.d} stroke={i === 1 ? MUS : FOR} strokeWidth={c.w} style={pl(i === 1 ? "A" : "B")} />
            <path d={c.d} stroke={url("kD")} strokeWidth={c.w} strokeOpacity=".75" />
            <path d={c.d} stroke={PAPER} strokeWidth={c.w * 0.14} transform={`translate(${-c.w * 0.18} ${-c.w * 0.18})`} strokeOpacity=".9" />
        </g>
    ));

    return (
        <>
            <style>{css}</style>
            <div className="v1i-layer" data-depth="0.2">{svg(back)}</div>
            <div className="v1i-layer" data-depth="0.55">{svg(mid, midFront)}</div>
            <div className="v1i-layer" data-depth="1">{svg(front,
                <g>
                    <path d="M1462 -60H1600V1100H1462Z" fill={PAPER} /><path d="M1462 -60H1600V1100H1462Z" fill={MUS} style={pl("A")} />
                    <path d="M1462 -60H1600V1100H1462Z" fill={DK} style={pl("D")} />
                    <path d="M1462 -60H1600V1100H1462Z" fill={url("kh")} fillOpacity=".8" stroke={INK} strokeWidth="2.4" />
                    <path d="M1478 -60V1100" stroke={INK} strokeWidth="1.4" />
                    {[200, 860].map((y) => <g key={y} stroke={INK} strokeWidth="2"><circle cx="1500" cy={y} r="15" fill={PAPER} /><path d={`M${1490} ${y - 4}l20 8`} strokeWidth="3" /></g>)}
                </g>)}</div>
        </>
    );
}

// a standing cylinder: capacitor (forest sleeve) or the flyback body (dark)
function Cap({ c, url, dark }: { c: ReturnType<typeof cap>; url: (n: string) => string; dark?: boolean }) {
    const { cx, cy, rx, ry } = c.top;
    return (
        <g>
            <ellipse cx={cx} cy={c.base - ry * 0.8} rx={rx * 1.35} ry={ry * 1.7} fill={url("kD")} opacity=".7" />
            <path d={c.body} fill={PAPER} />
            <path d={c.body} fill={dark ? DK : FOR} fillOpacity={dark ? 1 : 0.85} style={pl(dark ? "D" : "B")} />
            {!dark && <path d={c.stripe} fill={PAPER} fillOpacity=".8" />}
            <path d={c.shade} fill={url(dark ? "kD" : "kh")} />
            {dark && <path d={c.body} fill={url("kd")} />}
            <path d={c.body} stroke={INK} strokeWidth="2" /><path d={c.sleeve} stroke={INK} strokeWidth="1.2" />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={PAPER} />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={MUS} fillOpacity=".55" style={pl("A")} />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={INK} strokeWidth="2" />
            {!dark && <path d={c.vent} stroke={INK} strokeWidth="1.3" />}
        </g>
    );
}
