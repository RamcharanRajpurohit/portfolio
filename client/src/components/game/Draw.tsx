import { useEffect, useRef, useState, type PointerEvent as PE } from "react";
import { applyPalette, clearPalette, type Palette } from "../paintedTheme";

// "Draw": scribble on the sheet, then print it. The print re-inks the scribble as a two-colour screen print:
// smoothed variable-width key lines (perfect-freehand's streamline + simulated pressure, done here), enclosed
// regions found on a low-res raster (stroke ends joined across gaps, a small distance-field dilation, flood fill) and
// filled with solid or halftone plates so neighbours differ, the plates offset out of register, then paper grain.
// A print's palette can become the site's colours. Everything is drawn on demand: no loop runs while idle.

const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
// stock, plate A, plate B, key (as on the record sleeves)
const PALETTES: Palette[] = [
    [CREAM, ORANGE, FOREST, INK], [MUSTARD, FOREST, ORANGE, INK], [FOREST, MUSTARD, ORANGE, CREAM],
    [ORANGE, FOREST, MUSTARD, INK], [CREAM, FOREST, MUSTARD, INK], [INK, ORANGE, MUSTARD, CREAM],
];
type Stroke = number[][]; // [x, y, pressure] with x, y in sheet widths; pressure -1 = simulate from speed

function rng(seed: number) {
    let h = Math.imul(seed + 1, 2654435761);
    return () => {
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), 1 | h);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Symmetry 1 mirrors every stroke across the middle; 2 turns it six times round the centre. */
function expand(strokes: Stroke[], sym: number, h: number) {
    if (!sym) return strokes;
    const out: Stroke[] = [], cy = h / 2;
    for (const s of strokes) {
        if (sym === 1) { out.push(s, s.map(([x, y, p]) => [1 - x, y, p])); continue; }
        for (let k = 0; k < 6; k++) {
            const c = Math.cos(k * Math.PI / 3), n = Math.sin(k * Math.PI / 3);
            out.push(s.map(([x, y, p]) => [0.5 + (x - 0.5) * c - (y - cy) * n, cy + (x - 0.5) * n + (y - cy) * c, p]));
        }
    }
    return out;
}

/** The key plate: each stroke streamlined, given a radius from pressure (or speed), a slow wobble and ink pooled at
 *  its ends, as round-capped segments [x0, y0, x1, y1, width, ...] (one big union path rasterises far slower). */
function ink(strokes: Stroke[], W: number, size: number) {
    const seg: number[] = [];
    for (const s of strokes) {
        const P: number[][] = [];
        let x = s[0][0] * W, y = s[0][1] * W;
        for (let i = 0; i < s.length; i++) {
            const last = i === s.length - 1;
            x = last ? s[i][0] * W : x + (s[i][0] * W - x) * 0.575; // perfect-freehand: t = .15 + (1 - streamline) * .85
            y = last ? s[i][1] * W : y + (s[i][1] * W - y) * 0.575;
            const q = P[P.length - 1];
            if (!q || Math.hypot(x - q[0], y - q[1]) > size * 0.12) P.push([x, y, s[i][2]]);
        }
        const L = [0];
        for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
        const total = L[L.length - 1], ph = s[0][0] * 97 + s[0][1] * 41;
        let pr = 0.5, px = 0, py = 0, pr0 = 0;
        for (let i = 0; i < P.length; i++) {
            const d = i ? L[i] - L[i - 1] : 0, p = P[i][2];
            if (p >= 0) pr = p;
            else { const sp = Math.min(1, d / (size * 2.5)); pr = Math.min(1, pr + (Math.min(1, 1 - sp) - pr) * sp * 0.275); }
            const rad = size * (0.5 - 0.5 * (0.5 - pr)) * (1 + 0.45 * Math.exp(-Math.min(L[i], total - L[i]) / size));
            const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const w = (Math.sin(L[i] / (size * 4) + ph) + 0.4 * Math.sin(L[i] / (size * 1.7) + ph * 1.7)) * size * 0.05;
            const cx = P[i][0] - (b[1] - a[1]) / dl * w, cy = P[i][1] + (b[0] - a[0]) / dl * w;
            if (i) seg.push(px, py, cx, cy, pr0 + rad);
            else if (P.length === 1) seg.push(cx, cy, cx + 0.01, cy, rad * 2); // a dot
            px = cx; py = cy; pr0 = rad;
        }
    }
    return seg;
}
function stamp(ctx: CanvasRenderingContext2D, seg: number[], colour: string) {
    ctx.strokeStyle = colour; ctx.lineCap = ctx.lineJoin = "round";
    for (let i = 0, n = 0; i < seg.length; n = 0) {
        const w = seg[i + 4];
        ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(seg[i], seg[i + 1]);
        // segments that carry on from the last one at nearly its width share one short polyline
        do { ctx.lineTo(seg[i + 2], seg[i + 3]); i += 5; } while (i < seg.length && ++n < 16 && seg[i] === seg[i - 3] && seg[i + 1] === seg[i - 2] && Math.abs(seg[i + 4] - w) < 0.5);
        ctx.stroke();
    }
}

