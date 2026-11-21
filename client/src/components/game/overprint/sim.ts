// Overprint, the rules: a sheet W x H cells, colour plates made of shapes that slide out of register a cell at a time,
// and an ink figure that can only stand on (or bump into) overprint, the cells two or more plates cover.
// No DOM here, so the level solver can run the same code.
import { LEVELS } from "./levels.ts";

export const W = 40, H = 25;
export { LEVELS };
// ["r", x, y, w, h] | ["c", cx, cy, r] | ["e", cx, cy, rx, ry] | ["p", x0, y0, x1, y1, ...] (key plate also: ["l", ...] open line, ["d", cx, cy, r] dot)
export type Shape = readonly [string, ...number[]];
// ink: 0 orange, 1 forest, 2 mustard; x / y: the range the plate slides in (cells, 0 = in register); at: where it starts
export type Plate = { ink: number; s: Shape[]; x?: readonly [number, number]; y?: readonly [number, number]; at?: readonly [number, number] };
export type Level = { hint?: string; plates: Plate[]; key: Shape[]; start: readonly [number, number]; goal: readonly [number, number] };

export function inside(s: Shape, px: number, py: number) {
    const [k, a, b, c, d] = s;
    if (k === "r") return px >= a && px < a + c && py >= b && py < b + d;
    if (k === "c") return (px - a) ** 2 + (py - b) ** 2 <= c * c;
    if (k === "e") return ((px - a) / c) ** 2 + ((py - b) / d) ** 2 <= 1;
    if (k !== "p") return false;
    let o = false;
    for (let i = 1, j = s.length - 2; i < s.length; j = i, i += 2) {
        const xi = s[i] as number, yi = s[i + 1] as number, xj = s[j] as number, yj = s[j + 1] as number;
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) o = !o;
    }
    return o;
}
export const covers = (p: Plate, o: readonly number[], x: number, y: number) => p.s.some((s) => inside(s, x - o[0], y - o[1]));

// each plate's cells in register, over three sheets each way, worked out once
const masks = new WeakMap<Plate, Uint8Array>();
function mask(p: Plate) {
    let m = masks.get(p);
    if (!m) {
        m = new Uint8Array(9 * W * H);
        for (let y = -H; y < 2 * H; y++) for (let x = -W; x < 2 * W; x++) m[(y + H) * 3 * W + x + W] = covers(p, [0, 0], x + 0.5, y + 0.5) ? 1 : 0;
        masks.set(p, m);
    }
    return m;
}
// how many plates cover each cell centre; 2+ is solid
export function grid(lv: Level, offs: number[][]) {
    const g = new Uint8Array(W * H);
    lv.plates.forEach((p, i) => {
        const m = mask(p), [ox, oy] = offs[i];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] += m[(y - oy + H) * 3 * W + x - ox + W];
    });
    return g;
}

// the figure, in cells and seconds (jump about 4.3 cells high, about 5.5 across)
export const PW = 1.1, PH = 1.9;
const RUN = 8.5, ACC = 80, DEC = 110, AIR = 55, G_UP = 62, G_CUT = 170, G_DOWN = 105, JUMP = 23, FALL = 26, COYOTE = 0.1, BUFFER = 0.13;
export type Body = { x: number; y: number; vx: number; vy: number; ground: boolean; coy: number; buf: number; held: boolean };
export type Input = { l: boolean; r: boolean; j: boolean };
export type State = { lv: Level; offs: number[][]; g: Uint8Array; b: Body; won: boolean; falls: number };

export function solidAt(g: Uint8Array, cx: number, cy: number) {
    if (cx < 0 || cx >= W) return true; // the sheet edges are walls
    if (cy < 0 || cy >= H) return false;
    return g[cy * W + cx] >= 2;
}
const E = 1e-4;
export function hits(g: Uint8Array, x: number, y: number) {
    for (let cy = Math.floor(y + E); cy <= Math.floor(y + PH - E); cy++)
        for (let cx = Math.floor(x + E); cx <= Math.floor(x + PW - E); cx++) if (solidAt(g, cx, cy)) return true;
    return false;
}
const body = (lv: Level): Body => ({ x: lv.start[0] - PW / 2, y: lv.start[1] - PH, vx: 0, vy: 0, ground: false, coy: 0, buf: 0, held: false });
export function start(lv: Level): State {
    const offs = lv.plates.map((p) => [...(p.at ?? [0, 0])]);
    return { lv, offs, g: grid(lv, offs), b: body(lv), won: false, falls: 0 };
}

// cells under the feet: is the figure standing, and on which plate's ink
const feet = (g: Uint8Array, b: Body) => {
    const cy = Math.floor(b.y + PH + 0.05), out: number[] = [];
    for (let cx = Math.floor(b.x + E); cx <= Math.floor(b.x + PW - E); cx++) if (solidAt(g, cx, cy) && cx >= 0 && cx < W) out.push(cx);
    return { cy, out };
};

