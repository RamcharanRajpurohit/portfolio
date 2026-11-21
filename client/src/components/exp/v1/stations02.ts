import { apply, chain, cylinder, grid, hex, merge, rbox, RX, RY, RZ, S, T, tube, type Geo, type M4, type Mat, type V3 } from "./gl";
import { C, cone, curve, frac, lerp3, type Ctx } from "./kit";

type Part = [Geo, M4][];
const PI = Math.PI;
const m0 = () => T(0, 0, 0);
// rbox with its corner radius kept under half the thinnest side (a larger one collapses the box)
const box = (w: number, h: number, d: number, r: number, seg = 3) => rbox(w, h, d, Math.min(r, Math.min(w, h, d) * 0.45), seg);
// a flat card facing +z (2 triangles) for printed lines, text and UI on a surface
const flat = (w: number, h: number): Geo => grid((u, v) => [(u - 0.5) * w, (v - 0.5) * h, 0], 1, 1);
// gl.ts tube() leaves its normals at zero (v±e rounds to the same path point); rebuild them radially
const pipe = (pts: V3[], r: number, rs = 8): Geo => {
    const g = tube(pts, r, rs);
    for (let k = 0; k < g.p.length; k += 3) {
        const c = pts[Math.floor(k / 3 / (rs + 1))], d = [g.p[k] - c[0], g.p[k + 1] - c[1], g.p[k + 2] - c[2]], l = Math.hypot(...d) || 1;
        g.n[k] = d[0] / l; g.n[k + 1] = d[1] / l; g.n[k + 2] = d[2] / l;
    }
    return g;
};
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ball = (r: number, seg = 12): Geo => grid((u, v) => { const a = u * PI * 2, b = (v - 0.5) * PI; return [r * Math.cos(b) * Math.cos(a), r * Math.sin(b), -r * Math.cos(b) * Math.sin(a)]; }, seg, seg >> 1);
const tick = (s: number): Geo => pipe([[-0.03 * s, 0.004 * s, 0], [-0.008 * s, -0.018 * s, 0], [0.032 * s, 0.03 * s, 0]], 0.009 * s, 6);
const gem = (r: number): Geo => merge([[cone(r, r * 1.3, 4), m0()], [cone(r, r * 1.3, 4), RX(PI)]]);
const tris = (p: Part) => p.reduce((n, [g]) => n + g.i.length, 0);
// one mesh: `fixed` always drawn, `seq` revealed in order by u (through the renderer's frac)
const reveal = (fixed: Part, seq: Part) => { const a = tris(fixed), b = tris(seq); return { geo: merge([...fixed, ...seq]), at: (u: number) => (a + cl(u) * b) / (a + b) }; };
const hop = (a: V3, b: V3, u: number, h: number): V3 => { const p = lerp3(a, b, u); return [p[0], p[1] + Math.sin(u * PI) * h, p[2]]; };
const pt = (m: M4, p: V3): V3 => { const q = apply(m, p); return [q[0], q[1], q[2]]; };
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// a matrix taking the unit segment (0,0,0)-(0,1,0) onto a-b, x and z kept unit length: arms and pointers that reach
function link(a: V3, b: V3): M4 {
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d) || 1, y: V3 = [d[0] / l, d[1] / l, d[2] / l];
    const c = (p: V3, q: V3): V3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const x0 = c(Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], y), xl = Math.hypot(...x0), x: V3 = [x0[0] / xl, x0[1] / xl, x0[2] / xl], z = c(x, y);
    const m = T(...a);
    m[0] = x[0]; m[1] = x[1]; m[2] = x[2]; m[4] = d[0]; m[5] = d[1]; m[6] = d[2]; m[8] = z[0]; m[9] = z[1]; m[10] = z[2];
    return m;
}
const ARM = merge([[box(0.024, 1, 0.026, 0.008, 1), T(0, 0.5, 0)]]);

