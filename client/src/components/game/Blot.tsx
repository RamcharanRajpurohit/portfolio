import { useEffect, useRef, useState } from "react";

// Blot: you (orange) and the bot (forest) take turns dropping ink on a sheet of absorbent paper, 8 drops each.
// The sheet is a low-res grid with a fibre field: a few hundred fibres plus the paper's grain direction and its
// formation (cloudy absorbency). A drop spreads as one shared Dijkstra flood whose step cost comes from that field,
// so it runs along the grain and up the fibres, is stopped by the other ink, and dries out when its ink is soaked up
// or after a few turns. A big drop keeps creeping into the next turns, so a drop beside it can cut it off.
// One WebGL2 pass prints the result: two offset ink plates (flat + halftone, multiplied; the second hit of the same
// ink makes the darker rim, as stacked pigment layers do in Kubelka-Munk), the key plate for the wet line where the
// inks meet, the fibres and the site's paper grain. Nothing runs while idle, off screen or in a hidden tab.

const DROPS = 8, TURN = 1, ANIM = 1300, LIFE = 3;
const ORANGE = "#ff6509", FOREST = "#24493a", INK = "#26201a", CREAM = "#f3e6c4", MUSTARD = "#ecba2a";
const RM = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function rng(s: number) {
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const hash = (i: number) => {
    let k = Math.imul(i ^ 0x2c1b3c6d, 0x297a2d39);
    k = Math.imul(k ^ (k >>> 15), 0x85ebca6b);
    return ((k ^ (k >>> 13)) >>> 0) / 4294967296;
};
const vnoise = (x: number, y: number, s: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a: number, b: number) => hash(a * 7919 + b * 104729 + s);
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// 8 neighbours plus knight moves, so fronts are round rather than octagonal
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
// the two cells a diagonal or knight move passes between: if the rival holds both, ink can't slip through
const VIA = DIRS.map(([x, y]) => Math.abs(x) === 2 ? [[Math.sign(x), 0], [Math.sign(x), y]] : Math.abs(y) === 2 ? [[0, Math.sign(y)], [x, Math.sign(y)]] : x && y ? [[x, 0], [0, y]] : null);

type Paper = { W: number; H: number; N: number; cap: Float32Array; cost: Float32Array; cells: Uint8Array; fib: HTMLCanvasElement };
const S = 5; // fibre texture pixels per cell

function makePaper(W: number, H: number, seed: number): Paper {
    const r = rng(seed), N = W * H, cap = new Float32Array(N), gr = new Float32Array(N), fang = new Float32Array(N).fill(-1), cells = new Uint8Array(N * 4);
    const g0 = (r() - 0.5) * 1.2; // machine direction of this sheet
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
        gr[i] = g0 + 1.3 * (vnoise(x / 40, y / 40, seed) - 0.5);
        const f = 0.62 * vnoise(x / 12, y / 12, seed + 1) + 0.38 * vnoise(x / 4.5, y / 4.5, seed + 2); // formation: flocs of fibre
        cap[i] = 0.7 + 0.6 * f;
        cells[i * 4] = f * 255;
    }
    const fib = document.createElement("canvas");
    fib.width = W * S; fib.height = H * S;
    const g = fib.getContext("2d")!;
    g.fillRect(0, 0, fib.width, fib.height);
    g.globalCompositeOperation = "lighter";
    g.lineCap = "round";
    // R: light fibres, G: dark fibres, B: the halo ink wicks along. The long fibres also steer the flood.
    const fibre = (long: boolean) => {
        let x = r() * W, y = r() * H, a = gr[(x | 0) + (y | 0) * W] + (r() - 0.5) * 0.9;
        const len = long ? 8 + r() * 22 : 1 + r() * 5, bend = (r() - 0.5) * (long ? 0.03 : 0.12), p = new Path2D();
        p.moveTo(x * S, y * S);
        for (let s = 0; s < len; s += 0.5) {
            if (long && x >= 0 && x < W && y >= 0 && y < H) fang[(x | 0) + (y | 0) * W] = ((a % Math.PI) + Math.PI) % Math.PI;
            a += bend; x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5;
            p.lineTo(x * S, y * S);
        }
        const light = r() < 0.6;
        g.strokeStyle = light ? `rgba(255,0,0,${long ? 0.6 : 0.35})` : `rgba(0,255,0,${long ? 0.45 : 0.15})`;
        g.lineWidth = long ? 1 : 0.7;
        g.stroke(p);
        if (long) { g.strokeStyle = "rgba(0,0,255,.45)"; g.lineWidth = S * 0.8; g.stroke(p); }
    };
    for (let k = 0; k < N / 80; k++) fibre(true);
    for (let k = 0; k < N / 10; k++) fibre(false);
    const cost = new Float32Array(N * 16);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) DIRS.forEach(([dx, dy], d) => {
        const nx = x + dx, ny = y + dy, j = nx + ny * W;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) { cost[i * 16 + d] = Infinity; return; }
        const len = Math.hypot(dx, dy), on = fang[i] >= 0 && fang[j] >= 0, th = fang[i] >= 0 ? fang[i] : gr[i];
        const al = Math.abs(dx * Math.cos(th) + dy * Math.sin(th)) / len;
        cost[i * 16 + d] = len * (on ? 0.3 + 1.1 * (1 - al) : 1 + 1.4 * (1 - al)) * (0.55 + 0.6 * cap[j]) * (0.75 + 0.5 * hash(j + seed));
    });
    return { W, H, N, cap, cost, cells, fib };
}

