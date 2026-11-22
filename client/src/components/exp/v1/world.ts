import { apply, chain, cylinder, grid, hex, m4, merge, rbox, RX, RY, RZ, S, T, tube, type Geo, type M4, type Mat, type V3 } from "./gl";
import { BLOT, C, cone, curve, frac, STATIONS, type Ctx } from "./kit";
import type { Silk } from "./labels";

const TAU = Math.PI * 2;
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const out3 = (t: number) => 1 - (1 - t) ** 3;
const spring = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-6 * t)); // overshoots, settles
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// a prism along y whose radius follows rf(u) (pleated rosettes, stars), capped like cylinder()
const prism = (rf: (u: number) => number, h: number, n: number): Geo => merge([
    [grid((u, v) => { const r = rf(u); return [r * Math.cos(u * TAU), (v - 0.5) * h, -r * Math.sin(u * TAU)]; }, n, 1), m4()],
    [grid((u, v) => { const r = rf(u) * Math.max(0.002, v); return [r * Math.cos(u * TAU), h / 2, r * Math.sin(u * TAU)]; }, n, 1), m4()],
    [grid((u, v) => { const r = rf(u) * Math.max(0.002, v); return [r * Math.cos(u * TAU), -h / 2, -r * Math.sin(u * TAU)]; }, n, 1), m4()],
]);
// a plain box (12 triangles, flat faces): for the hundreds of small parts
const box = (w: number, h: number, d: number): Geo => merge(([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as V3[]).map((n) => {
    const a: V3 = n[1] ? [1, 0, 0] : [0, 1, 0], b: V3 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]], e: V3 = [w / 2, h / 2, d / 2];
    return [grid((u, v) => [0, 1, 2].map((i) => (n[i] + (u * 2 - 1) * a[i] + (v * 2 - 1) * b[i]) * e[i]) as V3, 1, 1), m4()];
}));
// a tube with radial normals (gl's tube() steps between its points, so its finite-difference normals come out zero)
const pipe = (pts: V3[], r: number, rs: number): Geo => {
    const g = tube(pts, r, rs);
    for (let k = 0; k < g.n.length; k++) g.n[k] = (g.p[k] - pts[Math.floor(k / 3 / (rs + 1))][k % 3]) / r;
    return g;
};
// a flat ribbon cable along a path in a plane of constant z: an elliptic tube, wide in z
const ribbon = (pts: V3[], w: number, th: number): Geo => grid((u, v) => {
    const n = pts.length - 1, i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i, o = pts[i], q = pts[i + 1];
    const tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty) || 1, a = v * TAU, x = o[0] + tx * f, y = o[1] + ty * f;
    return [x - (ty / l) * Math.sin(a) * th, y + (tx / l) * Math.sin(a) * th, o[2] + (Math.cos(a) * w) / 2];
}, pts.length - 1, 10);
// a copper coil: a torus wound with wire (the windings print as hatching along v)
const coil = (R: number, r: number): Geo => grid((u, v) => {
    const a = v * TAU, b = u * TAU, rr = r * (1 + 0.1 * Math.abs(Math.sin(a * 30))), x = R + rr * Math.cos(b);
    return [x * Math.cos(a), rr * Math.sin(b), -x * Math.sin(a)];
}, 10, 180, true);