// the robot (agents in the team, workers at every other station): feet at the origin, facing +z, its parts go to
// the shared colour lists; `sides` are the arms drawn hanging (the others are animated meshes reaching from shoulder())
type Bot = { cream: Part; forest: Part; ink: Part; eye: Part; orange: Part };
const crew = (): Bot => ({ cream: [], forest: [], ink: [], eye: [], orange: [] });
function bot(L: Bot, m: M4, s = 1, seg = 2, sides = [-1, 1]) {
    const P = (...t: M4[]) => chain(m, S(s), ...t);
    const foot = box(0.036, 0.02, 0.05, 0.008, 1), arm = box(0.024, 0.065, 0.026, 0.011, 1), eye = cylinder(0.013, 0.01, 8);
    L.ink.push([foot, P(T(-0.026, 0.01, 0))], [foot, P(T(0.026, 0.01, 0))], [cylinder(0.005, 0.05, 6), P(T(0, 0.23, 0))]);
    L.cream.push([box(0.1, 0.085, 0.08, 0.03, seg), P(T(0, 0.062, 0))], [box(0.13, 0.095, 0.1, 0.04, seg), P(T(0, 0.155, 0))]);
    sides.forEach((sd) => L.cream.push([arm, P(T(sd * 0.064, 0.068, 0), RZ(sd * 0.25))]));
    L.forest.push([box(0.1, 0.052, 0.014, 0.007, 1), P(T(0, 0.157, 0.049))]);
    L.eye.push([eye, P(T(-0.024, 0.159, 0.056), RX(PI / 2))], [eye, P(T(0.024, 0.159, 0.056), RX(PI / 2))]);
    L.orange.push([ball(0.018, 8), P(T(0, 0.27, 0))]);
}
const shoulder = (m: M4, s: number, side: number) => pt(chain(m, S(s)), [side * 0.064, 0.095, 0]);

