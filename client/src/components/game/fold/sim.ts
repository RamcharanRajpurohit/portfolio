// Fold press: the sheet is a 160 x 112 grid of cells, one amount (a) and one wetness (w) per cell per ink.
// A fold mirrors every cell across the crease; where the two halves of the sheet touch, wet ink on either side
// prints onto the other (lighter, a little feathered), the pressed ink gives some of its wetness up, and all
// wet ink dries a little with each fold. Kept apart from the UI so the levels can be solved in a browser.

export const W = 160, H = 112, N = W * H, STEP = 8, INKED = 0.3;
export type Pt = [number, number];
export type Poly = Pt[];
/** k: 0 vertical x = c, 1 horizontal y = c, 2 diagonal x - y = c, 3 diagonal x + y = c */
export type Line = { k: number; c: number };
export type Ink = { p: Poly[]; c?: number; dry?: boolean; w?: number; clip?: Poly[] };
export type Level = { t: Poly[][]; ink: Ink[]; par: number; zones?: Poly[]; hint?: string; sol: Line[] };
export type State = { a: Float32Array[]; w: Float32Array[] };

const COPY = 0.9, COPY_WET = 0.55, PRESS = 0.7, DRY = 0.85;

// the crease's valid range: it must leave both halves of the sheet some paper to touch
const RANGE = [[STEP, W - STEP], [STEP, H - STEP], [STEP - H, W - STEP], [STEP, W + H - STEP]];
export const clampLine = (l: Line): Line => ({ k: l.k, c: Math.max(RANGE[l.k][0], Math.min(RANGE[l.k][1], Math.round(l.c / STEP) * STEP)) });
export const lines = () => RANGE.flatMap(([lo, hi], k) => Array.from({ length: (hi - lo) / STEP + 1 }, (_, i) => ({ k, c: lo + i * STEP })));

/** cell index -> index of the cell it touches when folded, or -1 (off the sheet) */
export function mirror({ k, c }: Line) {
    const m = new Int32Array(N);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const x = k === 0 ? 2 * c - 1 - i : k === 1 ? i : k === 2 ? j + c : c - j - 1, y = k === 0 ? j : k === 1 ? 2 * c - 1 - j : k === 2 ? i - c : c - i - 1;
        m[j * W + i] = x >= 0 && x < W && y >= 0 && y < H ? y * W + x : -1;
    }
    return m;
}

// 1-2-1 blur in place (the feathered edge of a transfer)
function blur(f: Float32Array, t: Float32Array) {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = j * W + i; t[p] = (2 * f[p] + (i ? f[p - 1] : 0) + (i < W - 1 ? f[p + 1] : 0)) / 4; }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = j * W + i; f[p] = (2 * t[p] + (j ? t[p - W] : 0) + (j < H - 1 ? t[p + W] : 0)) / 4; }
}

export function fold(s: State, l: Line) {
    const m = mirror(l), t = new Float32Array(N), tw = new Float32Array(N), tmp = new Float32Array(N);
    s.a.forEach((a, c) => {
        const w = s.w[c];
        t.fill(0); tw.fill(0);
        for (let p = 0; p < N; p++) { const q = m[p]; if (q >= 0 && a[q] * w[q] > 0) { t[p] = a[q] * w[q] * COPY; tw[p] = t[p] * w[q] * COPY_WET; } }
        blur(t, tmp); blur(tw, tmp);
        for (let p = 0; p < N; p++) {
            if (m[p] >= 0) w[p] *= PRESS;
            if (t[p] > 1e-4) { const na = a[p] + t[p]; w[p] = (a[p] * w[p] + tw[p]) / na; a[p] = Math.min(1, na); }
            w[p] *= DRY;
        }
    });
}

/** fill polygons into a 160 x 112 coverage grid (0..1) */
export function raster(ps: Poly[], clip?: Poly[]) {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d", { willReadFrequently: true })!, path = (q: Poly[]) => { g.beginPath(); for (const p of q) p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); };
    if (clip) { path(clip); g.clip(); }
    path(ps); g.fill();
    const d = g.getImageData(0, 0, W, H).data, r = new Float32Array(N);
    for (let p = 0; p < N; p++) r[p] = d[p * 4 + 3] / 255;
    return r;
}

export function start(lv: Level): State {
    const s: State = { a: lv.t.map(() => new Float32Array(N)), w: lv.t.map(() => new Float32Array(N)) };
    for (const k of lv.ink) {
        const r = raster(k.p, k.clip), a = s.a[k.c ?? 0], w = s.w[k.c ?? 0], wet = k.dry ? 0 : k.w ?? 1;
        for (let p = 0; p < N; p++) if (r[p] > 0) { a[p] = Math.min(1, a[p] + r[p]); w[p] = wet; }
    }
    return s;
}