type Blot = { who: number; rem: number; n: number; v: number; born: number; c: number };
// One flood for every blot: heap keys are arrival times, values cell * 128 + blot. best / bb = the soonest time
// queued for a cell and by which blot, so a blot only queues a cell again when it can reach it sooner.
class Sim {
    own: Int8Array; best: Float32Array; bb: Int8Array; arr: Float32Array | null; den: Float32Array | null;
    hk = new Float64Array(8192); hv = new Int32Array(8192); hn = 0;
    blots: Blot[] = []; clock = 0; turn = 0; cnt = [0, 0, 0]; off: number[]; P: Paper;
    constructor(P: Paper, full = true) {
        this.P = P;
        this.own = new Int8Array(P.N);
        this.best = new Float32Array(P.N).fill(Infinity);
        this.bb = new Int8Array(P.N);
        this.arr = full ? new Float32Array(P.N) : null;
        this.den = full ? new Float32Array(P.N) : null;
        this.off = DIRS.map(([x, y]) => x + y * P.W);
    }
    push(k: number, v: number) {
        if (this.hn === this.hk.length) {
            const k2 = new Float64Array(this.hn * 2), v2 = new Int32Array(this.hn * 2);
            k2.set(this.hk); v2.set(this.hv); this.hk = k2; this.hv = v2;
        }
        const { hk, hv } = this;
        let i = this.hn++;
        while (i) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
        hk[i] = k; hv[i] = v;
    }
    pop() {
        const { hk, hv } = this, n = --this.hn, k = hk[n], v = hv[n];
        let i = 0;
        for (;;) {
            let c = 2 * i + 1;
            if (c >= n) break;
            if (c + 1 < n && hk[c + 1] < hk[c]) c++;
            if (hk[c] >= k) break;
            hk[i] = hk[c]; hv[i] = hv[c]; i = c;
        }
        hk[i] = k; hv[i] = v;
    }
    run(until: number) {
        const { own, best, bb, blots, P } = this;
        while (this.hn && this.hk[0] <= until) {
            const t = this.hk[0], v = this.hv[0];
            this.pop();
            const c = v >> 7, bl = blots[v & 127];
            if (own[c] || bl.rem <= 0) continue;
            own[c] = bl.who; this.cnt[bl.who]++; bl.n++; bl.rem -= P.cap[c];
            if (this.arr) { this.arr[c] = t; this.den![c] = 0.18 + 0.72 * Math.exp(-bl.n / (0.07 * bl.v)); }
            // a fast splat, then slower and slower as the blot grows: a small drop soaks in within its turn, the biggest
            // creeps on through the next one, so it can be cut off
            const pace = 0.03 * (bl.n < 0.05 * bl.v ? 0.3 : 1) * (1 + (bl.n / (0.02 * P.N)) ** 1.5);
            for (let d = 0; d < 16; d++) {
                const k = P.cost[c * 16 + d];
                if (k === Infinity) continue;
                const j = c + this.off[d], tj = t + k * pace;
                if (own[j] || (tj >= best[j] && bb[j] === (v & 127))) continue;
                const via = VIA[d];
                if (via) {
                    const a = own[c + via[0][0] + via[0][1] * P.W], b = own[c + via[1][0] + via[1][1] * P.W];
                    if (a && b && a !== bl.who && b !== bl.who) continue;
                }
                if (tj < best[j]) { best[j] = tj; bb[j] = v & 127; }
                this.push(tj, j * 128 + (v & 127));
            }
        }
        this.clock = until;
    }
    drop(who: number, c: number, vol: number) {
        const { P } = this, b = this.blots.length;
        this.blots.push({ who, rem: vol, n: 0, v: vol, born: this.turn, c });
        this.push(this.clock, c * 128 + b);
        // a big drop throws a few specks
        if (vol < 0.06 * P.N) return;
        const r = rng(c * 31 + this.turn), r0 = Math.sqrt(vol / Math.PI) * 0.5, x = c % P.W, y = (c / P.W) | 0;
        for (let k = 0, n = 2 + ((r() * 3) | 0); k < n; k++) {
            const a = r() * 6.283, d = r0 * (1.5 + r()), sx = Math.round(x + Math.cos(a) * d), sy = Math.round(y + Math.sin(a) * d);
            if (sx < 1 || sy < 1 || sx >= P.W - 1 || sy >= P.H - 1 || this.own[sx + sy * P.W]) continue;
            const v = vol * (0.008 + r() * 0.02);
            this.blots.push({ who, rem: v, n: 0, v, born: this.turn, c: sx + sy * P.W });
            this.push(this.clock + 0.03 + r() * 0.05, (sx + sy * P.W) * 128 + this.blots.length - 1);
        }
    }
    // a new turn: old blots dry out, and their queued cells open up again for the others
    next() {
        this.turn++;
        for (const b of this.blots) if (this.turn - b.born >= LIFE) b.rem = 0;
        const { hk, hv, own, blots, best } = this, n = this.hn;
        this.hn = 0;
        best.fill(Infinity);
        const k2 = hk.slice(0, n), v2 = hv.slice(0, n);
        for (let i = 0; i < n; i++) {
            const c = v2[i] >> 7;
            if (own[c] || blots[v2[i] & 127].rem <= 0) continue;
            if (k2[i] < best[c]) { best[c] = k2[i]; this.bb[c] = v2[i] & 127; }
            this.push(k2[i], v2[i]);
        }
    }
    live() { return this.hn > 0 && this.blots.some((b) => b.rem > 0); }
    clone() {
        const s = new Sim(this.P, false), n = Math.max(16, this.hn);
        s.own.set(this.own); s.best.set(this.best); s.bb.set(this.bb);
        s.hk = this.hk.slice(0, n); s.hv = this.hv.slice(0, n); s.hn = this.hn;
        s.blots = this.blots.map((b) => ({ ...b })); s.clock = this.clock; s.turn = this.turn; s.cnt = [...this.cnt];
        return s;
    }
}