/** Gap closing, as line-art fills do: each stroke end within reach of another stroke (or of a far part of its own)
 *  is joined to the nearest point there. The joins go only into the region raster, never into the ink. */
function bridges(strokes: Stroke[], W: number) {
    const p = new Path2D();
    strokes.forEach((s, a) => {
        let len = 0;
        for (let i = 1; i < s.length; i++) len += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
        const reach = W * Math.min(0.16, Math.max(0.07, len * 0.12)); // longer strokes may leave bigger gaps
        for (const e of [0, s.length - 1]) {
            let best = reach, bx = 0, by = 0, run = 0;
            const ex = s[e][0] * W, ey = s[e][1] * W;
            strokes.forEach((t, b) => {
                for (let i = 0; i < t.length; i++) {
                    if (a === b) { // along its own stroke, only parts well away from this end
                        const j = e ? s.length - 1 - i : i;
                        if (i) run += Math.hypot(s[j][0] - s[j + (e ? 1 : -1)][0], s[j][1] - s[j + (e ? 1 : -1)][1]) * W;
                        if (run < reach * 3) continue;
                    }
                    const q = a === b ? s[e ? s.length - 1 - i : i] : t[i], d = Math.hypot(q[0] * W - ex, q[1] * W - ey);
                    if (d < best) { best = d; bx = q[0] * W; by = q[1] * W; }
                }
            });
            if (best < reach) { p.moveTo(ex, ey); p.lineTo(bx, by); }
        }
    });
    return p;
}

/** Regions on a C x R raster of the ink: distance to ink, the outside flooded through cells farther than `gap` from
 *  ink (so nearly closed shapes count as closed), the rest labelled, then grown back under their outlines. */
function regions(a: Uint8ClampedArray, C: number, R: number, gap: number) {
    const N = C * R, D = new Float32Array(N), lab = new Int32Array(N), q = new Int32Array(N), dep = new Uint8Array(N);
    for (let i = 0; i < N; i++) D[i] = a[i * 4 + 3] > 90 ? 0 : 1e6;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { // two-pass chamfer distance
        const i = y * C + x; let v = D[i];
        if (x) v = Math.min(v, D[i - 1] + 1);
        if (y) { v = Math.min(v, D[i - C] + 1); if (x) v = Math.min(v, D[i - C - 1] + 1.41); if (x < C - 1) v = Math.min(v, D[i - C + 1] + 1.41); }
        D[i] = v;
    }
    for (let y = R - 1; y >= 0; y--) for (let x = C - 1; x >= 0; x--) {
        const i = y * C + x; let v = D[i];
        if (x < C - 1) v = Math.min(v, D[i + 1] + 1);
        if (y < R - 1) { v = Math.min(v, D[i + C] + 1); if (x < C - 1) v = Math.min(v, D[i + C + 1] + 1.41); if (x) v = Math.min(v, D[i + C - 1] + 1.41); }
        D[i] = v;
    }
    const nb = (i: number, f: (j: number) => void) => { const x = i % C; if (x) f(i - 1); if (x < C - 1) f(i + 1); if (i >= C) f(i - C); if (i < N - C) f(i + C); };
    const flood = (s: number, k: number) => {
        let h = 0, t = 0; q[t++] = s; lab[s] = k;
        while (h < t) nb(q[h++], (j) => { if (!lab[j] && D[j] > gap) { lab[j] = k; q[t++] = j; } });
        return t;
    };
    for (let i = 0; i < N; i++) if ((i < C || i >= N - C || i % C === 0 || i % C === C - 1) && !lab[i] && D[i] > gap) flood(i, -1);
    let n = 0;
    for (let i = 0; i < N; i++) if (!lab[i] && D[i] > gap) {
        const t = flood(i, ++n);
        if (t < 6) { for (let k = 0; k < t; k++) lab[q[k]] = -2; n--; }
    }
    let h = 0, t = 0;
    const adj = new Set<number>();
    for (let i = 0; i < N; i++) if (lab[i] > 0) q[t++] = i;
    while (h < t) {
        const i = q[h++], k = lab[i];
        nb(i, (j) => {
            // three cells: far enough that fills on either side of a line meet (and trap) under it
            if (!lab[j] && dep[i] < 3) { lab[j] = k; dep[j] = dep[i] + 1; q[t++] = j; }
            else if (lab[j] > 0 && lab[j] !== k) adj.add(Math.min(k, lab[j]) * 4096 + Math.max(k, lab[j]));
        });
    }
    return { D, lab, n, adj };
}

