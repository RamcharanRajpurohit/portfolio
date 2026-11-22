import { chain, grid, hex, T, type Geo, type M4, type Mat, type V3 } from "./gl";

// Shared kit for the inside of the machine: palette, layout, small helpers and the build context.
// Each part of the scene (world.ts, stations01.ts, stations02.ts) gets a Ctx and adds meshes through it.

export type State = { T: number; lv: number; stops: number[]; ink: number; blot: number; dark: boolean };

export const C = {
    cream: "#f3e6c4", bezel: "#d6c08a", top: "#e9cf86", forest: "#24493a", mustard: "#f0c43a",
    orange: "#ff6509", ink: "#2b2620", board: "#2f5a45", brown: "#8a6326",
};
const STOCK = hex("#f3e6c4"), NIGHT = hex("#1e2d25"), BROWN = hex(C.brown);

// station centres: a row down the board; the blot sits between chapter 01 and 02
export const STATIONS: V3[] = Array.from({ length: 9 }, (_, k) => [0.3, 0, -1.6 * k - (k > 3 ? 0.6 : 0)]);
export const BLOT: V3 = [-0.05, 0.03, -5.9];
// the angle each station is seen from while its text is read (camera orbit around the station, radians)
export const REST_ANG = [-0.5, 0.62, -0.7, 0.42, -0.45, 0.72, -0.25, 0.55, -0.4];

export const curve = (key: V3[], n = 10): V3[] => {
    const out: V3[] = [];
    for (let k = 0; k < key.length - 1; k++) for (let s = 0; s < n; s++) {
        const t = s / n, a = key[Math.max(0, k - 1)], b = key[k], c = key[k + 1], d = key[Math.min(key.length - 1, k + 2)];
        out.push([0, 1, 2].map((i) => 0.5 * (2 * b[i] + (-a[i] + c[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t * t + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t * t * t)) as V3);
    }
    out.push(key[key.length - 1]);
    return out;
};
export const cone = (r: number, h: number, seg = 20): Geo => grid((u, v) => [r * (1 - v) * Math.cos(u * Math.PI * 2), v * h, -r * (1 - v) * Math.sin(u * Math.PI * 2)], seg, 4);
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const frac = (x: number) => x - Math.floor(x);

export type Ctx = {
    st: State;
    /** add a mesh; model() is evaluated every frame (use st.T for scroll-driven motion); show() hides it */
    add: (geo: Geo, mat: Mat, model: () => M4, show?: () => boolean, frac?: () => number) => void;
    /** a print material: proof = stock + ink halftone, print = this colour + brown halftone */
    M: (print: string, x?: Partial<Mat>) => Mat;
    /** model matrix at station k (includes the level-up hop), followed by local transforms */
    at: (k: number, ...m: M4[]) => () => M4;
    fixed: (m: M4) => () => M4;
};

export type Pending = { geo: Geo; mat: Mat; model: () => M4; show?: () => boolean; frac?: () => number };
export function makeCtx(st: State, pending: Pending[]): Ctx {
    const stock = () => (st.dark ? NIGHT : STOCK);
    const M = (print: string, x: Partial<Mat> = {}): Mat => Object.defineProperties({ print: hex(print), dot: BROWN, ...x } as Mat, { proof: { get: stock, enumerable: true } });
    const add: Ctx["add"] = (geo, mat, model, show, frac) => { pending.push({ geo, mat, model, show, frac }); };
    // the level-up "cheer": a wave runs along the stations from the blot, each one hops once
    const hop = (k: number) => { const u = (st.T - st.lv - 6 - Math.abs(k - 3.5) * 3) / 9; return u > 0 && u < 1 ? Math.sin(u * Math.PI) * 0.28 : 0; };
    const at = (k: number, ...m: M4[]) => () => chain(T(...STATIONS[k]), T(0, hop(k), 0), ...m);
    return { st, add, M, at, fixed: (m) => () => m };
}