export type Masks = { t: Uint8Array[]; z: Int16Array; nz: number };
export function masks(lv: Level): Masks {
    const z = new Int16Array(N).fill(-1);
    (lv.zones ?? []).forEach((q, i) => raster([q]).forEach((v, p) => { if (v > 0.5) z[p] = i; }));
    return { t: lv.t.map((q) => Uint8Array.from(raster(q), (v) => +(v > 0.5))), z, nz: lv.zones?.length ?? 0 };
}

/** match %: mean IoU of each ink with its target, less 10 for each do-not-print zone that took ink */
export function score(s: State, m: Masks) {
    let sum = 0;
    const hit = new Uint16Array(m.nz);
    m.t.forEach((t, c) => {
        const a = s.a[c];
        let i = 0, u = 0;
        for (let p = 0; p < N; p++) { const k = a[p] >= INKED; if (k && t[p]) i++; if (k || t[p]) u++; if (k && m.z[p] >= 0) hit[m.z[p]]++; }
        sum += u ? i / u : 1;
    });
    const spoiled = Array.from(hit, (h) => h > 3);
    return { match: Math.max(0, Math.round((100 * sum) / m.t.length) - 10 * spoiled.filter(Boolean).length), spoiled };
}

// ---- shapes (polygons in sheet units) ----
const TAU = Math.PI * 2;
const loop = (n: number, f: (t: number) => Pt): Poly => Array.from({ length: n }, (_, k) => f((k / n) * TAU));
const circle = (x: number, y: number, r: number) => loop(40, (t) => [x + r * Math.cos(t), y + r * Math.sin(t)]);
const ellipse = (x: number, y: number, rx: number, ry: number, a = 0) =>
    loop(44, (t) => { const u = rx * Math.cos(t), v = ry * Math.sin(t); return [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)]; });
const rect = (x0: number, y0: number, x1: number, y1: number): Poly => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// s = half width
const heart = (x: number, y: number, s: number) =>
    loop(72, (t) => [x + s * Math.sin(t) ** 3, y - (s / 16) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5)]);
// Chaikin corner cutting: hand-placed points become a soft outline
function soft(p: Poly, n = 3): Poly {
    for (; n > 0; n--) p = p.flatMap(([x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return [[0.75 * x + 0.25 * u, 0.75 * y + 0.25 * v], [0.25 * x + 0.75 * u, 0.25 * y + 0.75 * v]] as Pt[]; });
    return p;
}
// right half (x >= 0, top to bottom) -> whole outline, mirrored about x = 0
const sym = (r: Pt[]): Poly => [...r, ...r.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Pt)];
const place = (p: Poly, x: number, y: number, s = 1, a = 0): Poly => p.map(([u, v]) => [x + s * (u * Math.cos(a) - v * Math.sin(a)), y + s * (u * Math.sin(a) + v * Math.cos(a))]);
const pine = (x: number, y: number, s: number) =>
    place(sym([[0, 0], [9, 13], [5, 13], [13, 26], [8, 26], [17, 40], [3, 40], [3, 48], [0, 48]]), x, y, s);
const bird = soft(sym([[0, -37], [3, -34], [5, -28], [5, -20], [16, -23], [30, -27], [45, -28], [54, -25], [47, -19], [39, -14], [29, -9], [17, -3], [8, 4], [7, 12], [15, 28], [9, 31], [4, 27], [0, 31]]), 2);
// half-plane clips
const left = (x: number) => [rect(-1, -1, x, H + 1)], right = (x: number) => [rect(x, -1, W + 1, H + 1)], above = (y: number) => [rect(-1, -1, W + 1, y)];

// "c": a ring open on the right
const cee = (x: number, y: number, R: number, r: number, gap: number): Poly => {
    const arc = (rad: number, a0: number, a1: number) => Array.from({ length: 33 }, (_, k) => { const t = a0 + ((a1 - a0) * k) / 32; return [x + rad * Math.cos(t), y + rad * Math.sin(t)] as Pt; });
    return [...arc(R, gap, TAU - gap), ...arc(r, TAU - gap, gap)];
};
const flower = (x: number, y: number) => [circle(x, y, 10), ...[0, 1, 2, 3].map((k) => ellipse(x + 23 * Math.cos((k * TAU) / 4), y + 23 * Math.sin((k * TAU) / 4), 16, 11, (k * TAU) / 4))];

// ---- levels ----
const V = (c: number): Line => ({ k: 0, c }), Hz = (c: number): Line => ({ k: 1, c }), D2 = (c: number): Line => ({ k: 3, c });