/** Marching squares on a field sampled at cell centres, traced into closed outlines (clockwise round the inside):
 *  going round each cell, a crossing out of the inside joins the next crossing back in, and the joins chain up. */
function contour(F: Float32Array, C: number, R: number, g: number) {
    const v = (x: number, y: number) => (x < 0 || y < 0 || x >= C || y >= R ? 0 : F[y * C + x]);
    const M = (C + 2) * (R + 2) * 2, next = new Int32Array(M).fill(-1), px = new Float32Array(M), py = new Float32Array(M);
    const X = [0, 1, 1, 0], Y = [0, 0, 1, 1], E = [0, 0, 0, 0], out = [false, false, false, false];
    for (let y = -1; y < R; y++) for (let x = -1; x < C; x++) {
        const c = [v(x, y), v(x + 1, y), v(x + 1, y + 1), v(x, y + 1)];
        let n = 0;
        for (let k = 0; k < 4; k++) {
            const m = (k + 1) & 3;
            if (c[k] >= 0.5 === c[m] >= 0.5) continue;
            // the edge from corner k to m, named by its top or left end so both cells agree
            const ax = x + Math.min(X[k], X[m]), ay = y + Math.min(Y[k], Y[m]), id = ((ay + 1) * (C + 2) + ax + 1) * 2 + (X[k] === X[m] ? 1 : 0);
            const a = v(ax, ay), b = X[k] === X[m] ? v(ax, ay + 1) : v(ax + 1, ay), t = (0.5 - a) / (b - a);
            px[id] = (ax + 0.5 + (X[k] === X[m] ? 0 : t)) * g; py[id] = (ay + 0.5 + (X[k] === X[m] ? t : 0)) * g;
            E[n] = id; out[n++] = c[k] >= 0.5;
        }
        for (let i = 0; i < n; i++) if (out[i]) for (let j = 1; j < n; j++) if (!out[(i + j) % n]) { next[E[i]] = E[(i + j) % n]; break; }
    }
    const p = new Path2D();
    for (let s = 0; s < M; s++) if (next[s] >= 0) {
        let e = next[s];
        p.moveTo(px[s], py[s]); next[s] = -1;
        while (e >= 0) { p.lineTo(px[e], py[e]); const f = next[e]; next[e] = -1; e = f; }
        p.closePath();
    }
    return p;
}

/** A halftone screen at angle `ang`: one dot per lattice point, its area following tone(x, y). */
function screen(ctx: CanvasRenderingContext2D, tone: (x: number, y: number) => number, W: number, H: number, s: number, ang: number) {
    const c = Math.cos(ang), n = Math.sin(ang), m = Math.ceil(Math.hypot(W, H) / 2 / s);
    let p = new Path2D(), k = 0;
    for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) {
        const x = W / 2 + (i * c - j * n) * s, y = H / 2 + (i * n + j * c) * s;
        if (x < -s || y < -s || x > W + s || y > H + s) continue;
        const t = tone(x, y);
        if (t < 0.04) continue;
        const r = s * 0.66 * Math.sqrt(t);
        p.moveTo(x + r, y); p.arc(x, y, r, 0, Math.PI * 2);
        if (++k % 500 === 0) { ctx.fill(p); p = new Path2D(); } // small batches rasterise much faster than one big path
    }
    ctx.fill(p);
}

