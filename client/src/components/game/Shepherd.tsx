import { useEffect, useRef, useState } from "react";

// Cloud shepherd: drag across the sky to blow the hero's engraved clouds into the shape traced on it. When they cover
// 80% of it, the clouds blow off and the shape prints (colour plates slide into register), then the next shape comes.
// Wind is a coarse air grid: the pointer pulls the air towards its own velocity under a Gaussian, the air carries itself
// along and a few Jacobi passes keep it divergence-free, so a swipe leaves a jet with curling return flow. Clouds feel drag
// towards that air plus a slow crosswind (gusts every ~16 s, curl noise) that scatters them again; the shape is a lee that
// holds the ones inside it and lets them drift into its gaps. Coverage is counted on a 10-unit grid: each shape cell under
// a cloud is looked up in that cloud's sprite alpha. The world is 1000 units wide. One rAF loop runs only while the game
// is started, on screen and the tab is visible (and, with reduced motion, only while something still moves).

const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const SHEET = "/art/game/shepherd/clouds.webp"; // cut from /art/clouds.webp: grey = shading, alpha = cloud
const RECTS = [[4, 4, 327, 210], [335, 4, 301, 167], [640, 4, 349, 208], [993, 4, 189, 108]];
// plates per print, rotated like the crate sleeves: [plate A, plate B] on the day stock and on the night stock
const DAY = [[ORANGE, FOREST], [FOREST, ORANGE], [ORANGE, INK], [FOREST, ORANGE]];
const NIGHT = [[MUSTARD, ORANGE], [ORANGE, CREAM], [CREAM, MUSTARD], [MUSTARD, ORANGE]];
const TAU = Math.PI * 2, W = 1000, CELL = 10, AIR = 32, GOAL = 0.8, SM = 40, N = 16;

// shapes in a unit box about ±1, painted with the current fill and stroke style (wide: the sky is landscape)
const logo: Path2D[] = [];
const brace = new Path2D("M.42-1C.06-1 .06-.84 .06-.6V-.32C.06-.1-.08 0-.42 0C-.08 0 .06.1 .06.32V.6C.06.84 .06 1 .42 1");
const SHAPES: { paint: (c: CanvasRenderingContext2D, wide: boolean) => void }[] = [
    { paint: (c, wide) => { // curly bracket, or a pair of them in a wide sky
        c.lineWidth = 0.32; c.lineCap = c.lineJoin = "round";
        if (!wide) return c.stroke(brace);
        c.translate(-0.75, 0); c.stroke(brace); c.translate(1.5, 0); c.scale(-1, 1); c.stroke(brace);
    } },
    { paint: (c) => { // robot head
        const p = new Path2D();
        p.roundRect(-0.8, -0.45, 1.6, 1.22, 0.3);
        p.moveTo(-0.17, 0.08); p.arc(-0.36, 0.08, 0.19, 0, TAU);
        p.moveTo(0.55, 0.08); p.arc(0.36, 0.08, 0.19, 0, TAU);
        p.roundRect(-0.38, 0.42, 0.76, 0.15, 0.07);
        c.fill(p, "evenodd");
        c.fillRect(-1.02, -0.08, 0.3, 0.46); c.fillRect(0.72, -0.08, 0.3, 0.46);
        c.fillRect(-0.08, -0.8, 0.16, 0.4);
        c.beginPath(); c.arc(0, -0.86, 0.2, 0, TAU); c.fill();
    } },
    { paint: (c) => { // the rc. mark from the navbar, inked fat
        c.scale(1 / 30, 1 / 30); c.translate(-32, -22);
        c.lineWidth = 6.5; c.lineJoin = "round";
        for (const p of logo) { c.fill(p); c.stroke(p); }
    } },
    { paint: (c) => { // arrow
        c.rotate(-0.32); c.lineWidth = 0.44; c.lineCap = c.lineJoin = "round";
        c.beginPath(); c.moveTo(-1.05, 0); c.lineTo(0.3, 0); c.stroke();
        c.lineWidth = 0.12; c.beginPath(); c.moveTo(0.1, -0.62); c.lineTo(1.05, 0); c.lineTo(0.1, 0.62); c.closePath(); c.fill(); c.stroke();
    } },
];