const sizes = (N: number) => ({ min: 0.014 * N, max: 0.15 * N, budget: 0.55 * N }); // more ink than paper: space is what you fight for
// the biggest drop allowed now: keep a small drop's worth for each drop after this one
const most = (N: number, ink: number, left: number) => { const z = sizes(N); return clamp(ink - z.min * (left - 1), z.min, z.max); };

// The bot: a handful of candidate spots (open paper, just ahead of your wet blots to cut them off, a few at random),
// each tried on a copy of the sheet for two turns; it yields between tries so the thinking spreads over frames.
type Pick = { c: number; s: number };
function* think(sim: Sim, vol: number, r: () => number): Generator<number, Pick[]> {
    const { W, H, N } = sim.P, own = sim.own, cs = new Set<number>();
    const ok = (x: number, y: number) => x >= 1 && y >= 1 && x < W - 1 && y < H - 1 && !own[x + y * W];
    // chamfer distance to ink and to the sheet's edge
    const dist = new Float32Array(N);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) dist[i] = own[i] ? 0 : Math.min(x + 1, y + 1, W - x, H - y);
    for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) { const i = x + y * W; dist[i] = Math.min(dist[i], dist[i - 1] + 1, dist[i - W] + 1, dist[i - W - 1] + 1.4, dist[i - W + 1] + 1.4); }
    for (let y = H - 2; y >= 0; y--) for (let x = W - 2; x > 0; x--) { const i = x + y * W; dist[i] = Math.min(dist[i], dist[i + 1] + 1, dist[i + W] + 1, dist[i + W + 1] + 1.4, dist[i + W - 1] + 1.4); }
    const open = Array.from({ length: 500 }, () => (r() * N) | 0).filter((i) => !own[i]).sort((a, b) => dist[b] - dist[a]);
    const picked: number[] = [];
    for (const i of open) {
        if (picked.length >= 6) break;
        if (picked.every((j) => Math.hypot((i % W) - (j % W), ((i / W) | 0) - ((j / W) | 0)) > 12)) picked.push(i);
    }
    picked.forEach((i) => cs.add(i));
    // just ahead of the leading edge of your live blots
    for (let k = 0, n = 0; k < 60 && n < 8 && sim.hn; k++) {
        const v = sim.hv[(r() * sim.hn) | 0], b = sim.blots[v & 127];
        if (b.who !== 1 || b.rem < 0.12 * b.v) continue;
        const c = v >> 7, bx = b.c % W, by = (b.c / W) | 0, x = c % W, y = (c / W) | 0, d = Math.hypot(x - bx, y - by) || 1, s = 2 + r() * 4;
        const nx = Math.round(x + ((x - bx) / d) * s), ny = Math.round(y + ((y - by) / d) * s);
        if (ok(nx, ny)) { cs.add(nx + ny * W); n++; }
    }
    for (let k = 0; k < 40 && cs.size < 18; k++) { const x = (r() * W) | 0, y = (r() * H) | 0; if (ok(x, y)) cs.add(x + y * W); }
    const out: Pick[] = [];
    for (const c of cs) {
        const s = sim.clone();
        s.next(); s.drop(2, c, vol); s.run(s.clock + TURN); s.next(); s.run(s.clock + TURN);
        out.push({ c, s: s.cnt[2] - sim.cnt[2] - (s.cnt[1] - sim.cnt[1]) });
        yield c;
    }
    return out.sort((a, b) => b.s - a.s);
}

