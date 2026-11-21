import { apply, chain, cylinder, grid, m4, merge, rbox, RX, RY, RZ, S, T, tube, type Geo, type M4, type Mat, type V3 } from "./gl";
import { C, cone, curve, frac, lerp3, type Ctx } from "./kit";

type P2 = [number, number];
type Part = [Geo, M4][];
const PI = Math.PI;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const t = cl(x); return t * t * (3 - 2 * t); };
const pt = (m: M4, p: V3): V3 => apply(m, p).slice(0, 3) as V3;
const hop = (a: V3, b: V3, u: number, h: number): V3 => { const p = lerp3(a, b, u); return [p[0], p[1] + Math.sin(u * PI) * h, p[2]]; };
// shared with stations02 (same robot, same fixes): radius kept under half the thinnest side; tubes with real normals and
// outward winding (else the ink outline hull covers them)
const box = (w: number, h: number, d: number, r: number, seg = 3) => rbox(w, h, d, Math.min(r, Math.min(w, h, d) * 0.45), seg);
const ball = (r: number, seg = 12): Geo => grid((u, v) => { const a = u * PI * 2, b = (v - 0.5) * PI; return [r * Math.cos(b) * Math.cos(a), r * Math.sin(b), -r * Math.cos(b) * Math.sin(a)]; }, seg, seg >> 1);
const pipe = (pts: V3[], r: number, rs = 8): Geo => {
    const g = tube(pts, r, rs);
    for (let k = 0; k < g.p.length; k += 3) {
        const c = pts[Math.floor(k / 3 / (rs + 1))], d = [g.p[k] - c[0], g.p[k + 1] - c[1], g.p[k + 2] - c[2]], l = Math.hypot(...d) || 1;
        g.n[k] = d[0] / l; g.n[k + 1] = d[1] / l; g.n[k + 2] = d[2] / l;
    }
    // wind every triangle counter-clockwise seen from outside, whatever order tube() used
    for (let t = 0; t < g.i.length; t += 3) {
        const [a, b, c] = [g.i[t], g.i[t + 1], g.i[t + 2]].map((i) => g.p.slice(i * 3, i * 3 + 3)), n = g.n.slice(g.i[t] * 3, g.i[t] * 3 + 3);
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        if ((u[1] * w[2] - u[2] * w[1]) * n[0] + (u[2] * w[0] - u[0] * w[2]) * n[1] + (u[0] * w[1] - u[1] * w[0]) * n[2] < 0) [g.i[t + 1], g.i[t + 2]] = [g.i[t + 2], g.i[t + 1]];
    }
    return g;
};
const tris = (p: Part) => p.reduce((n, [g]) => n + g.i.length, 0);
// one mesh: `fixed` always drawn, `seq` revealed in order by u (through the renderer's frac)
const reveal = (fixed: Part, seq: Part) => { const a = tris(fixed), b = tris(seq); return { geo: merge([...fixed, ...seq]), at: (u: number) => (a + cl(u) * b) / (a + b) }; };
// a convex outline (counter-clockwise in x/y) extruded d deep along z: the shield, the visor, the dog-eared page
function prism(pts: P2[], d: number): Geo {
    const n = pts.length, c = pts.reduce((a, p) => [a[0] + p[0] / n, a[1] + p[1] / n], [0, 0]);
    const on = (u: number): P2 => { const s = u * n, i = Math.min(n - 1, Math.floor(s)), t = s - i, a = pts[i], b = pts[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
    const cap = (z: number, front: boolean) => grid((u, v) => { const p = on(u); return [c[0] + (p[0] - c[0]) * v, c[1] + (p[1] - c[1]) * v, z]; }, n * 4, 1, front);
    return merge([[grid((u, v) => [...on(u), (v - 0.5) * d] as V3, n * 4, 1), m4()], [cap(d / 2, true), m4()], [cap(-d / 2, false), m4()]]);
}
// a rod along y (0..1) stretched from a to b: the agents' rubber-hose arms and the red pen
const rod = (r: number, tip = false) => merge(tip ? [[cone(r, 0.25, 10), chain(T(0, 0.25, 0), RX(PI))], [cylinder(r, 0.75, 10), T(0, 0.625, 0)]] : [[cylinder(r, 1, 8), T(0, 0.5, 0)]]);
function span(a: V3, b: V3): M4 {
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d) || 1e-6, y = d.map((v) => v / l), h = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const x0 = [y[1] * h[2] - y[2] * h[1], y[2] * h[0] - y[0] * h[2], y[0] * h[1] - y[1] * h[0]], lx = Math.hypot(...x0), x = x0.map((v) => v / lx);
    const m = m4();
    m.set([...x, 0, ...d, 0, x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0], 0, ...a, 1]);
    return m;
}