function moveX(s: State, dx: number) {
    const b = s.b, nx = b.x + dx;
    if (!hits(s.g, nx, b.y)) { b.x = nx; return; }
    // step up a ledge of up to one cell (hills drawn as curves are stairs in cells)
    if (b.ground) for (let up = 0.25; up <= 1.01; up += 0.25) if (!hits(s.g, nx, b.y - up)) { b.x = nx; b.y -= up; return; }
    b.x = dx > 0 ? Math.floor(nx + PW - E) - PW : Math.floor(nx + E) + 1;
    b.vx = 0;
}
function moveY(s: State, dy: number) {
    const b = s.b, ny = b.y + dy;
    if (!hits(s.g, b.x, ny)) { b.y = ny; return false; }
    b.y = dy > 0 ? Math.floor(ny + PH - E) - PH : Math.floor(ny + E) + 1;
    b.vy = 0;
    return dy > 0;
}

/** One physics step. Returns "jump" | "land" | "fall" | "win" for the renderer's juice, or "". */
export function step(s: State, inp: Input, dt: number) {
    if (s.won) return "";
    const b = s.b, dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    let ev = "";
    const was = b.ground;
    // run
    const target = dir * RUN, a = b.ground ? (dir ? ACC : DEC) : AIR;
    b.vx += Math.sign(target - b.vx) * Math.min(Math.abs(target - b.vx), a * dt);
    // jump: buffered press, coyote time after leaving a ledge, a short hop when let go early
    if (inp.j && !b.held) b.buf = BUFFER;
    b.held = inp.j;
    b.coy = b.ground ? COYOTE : Math.max(0, b.coy - dt);
    b.buf = Math.max(0, b.buf - dt);
    if (b.buf > 0 && b.coy > 0) { b.vy = -JUMP; b.buf = 0; b.coy = 0; b.ground = false; ev = "jump"; }
    b.vy = Math.min(FALL, b.vy + (b.vy < 0 ? (inp.j ? G_UP : G_CUT) : G_DOWN) * dt);
    // move axis by axis in small steps
    const n = Math.ceil(Math.max(Math.abs(b.vx), Math.abs(b.vy)) * dt / 0.2) || 1;
    let landed = false;
    for (let i = 0; i < n; i++) { moveX(s, (b.vx * dt) / n); if (moveY(s, (b.vy * dt) / n)) landed = true; }
    b.ground = landed;
    if (b.ground && !was) ev = "land";
    if (b.y > H + 2) { // off the bottom of the sheet: back to the start (with the plates as they started, if nothing is under it now)
        s.b = body(s.lv); s.falls++; ev = "fall";
        if (!under(s)) { s.offs = s.lv.plates.map((p) => [...(p.at ?? [0, 0])]); s.g = grid(s.lv, s.offs); }
    }
    const [gx, gy] = s.lv.goal;
    if (b.ground && Math.abs(b.x + PW / 2 - gx) < 1.2 && Math.abs(b.y + PH / 2 - gy) < 1.3) { s.won = true; ev = "win"; } // standing on the mark
    return ev;
}
// is there any overprint below the start point
function under(s: State) {
    const x0 = Math.floor(s.b.x + E), x1 = Math.floor(s.b.x + PW - E);
    for (let cy = Math.max(0, Math.floor(s.b.y + PH)); cy < H; cy++) for (let cx = x0; cx <= x1; cx++) if (solidAt(s.g, cx, cy)) return true;
    return false;
}

/** Slide plate k one cell. A plate under the figure's feet carries it; a move that would print over the figure is refused. */
export function shift(s: State, k: number, dx: number, dy: number) {
    const p = s.lv.plates[k], o = s.offs[k], nx = o[0] + dx, ny = o[1] + dy;
    if ((dx && (!p.x || nx < p.x[0] || nx > p.x[1])) || (dy && (!p.y || ny < p.y[0] || ny > p.y[1]))) return false;
    const b = s.b, f = feet(s.g, b);
    const ride = !s.won && f.out.length > 0 && f.out.some((cx) => covers(p, o, cx + 0.5, f.cy + 0.5));
    const offs = s.offs.map((q, i) => (i === k ? [nx, ny] : q)), g = grid(s.lv, offs);
    let x = b.x, y = b.y;
    if (ride && !hits(g, x + dx, y + dy)) { x += dx; y += dy; }
    else if (hits(g, x, y)) {
        let up = 0.25;
        for (; up <= 1.01 && hits(g, x, y - up); up += 0.25);
        if (up > 1.01) return false;
        y -= up;
    }
    s.offs = offs; s.g = g; b.x = x; b.y = y;
    if (ride && dy < 0) b.vy = Math.min(b.vy, 0);
    return true;
}