// Chapter 02 stations (printed): Homework, PupilRevise, Agent team, Playwright testing, Parallel accounts.
// Robots do the work at each one. Each is laid out in a frame turned toward its rest camera (the orbit angles of
// V1's rest keys for stations 4..8): x = screen right, +z = toward the camera.
export function stations02({ st, add, M, at }: Ctx) {
    const F = (k: number) => RY([-0.45, 0.72, -0.25, 0.55, -0.4][k - 4]);
    const A = (k: number, ...m: M4[]) => at(k, F(k), ...m);
    const D = (k: number, f: () => M4) => { const b = at(k, F(k)); return () => chain(b(), f()); };

    // 05 Homework: a robot on a stool marks the worksheet with a pencil, row by row (one answer gets a cross);
    // another robot holds up a phone and the photo flies into the import tray
    {
        const bf = chain(T(0.05, 0.035, -0.2), RX(-0.32)), B = (...t: M4[]) => chain(bf, ...t), W = crew();
        const rows = [0.375, 0.29, 0.205, 0.12], mk = chain(T(0.36, 0.135, -0.06), RY(-1.1)), im = chain(T(0.1, 0.035, 0.22), RY(0.25));
        const phone = chain(im, T(0.1, 0.15, 0.03), RZ(-0.15));
        bot(W, mk, 0.8, 1, [1]); bot(W, im, 0.8, 1, [-1]);
        W.cream.push([ARM, link(shoulder(im, 0.8, 1), pt(phone, [0, -0.05, 0]))]);
        add(merge([[box(0.44, 0.56, 0.03, 0.025, 2), B(T(0, 0.28, 0))], [box(0.22, 0.03, 0.16, 0.012, 2), chain(T(0.33, 0.05, 0.2), RY(0.2))], [box(0.07, 0.12, 0.014, 0.006, 2), phone]]), M(C.bezel), A(4));
        add(merge([[box(0.36, 0.47, 0.01, 0.008, 1), B(T(0, 0.265, 0.02))], [box(0.17, 0.008, 0.12, 0.004, 1), chain(T(0.33, 0.07, 0.2), RY(0.3))],
            [cone(0.022, 0.03, 3), chain(phone, T(-0.006, -0.032, 0.012), S(1, 1, 0.1))], ...W.cream]), M(C.cream), A(4));
        const ink: Part = [[box(0.15, 0.05, 0.04, 0.016, 2), B(T(0, 0.52, 0.025))], [pipe([[0, 0.43, -0.366], [0, 0.035, -0.45]], 0.012, 6), T(0.05, 0, 0)],
            [box(0.056, 0.095, 0.006, 0.003, 1), chain(phone, T(0, 0.004, 0.008))], ...W.ink];
        rows.forEach((y) => ink.push([flat(0.2, 0.014), B(T(-0.04, y + 0.012, 0.027))], [flat(0.13, 0.012), B(T(-0.075, y - 0.018, 0.027))]));
        add(merge(ink), M(C.ink, { tone: 0.8, outline: false }), A(4));
        add(merge([[flat(0.26, 0.03), B(T(0, 0.45, 0.027))], [ball(0.01, 8), chain(phone, T(0.012, 0.028, 0.012))], ...W.eye]), M(C.mustard, { outline: false }), A(4));
        add(merge([[cylinder(0.055, 0.1, 18), T(0.36, 0.085, -0.06)], ...W.forest]), M(C.forest), A(4));
        const cross = merge([[pipe([[-0.026, 0.026, 0], [0.026, -0.026, 0]], 0.009, 6), m0()], [pipe([[-0.026, -0.026, 0], [0.026, 0.026, 0]], 0.009, 6), m0()]]);
        const mark = reveal([[box(0.04, 0.012, 0.03, 0.004, 1), chain(T(0.39, 0.08, 0.17), RY(0.3))], ...W.orange], rows.map((y, k): [Geo, M4] => [k === 2 ? cross : tick(1.1), B(T(0.125, y, 0.042))]));
        const u = () => cl((st.T - 326) / 44);
        add(mark.geo, M(C.orange, { outline: false, glow: 0.15 }), A(4), undefined, () => mark.at(u()));
        // the marking robot's pencil follows the stroke it is drawing; its arm reaches from the shoulder to the pencil
        const pen = () => {
            const v = u() * 4, r = Math.min(3, Math.floor(v)), p = u() >= 1 ? 1 : v - r;
            return chain(bf, T(0.095 + 0.062 * p, rows[r] - 0.015 + 0.04 * Math.abs(p - 0.35), 0.04), RX(0.55), RZ(-0.45));
        };
        add(merge([[cylinder(0.02, 0.24, 10), T(0, 0.17, 0)], [cone(0.02, 0.05, 10), chain(T(0, 0.05, 0), RX(PI))], [cylinder(0.021, 0.04, 10), T(0, 0.3, 0)]]), M(C.mustard), D(4, pen));
        const sh = shoulder(mk, 0.8, -1);
        add(ARM, M(C.cream), D(4, () => link(sh, pt(pen(), [0, 0.2, 0]))));
        const from = pt(phone, [0, 0, 0.02]);
        add(box(0.09, 0.006, 0.07, 0.004, 1), M(C.cream, { tone: 0.15 }), D(4, () => {
            const v = frac(st.T / 16 + 0.5);
            return chain(T(...hop(from, [0.33, 0.09, 0.2], v, 0.14)), RY(v * 1.4), RX((1 - v) * 1.2));
        }));
    }

    // 06 PupilRevise: a teacher points out the lessons taught on a shelf of books (they get flagged), a robot writes
    // the fold-out cheat sheet line by line with a long reaching arm and deals question cards onto a fan
    {
        const hs = [0.2, 0.24, 0.18, 0.22, 0.2, 0.17], bk = (i: number): [Geo, M4] => [box(0.045, hs[i], 0.17, 0.008, 1), T(-0.24 + i * 0.052, 0.035 + hs[i] / 2, -0.08)];
        const cards = [0, 1, 2].map((k) => chain(T(0.2 + k * 0.085, 0.035, 0.2 + (k === 1 ? 0.03 : 0)), RY(0.35 - k * 0.35), RX(-0.18)));
        const W = crew(), wr = chain(T(0.44, 0.095, -0.04), RY(-1.1)), te = chain(T(-0.04, 0.035, 0.15), RY(0.3));
        bot(W, wr, 0.85, 1, [1]);
        add(merge([bk(0), bk(1), bk(4), [box(0.3, 0.03, 0.06, 0.012, 1), T(0.28, 0.05, 0.18)], [cylinder(0.05, 0.06, 16), T(0.44, 0.065, -0.04)],
            [cone(0.05, 0.15, 14), te], [box(0.024, 0.07, 0.026, 0.01, 1), chain(te, T(0.045, 0.095, 0), RZ(0.3))], ...W.forest]), M(C.forest), A(5));
        // the fold-out sheet: three panels in a shallow U
        const a = 0.45, pc = 0.08, panels: M4[] = [
            chain(T(0.15 - pc * Math.cos(a), 0.22, -0.22 + pc * Math.sin(a)), RY(a)), T(0.23, 0.22, -0.22),
            chain(T(0.31 + pc * Math.cos(a), 0.22, -0.22 + pc * Math.sin(a)), RY(-a))];
        add(merge([bk(2), bk(5), ...panels.map((m): [Geo, M4] => [flat(0.12, 0.035), chain(m, T(0, 0.135, 0.006))]), ...W.eye]), M(C.mustard), A(5));
        add(merge([bk(3), ...panels.map((m): [Geo, M4] => [box(0.16, 0.36, 0.008, 0.005, 1), m]), ...cards.map((m): [Geo, M4] => [box(0.1, 0.13, 0.006, 0.006, 1), chain(m, T(0, 0.08, 0))]),
            [ball(0.032, 12), chain(te, T(0, 0.175, 0))], ...W.cream]), M(C.cream), A(5));
        const lines: Part = [], ys = [0.08, 0.04, 0, -0.04, -0.08, -0.12];
        panels.forEach((m) => ys.forEach((y, j) => lines.push([flat(j % 2 ? 0.09 : 0.12, 0.012), chain(m, T(j % 2 ? -0.015 : 0, y, 0.006))])));
        const ink = reveal([[box(0.02, 0.2, 0.17, 0.006, 1), T(-0.28, 0.135, -0.08)], [box(0.02, 0.17, 0.17, 0.006, 1), T(0.06, 0.12, -0.08)],
            [ball(0.034, 12), chain(te, T(0, 0.185, -0.01), S(1, 0.85, 1))], [ball(0.017, 8), chain(te, T(0, 0.215, -0.03))], ...W.ink,
            ...cards.flatMap((m): Part => [[flat(0.06, 0.008), chain(m, T(0, 0.06, 0.005))], [flat(0.045, 0.008), chain(m, T(-0.007, 0.04, 0.005))]])], lines);
        const w = () => cl((st.T - 385) / 26), fu = () => (st.T - 380) / 18, picked = [0, 1, 3];
        add(ink.geo, M(C.ink, { tone: 0.8, outline: false }), A(5), undefined, () => ink.at(w()));
        const flags = reveal([[ball(0.03, 12), T(0.02, 0.235, -0.1)], [cylinder(0.004, 0.025, 6), T(0.02, 0.27, -0.1)], ...W.orange,
            ...cards.map((m): [Geo, M4] => [cylinder(0.022, 0.006, 12), chain(m, T(0, 0.11, 0.006), RX(PI / 2))])],
            picked.map((i): [Geo, M4] => [box(0.03, 0.06, 0.005, 0.003, 1), T(-0.24 + i * 0.052, 0.035 + hs[i] + 0.02, -0.01)]));
        add(flags.geo, M(C.orange), A(5), undefined, () => flags.at(fu()));
        // the teacher's pointer taps the book being picked
        const tsh = pt(te, [-0.045, 0.13, 0]);
        add(merge([[box(0.026, 0.4, 0.028, 0.01, 1), T(0, 0.2, 0)], [box(0.008, 0.6, 0.008, 0.003, 1), T(0, 0.7, 0)]]), M(C.forest), D(5, () => {
            const i = picked[Math.min(2, Math.max(0, Math.floor(fu() * 3)))];
            return link(tsh, [-0.24 + i * 0.052, 0.035 + hs[i] + 0.03 + 0.02 * Math.abs(Math.sin(st.T * 1.5)), -0.02]);
        }));
        // the robot's arm writes along the current line
        const wsh = shoulder(wr, 0.85, -1);
        add(ARM, M(C.cream), D(5, () => {
            const v = w() * 18, i = Math.min(17, Math.floor(v));
            return link(wsh, pt(panels[Math.floor(i / 6)], [0.045 * Math.sin(v * PI) - 0.02, ys[i % 6], 0.012]));
        }));
        const deal = pt(chain(wr, S(0.85)), [0.08, 0.07, 0.05]);
        add(box(0.1, 0.13, 0.006, 0.006, 1), M(C.mustard), D(5, () => {
            const v = frac(st.T / 15);
            return chain(T(...hop(deal, [0.3, 0.12, 0.26], v, 0.14)), RY(v * PI * 2), RX(-0.2));
        }));
    }

    // 07 Agent team: six specialist robots on posts, wired to the reviewer on its plinth; glowing work slips
    // hop to the reviewer (who sometimes sends one back), then on to the browser tester, whose screen ticks
    {
        const L = crew(), mustard: Part = [], wires: Part = [];
        const R: V3 = [0.12, 0, -0.08], RH = 0.13;
        const bots: [V3, number][] = [[[-0.08, 0, -0.34], 0.1], [[0.34, 0, -0.36], 0.1], [[0.44, 0, -0.1], 0.15], [[-0.12, 0, 0.1], 0.04], [[0.12, 0, 0.27], 0.04]]; // flutter, backend, ai, scout, tester
        L.forest.push([cylinder(0.09, RH, 28), T(R[0], 0.035 + RH / 2, R[2])]);
        bot(L, T(R[0], 0.035 + RH, R[2]), 1.4);
        bots.forEach(([p, h], k) => {
            L.forest.push([cylinder(0.06, h, 22), T(p[0], 0.035 + h / 2, p[2])]);
            const m = chain(T(p[0], 0.035 + h, p[2]), RY(k === 4 ? 0.6 : 0));
            bot(L, m);
            wires.push([pipe(curve([[p[0], 0.045, p[2]], lerp3([p[0], 0.06, p[2]], [R[0], 0.06, R[2]], 0.5), [R[0], 0.045, R[2]]], 4), 0.008, 5), m0()]);
            if (k === 0) { L.cream.push([box(0.05, 0.085, 0.012, 0.005, 1), chain(m, T(0.09, 0.09, 0.035), RZ(-0.2))]); L.forest.push([box(0.038, 0.062, 0.006, 0.003, 1), chain(m, T(0.09, 0.09, 0.043), RZ(-0.2))]); }
            if (k === 1) { [0.045, 0.07].forEach((y) => L.ink.push([flat(0.07, 0.008), chain(m, T(0, y, 0.042))])); L.orange.push([ball(0.008, 8), chain(m, T(0.03, 0.09, 0.042))]); }
            if (k === 2) mustard.push([gem(0.03), chain(m, T(0, 0.33, 0))]);
            if (k === 3) { mustard.push([merge([[cylinder(0.011, 0.1, 10), T(0, 0.05, 0)], [cylinder(0.018, 0.06, 12), T(0, 0.12, 0)]]), chain(m, T(-0.07, 0.165, 0.05), RZ(0.5), RX(-0.8))]); L.ink.push([cylinder(0.004, 0.3, 6), chain(m, T(0.085, 0.15, -0.02))]); L.orange.push([box(0.07, 0.045, 0.004, 0.002, 1), chain(m, T(0.12, 0.275, -0.02))]); }
        });
        // the browser the tester proves changes in
        const bw = chain(T(0.36, 0.035, 0.18), RY(-0.35)), win = chain(bw, T(0, 0.15, 0));
        L.cream.push([box(0.25, 0.18, 0.022, 0.01, 2), win], [flat(0.18, 0.016), chain(win, T(0.01, 0.035, 0.019))], [flat(0.08, 0.05), chain(win, T(-0.05, -0.03, 0.019))]);
        L.forest.push([box(0.22, 0.125, 0.008, 0.004, 1), chain(win, T(0, -0.012, 0.012))]);
        L.ink.push([box(0.03, 0.07, 0.03, 0.008, 1), chain(bw, T(0, 0.035, -0.01))], [box(0.12, 0.012, 0.08, 0.006, 1), chain(bw, T(0, 0.006, 0))]);
        [-0.105, -0.085, -0.065].forEach((x, i) => (i === 0 ? L.orange : mustard).push([ball(0.006, 8), chain(win, T(x, 0.078, 0.012))]));
        wires.push([pipe(curve([[R[0], 0.045, R[2]], [0.26, 0.06, 0.14], [0.36, 0.045, 0.18]], 4), 0.008, 5), m0()]);
        add(merge(L.forest), M(C.forest), A(6));
        add(merge(L.cream), M(C.cream), A(6));
        add(merge(L.ink), M(C.ink, { tone: 0.8, outline: false }), A(6));
        add(merge(L.orange), M(C.orange), A(6));
        add(merge([...mustard, ...L.eye]), M(C.mustard, { glow: 0.12 }), A(6));
        add(merge(wires), M(C.brown, { tone: 0.5, outline: false }), A(6));
        // work slips: agent hand -> reviewer; the Flutter slip comes back (in orange) every third round
        const top: V3 = [R[0], 0.035 + RH + 0.36, R[2] + 0.03], slip = box(0.075, 0.01, 0.055, 0.004, 1), cyc = 16;
        bots.slice(0, 3).forEach(([p, h], k) => {
            const from: V3 = [p[0], 0.035 + h + 0.2, p[2] + 0.04], ph = () => st.T / cyc + k * 0.33;
            const back = () => k === 0 && Math.floor(ph()) % 3 === 0;
            const mat = Object.defineProperty(M(C.cream, { glow: 0.3 }), "print", { get: () => hex(back() ? C.orange : C.cream), enumerable: true }) as Mat;
            add(slip, mat, D(6, () => { const v = frac(ph()) / 0.7; return chain(T(...hop(back() ? top : from, back() ? from : top, v, 0.12)), RY(v * 2)); }), () => frac(ph()) < 0.7);
        });
        const tst: V3 = [0.14, 0.3, 0.3], tp = () => frac(st.T / cyc + 0.6);
        add(slip, M(C.cream, { glow: 0.3 }), D(6, () => { const v = tp() / 0.6; return chain(T(...hop(top, tst, v, 0.1)), RY(v * 2)); }), () => tp() < 0.6);
        add(tick(2.2), M(C.orange, { glow: 0.2, outline: false }), A(6, win, T(0.02, -0.01, 0.022)), undefined, () => (tp() - 0.6) / 0.15);
        // the reviewer's magnifier sweeps over the incoming work
        add(merge([[pipe(Array.from({ length: 17 }, (_, i) => [0.045 * Math.cos((i / 16) * PI * 2), 0.045 * Math.sin((i / 16) * PI * 2), 0] as V3), 0.009, 6), m0()],
            [cylinder(0.011, 0.09, 8), T(0, -0.09, 0)]]), M(C.mustard, { outline: false }), D(6, () => chain(T(R[0] + 0.12, 0.035 + RH + 0.15, R[2] + 0.08), RZ(0.35 * Math.sin(st.T * 0.25)), T(0, 0.06, 0))));
    }

    // 08 Playwright testing: a robot tester beside the phone, the tablet and the desktop taps through the screens;
    // a tick pops over each device as its tester finishes the journey
    {
        const W = crew(), cream: Part = [], forest: Part = [], ink: Part = [], mustard: Part = [];
        const desk = T(0.1, 0.035, -0.3), tab = chain(T(0.4, 0.035, -0.04), RY(-0.35)), pho = chain(T(-0.1, 0.035, -0.1), RY(0.15));
        const sm = [chain(pho, T(0, 0.11, 0), RX(-0.12), T(0, 0.004, 0.009)), chain(tab, T(0, 0.14, 0), RX(-0.2), T(0, 0.004, 0.011)), chain(desk, T(0, 0.275, 0.016))]; // phone, tablet, desktop
        const dims: [number, number, number][] = [[0.068, 0.12, 1], [0.145, 0.195, 2], [0.34, 0.21, 3]];
        sm.forEach((m, k) => {
            const [w, h, cols] = dims[k];
            forest.push([box(w, h, 0.008, 0.004, 1), m]);
            cream.push([flat(w * 0.85, h * 0.1), chain(m, T(0, h * 0.36, 0.006))]);
            for (let c = 0; c < cols; c++) cream.push([flat((w * 0.85) / cols - 0.01, h * 0.42), chain(m, T(-w * 0.425 + ((w * 0.85) / cols) * (c + 0.5), h * 0.02, 0.006))]);
            mustard.push([flat(w * 0.3, h * 0.1), chain(m, T(w * 0.25, -h * 0.34, 0.006))]);
        });
        cream.push([box(0.38, 0.26, 0.03, 0.014, 2), chain(desk, T(0, 0.27, 0))], [box(0.17, 0.23, 0.02, 0.01, 2), chain(tab, T(0, 0.14, 0), RX(-0.2))], [box(0.085, 0.155, 0.016, 0.008, 2), chain(pho, T(0, 0.11, 0), RX(-0.12))]);
        ink.push([box(0.04, 0.1, 0.03, 0.01, 1), chain(desk, T(0, 0.09, -0.01))], [box(0.15, 0.016, 0.09, 0.008, 1), chain(desk, T(0, 0.008, 0))],
            [box(0.12, 0.016, 0.07, 0.006, 1), chain(tab, T(0, 0.008, 0.01))], [box(0.07, 0.03, 0.05, 0.008, 1), chain(pho, T(0, 0.015, 0.005))]);
        const testers: [M4, number][] = [[chain(T(0.04, 0.035, 0.04), RY(-0.8)), -1], [chain(T(0.24, 0.035, 0.13), RY(0.9)), 1], [chain(T(0.3, 0.095, -0.12), RY(-1.0)), -1]];
        testers.forEach(([m, sd]) => bot(W, m, 0.75, 1, [-sd]));
        forest.push([cylinder(0.05, 0.06, 16), T(0.3, 0.065, -0.12)]);
        add(merge([...cream, ...W.cream]), M(C.cream), A(7));
        add(merge([...forest, ...W.forest]), M(C.forest), A(7));
        add(merge([...ink, ...W.ink]), M(C.ink, { tone: 0.8 }), A(7));
        add(merge([...mustard, ...W.eye]), M(C.mustard, { outline: false }), A(7));
        // each tester's arm taps from spot to spot on its screen
        const spots: [number, number][] = [[-0.28, 0], [0, 0.05], [0.28, 0], [0.25, -0.34]];
        testers.forEach(([m, sd], k) => {
            const sh = shoulder(m, 0.75, sd), [w, h] = dims[k];
            add(ARM, M(C.cream), D(7, () => {
                const ph = st.T * 0.35 + k * 1.3, [sx, sy] = spots[((Math.floor(ph) % 4) + 4) % 4];
                return link(sh, pt(sm[k], [sx * w, sy * h, 0.008 + 0.035 * Math.sin(frac(ph) * PI)]));
            }));
        });
        const prog = (k: number) => cl((st.T - 458 - k * 2) / (28 + k * 8 + (k === 2 ? 2 : 0)));
        const ticks = reveal(W.orange, [[tick(2), chain(pho, T(0, 0.26, 0))], [tick(2.2), chain(tab, T(0, 0.33, 0))], [tick(2.6), chain(desk, T(0, 0.48, 0))]]);
        add(ticks.geo, M(C.orange, { glow: 0.15, outline: false }), A(7), undefined, () => ticks.at([0, 1, 2].filter((k) => prog(k) >= 1).length / 3));
    }

    // 09 Parallel accounts: a robot types at each of three terminals at once, wired to one shared chest of agents
    // and skills; finished parcels hop to the chest and on to the ship
    {
        const W = crew(), cream: Part = [], forest: Part = [], ink: Part = [], text: Part = [], orange: Part = [], arms: Part = [];
        const hub = T(0.22, 0.035, -0.26), boat = T(0.37, 0.035, 0.02);
        const terms = [chain(T(-0.12, 0.035, -0.24), RY(0.3)), chain(T(-0.02, 0.035, 0.12), RY(0.1)), chain(T(0.2, 0.035, 0.3), RY(-0.1))];
        const chest: Part = [[box(0.26, 0.2, 0.2, 0.03, 2), chain(hub, T(0, 0.1, 0))], [box(0.06, 0.05, 0.045, 0.012, 1), chain(boat, T(0.03, 0.04, 0.0))], [box(0.05, 0.04, 0.04, 0.01, 1), chain(boat, T(-0.02, 0.038, -0.01), RY(0.5))]];
        [-0.06, 0.06].forEach((x) => [0.06, 0.14].forEach((y) => { cream.push([box(0.1, 0.065, 0.01, 0.005, 1), chain(hub, T(x, y, 0.1))]); ink.push([box(0.035, 0.01, 0.012, 0.004, 1), chain(hub, T(x, y, 0.108))]); }));
        [-0.075, 0, 0.075].forEach((x, i) => {
            const m = chain(hub, T(x, 0.22 + (i === 1 ? 0.02 : 0), 0), RY(-x * 3));
            cream.push([box(0.06, 0.05, 0.055, 0.02, 1), m]); forest.push([box(0.048, 0.022, 0.006, 0.003, 1), chain(m, T(0, 0, 0.028))]);
            ink.push([cylinder(0.004, 0.04, 6), chain(m, T(0, 0.045, 0))]); orange.push([ball(0.012, 8), chain(m, T(0, 0.068, 0))]);
        });
        terms.forEach((m) => {
            cream.push([box(0.15, 0.12, 0.12, 0.03, 1), chain(m, T(0, 0.095, 0))], [box(0.13, 0.015, 0.05, 0.006, 1), chain(m, T(0, 0.01, 0.088))], [box(0.08, 0.03, 0.06, 0.01, 1), chain(m, T(0, 0.02, -0.01))]);
            forest.push([box(0.115, 0.08, 0.01, 0.005, 1), chain(m, T(0, 0.1, 0.059))]);
            ink.push([pipe(curve([[m[12], 0.042, m[14]], [(m[12] + 0.22) / 2, 0.05, (m[14] - 0.26) / 2], [0.22, 0.042, -0.26]], 4), 0.008, 5), m0()]);
            // the typist stands at the keyboard's right, both hands on the keys
            const r = chain(m, T(0.1, 0, 0.1), RY(-1.3)), s1 = shoulder(r, 0.75, -1), s2 = shoulder(r, 0.75, 1), k1 = pt(m, [0.015, 0.02, 0.095]), k2 = pt(m, [0.05, 0.02, 0.08]);
            bot(W, r, 0.75, 1, []);
            const swap = dist(s1, k1) + dist(s2, k2) > dist(s1, k2) + dist(s2, k1);
            arms.push([ARM, link(s1, swap ? k2 : k1)], [ARM, link(s2, swap ? k1 : k2)]);
        });
        [0.08, 0.05, 0.07, 0.035].forEach((w, l) => terms.forEach((m) => text.push([flat(w, 0.009), chain(m, T(-0.045 + w / 2, 0.122 - l * 0.016, 0.066))])));
        // the ship: hull, mast, a flat sail and a pennant on a pond
        const sail = (flip: boolean) => grid((u, v) => [u * 0.11 * (1 - v), v * 0.13, 0], 1, 4, flip);
        forest.push([cylinder(0.12, 0.008, 28), chain(boat, T(0, 0.004, 0))]);
        orange.push([box(0.2, 0.05, 0.09, 0.025, 2), chain(boat, T(0, 0.035, 0))], [box(0.06, 0.04, 0.07, 0.02, 1), chain(boat, T(0.1, 0.045, 0), RY(PI / 4), S(1, 1, 0.6))],
            [box(0.055, 0.028, 0.005, 0.002, 1), chain(boat, T(-0.07, 0.215, 0))]);
        ink.push([cylinder(0.006, 0.18, 6), chain(boat, T(-0.04, 0.14, 0))]);
        cream.push([sail(false), chain(boat, T(-0.032, 0.075, 0))], [sail(true), chain(boat, T(-0.032, 0.075, 0))]);
        add(merge([...cream, ...W.cream]), M(C.cream), A(8));
        add(merge([...forest, ...W.forest]), M(C.forest), A(8));
        add(merge([...ink, ...W.ink]), M(C.ink, { tone: 0.8, outline: false }), A(8));
        add(merge([...orange, ...W.orange]), M(C.orange), A(8));
        const typed = reveal([...chest, ...W.eye], text);
        add(typed.geo, M(C.mustard, { glow: 0.12 }), A(8), undefined, () => typed.at(frac(st.T / 10) * 1.3));
        add(merge(arms), M(C.cream), D(8, () => T(0, 0.007 * Math.abs(Math.sin(st.T * 2.2)), 0)));
        [0, 1].forEach((k) => {
            const from = pt(terms[k], [0, 0.2, 0]), mid: V3 = [0.22, 0.33, -0.26], dock: V3 = [0.37, 0.11, 0.02], ph = () => frac(st.T / 18 + k / 2);
            add(box(0.05, 0.04, 0.04, 0.01, 1), M(C.bezel, { tone: 0.2 }), D(8, () => {
                const v = ph();
                return chain(T(...(v < 0.5 ? hop(from, mid, v * 2, 0.12) : hop(mid, dock, (v - 0.5) * 2, 0.16))), RY(v * 3));
            }), () => ph() < 0.97);
        });
    }
}