// the chapter-02 agent robot (copied from stations02.bot): feet at the origin, facing +z; `arms` lists the sides that keep
// a resting arm (the others are animated rubber-hose arms from SHOULDER)
type Bot = { cream: Part; forest: Part; ink: Part; eye: Part; orange: Part };
const newBot = (): Bot => ({ cream: [], forest: [], ink: [], eye: [], orange: [] });
const SHOULDER = (x: number): V3 => [x * 0.066, 0.1, 0];
function worker(L: Bot, m: M4, s = 1, arms = [-1, 1]) {
    const P = (...t: M4[]) => chain(m, S(s), ...t);
    const foot = box(0.036, 0.02, 0.05, 0.008, 1), arm = box(0.024, 0.065, 0.026, 0.011, 1), eye = cylinder(0.013, 0.01, 10);
    L.ink.push([foot, P(T(-0.026, 0.01, 0))], [foot, P(T(0.026, 0.01, 0))], [cylinder(0.005, 0.05, 6), P(T(0, 0.23, 0))]);
    L.cream.push([box(0.1, 0.085, 0.08, 0.03, 2), P(T(0, 0.062, 0))], [box(0.13, 0.095, 0.1, 0.04, 2), P(T(0, 0.155, 0))]);
    arms.forEach((x) => L.cream.push([arm, P(T(x * 0.064, 0.068, 0), RZ(x * 0.25))]));
    L.forest.push([box(0.1, 0.052, 0.012, 0.02, 1), P(T(0, 0.157, 0.049))]);
    L.eye.push([eye, P(T(-0.024, 0.159, 0.056), RX(PI / 2))], [eye, P(T(0.024, 0.159, 0.056), RX(PI / 2))]);
    L.orange.push([ball(0.018, 10), P(T(0, 0.27, 0))]);
}