const layers: HTMLCanvasElement[] = [];
function layer(k: number, w: number, h: number) {
    const c = (layers[k] ??= document.createElement("canvas"));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    else { const x = c.getContext("2d")!; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); }
    return c;
}
// starved ink: a speckle tile knocked out of each plate
let grit: CanvasPattern | null = null;
function starve(ctx: CanvasRenderingContext2D, W: number, H: number, alpha: number) {
    if (!grit) {
        const t = document.createElement("canvas"), g = t.getContext("2d")!, r = rng(7);
        t.width = t.height = 128;
        for (let i = 0; i < 1100; i++) { g.globalAlpha = r(); const s = 0.4 + r() * 1.6; g.fillRect(r() * 128, r() * 128, s, s); }
        grit = ctx.createPattern(t, "repeat");
    }
    ctx.globalCompositeOperation = "destination-out"; ctx.globalAlpha = alpha; ctx.fillStyle = grit!;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
}

// luminance of a colour, or of two multiplied together
const lum = (h: string, m = "#ffffff") => [0.3, 0.59, 0.11].reduce((s, w, i) => s + w * parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) * parseInt(m.slice(1 + i * 2, 3 + i * 2), 16) / 255, 0);
let paper: CanvasPattern | null = null; // the grain, made once
type Opts = { W: number; H: number; dpr: number; seed: number; sym: number; printed: boolean; paper: HTMLImageElement | null };
const inkSize = (W: number) => Math.max(6.5, W * 0.014);

function render(cv: HTMLCanvasElement, strokes: Stroke[], o: Opts) {
    const { W, H, dpr } = o, [stock, A, B, key] = PALETTES[o.seed % PALETTES.length];
    const all = expand(strokes, o.sym, H / W), seg = ink(all, W, inkSize(W));
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = stock; ctx.fillRect(0, 0, W, H);
    if (o.printed && all.length) {
        const r = rng(o.seed), g = W / 160, C = Math.ceil(W / g), R = Math.ceil(H / g), gap = 1.6;
        const lo = layer(3, C, R).getContext("2d", { willReadFrequently: true })!;
        lo.setTransform(1 / g, 0, 0, 1 / g, 0, 0); stamp(lo, seg, INK);
        lo.lineWidth = g; lo.stroke(bridges(all, W));
        const { D, lab, n, adj } = regions(lo.getImageData(0, 0, C, R).data, C, R, gap);
        // styles: 0 solid plate, 1 the other plate screened, 2 solid plate screened, 3 both (only when the others are taken);
        // greedy, so that neighbours differ
        const style = [0], off = Math.floor(r() * 3);
        for (let k = 1; k <= n; k++) {
            let s = 0;
            for (let j = 0; j < 4; j++) {
                s = j < 3 ? (off + k + j) % 3 : 3;
                let used = false;
                for (let m = 1; m < k && !used; m++) used = style[m] === s && adj.has(m * 4096 + k);
                if (!used) break;
            }
            style[k] = s;
        }
        const N = C * R, sample = (F: Float32Array, x: number, y: number) => {
            const gx = Math.min(C - 1.001, Math.max(0, x / g - 0.5)), gy = Math.min(R - 1.001, Math.max(0, y / g - 0.5)), x0 = gx | 0, y0 = gy | 0, fx = gx - x0, fy = gy - y0, i = y0 * C + x0;
            return (F[i] * (1 - fx) + F[i + 1] * fx) * (1 - fy) + (F[i + C] * (1 - fx) + F[i + C + 1] * fx) * fy;
        };
        // solids go in the plate the key reads best over; the other plate is only ever screened
        const light = Math.abs(lum(A) - lum(key)) > Math.abs(lum(B) - lum(key)) ? 0 : 1, rib = 1.6 + r() * 2;
        for (const [k, colour] of [[0, A], [1, B]] as const) {
            const solid = new Float32Array(N), tint = new Float32Array(N), lt = k === light;
            for (let i = 0; i < N; i++) {
                const l = lab[i], s = style[l];
                if (l > 0) { if (lt ? s === 0 || s === 3 : false) solid[i] = 1; else if (lt ? s === 2 : s === 1 || s === 3) tint[i] = 1; }
                else if (lt) solid[i] = D[i] <= rib ? 1 : 0; // outside the shapes the solid plate runs a flat ribbon under the lines
                else tint[i] = D[i] > rib ? 0.4 * Math.max(0, 1 - (D[i] - rib) / 6) : 0; // and the other haloes them
            }
            const sm = new Float32Array(N); // 3x3 box blur, so the marching squares edge is smooth
            for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
                let s = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < C && yy < R) s += solid[yy * C + xx]; }
                sm[y * C + x] = s / 9;
            }
            const pc = layer(k, Math.round(W * dpr), Math.round(H * dpr)), p = pc.getContext("2d")!;
            p.setTransform(dpr, 0, 0, dpr, 0, 0); p.fillStyle = colour;
            p.fill(contour(sm, C, R, g));
            const ang = (k ? 45 : 15) * Math.PI / 180 + (r() - 0.5) * 0.5;
            screen(p, (x, y) => { const t = sample(tint, x, y); return Math.min(t, 0.5); }, W, H, Math.max(3.5, W / 125), ang);
            starve(p, W, H, 0.5);
            const ox = (r() - 0.5) * W * 0.009, oy = (r() - 0.5) * W * 0.009, rot = (r() - 0.5) * 0.008;
            // translucent (riso) ink where it shows through on this stock, else opaque (screen-print) ink
            ctx.save(); ctx.globalCompositeOperation = lum(stock) - lum(stock, colour) > 40 ? "multiply" : "source-over";
            ctx.translate(W / 2 + ox, H / 2 + oy); ctx.rotate(rot); ctx.drawImage(pc, -W / 2, -H / 2, W, H); ctx.restore();
        }
    }
    const kc = layer(2, Math.round(W * dpr), Math.round(H * dpr)), kx = kc.getContext("2d")!;
    kx.setTransform(dpr, 0, 0, dpr, 0, 0); stamp(kx, seg, key);
    starve(kx, W, H, 0.2);
    ctx.drawImage(kc, 0, 0, W, H);
    if (o.paper) {
        if (!paper) { paper = ctx.createPattern(o.paper, "repeat")!; paper.setTransform(new DOMMatrix().scale(512 / 768)); }
        ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.6; ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    }
}