const VS = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;
// pass 1, at grid size: four bilinear taps half a cell out = a [1 2 1] blur, so the edges come out round, not stepped
const SM = `#version 300 es
precision highp float;
uniform sampler2D uS;
uniform vec2 uN;
out vec4 o;
void main() {
  vec2 u = gl_FragCoord.xy / uN, h = .5 / uN;
  o = .25 * (texture(uS, u - h) + texture(uS, u + h) + texture(uS, u + vec2(h.x, -h.y)) + texture(uS, u + vec2(-h.x, h.y)));
}`;
// pass 2, the print. uS: smoothed (you, bot, wetness, ink load), mipmapped so a coarser level finds rims and seams
const FS = `#version 300 es
precision highp float;
uniform sampler2D uS, uC, uF, uG;
uniform vec2 uR, uN;
uniform float uD, uReg, uNight;
out vec4 o;
const vec3 INK = vec3(38., 32., 26.) / 255., FOR = vec3(36., 73., 58.) / 255., ORA = vec3(255., 101., 9.) / 255., CRE = vec3(243., 230., 196.) / 255.;
// rotated halftone screen: dot area follows v
float ht(vec2 p, float a, float v) {
  float c = clamp(uR.x / uN.x / uD * .95, 3.2, 4.6) * uD; // about a cell, so a phone's screen is finer
  vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * p / c, g = fract(q) - .5;
  float r = sqrt(clamp(v, 0., 1.)) * .72, w = .8 / c;
  return smoothstep(r + w, r - w, length(g));
}
vec3 overlay(vec3 a, float b) { return mix(2. * a * b, 1. - 2. * (1. - a) * (1. - b), step(.5, a)); }
void main() {
  vec2 p = vec2(gl_FragCoord.x, uR.y - gl_FragCoord.y), u = p / uR;
  vec4 f = texture(uF, u), c = texture(uC, u);
  float g = texture(uG, p / (512. * uD)).r, aa = .7 * uN.x / uR.x;
  // paper: formation clouds, then the fibres
  vec3 col = CRE * (.92 + .12 * c.r);
  col = mix(col, col * .72, f.g * .7);
  col = mix(col, vec3(1.), f.r * .35);
  // the ink edge reaches up the fibres and sinks unevenly into the formation and the grain
  float e = f.b * .45 + (g - .5) * .5 + (c.r - .5) * .3 - .03;
  vec2 o1 = vec2(1.1, -.7) * uReg * uD / uR, o2 = vec2(-.6, .8) * uReg * uD / uR;
  vec4 s1 = textureLod(uS, u + o1, 0.), s2 = textureLod(uS, u + o2, 0.), w = textureLod(uS, u + o2, 1.4), m = textureLod(uS, u, .5);
  // only near ink: the wide blur says how near
  vec2 n = e * smoothstep(0., .3, w.rg), c1 = smoothstep(.5 - aa, .5 + aa, s1.rg + n), c2 = smoothstep(.5 - aa, .5 + aa, s2.rg + n);
  // ink pools at the rim and where the drop landed; fresh ink is darker until it soaks in
  vec2 rim = smoothstep(0., .6, 1. - w.rg) * c2;
  vec2 d = clamp(s2.a * (.75 + .5 * c.r) + rim * 1.1 + s2.b * .25, 0., 1.);
  col *= mix(vec3(1.), ORA, c1.x * .85);
  col *= mix(vec3(1.), ORA * .85, ht(p + o2 * uR, .26, d.x) * c2.x * .8);
  col *= mix(vec3(1.), FOR * 1.5, c1.y * .85);
  col *= mix(vec3(1.), FOR * .9, ht(p + o2 * uR, 1.31, d.y) * c2.y * .85);
  // key plate: the dark wet line where the two inks meet
  float meet = smoothstep(.16 + (g - .5) * .1, .22, m.r * m.g);
  col = mix(col, INK, meet * (.8 + .2 * s2.b));
  col = mix(col, overlay(col, g), .5);
  col *= mix(vec3(1.), vec3(.8, .84, .8), uNight);
  o = vec4(col, 1.);
}`;

type Gfx = { paper: (P: Paper) => void; free: () => void; state: (d: Uint8Array) => void; draw: (reg: number, night: boolean) => void; size: (w: number, h: number) => void };

// one context for the component's life: a new round only swaps the grid textures (paper)
function makeGL(cv: HTMLCanvasElement, grain: HTMLImageElement): Gfx | null {
    const gl = cv.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
    if (!gl) return null;
    const prog = (fs: string) => {
        const pr = gl.createProgram()!;
        for (const [t, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]] as const) {
            const s = gl.createShader(t)!;
            gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(pr, s);
        }
        gl.linkProgram(pr);
        return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : (console.error(gl.getProgramInfoLog(pr)), null);
    };
    const sm = prog(SM), pr = prog(FS);
    if (!sm || !pr) return null;
    const tex = (unit: number, wrap: number, min: number = gl.LINEAR) => {
        const t = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        return t;
    };
    const C = gl.CLAMP_TO_EDGE;
    tex(1, C); tex(2, C); tex(4, C); // the paper's cells, its fibres, the raw grid from the sim
    tex(3, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    let grainSet = false;
    const putGrain = () => {
        if (grainSet || !grain.complete || !grain.naturalWidth) return;
        gl.activeTexture(gl.TEXTURE3);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, grain);
        grainSet = true;
    };
    const fb = gl.createFramebuffer(), U = (n: string) => gl.getUniformLocation(pr, n);
    gl.useProgram(sm);
    gl.uniform1i(gl.getUniformLocation(sm, "uS"), 4);
    gl.useProgram(pr);
    ["uS", "uC", "uF", "uG"].forEach((n, i) => gl.uniform1i(U(n), i));
    let w = 1, h = 1, P: Paper, smooth: WebGLTexture | null = null;
    return {
        paper(p) {
            P = p;
            gl.activeTexture(gl.TEXTURE1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, P.W, P.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, P.cells);
            gl.activeTexture(gl.TEXTURE2); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, P.fib);
            gl.activeTexture(gl.TEXTURE4); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, P.W, P.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            // unit 0: the smoothed copy pass 1 draws into (fixed-size storage, so a new one when the grid changes)
            gl.deleteTexture(smooth);
            smooth = tex(0, C, gl.LINEAR_MIPMAP_LINEAR);
            gl.texStorage2D(gl.TEXTURE_2D, 1 + Math.floor(Math.log2(Math.max(P.W, P.H))), gl.RGBA8, P.W, P.H);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, smooth, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(sm); gl.uniform2f(gl.getUniformLocation(sm, "uN"), P.W, P.H);
            gl.useProgram(pr); gl.uniform2f(U("uN"), P.W, P.H);
        },
        free() { gl.getExtension("WEBGL_lose_context")?.loseContext(); },
        state(d) {
            gl.activeTexture(gl.TEXTURE4); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, P.W, P.H, gl.RGBA, gl.UNSIGNED_BYTE, d);
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, P.W, P.H); gl.useProgram(sm);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h); gl.useProgram(pr);
            gl.activeTexture(gl.TEXTURE0); gl.generateMipmap(gl.TEXTURE_2D);
        },
        size(W, H) { cv.width = w = W; cv.height = h = H; gl.viewport(0, 0, w, h); gl.uniform2f(U("uR"), w, h); },
        draw(reg, night) {
            putGrain();
            gl.uniform1f(U("uD"), Math.max(1, cv.width / (cv.clientWidth || cv.width)));
            gl.uniform1f(U("uReg"), reg); gl.uniform1f(U("uNight"), night ? 1 : 0);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
    };
}