// Chapter 01 stations (proof until the level-up): Assessments, Handwritten grading, Amigo, PDF -> question bank.
// In each an agent robot does the work. They print as one-colour proof first, so each reads by silhouette:
// light tops and fronts, dark left sides, ink details. Each is laid out for a camera at its front-left
// (angle -0.54) and turned toward its rest key in V1 (orbit angles -0.5, 0.62, -0.7, 0.42).
export function stations01({ st, add, M, at }: Ctx) {
    const F = (k: number) => RY([-0.5, 0.62, -0.7, 0.42][k] + 0.54);
    const A = (k: number, ...m: M4[]) => at(k, F(k), ...m);
    const live = (k: number, f: () => M4[]) => { const base = A(k); return () => chain(base(), ...f()); };
    const ink = M(C.ink, { tone: 0.75 }), fine = M(C.ink, { tone: 0.8, outline: false }), paper = M(C.cream, { tone: -0.12 });
    const forest = M(C.forest), eyes = M(C.mustard, { glow: 0.35, outline: false }), orange = M(C.orange);

    // 01 Assessments: an agent types the exam on a typewriter fed by the pipeline; the sheet rises out of the platen
    // and is dealt onto the stack
    {
        const TW = T(-0.06, 0, -0.08), deck = (x: number, z: number, y = 0) => chain(TW, T(0, 0.15, 0.1), RX(0.38), T(x, y, z));
        const ST = chain(T(0.04, 0, 0.33), RY(0.12)), WB = chain(T(0.29, 0.035, 0.02), RY(-PI / 2)), L = newBot();
        const tubing = curve([[0.42, 0.03, -0.3], [0.44, 0.25, -0.3], [0.36, 0.4, -0.26], [0.16, 0.37, -0.21], [0.1, 0.27, -0.2]], 8);
        add(merge([[box(0.5, 0.1, 0.38, 0.04, 2), chain(TW, T(0, 0.09, 0))], [box(0.48, 0.14, 0.15, 0.05, 2), chain(TW, T(0, 0.19, -0.1))], [box(0.44, 0.03, 0.2, 0.012, 1), deck(0, 0)],
            [pipe(tubing, 0.028, 10), m4()], [cylinder(0.045, 0.03, 14), T(0.1, 0.27, -0.2)], [cylinder(0.05, 0.03, 14), T(0.42, 0.05, -0.3)]]), M(C.bezel), A(0));
        L.ink.push([cylinder(0.05, 0.5, 18), chain(TW, T(0, 0.27, -0.1), RZ(PI / 2))], [cylinder(0.04, 0.04, 14), chain(TW, T(0.27, 0.27, -0.1), RZ(PI / 2))],
            [cylinder(0.04, 0.04, 14), chain(TW, T(-0.27, 0.27, -0.1), RZ(PI / 2))], [pipe(curve([[-0.27, 0.3, -0.1], [-0.31, 0.36, -0.04], [-0.32, 0.37, 0.05]], 5), 0.012, 6), TW],
            [box(0.22, 0.02, 0.035, 0.01, 1), deck(0, 0.075, 0.02)], [box(0.06, 0.02, 0.03, 0.008, 1), chain(ST, T(0, 0.1, -0.11))]);
        for (let r = 0; r < 3; r++) for (let x = 0; x < 7 - (r % 2); x++) {
            const kx = -0.18 + x * 0.06 + (r % 2) * 0.03, kz = -0.065 + r * 0.05;
            L.ink.push([cylinder(0.019, 0.04, 10), deck(kx, kz, 0.025)]);
            L.cream.push([cylinder(0.013, 0.008, 10), deck(kx, kz, 0.047)]);
        }
        for (let k = 0; k < 5; k++) L.cream.push([box(0.19, 0.009, 0.24, 0.003, 1), chain(ST, T(0, 0.044 + k * 0.011, 0), RY(((k * 7) % 3 - 1) * 0.06))]);
        worker(L, WB, 1.35, []);
        add(merge(L.ink), ink, A(0));
        add(merge(L.cream), paper, A(0));
        add(merge(L.forest), forest, A(0));
        add(merge(L.eye), eyes, A(0));
        add(merge(L.orange), orange, A(0));
        // the agent's hands patter over the keys (rocking left/right) while the sheet is being typed
        const cyc = () => frac(st.T / 22), typing = () => (cyc() < 0.7 ? 1 : 0.15);
        add(merge([-1, 1].flatMap((x): Part => [[pipe([SHOULDER(x), [x * 0.05, 0.11, 0.08], [x * 0.042, 0.115, 0.15]], 0.013, 6), m4()], [ball(0.019, 10), T(x * 0.042, 0.115, 0.15)]])), paper,
            live(0, () => [WB, S(1.35), T(0, 0.1, 0), RZ(0.16 * typing() * Math.sin(st.T * 2.6)), RX(0.1 * typing() * Math.abs(Math.sin(st.T * 5.2))), T(0, -0.1, 0)]));
        // the exam: a title, answer boxes and question lines; it rises out of the platen, lifts off and lands on the stack
        const sheet = (): M4[] => {
            const c = cyc();
            if (c < 0.72) return [TW, T(0, 0.13 + 0.25 * ease(c / 0.7), -0.135), RX(-0.12)];
            const p = ease((c - 0.72) / 0.28);
            return [T(...hop([-0.06, 0.38, -0.215], [0.04, 0.1, 0.33], p, 0.12)), RY(0.12 * p), RX(-0.12 - (PI / 2 - 0.12) * p), S(1 - 0.2 * p)];
        };
        const lines: Part = [[box(0.1, 0.014, 0.004, 0.002, 1), T(-0.05, 0.12, 0.005)]];
        for (let k = 0; k < 5; k++) lines.push([box(0.024, 0.024, 0.004, 0.002, 1), T(-0.085, 0.07 - k * 0.048, 0.005)], [box(0.08 + ((k * 5) % 3) * 0.03, 0.008, 0.004, 0.002, 1), T(-0.03 + ((k * 5) % 3) * 0.015, 0.07 - k * 0.048, 0.005)]);
        add(box(0.24, 0.3, 0.008, 0.004, 1), paper, live(0, sheet));
        add(merge(lines), fine, live(0, sheet));
    }

    // 02 Handwritten grading: a camera on a tripod photographs a handwritten answer (flash!); the agent reads it
    // line by line with a red pen, then marks it with a tick
    {
        const BD = T(-0.06, 0.1, 0.15), board = (...m: M4[]) => chain(BD, RY(-0.25), RX(0.42), ...m);
        const CAM = (...m: M4[]) => chain(T(0.26, 0.37, -0.14), RY(-0.83), RX(0.56), ...m), scan = () => frac(st.T / 18);
        const RB = chain(T(0.22, 0.035, 0.27), RY(-1.26)), L = newBot();
        worker(L, RB, 1.3, [-1]);
        add(merge([[box(0.36, 0.03, 0.44, 0.015, 2), board()], [cylinder(0.05, 0.012, 18), CAM(T(0.07, 0.125, -0.035), RX(PI / 2))]]), M(C.bezel), A(1));
        L.cream.push([box(0.3, 0.008, 0.36, 0.003, 1), board(T(0, 0.019, 0.02))], [box(0.25, 0.045, 0.11, 0.015, 2), CAM(T(0, 0.055, 0))], [box(0.08, 0.04, 0.07, 0.015, 1), CAM(T(-0.04, 0.09, 0))],
            [cylinder(0.072, 0.024, 20), CAM(T(0, -0.01, 0.13), RX(PI / 2))]);
        L.ink.push(...([[0.4, -0.27], [0.12, -0.26], [0.3, 0.04]] as P2[]).map(([x, z]): [Geo, M4] => [pipe([[0.26, 0.29, -0.14], [x, 0.035, z]], 0.011, 6), m4()]),
            [cylinder(0.025, 0.08, 10), T(0.26, 0.31, -0.14)], [box(0.12, 0.035, 0.05, 0.012, 1), board(T(0, 0.02, -0.2))], [box(0.24, 0.1, 0.1, 0.02, 2), CAM(T(0, -0.015, 0))],
            [cylinder(0.058, 0.1, 18), CAM(T(0, -0.01, 0.08), RX(PI / 2))], [cylinder(0.046, 0.02, 18), CAM(T(0, -0.01, 0.145), RX(PI / 2))],
            [cylinder(0.01, 0.05, 8), CAM(T(0.07, 0.09, -0.02))], [cylinder(0.016, 0.02, 10), CAM(T(-0.09, 0.085, 0.02))]);
        add(merge(L.cream), paper, A(1));
        add(merge(L.ink), ink, A(1));
        add(merge(L.forest), forest, A(1));
        // the flash bulb fires as the photo is taken; the agent's eyes light up with it
        const flash = Object.defineProperty(M(C.mustard, { outline: false }), "glow", { get: () => (scan() < 0.06 ? 0.85 : 0.3), enumerable: true }) as Mat;
        add(merge([[ball(0.026, 12), CAM(T(0.07, 0.125, -0.005))], ...L.eye]), flash, A(1));
        add(cone(0.2, 0.36, 24), M(C.mustard, { alpha: 0.3, glow: 0.25 }), A(1, CAM(T(0, 0, 0.51), RX(-PI / 2))));
        const hw: Part = [];
        for (let r = 0; r < 4; r++) {
            const n = 16 - (r % 2) * 5, pts: V3[] = Array.from({ length: n }, (_, i) => [-0.12 + i * 0.014 + Math.cos(i * 2.1 + r) * 0.006, 0.026, -0.12 + r * 0.065 + Math.sin(i * 2.1 + r) * 0.012]);
            hw.push([pipe(pts, 0.0055, 5), board()]);
        }
        add(merge(hw), fine, A(1));
        // the tick is drawn stroke by stroke as the pen runs along it
        const tk = curve([[-0.05, 0.03, 0.03], [0, 0.03, 0.09], [0.13, 0.03, -0.08]], 6), mark = reveal(L.orange, [[pipe(tk, 0.018, 8), board()]]);
        const draw = () => cl((scan() - 0.5) / 0.3);
        add(mark.geo, orange, A(1), undefined, () => mark.at(draw()));
        const tip = (): V3 => {
            const u = scan();
            if (u < 0.45) { const v = (u / 0.45) * 4, r = Math.min(3, Math.floor(v)); return pt(board(), [-0.12 + 0.22 * (v - r), 0.05, -0.12 + r * 0.065]); }
            if (u < 0.5) return pt(board(), lerp3([0.1, 0.05, 0.075], tk[0], (u - 0.45) / 0.05));
            if (u < 0.8) { const v = draw() * (tk.length - 1), i = Math.min(tk.length - 2, Math.floor(v)); return pt(board(), lerp3(tk[i], tk[i + 1], v - i)); }
            return pt(board(), lerp3(tk[tk.length - 1], [0.17, 0.14, -0.04], ease((u - 0.8) / 0.2)));
        };
        const sh = pt(chain(RB, S(1.3)), SHOULDER(1)), up = (a: V3, k: number): V3 => [a[0] + 0.05 * k, a[1] + 0.11 * k, a[2] + 0.05 * k];
        add(rod(0.011, true), orange, live(1, () => { const a = tip(); return [span(a, up(a, 1))]; }));
        add(rod(0.02), paper, live(1, () => [span(sh, up(tip(), 0.6))]));
    }

    // 03 Amigo: a friendly companion agent chats with a student (it waves, a speech bubble types, a voice wave plays),
    // the child-safety shield on its arm
    {
        const R = (...m: M4[]) => chain(T(0.04, 0, -0.08), RY(-0.3), ...m), K = (x: number, y: number, z: number) => T(0.33 + x, y, 0.2 + z);
        const visor: P2[] = Array.from({ length: 16 }, (_, i) => { const a = -PI / 2 + (i % 8) * (PI / 7) + (i < 8 ? 0 : PI); return [(i < 8 ? 0.06 : -0.06) + 0.065 * Math.cos(a), 0.065 * Math.sin(a)]; });
        const crest: P2[] = [[-0.1, 0.12], [-0.1, 0.02], [-0.06, -0.06], [0, -0.11], [0.06, -0.06], [0.1, 0.02], [0.1, 0.12]], SH = R(T(-0.19, 0.19, 0.14), RY(-0.2), S(0.85));
        add(merge([
            [cylinder(0.12, 0.05, 24), R(T(0, 0.06, 0))], [box(0.22, 0.17, 0.17, 0.07, 2), R(T(0, 0.17, 0))], [box(0.32, 0.22, 0.24, 0.09, 3), R(T(0, 0.37, 0))],
            [pipe([[-0.11, 0.2, 0], [-0.17, 0.17, 0.06], [-0.17, 0.17, 0.1]], 0.025, 8), R()],
            [box(0.09, 0.1, 0.07, 0.03, 2), K(0, 0.12, 0)], [ball(0.05, 14), K(0, 0.22, 0)],
            [box(0.19, 0.12, 0.06, 0.03, 2), T(0.3, 0.5, 0.1)], [box(0.045, 0.045, 0.045, 0.01, 1), chain(T(0.22, 0.445, 0.1), RZ(PI / 4))],
        ]), paper, A(2));
        add(merge([
            [pipe(curve([[-0.04, 0.335, 0.138], [0, 0.322, 0.14], [0.04, 0.335, 0.138]], 5), 0.008, 6), R()], [pipe([[0, 0.48, 0], [0.01, 0.53, 0], [0.04, 0.57, 0]], 0.009, 6), R()],
            [ball(0.054, 14), chain(K(0, 0.235, -0.008), S(1, 0.75, 1))], [cylinder(0.016, 0.05, 8), K(-0.022, 0.06, 0)], [cylinder(0.016, 0.05, 8), K(0.022, 0.06, 0)],
        ]), ink, A(2));
        add(merge([[prism(crest, 0.03), SH], [prism(crest.map(([x, y]) => [x * 0.55, y * 0.55 + 0.01] as P2), 0.012), chain(SH, T(0, 0, 0.018))], [prism(visor, 0.03), R(T(0, 0.37, 0.12))]]), forest, A(2));
        add(merge([[cylinder(0.025, 0.012, 14), T(-0.055, 0, 0)], [cylinder(0.025, 0.012, 14), T(0.055, 0, 0)]]), eyes, live(2, () => [R(T(0, 0.38, 0.14), RX(PI / 2), S(1, 1, frac(st.T / 15) > 0.93 ? 0.15 : 1))]));
        add(merge([0, 1, 2].map((k): [Geo, M4] => [cylinder(0.014, 0.01, 10), chain(T(0.255 + k * 0.045, 0.5, 0.132), RX(PI / 2))])), fine, A(2), undefined, () => Math.floor(frac(st.T / 8) * 4) / 3);
        const wave = reveal([[ball(0.03, 12), R(T(0.04, 0.58, 0))], [cylinder(0.05, 0.03, 18), R(T(-0.17, 0.37, 0), RZ(PI / 2))], [cylinder(0.05, 0.03, 18), R(T(0.17, 0.37, 0), RZ(PI / 2))], [box(0.07, 0.08, 0.04, 0.02, 1), K(0, 0.13, -0.05)]],
            Array.from({ length: 9 }, (_, k): [Geo, M4] => { const h = 0.03 + 0.15 * Math.abs(Math.sin(k * 1.3 + 0.4)) * Math.sin(((k + 1) / 10) * PI); return [box(0.024, h, 0.024, 0.01, 1), T(-0.2 + k * 0.04, 0.035 + h / 2, 0.3 - k * 0.012)]; }));
        add(wave.geo, M(C.mustard), A(2), undefined, () => wave.at(ease(frac(st.T / 12) * 1.6)));
        // the free arm waves hello to the student
        const sh = pt(R(), [0.1, 0.22, 0.02]);
        add(rod(0.024), paper, live(2, () => { const a = 0.75 + 0.5 * Math.sin(st.T * 0.7); return [span(sh, pt(R(), [0.1 + 0.14 * Math.cos(a), 0.22 + 0.14 * Math.sin(a), 0.06]))]; }));
    }

    // 04 PDF -> question bank: an agent takes question cards off a dog-eared PDF and files them, one by one,
    // into the open drawer of a card catalogue
    {
        const CB = (...m: M4[]) => chain(T(0.17, 0, -0.1), ...m), L = newBot(), RB = chain(T(-0.12, 0.035, 0.12), RY(0.6));
        const page: P2[] = [[-0.11, -0.15], [0.11, -0.15], [0.11, 0.1], [0.06, 0.15], [-0.11, 0.15]];
        const PG = (...m: M4[]) => chain(T(0.0, 0.16, 0.34), RY(-0.3), RX(-0.3), S(0.82), ...m);
        const tray: Part = [[box(0.17, 0.012, 0.24, 0.004, 1), T(0, -0.04, 0)], [box(0.012, 0.07, 0.24, 0.004, 1), T(-0.08, 0, 0)], [box(0.012, 0.07, 0.24, 0.004, 1), T(0.08, 0, 0)], [box(0.17, 0.07, 0.012, 0.004, 1), T(0, 0, -0.115)]];
        worker(L, RB, 1.35, [-1]);
        add(merge([
            [box(0.42, 0.34, 0.34, 0.03, 2), CB(T(0, 0.255, 0))], [box(0.46, 0.03, 0.38, 0.014, 1), CB(T(0, 0.435, 0))],
            ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): [Geo, M4] => [cylinder(0.022, 0.06, 10), CB(T(sx * 0.17, 0.065, sz * 0.13))])),
            ...tray.map(([g, m]): [Geo, M4] => [g, CB(T(-0.1, 0.36, 0.25), m)]),
            [prism([[0.06, 0.15], [0.06, 0.1], [0.11, 0.1]], 0.012), PG(T(0, 0, 0.012))],
        ]), M(C.bezel), A(3));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) if (r || c) L.cream.push([box(0.18, 0.092, 0.02, 0.009, 1), CB(T(-0.1 + c * 0.2, 0.36 - r * 0.105, 0.175))]);
        L.cream.push([box(0.18, 0.092, 0.02, 0.009, 1), CB(T(-0.1, 0.36, 0.375))], [prism(page, 0.01), PG()], [prism(page, 0.01), PG(T(0.025, 0.012, -0.03), RZ(-0.05))]);
        for (let k = 0; k < 6; k++) L.cream.push([box(0.15, 0.09, 0.006, 0.003, 1), CB(T(-0.1, 0.375, 0.17 + k * 0.03), RX(-0.12))]);
        add(merge(L.cream), paper, A(3));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) L.ink.push([box(0.06, 0.016, 0.02, 0.008, 1), CB(T(-0.1 + c * 0.2, 0.345 - r * 0.105, r || c ? 0.19 : 0.39))], [box(0.06, 0.026, 0.004, 0.002, 1), CB(T(-0.1 + c * 0.2, 0.378 - r * 0.105, r || c ? 0.186 : 0.386))]);
        for (let k = 0; k < 6; k++) L.ink.push([box(0.06 + (k % 3) * 0.025, 0.008, 0.004, 0.002, 1), PG(T(-0.06 + (k % 3) * 0.012, 0.05 - k * 0.032, 0.006))]);
        add(merge(L.ink), fine, A(3));
        L.orange.push([box(0.08, 0.035, 0.006, 0.003, 1), PG(T(-0.05, 0.11, 0.008))], ...[0, 2, 4].map((k): [Geo, M4] => [box(0.04, 0.025, 0.007, 0.003, 1), CB(T(-0.14 + (k % 4) * 0.035, 0.43, 0.17 + k * 0.03), RX(-0.12))]));
        add(merge(L.orange), orange, A(3));
        add(merge(L.forest), forest, A(3));
        add(merge(L.eye), eyes, A(3));
        // the agent's arm carries a card from the PDF up into the drawer, lets it drop in, and reaches back for the next
        const grab = pt(PG(), [0.04, 0.13, 0.02]), drop = pt(CB(), [-0.1, 0.47, 0.25]), low: V3 = [drop[0], drop[1] - 0.07, drop[2]], sh = pt(chain(RB, S(1.35)), SHOULDER(1));
        const fu = () => frac(st.T / 16);
        const hand = (): V3 => {
            const u = fu();
            if (u < 0.1) return grab;
            if (u < 0.6) return hop(grab, drop, ease((u - 0.1) / 0.5), 0.12);
            if (u < 0.75) return lerp3(drop, low, ease((u - 0.6) / 0.15));
            return hop(low, grab, ease((u - 0.75) / 0.25), 0.06);
        };
        add(rod(0.022), paper, live(3, () => [span(sh, hand())]));
        add(box(0.13, 0.08, 0.006, 0.003, 1), M(C.cream, { tone: -0.15 }), live(3, () => { const h = hand(); return [T(h[0], h[1] - 0.045, h[2]), RY(0.2 * (1 - ease(fu() / 0.6))), RX(-0.12)]; }), () => fu() < 0.72);
    }
}