// The world: the board and its depth (giant capacitor towers and a copper coil sweeping past on the right,
// ribbon cables arching overhead, a heat-sink city and a huge chip on the horizon, swarms of tiny parts),
// the level-up joy (see joy()), and the line (graphite pencil up to the blot, ink after it).
export function world(ctx: Ctx) {
    const { st, add, M, at, fixed } = ctx, still = fixed(m4());
    // the board everything stands on
    add(rbox(7.4, 0.05, 22, 0.02), M(C.board, { tone: 0.1, dot: hex("#1b3a2c") }), fixed(T(0.1, -0.025, -7.4)));
    // ground pours: big copper areas under the green solder mask either side of the path, printed as diagonal hatching
    for (const [x0, x1] of [[-3.5, -1.15], [1.95, 3.75]]) {
        const pour = grid((u, v) => [x0 + u * (x1 - x0), 0.0015, 3.4 - v * 21.4], 1, 1);
        for (let k = 0; k < pour.p.length; k += 3) pour.uv[(k / 3) * 2 + 1] = pour.p[k] - pour.p[k + 2]; // stripes run at 45°
        add(pour, M(C.board, { tone: 0.1, dot: hex("#1b3a2c"), hatch: 9, outline: false }), still, () => st.T > st.lv + 30); // printed boards only
    }
    const plinth = cylinder(0.52, 0.035, 40);
    STATIONS.forEach((_, k) => add(plinth, M(C.cream, { tone: 0.05 }), at(k, T(0, 0.018, 0))));
    // each plinth is a part on the board: a silkscreen outline around it (stays put when the plinth hops)
    const ring = grid((u, v) => { const r = 0.58 + v * 0.014; return [r * Math.cos(u * TAU), 0.004, r * Math.sin(u * TAU)]; }, 64, 1); // wound to face up
    STATIONS.forEach(([x, , z]) => add(ring, M(C.cream, { tone: 0.6, outline: false }), fixed(T(x, 0, z))));
    // a status LED on the board beside each plinth: dark until you reach the station, lit from then on
    const led = rbox(0.06, 0.05, 0.06, 0.026), bezel = cylinder(0.045, 0.02, 16);
    const pool = merge([0.1, 0.17, 0.26].map((r, i) => [cylinder(r, 0.001, 28), T(0, 0.0035 - i * 0.0005, 0)] as [Geo, M4]));
    STATIONS.forEach((_, k) => {
        const lit = () => st.T > st.stops[k] - 12, flash = () => Math.max(0, 1 - (st.T - st.stops[k] + 12) / 10);
        add(bezel, M(C.ink, { tone: 0.6 }), at(k, T(0.44, 0.01, 0.44)));
        // its light on the board: three stacked translucent discs fake a soft falloff
        add(pool, Object.defineProperty(M(C.orange, { outline: false, tone: 0, glow: 0.3 }), "alpha", { get: () => (lit() ? 0.1 + 0.15 * flash() : 0) }), at(k, T(0.44, 0, 0.44)));
        add(led, Object.defineProperties(M(C.orange, { tone: 0.1, outline: false }), { print: { get: () => hex(lit() ? C.orange : C.brown) }, glow: { get: () => (lit() ? 0.7 + 0.8 * flash() : 0) } }), at(k, T(0.44, 0.035, 0.44)));
    });
    // silkscreen: part designators printed beside the parts, part numbers on the chip tops (drawn in labels.ts)
    const silk: Silk = [], count: Record<string, number> = {};
    const tag = (p: string, x: number, y: number, z: number, w = 0.2) => silk.push([x, y, z, `${p}${(count[p] = (count[p] ?? 0) + 1)}`, w]);
    STATIONS.forEach(([x, , z]) => tag("J", x + 0.66, 0.004, z - 0.12, 0.22));

    // static parts, merged per material
    const ink: [Geo, M4][] = [], forest: [Geo, M4][] = [], mustard: [Geo, M4][] = [], cream: [Geo, M4][] = [], sand: [Geo, M4][] = [], gold: [Geo, M4][] = [], cable: [Geo, M4][] = [], orange: [Geo, M4][] = [];
    const clear = (x: number, z: number, m: number) => STATIONS.every(([sx, , sz]) => Math.hypot(x - sx, z - sz) > 0.52 + m) && Math.abs(x + 0.3) > 0.16 + m && Math.hypot(x - BLOT[0], z - BLOT[2]) > 0.5 + m;

    // printed traces: a bus running the length of the board on the right, with 45° jogs, and short stubs
    const tr = box(1, 0.004, 0.016), pad = cylinder(0.02, 0.005, 12);
    for (let b = 0; b < 5; b++) {
        const x0 = 1.15 + b * 0.07;
        for (let z = 3.2; z > -17.6; z -= 0.4) {
            const xa = x0 + jog(z), xb = x0 + jog(z - 0.4), len = Math.hypot(xb - xa, 0.4);
            gold.push([tr, chain(T((xa + xb) / 2, 0.003, z - 0.2), RY(Math.PI / 2 + Math.atan2(xb - xa, 0.4)), S(len + 0.016, 1, 1))]);
        }
    }
    // short stubs, each ending in a round solder pad
    for (let k = 0; k < 40; k++) {
        const x = 2.0 + ((k * 7) % 5) * 0.14, z = 1.5 - k * 0.48, l = 0.4 + ((k * 13) % 5) * 0.12;
        gold.push([tr, chain(T(x, 0.003, z), S(l, 1, 1))], [pad, T(x - l / 2, 0.003, z)], [pad, T(x + l / 2, 0.003, z)]);
    }
    for (let k = 0; k < 24; k++) {
        const x = -0.95 - ((k * 5) % 3) * 0.1, z = 1.2 - k * 0.7, l = 0.3 + ((k * 11) % 4) * 0.1;
        gold.push([tr, chain(T(x, 0.003, z), RY(Math.PI / 2), S(l, 1, 1))], [pad, T(x, 0.003, z - l / 2)], [pad, T(x, 0.003, z + l / 2)]);
    }
    // vias: a copper ring with a drilled hole
    const via = cylinder(0.022, 0.006, 10), hole = cylinder(0.009, 0.008, 8);
    for (let k = 0; k < 140; k++) { const x = -3.2 + rnd() * 6.8, z = 3.2 - rnd() * 20.6; if (clear(x, z, 0.05)) { gold.push([via, T(x, 0.003, z)]); ink.push([hole, T(x, 0.003, z)]); } }

    // tiny parts in little rows (resistors, SMD caps, small ICs): the far detail that makes the board vast
    const band = cylinder(0.0195, 0.008, 6), cap = box(0.012, 0.032, 0.037);
    const res = cylinder(0.018, 0.09, 6), smd = box(0.06, 0.03, 0.035), ic = box(0.16, 0.04, 0.11), pin = box(0.012, 0.03, 0.03);
    for (let c = 0; c < 90; c++) {
        const x = -3.3 + rnd() * 7.0, z = 3.3 - rnd() * 21.2, along = rnd() < 0.5, kind = rnd(), n = 2 + Math.floor(rnd() * 5);
        if (!clear(x, z, 0.25)) continue;
        if (c % 3 === 0) tag(kind < 0.45 ? "R" : kind < 0.8 ? "C" : "U", x - (along ? 0.16 : 0), 0.004, z + (along ? 0 : 0.1));
        for (let k = 0; k < n; k++) {
            const px = x + (along ? 0 : k * 0.11), pz = z - (along ? k * 0.11 : 0);
            const o = chain(T(px, 0.02, pz), RY(along ? 0 : Math.PI / 2), RZ(Math.PI / 2));
            if (kind < 0.45) { // a resistor with its colour code
                sand.push([res, o]);
                [orange, forest, ink, mustard].forEach((l, b) => l.push([band, chain(o, T(0, b < 3 ? -0.026 + b * 0.014 : 0.028, 0))]));
            } else if (kind < 0.8) { // an SMD capacitor with metal end caps
                const q = chain(T(px, 0.015, pz), RY(along ? 0 : Math.PI / 2));
                cream.push([smd, q]);
                gold.push([cap, chain(q, T(0.025, 0, 0))], [cap, chain(q, T(-0.025, 0, 0))]);
            }
            else if (k < 3) {
                ink.push([ic, chain(T(px, 0.024, pz), RY(along ? Math.PI / 2 : 0))]);
                for (let p = -1; p <= 1; p++) for (const sd of [-1, 1]) ink.push([pin, chain(T(px, 0.012, pz), RY(along ? Math.PI / 2 : 0), T(p * 0.05, 0, sd * 0.065))]);
            }
        }
    }

    // giant electrolytic capacitors: towers sweeping past the camera on the right, a few on the left for the dive
    const towers: [number, number, number, number, string][] = [
        [2.65, -1.45, 0.45, 3.2, C.forest], [3.1, -2.6, 0.3, 1.4, C.mustard], [2.15, -4.1, 0.55, 3.6, C.mustard], [2.8, -5.5, 0.28, 1.1, C.forest],
        [2.75, -8.6, 0.48, 3.0, C.forest], [2.7, -11.55, 0.45, 3.4, C.mustard], [3.2, -12.5, 0.26, 1.2, C.forest], [2.75, -13.45, 0.45, 2.8, C.forest],
        [1.9, -15.0, 0.4, 2.2, C.mustard], [-2.3, -2.6, 0.45, 2.8, C.mustard], [-2.4, -8.0, 0.5, 3.2, C.forest], [-2.5, -13.0, 0.4, 2.2, C.mustard],
        [3.3, -6.6, 0.22, 0.8, C.mustard], [-3.0, -5.9, 0.24, 0.9, C.forest], [-1.6, -15.2, 0.3, 1.4, C.forest],
    ];
    for (const [x, z, r, h, col] of towers) {
        tag("C", x, 0.004, z + r + 0.14, 0.24);
        (col === C.forest ? forest : mustard).push([cylinder(r, h, 36), T(x, h / 2, z)]);
        ink.push([cylinder(r * 1.015, 0.05, 36), T(x, h - 0.2, z)]); // the crimp groove
        ink.push([cylinder(r * 0.97, 0.05, 36), T(x, 0.02, z)]); // the rubber seal it stands on
        ink.push([box(r * 1.4, 0.02, 0.05), T(x, h + 0.01, z)], [box(0.05, 0.02, r * 1.4), T(x, h + 0.01, z)]);
        // the polarity sleeve stripe, turned toward the path
        const a0 = x > 0 ? 3.69 : -0.55;
        cream.push([grid((u, v) => { const a = a0 - 0.28 + u * 0.56; return [(r + 0.004) * Math.cos(a), (v - 0.5) * (h - 0.35), -(r + 0.004) * Math.sin(a)]; }, 6, 1), T(x, (h - 0.35) / 2, z)]);
    }
    // brass standoffs with screw heads along the board's edges
    for (const [x, z] of [[3.45, 1.4], [3.45, -4.4], [3.45, -10.8], [3.45, -16.6], [-3.3, -0.4], [-3.3, -6.8], [-3.3, -13.6]] as const) {
        mustard.push([cylinder(0.13, 0.75, 6), T(x, 0.375, z)], [cylinder(0.19, 0.08, 20), T(x, 0.79, z)]);
        ink.push([box(0.3, 0.03, 0.04), chain(T(x, 0.835, z), RY(0.6))]);
    }
    // big chips (mid-size landmarks) and the huge one on the horizon
    const leg = box(0.04, 0.08, 0.1), lpad = box(0.06, 0.004, 0.13);
    const chip = (x: number, z: number, w: number, d: number, h: number, legs: number, quad = false) => {
        ink.push([rbox(w, h, d, 0.03), T(x, 0.03 + h / 2, z)]);
        tag("U", x - w / 2 + 0.12, 0.004, z + d / 2 + 0.2, 0.24);
        tag("RC0", x + w * 0.08, 0.032 + h, z, Math.min(w, d) * 0.6);
        cream.push([cylinder(Math.min(w, d) * 0.07, 0.01, 16), T(x - w * 0.36, 0.03 + h, z + d * 0.3)]);
        for (let k = 0; k < legs; k++) {
            const t = -0.44 + (k / (legs - 1)) * 0.88;
            ink.push([leg, T(x + t * w, 0.04, z + d / 2 + 0.03)], [leg, T(x + t * w, 0.04, z - d / 2 - 0.03)]);
            gold.push([lpad, T(x + t * w, 0.002, z + d / 2 + 0.04)], [lpad, T(x + t * w, 0.002, z - d / 2 - 0.04)]); // soldered to pads
            // fan-out: each pad runs a trace out to a via, staggered so the vias don't touch
            for (const sd of [1, -1]) {
                const l = 0.1 + (k % 3) * 0.07, z0 = z + sd * (d / 2 + 0.1);
                gold.push([tr, chain(T(x + t * w, 0.003, z0 + (sd * l) / 2), RY(Math.PI / 2), S(l, 1, 1))], [via, T(x + t * w, 0.003, z0 + sd * l)]);
                ink.push([hole, T(x + t * w, 0.003, z0 + sd * l)]);
            }
            if (quad) {
                ink.push([leg, chain(T(x + w / 2 + 0.03, 0.04, z + t * d), RY(Math.PI / 2))], [leg, chain(T(x - w / 2 - 0.03, 0.04, z + t * d), RY(Math.PI / 2))]);
                gold.push([lpad, chain(T(x + w / 2 + 0.04, 0.002, z + t * d), RY(Math.PI / 2))], [lpad, chain(T(x - w / 2 - 0.04, 0.002, z + t * d), RY(Math.PI / 2))]);
            }
        }
    };
    // a cooling fan on the small CPU by the path: it turns as you travel
    const fan = (x: number, z: number, s: number, y: number) => {
        const bar = box(s, 0.05, 0.06), side = box(0.06, 0.05, s), place = T(x, y, z);
        ink.push([bar, chain(place, T(0, 0, (s - 0.06) / 2))], [bar, chain(place, T(0, 0, -(s - 0.06) / 2))], [side, chain(place, T((s - 0.06) / 2, 0, 0))], [side, chain(place, T(-(s - 0.06) / 2, 0, 0))]);
        const blades = merge(Array.from({ length: 7 }, (_, k) => [box(s * 0.36, 0.006, s * 0.15), chain(RY((k * TAU) / 7), T(s * 0.24, 0, 0), RX(0.4))] as [Geo, M4]));
        add(blades, M(C.cream, { tone: 0.05 }), () => chain(place, RY(-st.T * 0.35)));
        add(cylinder(s * 0.13, 0.03, 20), M(C.orange), () => chain(place, T(0, 0.01, 0), RY(-st.T * 0.35)));
        // its power lead: two wires from a frame corner down to a header on the board
        const c: V3 = [x + s / 2 - 0.03, y, z + s / 2 - 0.03], hx = x + s / 2 + 0.22, hz = z + s / 2 + 0.12;
        ([[orange, 0], [ink, 0.016]] as const).forEach(([l, o]) => l.push([pipe(curve([[c[0], c[1], c[2] + o], [c[0] + 0.09, c[1] + 0.03, c[2] + 0.05 + o], [hx - 0.05, 0.07, hz + o], [hx, 0.05, hz + o]], 8), 0.008, 6), m4()]));
        ink.push([box(0.07, 0.05, 0.08), T(hx + 0.02, 0.025, hz + 0.008)]);
    };
    fan(-1.7, -9.4, 0.46, 0.17);
    chip(-1.9, -0.9, 1.1, 0.62, 0.2, 9); chip(-2.15, -5.1, 1.3, 0.75, 0.24, 11); chip(-2.15, -11.9, 1.3, 0.75, 0.24, 11); chip(2.9, -7.2, 0.7, 0.7, 0.12, 6, true); chip(-1.7, -9.4, 0.5, 0.5, 0.1, 5, true);
    chip(0.5, -17.5, 2.4, 1.2, 0.26, 16);
    sand.push([box(1.4, 0.012, 0.6), T(0.5, 0.295, -17.5)]); // the die window on top of it
    // a heat-sink city behind the horizon chip and along the right edge
    const fin = box(0.025, 1, 1), plate = box(1, 0.05, 1);
    const sink = (x: number, z: number, w: number, d: number, h: number) => {
        sand.push([plate, chain(T(x, 0.025, z), S(w, 1, d))]);
        const n = Math.max(3, Math.round(w / 0.09));
        for (let k = 0; k < n; k++) sand.push([fin, chain(T(x - w / 2 + 0.02 + (k * (w - 0.04)) / (n - 1), 0.05 + h / 2, z), S(1, h, d))]);
    };
    for (let k = 0; k < 16; k++) {
        const left = k < 8, x = left ? -3.2 + (k % 4) * 0.62 + rnd() * 0.15 : 2.15 + ((k - 8) % 3) * 0.6 + rnd() * 0.12, z = -15.1 - Math.floor((k % 8) / (left ? 4 : 3)) * 1.0 - rnd() * 0.5;
        sink(x, z, 0.4 + rnd() * 0.3, 0.35 + rnd() * 0.3, 0.3 + rnd() * 0.9);
    }
    for (const z of [-3.2, -8.6, -13.4]) sink(3.3, z, 0.5, 0.7, 0.55);
    // ribbon cables arching overhead (cream, wires as hatching), the pin-1 edge in orange. They cast no shadow: their
    // legs would throw a band across the whole board under this light
    for (const [z, x0, top] of [[1.2, -2.4, 3.3], [-3.4, -2.6, 3.1], [-8.6, -2.3, 3.4], [-12.8, -2.5, 3.2], [-16.9, -2.8, 2.6]] as const) {
        const path = curve([[x0, 0, z], [x0 + 0.25, top * 0.7, z], [0.4, top, z], [2.3, top * 0.66, z], [2.6, 0, z]], 10);
        cable.push([ribbon(path, 0.36, 0.018), m4()]);
        orange.push([pipe(path.map(([x, y]) => [x, y, z + 0.185] as V3), 0.02, 6), m4()]);
    }
    // a giant copper coil standing on the right
    add(merge(gold), M(C.mustard, { tone: 0.2, outline: false }), still);
    // signals: bright pulses race down the bus as you travel, so the board is at work
    const pulse = box(0.03, 0.01, 0.22);
    for (let b = 0; b < 5; b++) for (let k = 0; k < 4; k++) {
        const ph = (b * 0.37 + k / 4) % 1, x0 = 1.15 + b * 0.07;
        add(pulse, M(C.orange, { outline: false, tone: 0, glow: 0.6 }), () => {
            const z = 3.2 - frac(st.T / 70 + ph) * 20.8, zi = 3.2 - 0.4 * Math.floor((3.2 - z) / 0.4), f = (zi - z) / 0.4;
            return chain(T(x0 + jog(zi) * (1 - f) + jog(zi - 0.4) * f, 0.006, z), RY(Math.atan2(jog(zi - 0.4) - jog(zi), 0.4)));
        });
    }
    add(merge(sand), M(C.bezel, { tone: 0.12 }), still);
    add(merge(cream), M(C.cream, { tone: 0.06 }), still);
    add(merge(ink), M(C.ink, { tone: 0.75 }), still);
    add(merge(forest), M(C.forest), still);
    add(merge(mustard), M(C.mustard), still);
    add(merge(cable), M(C.cream, { tone: 0.06, shadow: false }), still);
    add(merge(orange), M(C.orange, { tone: 0.12, shadow: false }), still);
    add(coil(0.62, 0.24), M(C.orange, { tone: 0.12, hatch: 30 }), fixed(chain(T(2.95, 0.86, -10.1), RY(0.4), RX(Math.PI / 2))));

    joy(ctx);

    // the line: graphite pencil up to the blot, ink after it (revealed as you travel)
    add(pipe(WIRE.slice(0, BLOT_AT + 1), 0.009, 6), M("#54422a", { tone: 0.9, outline: false }), still);
    const inkCol = () => (st.dark ? hex("#f5c435") : hex("#24493a"));
    const inkM = () => Object.defineProperties({ tone: 0.1 } as Mat, { proof: { get: inkCol }, print: { get: inkCol } });
    const line = WIRE.slice(BLOT_AT);
    add(pipe(line, 0.022, 10), inkM(), still, () => st.ink > 0, () => st.ink);
    // the pen drawing it: rides the head of the line, leaning back the way it came
    const head = () => {
        const u = Math.min(1, st.ink) * (line.length - 1), i = Math.min(line.length - 2, Math.floor(u)), a = line[i], b = line[i + 1], f = u - i;
        // a hand's small side-to-side wobble as it writes
        return chain(T(a[0] + (b[0] - a[0]) * f, 0.03, a[2] + (b[2] - a[2]) * f), RY(Math.atan2(a[0] - b[0], a[2] - b[2])), RX(0.55), RZ(Math.sin(st.T * 0.9) * 0.07));
    };
    const drawing = () => st.ink > 0 && st.ink < 1;
    // signal beads run along the inked line from the blot to the pen: chapter 02's line is live
    const along = (u: number) => { const q = u * (line.length - 1), i = Math.min(line.length - 2, Math.floor(q)), a = line[i], b = line[i + 1], f = q - i; return T(a[0] + (b[0] - a[0]) * f, 0.03, a[2] + (b[2] - a[2]) * f); };
    for (let k = 0; k < 4; k++) add(led, M(C.orange, { tone: 0, outline: false, glow: 0.6 }), () => chain(along(frac(st.T / 30 + k / 4) * Math.min(1, st.ink)), S(0.8)), () => st.ink > 0.03);
    add(cone(0.034, 0.13, 16), M(C.mustard, { tone: 0.1, glow: 0.18 }), () => chain(head(), T(0, 0.13, 0), RX(Math.PI)), drawing);
    add(merge([[cylinder(0.03, 0.06, 20), T(0, 0.16, 0)], [cylinder(0.034, 0.3, 20), T(0, 0.34, 0)]]), M(C.ink, { tone: 0.6 }), head, drawing);
    add(cylinder(0.036, 0.03, 20), M(C.orange), () => chain(head(), T(0, 0.42, 0)), drawing);
    const blot = grid((u, v) => { const a = u * TAU, b = (v - 0.5) * Math.PI, rr = 0.16 * (1 + 0.1 * Math.sin(a * 5) + 0.06 * Math.sin(a * 11)); return [rr * Math.cos(b) * Math.cos(a), Math.max(0, rr * Math.sin(b)) * 0.12, rr * Math.cos(b) * Math.sin(a)]; }, 40, 10, true);
    add(blot, inkM(), () => chain(T(...BLOT), S(Math.max(0.001, st.blot))), () => st.blot > 0.01);
    add(blot, inkM(), () => { const h = head(); return chain(T(h[12], 0.03, h[14]), S(0.2, 1, 0.2)); }, drawing); // the wet bead at the nib
    return silk;
}