// no WebGL2: the coverage, upscaled smoothly by a 2D canvas
function make2D(cv: HTMLCanvasElement): Gfx {
    const g = cv.getContext("2d"), small = document.createElement("canvas");
    const cols = [[243, 230, 196], [255, 101, 9], [36, 73, 58]];
    let P: Paper, img: ImageData, d: Uint8Array;
    return {
        paper(p) { P = p; small.width = P.W; small.height = P.H; img = new ImageData(P.W, P.H); d = new Uint8Array(P.N * 4); },
        free() {},
        state(s) { d = s; },
        size(w, h) { cv.width = w; cv.height = h; },
        draw() {
            for (let i = 0; i < P.N; i++) { const c = cols[d[i * 4] > 127 ? 1 : d[i * 4 + 1] > 127 ? 2 : 0]; img.data.set([c[0], c[1], c[2], 255], i * 4); }
            small.getContext("2d")!.putImageData(img, 0, 0);
            g?.drawImage(small, 0, 0, cv.width, cv.height);
        },
    };
}

type Hud = { pct: [number, number]; drops: [number, number]; ink: [number, number]; turn: "you" | "bot" | "wait" | "done" };
type Mark = { x: number; y: number };
const HUD0: Hud = { pct: [0, 0], drops: [DROPS, DROPS], ink: [1, 1], turn: "you" };