type Cloud = { x: number; y: number; vx: number; vy: number; ex: number; ey: number; evx: number; evy: number; s: number; sz: number; w: number; h: number; m: number; flip: number; ph: number };
type Puff = { x: number; y: number; vx: number; vy: number; age: number; life: number; w: number };

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export default function Shepherd() {
    const cv = useRef<HTMLCanvasElement>(null);
    const [hud, setHud] = useState({ pct: 0, done: 0, on: false });
    const api = useRef({ start: () => {}, restart: () => {}, next: () => {}, key: (() => {}) as (name: string, down: boolean) => void });

    useEffect(() => {
        const canvas = cv.current!, ctx = canvas.getContext("2d")!;
        const mq = matchMedia("(prefers-reduced-motion: reduce)");
        let reduce = mq.matches, night = document.documentElement.dataset.theme === "dark";
        let H = 625, cssW = 1, k = 1, U = 790;
        // air grid (AIR columns, periodic in x)
        let GY = 25, u = new Float32Array(0), v = u, u2 = u, v2 = u, pr = u, dv = u;
        const CS = W / AIR, LC = Int32Array.from({ length: AIR }, (_, i) => (i ? -1 : AIR - 1)), RC = Int32Array.from({ length: AIR }, (_, i) => (i < AIR - 1 ? 1 : 1 - AIR));
        let airy = false;
        // shape: mask on the coverage grid, signed distance in cells (negative inside), outline dots, placement
        let MX = 100, MY = 63, mask = new Uint8Array(0), sd = new Float32Array(0), gap = new Int16Array(0), hit = mask, queue = new Int32Array(0), area = 1;
        let dots: number[] = [], key: number[] = [], sc = 1, cx = 500, cy = 300, shape = 0;
        let plateA = ORANGE;
        const plateB = document.createElement("canvas"); // plate B's halftone screen, cut to the shape
        let spriteMasks: Uint8Array[] = []; // each sprite's alpha on a SM x SM grid, for counting coverage on the CPU
        const bg = document.createElement("canvas"), bctx = bg.getContext("2d")!;
        let sprites: HTMLCanvasElement[] = [];
        const paper = new Image(), sheet = new Image();
        const clouds: Cloud[] = [], puffs: Puff[] = [];
        let phase: "play" | "press" | "print" | "shown" = "play", pt = 0, fill = 0, done = 0, started = false, time = 0, frameN = 0;
        // pointer segments since the last step: x0, y0, x1, y1, vx, vy
        let segs: number[] = [], down = false, px = 0, py = 0, pvx = 0, pvy = 0, pT = 0;
        const keys = new Set<string>();
        let bx = 500, by = 300, bvx = 0, bvy = 0, breath = 0;
        const wind = [0, 0];

        // ---------- shape ----------
        function paintShape(c: CanvasRenderingContext2D, style: string | CanvasPattern, s = sc) {
            c.save(); c.translate(cx, cy); c.scale(s, s);
            c.fillStyle = c.strokeStyle = style;
            SHAPES[shape % SHAPES.length].paint(c, H < W * 0.9);
            c.restore();
        }
        function buildShape() {
            const mc = document.createElement("canvas"), mw = W / 2, mh = Math.round(H / 2);
            mc.width = mw; mc.height = mh;
            const m = mc.getContext("2d", { willReadFrequently: true })!;
            const alpha = () => { const d = m.getImageData(0, 0, mw, mh).data, a = new Uint8Array(mw * mh); for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3]; return a; };
            // measure at a trial scale, then size it to ~55% of the clouds' area and fit it in the sky
            cx = W / 2; cy = H / 2;
            m.setTransform(0.5, 0, 0, 0.5, 0, 0); paintShape(m, "#000", 160);
            let a = alpha(), n = 0, x0 = mw, x1 = 0, y0 = mh, y1 = 0;
            for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) if (a[y * mw + x] > 127) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
            const cloudArea = clouds.reduce((s, c) => s + c.w * c.h * 0.62, 0);
            const bw = (x1 - x0 + 1) * 2, bh = (y1 - y0 + 1) * 2;
            sc = Math.min(160 * Math.sqrt((cloudArea * 0.55) / (Math.max(1, n) * 4)), (160 * W * 0.84) / bw, (160 * H * 0.76) / bh);
            cx = W / 2 - (x0 + x1 - mw) * (sc / 160); cy = H / 2 - (y0 + y1 - mh) * (sc / 160);
            m.clearRect(0, 0, W, H); paintShape(m, "#000");
            a = alpha();
            MX = W / CELL; MY = Math.ceil(H / CELL);
            mask = new Uint8Array(MX * MY); hit = new Uint8Array(MX * MY); gap = new Int16Array(MX * MY); queue = new Int32Array(MX * MY); area = 0;
            for (let j = 0; j < MY; j++) for (let i = 0; i < MX; i++) {
                const q = a[Math.min(mh - 1, j * 5 + 2) * mw + i * 5 + 2] > 127 ? 1 : 0;
                mask[j * MX + i] = q; area += q;
            }
            area = Math.max(1, area);
            // signed distance (chamfer, a forward and a backward pass, for the inside and the outside)
            const din = new Float32Array(MX * MY), dout = new Float32Array(MX * MY);
            for (let i = 0; i < mask.length; i++) { din[i] = mask[i] ? 1e4 : 0; dout[i] = mask[i] ? 0 : 1e4; }
            for (const d of [din, dout]) {
                for (let j = 0; j < MY; j++) for (let i = 0; i < MX; i++) {
                    const q = j * MX + i;
                    if (i) d[q] = Math.min(d[q], d[q - 1] + 1);
                    if (j) { d[q] = Math.min(d[q], d[q - MX] + 1); if (i) d[q] = Math.min(d[q], d[q - MX - 1] + 1.41); if (i < MX - 1) d[q] = Math.min(d[q], d[q - MX + 1] + 1.41); }
                }
                for (let j = MY - 1; j >= 0; j--) for (let i = MX - 1; i >= 0; i--) {
                    const q = j * MX + i;
                    if (i < MX - 1) d[q] = Math.min(d[q], d[q + 1] + 1);
                    if (j < MY - 1) { d[q] = Math.min(d[q], d[q + MX] + 1); if (i < MX - 1) d[q] = Math.min(d[q], d[q + MX + 1] + 1.41); if (i) d[q] = Math.min(d[q], d[q + MX - 1] + 1.41); }
                }
            }
            sd = new Float32Array(MX * MY);
            for (let i = 0; i < sd.length; i++) sd[i] = mask[i] ? -din[i] : dout[i];
            // outline: the points where the mask's alpha crosses half
            const pts: number[] = [];
            for (let y = 0; y < mh - 1; y++) for (let x = 0; x < mw - 1; x++) {
                const p = a[y * mw + x], r = a[y * mw + x + 1], b = a[(y + 1) * mw + x];
                if ((p > 127) !== (r > 127)) pts.push((x + (127.5 - p) / (r - p)) * 2 + 1, y * 2 + 1);
                if ((p > 127) !== (b > 127)) pts.push(x * 2 + 1, (y + (127.5 - p) / (b - p)) * 2 + 1);
            }
            // walk the crossings into chains (always to the nearest unvisited one) and drop a dot every s along them
            const np = pts.length / 2, used = new Uint8Array(np), grid = new Map<number, number[]>(), G = 6;
            for (let i = 0; i < np; i++) { const id = Math.floor(pts[i * 2] / G) * 4096 + Math.floor(pts[i * 2 + 1] / G); (grid.get(id) ?? grid.set(id, []).get(id)!).push(i); }
            const along = (s: number) => {
                const out: number[] = [];
                used.fill(0);
                for (let st = 0; st < np; st++) {
                    if (used[st]) continue;
                    let cur = st, acc = s;
                    for (;;) {
                        used[cur] = 1;
                        const x = pts[cur * 2], y = pts[cur * 2 + 1];
                        if (acc >= s) { out.push(x, y); acc = 0; }
                        let best = -1, bd = G * G;
                        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
                            for (const j of grid.get((Math.floor(x / G) + dx) * 4096 + Math.floor(y / G) + dy) ?? []) {
                                const d = (pts[j * 2] - x) ** 2 + (pts[j * 2 + 1] - y) ** 2;
                                if (!used[j] && d < bd) { bd = d; best = j; }
                            }
                        if (best < 0) break;
                        acc += Math.sqrt(bd); cur = best;
                    }
                }
                return out;
            };
            dots = along((13 * W) / cssW); key = along(2);
        }
        const cellAt = (x: number, y: number) => Math.min(MY - 1, Math.max(0, (y / CELL) | 0)) * MX + Math.min(MX - 1, Math.max(0, (x / CELL) | 0));

        // ---------- sky ----------
        // AM halftone: dots on a rotated lattice, radius from r(x, y)
        function halftone(c: CanvasRenderingContext2D, pitch: number, x0: number, y0: number, x1: number, y1: number, r: (x: number, y: number) => number) {
            const cs = Math.cos(0.26), sn = Math.sin(0.26), R = Math.hypot(x1 - x0, y1 - y0) / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            c.beginPath();
            for (let a = -R; a < R; a += pitch) for (let b = -R; b < R; b += pitch) {
                const x = mx + a * cs - b * sn, y = my + a * sn + b * cs;
                if (x < x0 || x > x1 || y < y0 || y > y1) continue;
                const rr = r(x, y);
                if (rr > 0.15) { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); }
            }
            c.fill();
        }
        function buildBg() {
            bg.width = canvas.width; bg.height = canvas.height;
            const c = bctx, p1 = W / cssW; // one css pixel in world units
            c.setTransform(k, 0, 0, k, 0, 0);
            c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
            c.fillStyle = night ? FOREST : MUSTARD; c.fillRect(0, 0, W, H);
            const [A, B] = (night ? NIGHT : DAY)[shape % 4];
            const sx = W * 0.83, sy = H * 0.2, sr = Math.min(W, H) * 0.085, box = [sx - sr * 1.4, sy - sr * 1.4, sx + sr * 1.4, sy + sr * 1.4] as const;
            if (night) {
                // deeper ink towards the top, a moon and a few stars printed in screen
                const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(38,32,26,.75)"); g.addColorStop(1, "rgba(38,32,26,.15)");
                c.globalCompositeOperation = "multiply"; c.fillStyle = g; c.fillRect(0, 0, W, H);
                c.globalCompositeOperation = "screen"; c.fillStyle = CREAM; c.globalAlpha = 0.85;
                halftone(c, 7 * p1, ...box, (x, y) => 3.6 * p1 * smooth(1.15, 0.7, Math.hypot(x - sx, y - sy) / sr) * smooth(0.55, 0.95, Math.hypot(x - sx - sr * 0.45, y - sy + sr * 0.3) / sr));
                c.fillStyle = MUSTARD; c.globalAlpha = 0.7;
                let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
                c.beginPath();
                for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H * 0.8, rr = (0.6 + r() * 1.4) * p1; c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); }
                c.fill();
            } else {
                // a halftone sun and a warm screen low in the sky, printed in multiply
                c.globalCompositeOperation = "multiply"; c.fillStyle = ORANGE; c.globalAlpha = 0.75;
                halftone(c, 7 * p1, ...box, (x, y) => 3.7 * p1 * smooth(1.25, 0.65, Math.hypot(x - sx, y - sy) / sr));
                c.globalAlpha = 0.3;
                halftone(c, 6 * p1, 0, H * 0.62, W, H, (_x, y) => 2.6 * p1 * smooth(H * 0.62, H * 1.08, y) ** 1.5);
            }
            // plate B: the shape filled with a rotated dot screen; its ghost marks the target, then the dotted outline
            const tile = document.createElement("canvas"), tp = Math.max(4, Math.round(6 * p1 * k));
            tile.width = tile.height = tp;
            const t = tile.getContext("2d")!; t.fillStyle = B; t.beginPath(); t.arc(tp / 2, tp / 2, tp * 0.27, 0, TAU); t.fill();
            plateB.width = bg.width; plateB.height = bg.height;
            const pb = plateB.getContext("2d")!, pat = pb.createPattern(tile, "repeat")!;
            pat.setTransform(new DOMMatrix().rotate(15));
            pb.setTransform(k, 0, 0, k, 0, 0); paintShape(pb, B);
            pb.setTransform(1, 0, 0, 1, 0, 0); pb.globalCompositeOperation = "source-in"; pb.fillStyle = pat; pb.fillRect(0, 0, bg.width, bg.height);
            plateA = A;
            c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = night ? 0.3 : 0.24;
            c.drawImage(plateB, 0, 0);
            c.setTransform(k, 0, 0, k, 0, 0); c.globalCompositeOperation = "source-over"; c.globalAlpha = 0.9;
            c.fillStyle = night ? CREAM : INK; c.beginPath();
            const dr = 2.1 * p1;
            for (let i = 0; i < dots.length; i += 2) { c.moveTo(dots[i] + dr, dots[i + 1]); c.arc(dots[i], dots[i + 1], dr, 0, TAU); }
            c.fill();
            // printer's register marks in the corners
            c.globalAlpha = 0.6; c.strokeStyle = night ? CREAM : INK; c.lineWidth = p1;
            for (const [x, y] of [[16, 16], [-16, 16], [16, -16], [-16, -16]]) {
                const mx = (x < 0 ? cssW + x : x) * p1, my = y < 0 ? H + y * p1 : y * p1, r = 6 * p1;
                c.beginPath(); c.arc(mx, my, r * 0.6, 0, TAU); c.moveTo(mx - r, my); c.lineTo(mx + r, my); c.moveTo(mx, my - r); c.lineTo(mx, my + r); c.stroke();
            }
            // paper grain, as on the page
            if (paper.naturalWidth) {
                const pp = c.createPattern(paper, "repeat")!;
                pp.setTransform(new DOMMatrix().scale((512 * canvas.width) / cssW / paper.naturalWidth));
                c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = night ? 0.5 : 0.8; c.globalCompositeOperation = "overlay";
                c.fillStyle = pp; c.fillRect(0, 0, bg.width, bg.height);
            }
            c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
        }

        // the sheet's grey is the shading: recolour it once per theme (the hero's blue by day, dimmed as the hero is at night)
        function recolour() {
            const src = document.createElement("canvas"); src.width = sheet.width; src.height = sheet.height;
            const s = src.getContext("2d", { willReadFrequently: true })!; s.drawImage(sheet, 0, 0);
            const base = s.getImageData(0, 0, sheet.width, sheet.height);
            spriteMasks = RECTS.map(([x, y, w, h]) => {
                const m = new Uint8Array(SM * SM);
                for (let j = 0; j < SM; j++) for (let i = 0; i < SM; i++) m[j * SM + i] = +(base.data[((y + Math.floor(((j + 0.5) * h) / SM)) * sheet.width + x + Math.floor(((i + 0.5) * w) / SM)) * 4 + 3] > 110);
                return m;
            });
            sprites = [[[243, 230, 196], [79, 128, 150]], [[138, 134, 114], [34, 58, 64]]].map(([body, shade]) => {
                const out = document.createElement("canvas"); out.width = sheet.width; out.height = sheet.height;
                const d = new ImageData(new Uint8ClampedArray(base.data), sheet.width, sheet.height), p = d.data;
                for (let i = 0; i < p.length; i += 4) { const t = p[i] / 255; for (let c = 0; c < 3; c++) p[i + c] = body[c] + (shade[c] - body[c]) * t; }
                out.getContext("2d")!.putImageData(d, 0, 0);
                return out;
            });
        }

        // ---------- clouds and air ----------
        function sizeClouds() {
            U = Math.min(Math.sqrt(W * H), W * 0.9);
            for (const c of clouds) { const r = RECTS[c.s]; c.w = U * 0.175 * c.sz; c.h = (c.w * r[3]) / r[2]; c.m = 0.7 + 0.5 * c.sz; }
        }
        function scatter() {
            clouds.length = 0;
            for (let i = 0; i < N; i++) clouds.push({ x: 0, y: 0, vx: 0, vy: 0, ex: 0, ey: 0, evx: 0, evy: 0, s: i % 3, sz: 0.8 + (0.45 * ((i * 7) % N)) / N, w: 0, h: 0, m: 1, flip: i % 2 ? -1 : 1, ph: rnd(0, 6) });
            clouds.sort((a, b) => b.sz - a.sz);
            sizeClouds(); buildShape();
            // start them off the shape
            for (const c of clouds) for (let tries = 0; tries < 30; tries++) {
                c.x = rnd(0, W); c.y = rnd(c.h * 0.5, H - c.h * 0.5);
                if (sd[cellAt(c.x, c.y)] > 6) break;
            }
        }
        function airAt(f: Float32Array, x: number, y: number) {
            const fx = x / CS - 0.5, fy = Math.min(GY - 1.001, Math.max(0, y / CS - 0.5));
            const i0 = Math.floor(fx), j0 = fy | 0, tx = fx - i0, ty = fy - j0;
            const a = i0 < 0 ? i0 + AIR : i0 >= AIR ? i0 - AIR : i0, b = a + 1 === AIR ? 0 : a + 1, r0 = j0 * AIR, r1 = Math.min(GY - 1, j0 + 1) * AIR;
            return (f[r0 + a] * (1 - tx) + f[r0 + b] * tx) * (1 - ty) + (f[r1 + a] * (1 - tx) + f[r1 + b] * tx) * ty;
        }
        // a breath: pull the air towards (vx, vy) under a Gaussian of radius R, stretched and carried ahead along the stroke
        function splat(x: number, y: number, vx: number, vy: number, R: number) {
            const sp = Math.hypot(vx, vy) || 1, nx = vx / sp, ny = vy / sp, ax = x + nx * R * 0.7, ay = y + ny * R * 0.7;
            const i0 = Math.floor((ax - 3 * R) / CS), i1 = Math.ceil((ax + 3 * R) / CS), j0 = Math.max(0, Math.floor((ay - 3 * R) / CS)), j1 = Math.min(GY - 1, Math.ceil((ay + 3 * R) / CS));
            for (let j = j0; j <= j1; j++) for (let ii = i0; ii <= i1; ii++) {
                const dx = (ii + 0.5) * CS - ax, dy = (j + 0.5) * CS - ay, along = dx * nx + dy * ny, across = dx * ny - dy * nx;
                const w = 0.35 * Math.exp(-(along * along) / (3.2 * R * R) - (across * across) / (R * R));
                if (w < 0.01) continue;
                const q = j * AIR + (((ii % AIR) + AIR) % AIR);
                u[q] += (vx - u[q]) * w; v[q] += (vy - v[q]) * w;
            }
            airy = true;
        }
        function crosswind(x: number, y: number) {
            if (reduce) { wind[0] = wind[1] = 0; return; }
            const t = time, g = 9 + 26 * Math.max(0, Math.sin(t * 0.39 - 1.2)) ** 3, a = Math.PI + 0.35 * Math.sin(t * 0.05);
            const X = x / 170 + t * 0.21, Y = y / 140 - t * 0.13;
            wind[0] = Math.cos(a) * g + 15 * Math.sin(X) * Math.sin(Y);
            wind[1] = Math.sin(a) * g * 0.5 + 12 * Math.cos(X) * Math.cos(Y);
        }
        function puff(x: number, y: number, vx: number, vy: number, w: number, life = rnd(0.7, 1.3)) {
            if (puffs.length < 110) puffs.push({ x, y, vx, vy, age: 0, life, w });
        }

        // ---------- step ----------
        function step(dt: number) {
            time += dt; frameN++; pt += dt;
            const R = 75; // breath radius, in world units on every screen so a swipe moves a cloud as far
            // the pointer and the keyboard breath push the air
            for (let i = 0; i < segs.length; i += 6) {
                const x0 = segs[i], y0 = segs[i + 1], dx = segs[i + 2] - x0, dy = segs[i + 3] - y0, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (R * 0.4)));
                for (let s = 1; s <= n; s++) splat(x0 + (dx * s) / n, y0 + (dy * s) / n, segs[i + 4], segs[i + 5], R);
            }
            segs = [];
            if (keys.size) {
                const dx = +keys.has("ArrowRight") - +keys.has("ArrowLeft"), dy = +keys.has("ArrowDown") - +keys.has("ArrowUp");
                bvx += (dx * 620 - bvx) * Math.min(1, dt * 6); bvy += (dy * 620 - bvy) * Math.min(1, dt * 6);
                breath = 1;
            } else { bvx *= 0.85; bvy *= 0.85; breath = Math.max(0, breath - dt * 0.5); }
            if (Math.abs(bvx) + Math.abs(bvy) > 20) {
                bx = (bx + bvx * dt + W) % W; by = Math.min(H - 20, Math.max(20, by + bvy * dt));
                splat(bx, by, bvx, bvy, R);
                if (!reduce && Math.random() < dt * 14) puff(bx, by, bvx * 0.3 + rnd(-30, 30), bvy * 0.3 + rnd(-30, 30), U * rnd(0.04, 0.07));
            }
            // air: carries itself, stays divergence-free, dies down; still air is skipped
            if (airy) {
                const n = AIR * GY, decay = Math.exp(-dt / 0.45);
                for (let q = 0; q < n; q++) {
                    const i = q % AIR, x = (i + 0.5) * CS - u[q] * dt, y = ((q - i) / AIR + 0.5) * CS - v[q] * dt;
                    u2[q] = airAt(u, x, y); v2[q] = airAt(v, x, y);
                }
                [u, u2] = [u2, u]; [v, v2] = [v2, v];
                for (let q = 0; q < n; q++) { const i = q % AIR; dv[q] = -0.5 * (u[q + RC[i]] - u[q + LC[i]] + (q + AIR < n ? v[q + AIR] : 0) - (q >= AIR ? v[q - AIR] : 0)); pr[q] = 0; }
                for (let it = 0; it < 10; it++) for (let q = 0; q < n; q++) { const i = q % AIR; pr[q] = (dv[q] + pr[q + LC[i]] + pr[q + RC[i]] + pr[q >= AIR ? q - AIR : q] + pr[q + AIR < n ? q + AIR : q]) * 0.25; }
                let top = 0;
                for (let q = 0; q < n; q++) {
                    const i = q % AIR;
                    u[q] = (u[q] - 0.5 * (pr[q + RC[i]] - pr[q + LC[i]])) * decay;
                    v[q] = q < AIR || q + AIR >= n ? 0 : (v[q] - 0.5 * (pr[q + AIR] - pr[q - AIR])) * decay;
                    top = Math.max(top, Math.abs(u[q]) + Math.abs(v[q]));
                }
                if (top < 1) { u.fill(0); v.fill(0); airy = false; }
            }
            // clouds: drag towards air + crosswind; the shape holds the ones in it; they keep a little room between them
            const hold = phase === "play" || phase === "press";
            for (const c of clouds) {
                const q = cellAt(c.x, c.y), d = sd[q], shelter = hold && d < 0 ? 0.4 - 0.3 * smooth(0.5, 0.8, fill) : 1; // the shape is a lee, more so as it fills
                crosswind(c.x, c.y);
                const drag = 3 / c.m;
                let fx = (airAt(u, c.x, c.y) + wind[0] * shelter - c.vx) * drag, fy = (airAt(v, c.x, c.y) + wind[1] * shelter - c.vy) * drag;
                if (hold && d < 3) {
                    const i = q % MX, j = (q / MX) | 0;
                    const gx = sd[j * MX + Math.min(MX - 1, i + 1)] - sd[j * MX + Math.max(0, i - 1)], gy = sd[Math.min(MY - 1, j + 1) * MX + i] - sd[Math.max(0, j - 1) * MX + i];
                    const gl = Math.hypot(gx, gy) || 1, pull = 90 * smooth(-5, 0, d) * smooth(3, 1, d);
                    fx -= (gx / gl) * pull; fy -= (gy / gl) * pull;
                    if (d < 0) {
                        fx -= c.vx * 2.2; fy -= c.vy * 2.2;
                        const g0 = gap[q], at = (o: number) => (mask[q + o] ? gap[q + o] : g0);
                        if (g0 > 0 && g0 < 9999 && i > 1 && i < MX - 2 && j > 1 && j < MY - 2) {
                            const sx = at(-2) - at(2), sy = at(-2 * MX) - at(2 * MX), sl = Math.hypot(sx, sy);
                            if (sl) { fx += (sx / sl) * 45; fy += (sy / sl) * 45; }
                        }
                    }
                }
                if (phase === "press") { fx -= c.vx * 6; fy -= c.vy * 6; }
                c.vx += fx * dt; c.vy += fy * dt;
            }
            for (let i = 0; i < clouds.length; i++) for (let j = i + 1; j < clouds.length; j++) {
                const a = clouds[i], b = clouds[j], dx = b.x - a.x, dy = (b.y - a.y) * 1.7, d = Math.hypot(dx, dy), min = 0.33 * (a.w + b.w);
                if (d >= min || d < 0.01) continue;
                const f = ((min - d) / min) * 420 * dt, nx = dx / d, ny = dy / d;
                a.vx -= (nx * f) / a.m; a.vy -= (ny * f) / a.m; b.vx += (nx * f) / b.m; b.vy += (ny * f) / b.m;
            }
            for (const c of clouds) {
                c.x += c.vx * dt; c.y += c.vy * dt;
                const top = c.h * 0.32, bot = H - c.h * 0.3;
                if (c.y < top) c.vy += (top - c.y) * 9 * dt;
                if (c.y > bot) c.vy -= (c.y - bot) * 9 * dt;
                if (c.x < -c.w * 0.6) c.x += W + c.w * 1.2;
                if (c.x > W + c.w * 0.6) c.x -= W + c.w * 1.2;
                // soft body: it stretches along its speed on a spring, so it overshoots a little and wobbles back
                if (!reduce) {
                    let tx = c.vx * 0.0007, ty = c.vy * 0.0007; const tl = Math.hypot(tx, ty);
                    if (tl > 0.3) { tx *= 0.3 / tl; ty *= 0.3 / tl; }
                    c.evx += ((tx - c.ex) * 110 - c.evx * 9) * dt; c.evy += ((ty - c.ey) * 110 - c.evy * 9) * dt;
                    c.ex += c.evx * dt; c.ey += c.evy * dt;
                }
            }
            for (let i = puffs.length - 1; i >= 0; i--) {
                const p = puffs[i];
                p.age += dt;
                if (p.age > p.life) { puffs.splice(i, 1); continue; }
                crosswind(p.x, p.y);
                p.vx += (airAt(u, p.x, p.y) + wind[0] - p.vx) * 3.5 * dt; p.vy += (airAt(v, p.x, p.y) + wind[1] - p.vy) * 3.5 * dt - 12 * dt;
                p.x += p.vx * dt; p.y += p.vy * dt;
            }
            // coverage, a few times a second
            if (phase === "play" && frameN % 4 === 0) {
                // each shape cell under a cloud: map it back into that cloud's sprite and look at the sprite's alpha
                hit.fill(0);
                for (const cl of clouds) {
                    const [a, b, c, d] = shapeOf(cl), det = a * d - b * c, sm = spriteMasks[cl.s];
                    if (!sm) break;
                    const ex = Math.abs(a) * cl.w / 2 + Math.abs(c) * cl.h / 2, ey = Math.abs(b) * cl.w / 2 + Math.abs(d) * cl.h / 2;
                    for (let j = Math.max(0, ((cl.y - ey) / CELL) | 0); j <= Math.min(MY - 1, (cl.y + ey) / CELL); j++)
                        for (let i = Math.max(0, ((cl.x - ex) / CELL) | 0); i <= Math.min(MX - 1, (cl.x + ex) / CELL); i++) {
                            const q = j * MX + i;
                            if (!mask[q] || hit[q]) continue;
                            const wx = (i + 0.5) * CELL - cl.x, wy = (j + 0.5) * CELL - cl.y;
                            const lx = (d * wx - c * wy) / det / cl.w + 0.5, ly = (a * wy - b * wx) / det / cl.h + 0.5;
                            if (lx >= 0 && lx < 1 && ly >= 0 && ly < 1 && sm[((ly * SM) | 0) * SM + ((lx * SM) | 0)]) hit[q] = 1;
                        }
                }
                fill = hit.reduce((n, x) => n + x, 0) / area;
                // how far each shape cell is from a bare one, walking inside the shape: clouds in it drift down this into gaps
                let qh = 0, qt = 0;
                for (let q = 0; q < mask.length; q++) { gap[q] = mask[q] && !hit[q] ? 0 : 9999; if (!gap[q]) queue[qt++] = q; }
                while (qh < qt) {
                    const q = queue[qh++], i = q % MX, g = gap[q] + 1;
                    const go = (nb: number) => { if (mask[nb] && gap[nb] > g) { gap[nb] = g; queue[qt++] = nb; } };
                    if (i) go(q - 1);
                    if (i < MX - 1) go(q + 1);
                    if (q >= MX) go(q - MX);
                    if (q + MX < mask.length) go(q + MX);
                }
                if (fill >= GOAL) { phase = "press"; pt = 0; }
                sync();
            }
            if (phase === "press" && pt > (reduce ? 0 : 0.45)) {
                phase = "print"; pt = 0; done++; sync();
                if (!reduce) for (const c of clouds) {
                    const dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1, s = rnd(650, 900);
                    c.vx += (dx / d) * s; c.vy += (dy / d) * s * 0.7;
                    for (let i = 0; i < 4; i++) puff(c.x + rnd(-0.35, 0.35) * c.w, c.y + rnd(-0.3, 0.3) * c.h, (dx / d) * s * 0.5 + rnd(-60, 60), (dy / d) * s * 0.4 + rnd(-60, 60), U * rnd(0.03, 0.06), rnd(0.8, 1.4));
                }
            }
            if (phase === "print" && pt > 1.3) { phase = "shown"; pt = 0; }
            if (phase === "shown" && pt > 2.6) next();
        }

        // ---------- draw ----------
        // a cloud's linear transform (as setTransform's a, b, c, d): stretched along its wobble vector, breathing, maybe mirrored
        function shapeOf(cl: Cloud) {
            const e = Math.hypot(cl.ex, cl.ey), th = Math.atan2(cl.ey, cl.ex), cs = Math.cos(th), sn = Math.sin(th), s = 1 + e, t = 1 / Math.sqrt(s);
            const br = reduce ? 1 : 1 + 0.012 * Math.sin(time * 0.9 + cl.ph);
            const m11 = (cs * cs * s + sn * sn * t) * br, m12 = cs * sn * (s - t) * br, m22 = (sn * sn * s + cs * cs * t) * br;
            return [m11 * cl.flip, m12 * cl.flip, m12, m22];
        }
        function drawClouds(c: CanvasRenderingContext2D) {
            const img = sprites[+night];
            if (!img) return;
            for (const cl of clouds) {
                const [a, b, cc, d] = shapeOf(cl), r = RECTS[cl.s];
                c.setTransform(k * a, k * b, k * cc, k * d, k * cl.x, k * cl.y);
                c.drawImage(img, r[0], r[1], r[2], r[3], -cl.w / 2, -cl.h / 2, cl.w, cl.h);
            }
        }
        function draw() {
            const p1 = W / cssW;
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
            ctx.drawImage(bg, 0, 0);
            ctx.setTransform(k, 0, 0, k, 0, 0);
            if (phase !== "play") {
                // the dotted line inks in solid as the clouds press, then plates A and B slide into register (a hair off)
                const e = reduce ? 1 : smooth(0, 1.1, phase === "print" ? pt : phase === "shown" ? 9 : 0), off = (1 - e) * 26 + (3 * W) / cssW, fade = phase === "shown" ? 1 - smooth(1.9, 2.6, pt) : 1;
                if (phase !== "press") {
                    ctx.globalCompositeOperation = night ? "screen" : "multiply";
                    ctx.globalAlpha = Math.min(1, e * 2) * fade;
                    ctx.translate(-off, off * 0.6); paintShape(ctx, plateA);
                    ctx.setTransform(1, 0, 0, 1, off * 0.8 * k, -off * k); ctx.drawImage(plateB, 0, 0);
                    ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalCompositeOperation = "source-over";
                }
                ctx.globalAlpha = phase === "press" ? smooth(0, 0.45, pt) : fade; ctx.fillStyle = night ? CREAM : INK; ctx.beginPath();
                const r = 1.8 * p1;
                for (let i = 0; i < key.length; i += 2) { ctx.moveTo(key[i] + r, key[i + 1]); ctx.arc(key[i], key[i + 1], r, 0, TAU); }
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            if (reduce && phase !== "play") ctx.globalAlpha = 0.35;
            drawClouds(ctx);
            ctx.setTransform(k, 0, 0, k, 0, 0); ctx.globalAlpha = 1;
            const img = sprites[+night], r = RECTS[3];
            if (img) for (const p of puffs) {
                const a = p.age / p.life, w = p.w * (0.6 + 0.7 * a), h = (w * r[3]) / r[2];
                ctx.globalAlpha = smooth(0, 0.12, a) * (1 - a) * 0.7;
                ctx.drawImage(img, r[0], r[1], r[2], r[3], p.x - w / 2, p.y - h / 2, w, h);
            }
            if (breath > 0) {
                ctx.globalAlpha = breath * 0.8; ctx.strokeStyle = night ? CREAM : INK; ctx.lineWidth = 1.5 * p1;
                ctx.setLineDash([3 * p1, 4 * p1]); ctx.beginPath(); ctx.arc(bx, by, 16 * p1, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1;
        }

        // ---------- loop ----------
        let raf = 0, last = 0, vis = false, shown = { pct: -1, done: -1, on: false };
        function sync() {
            const pct = Math.min(100, Math.round(fill * 100));
            if (pct !== shown.pct || done !== shown.done || started !== shown.on) { shown = { pct, done, on: started }; setHud(shown); }
        }
        const moving = () => down || keys.size > 0 || phase !== "play" || puffs.length > 0 || clouds.some((c) => Math.abs(c.vx) + Math.abs(c.vy) > 1.5) || airy;
        function frame(t: number) {
            raf = 0;
            if (!started || !vis || document.hidden) return;
            step(Math.min(1 / 30, (t - last) / 1000)); last = t;
            draw();
            if (!reduce || moving()) raf = requestAnimationFrame(frame);
        }
        function kick() { if (!raf && started && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
        function next() {
            shape++; phase = "play"; pt = 0; fill = 0;
            buildShape(); buildBg(); sync(); draw();
        }

        function resize() {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (!w || !h) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 1.75), oldH = H;
            cssW = w; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            H = (W * h) / w; k = canvas.width / W;
            for (const c of clouds) c.y *= H / oldH;
            GY = Math.ceil(H / CS);
            [u, v, u2, v2, pr, dv] = [0, 0, 0, 0, 0, 0].map(() => new Float32Array(AIR * GY));
            if (!clouds.length) scatter(); else { sizeClouds(); buildShape(); }
            buildBg(); draw();
        }

        // ---------- input ----------
        const toWorld = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
        function onDown(e: PointerEvent) {
            if (!e.isPrimary) return;
            e.preventDefault(); canvas.setPointerCapture(e.pointerId);
            [px, py] = toWorld(e); pT = e.timeStamp; pvx = pvy = 0; down = true;
            if (!started) api.current.start();
            kick();
        }
        function onMove(e: PointerEvent) {
            if (!down || !e.isPrimary) return;
            const [x, y] = toWorld(e), dt = Math.max(0.008, (e.timeStamp - pT) / 1000);
            let vx = (x - px) / dt, vy = (y - py) / dt; const sp = Math.hypot(vx, vy);
            if (sp > 2600) { vx *= 2600 / sp; vy *= 2600 / sp; }
            pvx += (vx - pvx) * 0.6; pvy += (vy - pvy) * 0.6;
            segs.push(px, py, x, y, pvx, pvy);
            const L = Math.hypot(x - px, y - py);
            if (!reduce) for (let s = 0; s < Math.min(3, L / 30); s++) { const f = Math.random(); puff(px + (x - px) * f, py + (y - py) * f, pvx * 0.25 + rnd(-40, 40), pvy * 0.25 + rnd(-40, 40), U * rnd(0.035, 0.065)); }
            px = x; py = y; pT = e.timeStamp;
            kick();
        }
        const onUp = () => { down = false; };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);

        api.current = {
            start: () => { started = true; sync(); canvas.focus({ preventScroll: true }); kick(); },
            restart: () => { done = 0; shape = 0; phase = "play"; fill = 0; puffs.length = 0; u.fill(0); v.fill(0); scatter(); buildBg(); started = true; sync(); draw(); kick(); },
            next: () => { if (phase === "play") { next(); kick(); } },
            key: (name: string, isDown: boolean) => {
                if (!name.startsWith("Arrow")) return;
                if (!isDown) { keys.delete(name); return; }
                keys.add(name);
                if (!started) api.current.start();
                kick();
            },
        };

        sheet.onload = () => { recolour(); draw(); };
        sheet.src = SHEET;
        paper.onload = () => { buildBg(); draw(); };
        paper.src = "/art/paper.webp";
        fetch("/logo.svg").then((r) => r.text()).then((s) => {
            for (const m of s.matchAll(/ d="([^"]+)"/g)) logo.push(new Path2D(m[1]));
            if (shape % SHAPES.length === 2) { buildShape(); buildBg(); draw(); }
        }).catch(() => {});

        const ro = new ResizeObserver(resize); ro.observe(canvas);
        const io = new IntersectionObserver((es) => { vis = es[es.length - 1].isIntersecting; kick(); }); io.observe(canvas);
        const theme = new MutationObserver(() => { night = document.documentElement.dataset.theme === "dark"; buildBg(); draw(); });
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        const onMq = () => { reduce = mq.matches; kick(); };
        mq.addEventListener("change", onMq);
        document.addEventListener("visibilitychange", kick);
        return () => {
            cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); theme.disconnect();
            mq.removeEventListener("change", onMq); document.removeEventListener("visibilitychange", kick);
            canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointercancel", onUp);
        };
    }, []);

    const btn = "pill-light !px-4 !py-1.5 outline-none focus-visible:ring-4 focus-visible:ring-[#ff6509]";
    return (
        <div className="mx-auto max-w-5xl">
            <div className="card select-none p-2 sm:p-3">
                <div className="relative">
                    <canvas
                        ref={cv} tabIndex={0}
                        aria-label="Sky with clouds. Drag, or hold the arrow keys, to blow the clouds into the dotted shape."
                        onKeyDown={(e) => { if (e.key.startsWith("Arrow")) { e.preventDefault(); api.current.key(e.key, true); } }}
                        onKeyUp={(e) => api.current.key(e.key, false)}
                        onBlur={() => ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].forEach((a) => api.current.key(a, false))}
                        className="block w-full aspect-[4/5] sm:aspect-[16/10] rounded-xl touch-none cursor-grab active:cursor-grabbing outline-none focus-visible:ring-4 focus-visible:ring-[#ff6509]"
                    />
                    {!hud.on && (
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <button className="pill-dark pointer-events-auto outline-none focus-visible:ring-4 focus-visible:ring-[#ff6509]" onClick={() => api.current.start()}>Start</button>
                        </div>
                    )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1 pb-1">
                    <div role="progressbar" aria-label="Fill" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.pct} className="relative h-3 min-w-[8rem] flex-1 overflow-hidden rounded-full border border-stroke/30">
                        <div className="absolute inset-y-0 left-0 bg-tertiary transition-[width] duration-300" style={{ width: `${hud.pct}%` }} />
                        <div className="absolute inset-y-0 w-px bg-[rgb(var(--stroke))]" style={{ left: `${GOAL * 100}%` }} />
                    </div>
                    <span className="w-11 text-sm font-semibold tabular-nums text-heading">{hud.pct}%</span>
                    <div className="flex gap-1.5" aria-label={`${hud.done} printed`}>
                        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-2.5 w-2.5 rounded-full border border-stroke/40 ${i < (hud.done - 1) % 4 + 1 && hud.done ? "bg-primary" : ""}`} />)}
                    </div>
                    <div className="ml-auto flex gap-2">
                        <button className={btn} onClick={() => api.current.next()}>Next</button>
                        <button className={btn} onClick={() => api.current.restart()}>Restart</button>
                    </div>
                </div>
            </div>
            <p className="mt-4 text-center text-sm text-paragraph">Drag to blow the clouds into the shape</p>
        </div>
    );
}