// The level-up joy (T ≈ lv … lv+50): the blot sends ink ripples over the board, a gold-star rosette springs
// up out of it with a twirl, two party poppers pop out of the board and fire curly streamers, paper confetti
// fountains up and flutters down (and stays on the board), then the rosette and poppers sink back in.
function joy({ st, add, M }: Ctx) {
    const lv = st.lv, [bx, , bz] = BLOT;
    // ripples
    const ring = grid((u, v) => { const a = u * TAU, b = v * TAU, r = 1 + 0.03 * Math.cos(b); return [r * Math.cos(a), 0.004 * Math.sin(b), -r * Math.sin(a)]; }, 72, 4);
    for (let k = 0; k < 3; k++) {
        const t = () => seg(st.T, lv + 4 + k * 5, lv + 26 + k * 5);
        const m = Object.defineProperty(M(k === 1 ? C.orange : C.mustard, { outline: false, tone: 0.1 }), "alpha", { get: () => (1 - t()) * 0.95 });
        add(ring, m, () => { const r = 0.2 + 2.4 * out3(t()); return chain(T(bx, 0.008 + k * 0.002, bz), S(r, 1, r)); }, () => t() > 0 && t() < 1);
    }
    // the rosette: cream pleats, an orange ring, a forest centre with a gold star, gold ribbon tails
    const face = Math.atan2(-1.25, 1.95), up = RX(Math.PI / 2), [rx, rz] = [bx + 0.1, bz - 0.1];
    const right: V3 = [Math.cos(face), 0, -Math.sin(face)], back: V3 = [-Math.sin(face), 0, -Math.cos(face)];
    const rosette = () => {
        const u = seg(st.T, lv + 6, lv + 17), d = seg(st.T, lv + 34, lv + 44);
        const s = Math.max(0.001, spring(u) * (1 - d * d * (3 - 2 * d)));
        const y = 0.04 + 0.34 * out3(u) * (1 - d) + 0.015 * Math.sin(st.T * 0.4) * u;
        return chain(T(rx, y, rz), RY(face + (1 - out3(u)) * TAU * 1.5), RX(-0.22), RZ(Math.sin(st.T * 0.3) * 0.07 * u), S(s));
    };
    const showR = () => st.T > lv + 6 && st.T < lv + 44;
    add(prism((u) => 0.19 * (0.84 + 0.16 * Math.abs(Math.cos(u * Math.PI * 22))), 0.025, 176), M(C.cream, { tone: 0.02 }), () => chain(rosette(), up), showR);
    add(cylinder(0.135, 0.025, 40), M(C.orange), () => chain(rosette(), T(0, 0, 0.018), up), showR);
    add(cylinder(0.098, 0.025, 40), M(C.forest), () => chain(rosette(), T(0, 0, 0.034), up), showR);
    const star = prism((u) => { const p = Math.abs(frac(u * 5 - 0.25) - 0.5) * 0.4 * Math.PI, al = 0.2 * Math.PI; return (0.078 * 0.032 * Math.sin(al)) / (0.078 * Math.sin(al - p) + 0.032 * Math.sin(p)); }, 0.02, 80), tail = rbox(0.065, 0.27, 0.012, 0.004, 1);
    add(merge([[star, chain(T(0, 0, 0.05), up)], [tail, chain(T(-0.06, -0.19, -0.02), RZ(-0.3))], [tail, chain(T(0.06, -0.19, -0.02), RZ(0.3))]]), M(C.mustard, { tone: 0 }), rosette, showR);

    // two party poppers spring up either side of it like raised arms, recoil as they fire curly streamers, then sink back
    const flecks: { o: V3; t0: number; n: number }[] = [{ o: [bx, 0.05, bz], t0: 4, n: 36 }];
    const popper = merge([[cone(0.08, 0.22, 18), chain(T(0, 0.22, 0), RX(Math.PI))]]);
    ([[1, 10, C.orange], [-1, 13, C.mustard]] as const).forEach(([side, fire, col], j) => {
        const x = rx + side * 0.4 * right[0] + 0.1 * back[0], z = rz + side * 0.4 * right[2] + 0.1 * back[2];
        const pose = (t: number) => {
            const u = seg(t, lv + fire - 5, lv + fire - 1), d = seg(t, lv + 34, lv + 42), f = seg(t, lv + fire, lv + fire + 2.5), s = Math.max(0.001, spring(u));
            return chain(T(x, -0.3 * d, z), RY(face), RZ(-side * 0.5), RX(-0.2), S(s, s * (1 - 0.3 * Math.sin(f * Math.PI)), s));
        };
        add(popper, M(col, { tone: 0.05, hatch: 4 }), () => pose(st.T), () => st.T > lv + fire - 5 && st.T < lv + 42);
        const mouth = apply(pose(lv + fire + 3), [0, 0.22, 0]).slice(0, 3) as V3;
        flecks.push({ o: mouth, t0: fire, n: 10 });
        [C.cream, C.mustard, C.orange, C.cream].slice(j, j + 3).forEach((sc, i) => {
            const th = (side < 0 ? 1.0 : 0.45) + i * 0.4, D = 0.45 + i * 0.15, H = 0.3 + ((i + j) % 3) * 0.1;
            const dir: V3 = [side * right[0] * Math.cos(th) + back[0] * Math.sin(th), 0, side * right[2] * Math.cos(th) + back[2] * Math.sin(th)];
            const pts: V3[] = [];
            for (let s = 0; s <= 1.0001; s += 1 / 60) {
                const c = Math.cos(s * TAU * 5 + i) * 0.03 * (1 - 0.5 * s), q = Math.sin(s * TAU * 5 + i) * 0.03 * (1 - 0.5 * s);
                pts.push([mouth[0] + dir[0] * D * s - dir[2] * c, Math.max(0.01, mouth[1] + 4 * H * s * (1 - s) - (mouth[1] - 0.012) * s * s + q), mouth[2] + dir[2] * D * s + dir[0] * c]);
            }
            add(pipe(pts, 0.008, 5), M(sc, { tone: 0, outline: false }), () => T(0, -0.4 * seg(st.T, lv + 34, lv + 42), 0), () => st.T > lv + fire && st.T < lv + 42,
                () => out3(seg(st.T, lv + fire, lv + fire + 6)));
        });
    });
    // confetti: paper flecks fountain out, flutter down and stay on the board
    const fleck = box(0.085, 0.005, 0.055), cols = [C.cream, C.mustard, C.orange, C.cream, C.forest];
    let k = 0;
    for (const { o: [ox, oy, oz], t0, n } of flecks) for (let i = 0; i < n; i++, k++) {
        const a = k * 2.399, big = t0 === 4 ? 1 : 0.55, sp = (0.5 + ((k * 53) % 17) / 13) * big, upv = (0.8 + ((k * 29) % 13) / 12) * big, ph = k * 1.7, spin = [6 + (k % 5), 4 + (k % 3)];
        add(fleck, M(cols[k % 5], { outline: false, tone: 0 }), () => {
            const t = Math.max(0, (st.T - lv - t0) / 14), e = 1 - Math.exp(-3 * t);
            const y = Math.max(0.012, oy + upv * e - 0.4 * t), fly = y > 0.012 ? 1 : 0;
            return chain(T(ox + Math.cos(a) * sp * e + Math.sin(t * 5 + ph) * 0.05 * fly, y, oz + Math.sin(a) * sp * e), RY(a), RX(fly * t * spin[0]), RZ(fly * t * spin[1]));
        }, () => st.T > lv + t0);
    }
}

// the wire weaves past each plinth (left of the stations), through the blot
const WIRE_KEYS: V3[] = [[-0.3, 0.03, 2.2], ...STATIONS.flatMap(([x, , z], k) => [[x - 0.72 + (k % 2) * 0.12, 0.03, z + 0.5], [x - 0.6, 0.03, z - 0.5]] as V3[])];
WIRE_KEYS.splice(9, 0, BLOT);
const WIRE = curve(WIRE_KEYS, 8);
// the bus traces jog 45° twice on their way down the board
const jog = (z: number) => (z < -3 && z > -9 ? 0.45 : 0) + (z < -11 ? -0.25 : 0);
const BLOT_AT = 9 * 8; // WIRE_KEYS[9] is the blot; curve() takes 8 samples per key