export default function Blot() {
    const box = useRef<HTMLDivElement>(null), ring = useRef<SVGSVGElement>(null), spend = useRef<HTMLDivElement>(null), again = useRef<() => void>(null);
    const [hud, setHud] = useState<Hud>(HUD0);
    const [marks, setMarks] = useState<Mark[]>([]);
    const [grid, setGrid] = useState({ W: 208, H: 130 });

    useEffect(() => {
        const wrap = box.current!, ringEl = ring.current!, [arc] = ringEl.children as unknown as SVGCircleElement[];
        // the canvas is made here, so its context is lost on unmount (Chrome keeps ~16 live ones and drops the oldest:
        // the experience section's) and StrictMode's second mount gets a fresh one rather than the lost one back
        const canvas = document.createElement("canvas");
        canvas.tabIndex = 0;
        canvas.setAttribute("aria-label", "Paper sheet. Arrow keys move, hold Space to drop ink.");
        canvas.className = "block w-full cursor-crosshair select-none outline-none focus-visible:outline-[3px] focus-visible:outline-offset-[-3px] focus-visible:outline-[#26201a]";
        canvas.style.touchAction = "none";
        wrap.prepend(canvas);
        const grain = new Image();
        grain.src = "/art/paper.webp";
        let gfx = makeGL(canvas, grain) ?? make2D(canvas);
        // the round: everything below is set afresh by reset()
        let W = 0, H = 0, N = 0, P: Paper, sim: Sim, Z = sizes(0), data = new Uint8Array(0), rnd = rng(0);
        let ink = [0, 0, 0], drops = [0, 0, 0], dropped: Mark[] = [];
        let phase: "you" | "spread" | "bot" | "settle" | "done" = "you", nextWho = 1;
        let animT = 0, from = 0, dirty = true, reg = 1, regT = -1, raf = 0, last = 0, onScreen = false, lastHud = "";
        // the cursor, in grid units; hold = a drop being charged
        const cur = { x: 0, y: 0, show: false, who: 1 }, mine = { x: 0, y: 0 };
        let hold: { t0: number; key: boolean } | null = null;
        const held = () => (hold ? performance.now() - hold.t0 : 0);
        type Bot = { gen: Generator<number, Pick[]>; picks: Pick[] | null; seen: number[]; vol: number; tx: number; ty: number; wait: number; hops: number; k: number; charge: number; ct: number; feint: number };
        let bot: Bot | null = null;
        const reset = () => {
            const narrow = innerWidth < 640, seed = (Math.random() * 1e9) | 0;
            W = narrow ? 128 : 208; H = narrow ? 168 : 130;
            P = makePaper(W, H, seed); sim = new Sim(P); Z = sizes(P.N); N = P.N; data = new Uint8Array(N * 4); rnd = rng(seed ^ 0x5bd1e995);
            ink = [0, Z.budget, Z.budget]; drops = [0, DROPS, DROPS]; dropped = [];
            phase = "you"; nextWho = 1; animT = from = 0; reg = 1; regT = -1; hold = null; bot = null;
            Object.assign(cur, { x: W / 2, y: H / 2, show: false, who: 1 }); Object.assign(mine, { x: W / 2, y: H / 2 });
            setGrid({ W, H }); setMarks([]);
            gfx.paper(P); upload(); fit(); report();
        };
        again.current = reset;

        const night = () => document.documentElement.dataset.theme === "dark";
        const fit = () => {
            const w = wrap.clientWidth, h = (w * H) / W, dpr = Math.min(devicePixelRatio || 1, 2);
            canvas.style.height = `${h}px`;
            gfx.size(Math.round(w * dpr), Math.round(h * dpr));
            dirty = true; drawRing(); kick();
        };
        const upload = () => {
            const { own, arr, den } = sim, t = sim.clock;
            for (let i = 0, j = 0; i < N; i++, j += 4) {
                const o = own[i];
                if (!o) { data[j] = data[j + 1] = data[j + 2] = 0; continue; }
                const a = Math.min(1, (t - arr![i]) / 0.05) * 255; // new cells fade in, so the front glides
                data[j] = o === 1 ? a : 0; data[j + 1] = o === 2 ? a : 0;
                data[j + 2] = 255 * Math.exp(-(t - arr![i]) / 0.8);
                data[j + 3] = den![i] * 255;
            }
            gfx.state(data);
            dirty = true;
        };
        const report = () => {
            const h: Hud = {
                pct: [Math.round((sim.cnt[1] / N) * 100), Math.round((sim.cnt[2] / N) * 100)], drops: [drops[1], drops[2]],
                ink: [ink[1] / Z.budget, ink[2] / Z.budget], turn: phase === "you" ? "you" : phase === "bot" ? "bot" : phase === "done" ? "done" : "wait",
            };
            const k = JSON.stringify(h);
            if (k !== lastHud) { lastHud = k; setHud(h); }
        };
        const volOf = (who: number, t: number) => {
            const max = most(N, ink[who], drops[who]), k = clamp(t / 1500, 0, 1);
            return Z.min + (max - Z.min) * k * k * (3 - 2 * k);
        };
        function drawRing() {
            const vis = cur.show && (phase === "you" || phase === "bot");
            ringEl.style.opacity = vis ? "1" : "0";
            if (spend.current) spend.current.style.width = hold ? `${(volOf(1, held()) / Z.budget) * 100}%` : "0";
            if (!vis) return;
            const px = wrap.clientWidth / W, v = cur.who === 1 ? (hold ? volOf(1, held()) : Z.min) : bot && bot.charge >= 0 ? Z.min + (bot.vol - Z.min) * bot.charge : bot && bot.feint > 0 ? Z.min : 0;
            const free = !sim.own[clamp(Math.floor(cur.x), 0, W - 1) + clamp(Math.floor(cur.y), 0, H - 1) * W];
            ringEl.style.transform = `translate(${cur.x * px}px, ${cur.y * px}px)`;
            ringEl.style.color = cur.who === 1 ? ORANGE : FOREST;
            arc.setAttribute("r", String(v ? Math.max(6, Math.sqrt(v / Math.PI) * px) : 0));
            arc.setAttribute("stroke-dasharray", !free ? "2 5" : hold || (bot && bot.charge >= 0) ? "none" : "5 4");
            ringEl.style.opacity = free || cur.who === 2 ? "1" : ".45";
        }

        const dropAt = (who: number, x: number, y: number, vol: number) => {
            const c = clamp(Math.floor(x), 0, W - 1) + clamp(Math.floor(y), 0, H - 1) * W;
            if (sim.own[c]) return false;
            sim.next(); sim.drop(who, c, vol);
            ink[who] -= vol; drops[who]--;
            dropped.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 });
            phase = "spread"; nextWho = who === 1 ? 2 : 1; animT = 0; from = sim.clock;
            if (who === 1) { mine.x = cur.x; mine.y = cur.y; navigator.vibrate?.(8); }
            drawRing(); report(); kick();
            return true;
        };

        const startBot = () => {
            phase = "bot";
            const left = drops[2], avg = ink[2] / left;
            const vol = clamp(left === 1 ? ink[2] : avg * (rnd() < 0.22 ? 1.7 : 0.75 + rnd() * 0.5), Z.min, most(N, ink[2], left));
            // its timing is its personality: stung by a drop beside its wet ink it answers at once, well ahead it dawdles
            const prev = dropped[dropped.length - 1], lead = (sim.cnt[2] - sim.cnt[1]) / N;
            const stung = !!prev && sim.blots.some((b) => b.who === 2 && b.rem > 0.25 * b.v && Math.hypot((b.c % W) - prev.x, ((b.c / W) | 0) - prev.y) < Math.sqrt(b.v) * 0.9);
            bot = {
                gen: think(sim, vol, rnd), picks: null, seen: [], vol, tx: cur.x, ty: cur.y, charge: -1, ct: 0, feint: 0,
                k: stung ? 16 : lead > 0.08 ? 5 : 9, wait: RM ? 450 : stung ? 100 : 250 + rnd() * 200, hops: RM || stung ? 0 : lead > 0.08 ? 2 : (rnd() * 2) | 0,
            };
            if (cur.who !== 2) { cur.x = W * (0.6 + rnd() * 0.3); cur.y = H * (0.2 + rnd() * 0.6); bot.tx = cur.x; bot.ty = cur.y; }
            cur.who = 2; cur.show = true; hold = null;
            report(); kick();
        };

        const stepBot = (dt: number, b: Bot) => {
            const t0 = performance.now(); // think a little each frame: at least one try, then up to ~4 ms
            if (!b.picks) do { const n = b.gen.next(); if (n.done) b.picks = n.value; else b.seen.push(n.value); } while (!b.picks && performance.now() - t0 < 4);
            const a = RM ? 1 : 1 - Math.exp((-dt / 1000) * b.k);
            cur.x += (b.tx - cur.x) * a; cur.y += (b.ty - cur.y) * a;
            if (b.charge >= 0) {
                b.ct += dt;
                b.charge = clamp(b.ct / (RM ? 300 : 220 + 800 * ((b.vol - Z.min) / (Z.max - Z.min))), 0, 1);
                if (b.charge >= 1) { bot = null; if (!dropAt(2, b.tx, b.ty, b.vol)) startBot(); }
                return;
            }
            b.feint -= dt; b.wait -= dt;
            if (b.wait > 0 || Math.hypot(b.tx - cur.x, b.ty - cur.y) > 0.6) return;
            if (b.hops > 0 && b.seen.length) { // drift over a spot it is weighing, now and then as if to drop there
                const c = b.seen[(rnd() * b.seen.length) | 0];
                b.tx = (c % W) + 0.5; b.ty = ((c / W) | 0) + 0.5; b.hops--; b.wait = 180 + rnd() * 200;
                if (rnd() < 0.3) { b.feint = 380; b.wait += 220; }
                return;
            }
            if (!b.picks) return;
            const w = rnd(), c = b.picks[Math.min(b.picks.length - 1, w < 0.6 ? 0 : w < 0.86 ? 1 : 2)]?.c;
            if (c === undefined) { bot = null; finish(); return; } // no paper left
            b.picks = [b.picks.find((p) => p.c === c)!]; // decided
            const x = (c % W) + 0.5, y = ((c / W) | 0) + 0.5;
            if (Math.hypot(x - b.tx, y - b.ty) > 0.1) { b.tx = x; b.ty = y; b.wait = 120 + rnd() * 200; return; }
            b.charge = 0;
        };

        const finish = () => {
            phase = "done"; cur.show = false; regT = RM ? -1 : 0; reg = RM ? 0.6 : 5;
            setMarks([...dropped]);
            drawRing(); report(); dirty = true; kick();
        };

        const step = (dt: number) => {
            if (regT >= 0) { // the plates swing into register as the print is pulled
                regT += dt;
                const k = clamp(regT / 1100, 0, 1);
                reg = 0.6 + 4.4 * (1 - k) ** 3 * Math.cos(k * 9);
                if (k >= 1) regT = -1;
                dirty = true;
            }
            if (phase === "spread" || phase === "settle") {
                animT += dt;
                const dur = RM ? 450 : phase === "settle" ? 900 : ANIM, k = clamp(animT / dur, 0, 1);
                sim.run(from + TURN * (RM ? k : 1 - (1 - k) ** 2));
                upload(); report();
                if (k >= 1) {
                    if (drops[1] + drops[2] === 0 || sim.cnt[1] + sim.cnt[2] >= N) {
                        if (sim.live()) { sim.next(); phase = "settle"; animT = 0; from = sim.clock; } else finish();
                    } else if (nextWho === 2) startBot();
                    else { phase = "you"; cur.who = 1; cur.x = mine.x; cur.y = mine.y; cur.show = document.activeElement === canvas; report(); }
                }
            } else if (phase === "bot" && bot) stepBot(dt, bot);
            if (phase === "you" || phase === "bot") drawRing();
        };
        const busy = () => dirty || regT >= 0 || phase === "spread" || phase === "settle" || phase === "bot" || !!hold;
        const frame = (now: number) => {
            raf = 0;
            const dt = Math.min(100, now - last);
            last = now;
            step(dt);
            if (dirty) { gfx.draw(reg, night()); dirty = false; }
            kick();
        };
        function kick() {
            if (!raf && onScreen && !document.hidden && busy()) { last = performance.now(); raf = requestAnimationFrame(frame); }
        }

        // input: the mouse aims, press and hold charges, release drops; the keyboard moves a cursor and holds Space
        const toGrid = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            cur.x = clamp(((e.clientX - r.left) / r.width) * W, 0, W - 0.01);
            cur.y = clamp(((e.clientY - r.top) / r.height) * H, 0, H - 0.01);
        };
        const aim = () => { cur.show = true; cur.who = 1; drawRing(); };
        const release = () => {
            if (!hold || phase !== "you") { hold = null; return; }
            const v = volOf(1, held());
            hold = null;
            if (!dropAt(1, cur.x, cur.y, v)) drawRing();
        };
        const onMove = (e: PointerEvent) => { if (phase === "you") { toGrid(e); aim(); } };
        const onDown = (e: PointerEvent) => {
            if (phase !== "you" || e.button > 0) return;
            canvas.setPointerCapture(e.pointerId);
            toGrid(e);
            hold = { t0: performance.now(), key: false };
            aim(); kick();
        };
        const onUp = () => { if (hold && !hold.key) release(); };
        const onCancel = () => { hold = null; drawRing(); };
        const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse" && !hold && phase === "you") { cur.show = false; drawRing(); } };
        const MV: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const onKey = (e: KeyboardEvent) => {
            const m = MV[e.key];
            if (m) {
                e.preventDefault();
                if (phase !== "you") return;
                const s = e.shiftKey ? 8 : 2.5;
                cur.x = clamp(cur.x + m[0] * s, 0, W - 0.01); cur.y = clamp(cur.y + m[1] * s, 0, H - 0.01);
                aim();
            } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (e.repeat || phase !== "you" || hold) return;
                hold = { t0: performance.now(), key: true };
                aim(); kick();
            }
        };
        const onKeyUp = (e: KeyboardEvent) => { if ((e.key === " " || e.key === "Enter") && hold?.key) release(); };
        const onFocus = () => { if (phase === "you") aim(); };
        const onBlur = () => { if (phase === "you" && hold?.key) hold = null; };
        const evs = [["pointermove", onMove], ["pointerdown", onDown], ["pointerup", onUp], ["pointercancel", onCancel], ["pointerleave", onLeave], ["keydown", onKey], ["keyup", onKeyUp], ["focus", onFocus], ["blur", onBlur]] as const;
        for (const [t, f] of evs) canvas.addEventListener(t, f as EventListener);

        const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; kick(); });
        io.observe(canvas);
        const ro = new ResizeObserver(fit);
        ro.observe(wrap);
        document.addEventListener("visibilitychange", kick);
        const mo = new MutationObserver(() => { dirty = true; kick(); });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        grain.onload = () => { dirty = true; kick(); };
        const lost = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; };
        const restored = () => { gfx = makeGL(canvas, grain) ?? make2D(canvas); gfx.paper(P); fit(); upload(); };
        canvas.addEventListener("webglcontextlost", lost);
        canvas.addEventListener("webglcontextrestored", restored);
        reset();
        return () => {
            cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect();
            document.removeEventListener("visibilitychange", kick);
            canvas.removeEventListener("webglcontextlost", lost); canvas.removeEventListener("webglcontextrestored", restored);
            for (const [t, f] of evs) canvas.removeEventListener(t, f as EventListener);
            gfx.free(); canvas.remove();
        };
    }, []);

    const done = hud.turn === "done", win = hud.pct[0] === hud.pct[1] ? 0 : hud.pct[0] > hud.pct[1] ? 1 : 2;
    const side = (i: 0 | 1) => {
        const col = i ? FOREST : ORANGE, active = hud.turn === (i ? "bot" : "you");
        return (
            <div className={`flex flex-col gap-1.5 ${i ? "items-end" : "items-start"}`}>
                <div className={`flex items-center gap-2 ${i ? "flex-row-reverse" : ""}`}>
                    <span className="w-3 h-3 rounded-full border border-stroke/30" style={{ background: col }} />
                    <span className={`eyebrow ${active ? "text-heading underline decoration-2 underline-offset-4" : "text-paragraph"}`}>{i ? "Bot" : "You"}</span>
                    <span className="text-2xl sm:text-3xl font-bold tracking-[-0.04em] text-heading tabular-nums">{hud.pct[i]}%</span>
                </div>
                <div className={`flex gap-1 ${i ? "flex-row-reverse" : ""}`} role="img" aria-label={`Drops left: ${hud.drops[i]}`}>
                    {Array.from({ length: DROPS }, (_, k) => (
                        <span key={k} className="w-2.5 h-2.5 rounded-full border border-stroke/40" style={{ background: k < hud.drops[i] ? col : "transparent" }} />
                    ))}
                </div>
                {/* ink left; while you hold, the share the drop will take shows dark */}
                <div className="relative h-1.5 w-24 sm:w-32 rounded-full overflow-hidden border border-stroke/20" style={{ background: CREAM }} aria-hidden>
                    <div className={`absolute inset-y-0 ${i ? "right-0" : "left-0"}`} style={{ width: `${hud.ink[i] * 100}%`, background: col }} />
                    {!i && <div className="absolute inset-y-0 left-0" style={{ width: `${hud.ink[0] * 100}%` }}><div ref={spend} className="absolute inset-y-0 right-0" style={{ width: 0, background: INK, opacity: 0.55 }} /></div>}
                </div>
            </div>
        );
    };
    const crop = "absolute w-4 h-4 border-heading/50 pointer-events-none";

    return (
        <div className="mx-auto w-full" style={{ maxWidth: `min(100%, calc((100vh - 280px) * ${grid.W / grid.H}))` }}>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 mb-3">
                {side(0)}
                <span className="eyebrow text-paragraph pb-0.5 hidden sm:block">Drops left</span>
                {side(1)}
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden border border-stroke/20 mb-6" style={{ background: CREAM }} aria-hidden>
                <div style={{ width: `${hud.pct[0]}%`, background: ORANGE }} className="transition-[width] duration-300" />
                <div className="flex-1" />
                <div style={{ width: `${hud.pct[1]}%`, background: FOREST }} className="transition-[width] duration-300" />
            </div>
            <div className="relative">
                <span className={`${crop} -left-3 -top-3 border-r border-b`} /><span className={`${crop} -right-3 -top-3 border-l border-b`} />
                <span className={`${crop} -left-3 -bottom-3 border-r border-t`} /><span className={`${crop} -right-3 -bottom-3 border-l border-t`} />
                <div ref={box} className="relative rounded-[3px] overflow-hidden" style={{ boxShadow: "0 18px 40px -22px rgb(40 30 0 / .6), 0 0 0 1px rgb(38 32 26 / .18)" }}>
                    <svg ref={ring} className="absolute left-0 top-0 overflow-visible pointer-events-none transition-opacity duration-150" width="1" height="1" style={{ opacity: 0 }} aria-hidden>
                        <circle r="0" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <circle r="2.6" fill="currentColor" />
                        <path d="M-8 0h-5M8 0h5M0-8v-5M0 8v5" stroke={INK} strokeWidth="1.2" />
                    </svg>
                    {done && (
                        <svg viewBox={`0 0 ${grid.W} ${grid.H}`} className="absolute inset-0 w-full h-full pointer-events-none mix-blend-multiply" aria-hidden>
                            {marks.map((m, k) => (
                                <g key={k} transform={`translate(${m.x} ${m.y})`} stroke={INK} strokeWidth=".3" fill="none" opacity=".75">
                                    <circle r="1.5" /><path d="M-2.6 0H2.6M0-2.6V2.6" />
                                </g>
                            ))}
                        </svg>
                    )}
                </div>
            </div>
            {done ? (
                <div aria-live="polite">
                    {/* colour bar, as on a press sheet's margin */}
                    <div className="mt-2 flex justify-end" aria-hidden>
                        {[INK, FOREST, MUSTARD, CREAM, ORANGE].map((c) => <span key={c} className="w-3 h-3 border border-stroke/20" style={{ background: c }} />)}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                            <span className="eyebrow text-paragraph">{win === 0 ? "You · Bot" : win === 1 ? "You" : "Bot"}</span>
                            <span className="text-5xl font-bold tracking-[-0.05em] text-heading tabular-nums">{hud.pct[win === 2 ? 1 : 0]}%</span>
                        </div>
                        <button className="pill-dark" onClick={() => again.current?.()}>Play again</button>
                    </div>
                </div>
            ) : (
                <p className="mt-7 text-center text-sm text-paragraph">Hold to drop ink, longer for more. Cover more paper than the bot.</p>
            )}
        </div>
    );
}