const btn = "outline-none focus-visible:ring-4 focus-visible:ring-[#ff6509] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:rgb(var(--bg))] aria-disabled:opacity-40 aria-disabled:cursor-default aria-disabled:hover:translate-y-0";
// aria-disabled rather than disabled, so a button pressed from the keyboard keeps focus when it greys out
const painted = () => !!document.documentElement.style.getPropertyValue("--bg");

export default function Draw() {
    const box = useRef<HTMLDivElement>(null), base = useRef<HTMLCanvasElement>(null), live = useRef<HTMLCanvasElement>(null);
    const S = useRef({ strokes: [] as Stroke[], cur: null as Stroke | null, id: -1, rect: new DOMRect(), paper: null as HTMLImageElement | null }).current;
    const [size, setSize] = useState({ W: 0, H: 0 });
    const [ver, setVer] = useState(0); // bumped when the strokes or the paper change
    const [printed, setPrinted] = useState(false);
    const [seed, setSeed] = useState(() => (document.documentElement.dataset.theme === "dark" ? 2 : 0));
    const [sym, setSym] = useState(0);
    const [site, setSite] = useState(painted); // a painted theme is on the site
    const { W, H } = size, dpr = Math.min(2, devicePixelRatio || 1), pal = PALETTES[seed % PALETTES.length];

    useEffect(() => {
        const el = box.current!, ro = new ResizeObserver(() => { const w = Math.min(760, el.clientWidth); setSize({ W: w, H: Math.round(w * (w < 520 ? 1.15 : 0.66)) }); });
        ro.observe(el);
        // the navbar's day/night toggle also clears a painted theme
        const mo = new MutationObserver(() => setSite(painted()));
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
        const im = new Image();
        im.onload = () => { S.paper = im; setVer((v) => v + 1); };
        im.src = "/art/paper.webp";
        return () => { ro.disconnect(); mo.disconnect(); };
    }, [S]);

    useEffect(() => {
        if (!W) return;
        for (const c of [base.current!, live.current!]) if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
        render(base.current!, S.strokes, { W, H, dpr, seed, sym, printed, paper: S.paper });
        live.current!.getContext("2d")!.clearRect(0, 0, live.current!.width, live.current!.height);
    }, [W, H, dpr, ver, seed, sym, printed, S]);

    const pt = (e: PointerEvent): number[] => [(e.clientX - S.rect.left) / W, (e.clientY - S.rect.top) / W, e.pointerType === "pen" && e.pressure ? e.pressure : -1];
    const drawLive = () => {
        const ctx = live.current!.getContext("2d")!;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        stamp(ctx, ink(expand([S.cur!], sym, H / W), W, inkSize(W)), pal[3]);
    };
    const down = (e: PE<HTMLCanvasElement>) => {
        if (e.button || S.cur) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        S.id = e.pointerId; S.rect = e.currentTarget.getBoundingClientRect(); S.cur = [pt(e.nativeEvent)];
        drawLive();
    };
    const move = (e: PE<HTMLCanvasElement>) => {
        if (!S.cur || e.pointerId !== S.id) return;
        for (const ev of e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) S.cur.push(pt(ev));
        drawLive();
    };
    const up = (e: PE<HTMLCanvasElement>) => {
        if (!S.cur || e.pointerId !== S.id) return;
        S.strokes.push(S.cur); S.cur = null; setVer((v) => v + 1);
    };
    const reset = (strokes: Stroke[]) => { S.strokes = strokes; if (!strokes.length) setPrinted(false); setVer((v) => v + 1); };
    const download = () => {
        const a = document.createElement("a");
        a.href = base.current!.toDataURL("image/png"); a.download = "print.png"; a.click(); // a data: URL; the CSP blocks blob: images
    };
    // the site cross-fades into the print's colours (View Transitions where there are any, and motion is welcome)
    const recolour = (f: () => void) => {
        if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(f);
        else f();
    };
    const empty = !S.strokes.length;

    return (
        <div className="mx-auto max-w-[800px]">
            <div className="card p-3 sm:p-5">
                <div ref={box} className="w-full">
                    <div className="relative mx-auto overflow-hidden rounded-md" style={{ width: W || "100%", height: H || "60vh", boxShadow: "0 1px 0 rgb(38 32 26 / .25), 0 10px 22px -14px rgb(40 30 0 / .6)" }}>
                        <canvas ref={base} className="absolute inset-0 w-full h-full" role="img" aria-label="Draw" />
                        <canvas ref={live} className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
                            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
                        {empty && <p className="eyebrow absolute inset-x-0 bottom-4 text-center pointer-events-none opacity-70" style={{ color: pal[3] }}>Scribble anything, then print it</p>}
                    </div>
                </div>
                <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
                    {pal.map((c, i) => <span key={i} className="w-4 h-4 rounded-full" style={{ background: c, boxShadow: "inset 0 0 0 1px rgb(38 32 26 / .3)" }} />)}
                </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button type="button" className={`pill-dark ${btn}`} onClick={() => setPrinted(!empty)} aria-disabled={empty || printed}>Print</button>
                <button type="button" className={`pill-light ${btn}`} onClick={() => printed && setSeed((s) => s + 1)} aria-disabled={!printed}>Reprint</button>
                <button type="button" className={`pill-light ${btn}`} onClick={() => setSym((s) => (s + 1) % 3)} aria-pressed={sym > 0}>
                    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                        <circle cx="8" cy="8" r="6.5" opacity=".35" />
                        {sym === 1 && <path d="M8 1.5v13" />}
                        {sym === 2 && <path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5" />}
                    </svg>
                    Symmetry
                </button>
                <button type="button" className={`pill-light ${btn}`} onClick={() => reset(S.strokes.slice(0, -1))} aria-disabled={empty}>Undo</button>
                <button type="button" className={`pill-light ${btn}`} onClick={() => reset([])} aria-disabled={empty}>Clear</button>
                <button type="button" className={`pill-light ${btn}`} onClick={() => !empty && download()} aria-disabled={empty}>Download</button>
                {printed && <button type="button" className={`pill-dark ${btn}`} onClick={() => recolour(() => applyPalette(pal))}>Apply to site</button>}
                {site && <button type="button" className={`pill-light ${btn}`} onClick={() => recolour(clearPalette)}>Reset site colours</button>}
            </div>
        </div>
    );
}