const lvHeart = [heart(80, 58, 34)];
const lvTree = [pine(56, 12, 1.9), circle(136, 24, 10)];
const lvBird = [place(bird, 80, 56, 0.95, Math.PI / 4)];
const lvTwo = [heart(40, 56, 26), heart(120, 56, 26)];
const lvFlower = flower(88, 56);
const lvR = [rect(34, 35, 44, 77), soft([[40, 52], [46, 40], [56, 35], [68, 35], [68, 45], [58, 44], [50, 48], [44, 58]], 2)];
const lvDot = circle(130, 70, 7);
const lvForest = [20, 60, 100, 140].map((x) => pine(x, 28, 1.1));
const wings = [ellipse(57, 40, 23, 16, -0.45), ellipse(62, 75, 16, 12, 0.5)];
const wingsR = wings.map((p) => p.map(([x, y]) => [160 - x, y] as Pt));
const spotsR = [circle(104, 37, 6), circle(98, 76, 4.5)];
const body = [ellipse(80, 58, 4.5, 26), circle(80, 30, 5)];
// robot (crease x = 48) with a dry antenna, and a sun in the corner (crease x - y = 104)
const robot = { head: soft(rect(30, 16, 66, 42), 1), l: [rect(44, 41, 52, 47), rect(26, 46, 70, 80)], arm: rect(72, 48, 80, 74), leg: rect(54, 82, 64, 102) };
const robotAll = [robot.head, ...robot.l, robot.arm, rect(16, 48, 24, 74), robot.leg, rect(32, 82, 42, 102)];
const antenna = [rect(34, 7, 38, 17), circle(36, 7, 4)];
const sun = [circle(128, 24, 11), ...Array.from({ length: 8 }, (_, k) => place([[-3.5, -15], [0, -24], [3.5, -15]], 128, 24, 1, (k * TAU) / 8))];
const eyes = [circle(40, 28, 4.5), circle(56, 28, 4.5)], chest = heart(48, 63, 9);

export const LEVELS: Level[] = [
    { t: [lvHeart], ink: [{ p: lvHeart, clip: left(80) }], par: 1, sol: [V(80)], hint: "Drag a line to fold the paper" },
    { t: [lvTree], ink: [{ p: [lvTree[0]], clip: right(56) }, { p: [lvTree[1]] }], par: 1, sol: [V(56)], hint: "Match the shape" },
    { t: [lvBird], ink: [{ p: lvBird, clip: [[[136, -1], [W + 1, -1], [W + 1, H + 1], [24, H + 1]]] }], par: 1, sol: [D2(136)] },
    { t: [lvTwo], ink: [{ p: lvTwo, clip: [...left(40), rect(96, -1, 120, H + 1)] }], par: 1, sol: [V(80)] },
    { t: [lvFlower], ink: [{ p: [lvFlower[0], lvFlower[3], lvFlower[4]] }], par: 1, sol: [D2(144)] },
    { t: [[...lvR, cee(94, 56, 21, 11, 0.7), lvDot]], ink: [{ p: lvR, dry: true }, { p: [lvDot], dry: true }, { p: [cee(94, 56, 21, 11, 0.7)], clip: above(56) }], par: 1, sol: [Hz(56)] },
    { t: [lvForest], ink: [{ p: [lvForest[0]] }], par: 2, sol: [V(40), V(80)] },
    { t: [body.concat(spotsR, spotsR.map((p) => p.map(([x, y]) => [160 - x, y] as Pt))), wings.concat(wingsR)], ink: [{ p: wings, c: 1, clip: left(80) }, { p: body }, { p: spotsR }], par: 1, sol: [V(80)] },
    {
        t: [[heart(40, 56, 24), pine(104, 22, 1.35)]], ink: [{ p: [heart(40, 56, 24)], clip: left(40) }, { p: [pine(104, 22, 1.35)], clip: right(104) }],
        zones: [rect(136, 24, 160, 88)], par: 2, sol: [V(104), V(40)],
    },
    {
        t: [[...robotAll, ...antenna], [...eyes, chest, ...sun]],
        ink: [{ p: [robot.head, ...robot.l], clip: left(48) }, { p: [robot.arm, robot.leg] }, { p: antenna, dry: true },
            { p: [eyes[1]], c: 1 }, { p: [chest], c: 1, clip: left(48) }, { p: sun, c: 1, clip: [[[-1, -1], [103, -1], [W + 1, 57], [W + 1, H + 1], [-1, H + 1]]] }],
        zones: [rect(56, 0, 72, 12)], par: 2, sol: [V(48), { k: 2, c: 104 }],
    },
];
