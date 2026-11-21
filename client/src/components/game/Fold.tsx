import { useEffect, useRef, useState, type PointerEvent as RPE, type KeyboardEvent as RKE } from "react";
import { ChevronLeft, ChevronRight, Download, RotateCcw, Undo2 } from "lucide-react";
import { W, H, LEVELS, clampLine, fold, masks, mirror, score, start, type Line, type Masks, type Poly, type Pt, type State } from "./fold/sim";

// Fold press: a monoprint puzzle. Drag a crease across the sheet; the paper folds over it (a CSS 3D flap over a
// clipped base), wet ink prints onto the facing half, and it opens again. The print is painted once per fold into
// a canvas (Beer-Lambert multiply of the inks over paper grain, pooled rims, wet gloss, halftone for faint ink);
// the animation only moves composited layers, and nothing runs while the sheet sits still.

const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const INKS = [FOREST, ORANGE];
const S = 4, PW = W * S, PH = H * S;
const UP = 620, HOLD = 200, DOWN = 560;
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const LN = [...INKS, INK].map((h) => rgb(h).map((v) => Math.log(v / 255)));
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// ---- crease geometry, in sheet units ----
const NORM: Pt[] = [[1, 0], [0, 1], [Math.SQRT1_2, -Math.SQRT1_2], [Math.SQRT1_2, Math.SQRT1_2]];
const off = (l: Line) => (l.k < 2 ? l.c : l.c * Math.SQRT1_2);
const RECT: Poly = [[0, 0], [W, 0], [W, H], [0, H]];
// the part of the sheet on one side of the crease (Sutherland-Hodgman against one half-plane)
function half(l: Line, sgn: number): Poly {
    const [nx, ny] = NORM[l.k], e = off(l), d = (p: Pt) => sgn * (p[0] * nx + p[1] * ny - e), out: Poly = [];
    RECT.forEach((p, i) => {
        const q = RECT[(i + 1) % 4], dp = d(p), dq = d(q);
        if (dp >= 0) out.push(p);
        if (dp * dq < 0) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    });
    return out;
}
const area = (p: Poly) => Math.abs(p.reduce((s, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * y; }, 0)) / 2;
// the smaller side folds over; n points from the crease into it
function crease(l: Line) {
    const a = half(l, 1), b = half(l, -1), flipA = area(a) <= area(b), [nx, ny] = NORM[l.k], s = flipA ? 1 : -1;
    const ends = a.filter((p) => Math.abs(p[0] * nx + p[1] * ny - off(l)) < 1e-6);
    return { flap: flipA ? a : b, stay: flipA ? b : a, n: [s * nx, s * ny] as Pt, ends };
}
const clipPct = (p: Poly) => `polygon(${p.map(([x, y]) => `${(x / W) * 100}% ${(y / H) * 100}%`).join(",")})`;
const svgPath = (ps: Poly[]) => ps.map((p) => "M" + p.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L") + "Z").join("");

// ---- the print ----
// value noise; used rotated and summed so its lattice never shows
const hash = (i: number, j: number) => { let h = Math.imul(i, 374761393) + Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vn(x: number, y: number) {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
type Tex = { noise: Float32Array; mottle: Float32Array; grain: Float32Array; paper: Uint8ClampedArray };
function texture(img?: HTMLImageElement): Tex {
    const noise = new Float32Array(PW * PH), mottle = new Float32Array(PW * PH), grain = new Float32Array(PW * PH).fill(0.5), paper = new Uint8ClampedArray(PW * PH * 3);
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const q = y * PW + x, u = x * 0.8 + y * 0.6, v = y * 0.8 - x * 0.6;
        // the fibrous, uneven edge of ink soaking into paper
        noise[q] = vn(u / 7, v / 7) * 1.3 + vn(x / 2.6 + 50, y / 2.6) * 0.7 - 1;
        // a pulled ink film is never even
        mottle[q] = (vn(x / 23 + 200, y / 23) + vn(u / 11, v / 11 + 70) * 0.6) / 1.6 - 0.5;
    }
    if (img) {
        const t = 480, cv = document.createElement("canvas"), g = cv.getContext("2d", { willReadFrequently: true })!;
        cv.width = PW; cv.height = PH;
        for (let y = 0; y < PH; y += t) for (let x = 0; x < PW; x += t) g.drawImage(img, x, y, t, t);
        const d = g.getImageData(0, 0, PW, PH).data;
        for (let p = 0; p < PW * PH; p++) grain[p] = d[p * 4 + 1] / 255;
    }
    // cream stock with the grain laid over it (CSS "overlay")
    const cr = rgb(CREAM).map((v) => v / 255);
    for (let p = 0; p < PW * PH; p++) for (let k = 0; k < 3; k++) { const b = cr[k], s = grain[p]; paper[p * 3 + k] = 255 * (b < 0.5 ? 2 * b * s : 1 - 2 * (1 - b) * (1 - s)); }
    return { noise, mottle, grain, paper };
}
const I0 = new Int32Array(PW), TX = new Float32Array(PW);
for (let x = 0; x < PW; x++) { const g = Math.min(W - 1.001, Math.max(0, (x + 0.5) / S - 0.5)); I0[x] = Math.floor(g); TX[x] = g - I0[x]; }

// pulling a pressed sheet apart leaves feathery veins running out from the crease, the same on both halves:
// contour lines of noise stretched away from the crease, sampled by distance from it (so mirrored by construction)
function veins(vein: Float32Array, l: Line, seed: number, st: State) {
    const [nx, ny] = NORM[l.k], e = off(l) * S, m = mirror(l), inked = m.map((q, p) => +(q >= 0 && st.a.some((a) => a[p] > 0.05)));
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        if (!inked[(y >> 2) * W + (x >> 2)]) continue; // only ink that was pressed
        const d = Math.abs(x * nx + y * ny - e), u = y * nx - x * ny;
        const f = vn(u / 5 + seed, d / 26) * 0.7 + vn(u / 2.2, d / 9 + seed) * 0.3, q = y * PW + x;
        vein[q] = Math.max(vein[q], 0.01 + Math.max(0, 1 - Math.abs(f - 0.5) * 11) ** 2 * Math.min(1, d / 6));
    }
}

function paint(out: ImageData, s: State, tex: Tex, vein: Float32Array, z?: Int16Array, spoiled?: boolean[]) {
    const d = out.data, { noise, mottle, grain, paper } = tex, nc = s.a.length;
    // a soft copy of the amounts: smooth contours when blown up 4x
    const A = s.a.map((a) => {
        const b = new Float32Array(a.length);
        for (let p = 0; p < a.length; p++) { const i = p % W; b[p] = (4 * a[p] + (i ? a[p - 1] : a[p]) + (i < W - 1 ? a[p + 1] : a[p]) + (p >= W ? a[p - W] : a[p]) + (p < a.length - W ? a[p + W] : a[p])) / 8; }
        return b;
    });
    // cells with no ink near them (most of the sheet) are bare paper
    const bare = new Uint8Array(W * H);
    for (let p = 0; p < W * H - W - 1; p++) bare[p] = +A.every((a) => a[p] + a[p + 1] + a[p + W] + a[p + W + 1] < 0.01);
    for (let y = 0; y < PH; y++) {
        const gy = Math.min(H - 1.001, Math.max(0, (y + 0.5) / S - 0.5)), j0 = Math.floor(gy), ty = gy - j0;
        for (let x = 0; x < PW; x++) {
            const q = y * PW + x, p = j0 * W + I0[x], tx = TX[x], g = grain[q] - 0.5, o = q * 4, zi = z ? z[(y >> 2) * W + (x >> 2)] : -1;
            if (bare[p] && zi < 0) { d[o] = paper[q * 3]; d[o + 1] = paper[q * 3 + 1]; d[o + 2] = paper[q * 3 + 2]; d[o + 3] = 255; continue; }
            let r = 0, gr = 0, b = 0, spec = 0;
            for (let c = 0; c < nc; c++) {
                const a = A[c], a00 = a[p], a10 = a[p + 1], a01 = a[p + W], a11 = a[p + W + 1];
                if (a00 + a10 + a01 + a11 < 0.01) continue;
                const top = a00 + (a10 - a00) * tx, v = top + (a01 + (a11 - a01) * tx - top) * ty, wa = s.w[c];
                const w = wa[p] + (wa[p + 1] - wa[p]) * tx + (wa[p + W] - wa[p]) * ty;
                const e = v + 0.075 * noise[q], solid = sstep(0.25, 0.35, e);
                // body, lighter where the ink is thin and uneven like a pulled film; the pooled, darker rim inside the edge
                const vc = Math.min(1, v);
                let t = solid * (0.3 + 0.7 * vc * Math.sqrt(vc)) * (1 + mottle[q] * 0.5) + solid * Math.exp(-(((v - 0.5) * 5) ** 2)) * (0.15 + 0.7 * w);
                // pulled apart while wet: ink gathers into the veins and thins between them
                if (vein[q] > 0) t *= 1 + (0.45 * vein[q] - 0.1) * Math.min(1, w * 4) * solid;
                t += (1 - solid) * sstep(0.03, 0.3, e) * 0.32; // the feathered fringe and faint ink below the print line
                t *= 1 + g * (1.3 - 1.1 * Math.min(1, w * 2)); // dry ink sits on the paper's tooth, wet ink fills it
                r += t * LN[c][0]; gr += t * LN[c][1]; b += t * LN[c][2];
                // wet gloss: a highlight where the ink's surface faces the light (top left)
                if (w > 0.05) spec += w * solid * Math.max(0, ((a10 - a00) * (1 - ty) + (a11 - a01) * ty + (a01 - a00) * (1 - tx) + (a11 - a10) * tx) * 1.2 - 0.14);
            }
            if (zi >= 0 && (x + y) % 9 < 2) { // do-not-print: a ruled hatch, orange once it has taken ink
                const m = spoiled?.[zi] ? LN[1] : LN[2], f = spoiled?.[zi] ? 0.9 : 0.4;
                r += f * m[0]; gr += f * m[1]; b += f * m[2];
            }
            const sp = Math.min(0.4, spec);
            if (r === 0 && gr === 0 && b === 0) { d[o] = paper[q * 3]; d[o + 1] = paper[q * 3 + 1]; d[o + 2] = paper[q * 3 + 2]; d[o + 3] = 255; continue; }
            d[o] = paper[q * 3] * Math.exp(r) * (1 - sp) + 250 * sp;
            d[o + 1] = paper[q * 3 + 1] * Math.exp(gr) * (1 - sp) + 244 * sp;
            d[o + 2] = paper[q * 3 + 2] * Math.exp(b) * (1 - sp) + 226 * sp;
            d[o + 3] = 255;
        }
    }
}

// the crease each fold leaves in the paper: a lit ridge beside a faint shadow
function creases(c: CanvasRenderingContext2D, fs: Line[], o: number) {
    for (const l of fs) {
        const [[x0, y0], [x1, y1]] = crease(l).ends, [nx, ny] = NORM[l.k];
        for (const [d, col] of [[-0.8, "rgb(255 250 236 / .55)"], [0.8, "rgb(38 32 26 / .16)"]] as const) {
            c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath();
            c.moveTo(o + x0 * S + nx * d, o + y0 * S + ny * d); c.lineTo(o + x1 * S + nx * d, o + y1 * S + ny * d); c.stroke();
        }
    }
}

// ---- progress: fewest folds per solved level ----
const KEY = "fold-press";
const load = (): Record<number, number> => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const save = (b: Record<number, number>) => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* private mode */ } };

const ORDER = [0, 3, 1, 2]; // keyboard: vertical, diagonal, horizontal, diagonal
const CENTRE = [W / 2, H / 2, W / 2 - H / 2, W / 2 + H / 2];

export default function Fold() {
    const [lvl, setLvl] = useState(() => Math.min(LEVELS.length - 1, Object.keys(load()).length));
    const [folds, setFolds] = useState<Line[]>([]);
    const [res, setRes] = useState({ match: 0, spoiled: [] as boolean[] });
    const [line, setLine] = useState<Line | null>(null);
    const [busy, setBusy] = useState(false);
    const [kbd, setKbd] = useState(false);
    const [best, setBest] = useState(load);
    const lv = LEVELS[lvl], solved = res.match >= 85 && !busy;

    const box = useRef<HTMLDivElement>(null), base = useRef<HTMLCanvasElement>(null), flapCv = useRef<HTMLCanvasElement>(null);
    const flap = useRef<HTMLDivElement>(null), back = useRef<HTMLDivElement>(null), shade = useRef<HTMLDivElement>(null), lite = useRef<HTMLDivElement>(null), shadow = useRef<HTMLDivElement>(null);
    const g = useRef<{ tex: Tex; m: Masks; s: State; vein: Float32Array; fs: Line[]; img?: ImageData; drag?: Pt; seen: boolean }>(null);

    const draw = () => {
        const G = g.current!, cv = base.current!, c = cv.getContext("2d")!;
        G.img ??= c.createImageData(PW, PH);
        paint(G.img, G.s, G.tex, G.vein, G.m.z, score(G.s, G.m).spoiled);
        c.putImageData(G.img, 0, 0);
        creases(c, G.fs, 0);
        flapCv.current!.getContext("2d")!.drawImage(cv, 0, 0);
    };
    // replay the level from its blots: restart, undo and a new level all come through here
    const replay = (fs: Line[], m = g.current!.m) => {
        const G = g.current!, s = start(lv), vein = new Float32Array(PW * PH);
        fs.forEach((l, i) => { fold(s, l); veins(vein, l, i * 37, s); });
        Object.assign(G, { m, s, vein, fs });
        draw();
        setRes(score(s, m)); setFolds(fs);
    };

    useEffect(() => {
        g.current = { tex: texture(), m: masks(lv), s: start(lv), vein: new Float32Array(PW * PH), fs: [], seen: true };
        const img = new Image();
        img.src = "/art/paper.webp";
        img.decode().then(() => { if (g.current) { g.current.tex = texture(img); draw(); } }, () => {});
        const io = new IntersectionObserver(([e]) => { if (g.current) g.current.seen = e.isIntersecting; });
        io.observe(box.current!);
        return () => { io.disconnect(); g.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { replay([], masks(lv)); setLine(null); }, [lvl]);

    const press = (l: Line) => {
        if (busy || solved) return;
        const G = g.current!, fs = [...folds, l], { flap: fp, stay, n, ends } = crease(l);
        const transfer = () => { fold(G.s, l); veins(G.vein, l, folds.length * 37, G.s); G.fs = fs; draw(); };
        const finish = () => {
            const r = score(G.s, G.m);
            setRes(r); setFolds(fs); setBusy(false);
            if (r.match >= 85 && !(best[lvl] <= fs.length)) { const b = { ...best, [lvl]: fs.length }; setBest(b); save(b); }
        };
        setLine(null);
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) { transfer(); finish(); return; }
        setBusy(true);
        const el = flap.current!, sh = shadow.current!, bc = base.current!, bk = back.current!, sd = shade.current!, li = lite.current!, [ux, uy] = [n[1], -n[0]];
        const origin = `${(ends[0][0] / W) * 100}% ${(ends[0][1] / H) * 100}%`;
        bc.style.clipPath = clipPct(stay);
        for (const e of [el, sh]) { e.style.clipPath = clipPct(fp); e.style.transformOrigin = origin; e.style.visibility = "visible"; }
        const pose = (phi: number) => {
            const c = Math.cos(phi), s = Math.sin(phi);
            el.style.transform = `rotate3d(${ux},${uy},0,${phi}rad)`;
            bk.style.opacity = c < 0 ? ".86" : "0";
            // light from the top left, a little in front: darken or lift whichever face shows
            const f = c < 0 ? -1 : 1, lit = (f * (n[0] * s * 0.35 + n[1] * s * 0.5 + c * 0.79)) / 0.79;
            sd.style.opacity = String(Math.min(0.6, Math.max(0, 1 - lit) * 0.7));
            li.style.opacity = String(Math.min(0.5, Math.max(0, lit - 1) * 1.6));
            // the cast shadow: the flap projected flat, pushed away from the light by its height
            const k = 0.5 * s, [lx, ly] = [0.3, 0.45];
            sh.style.transform = `matrix(${1 + (c - 1) * n[0] * n[0] + k * lx * n[0]},${(c - 1) * n[0] * n[1] + k * ly * n[0]},${(c - 1) * n[0] * n[1] + k * lx * n[1]},${1 + (c - 1) * n[1] * n[1] + k * ly * n[1]},0,0)`;
            sh.style.opacity = String(0.26 * s);
        };
        let t0 = performance.now(), phase = 0;
        const tick = () => {
            if (g.current !== G) return; // unmounted
            const now = performance.now(), fast = !G.seen; // off screen: no reason to animate
            if (phase === 0) {
                const p = fast ? 1 : Math.min(1, (now - t0) / UP);
                pose(Math.PI * ease(p));
                if (p === 1) { transfer(); phase = 1; t0 = performance.now(); }
            } else if (phase === 1) {
                if (fast || now - t0 > HOLD) { phase = 2; t0 = now; }
            } else {
                const p = fast ? 1 : Math.min(1, (now - t0) / DOWN);
                pose(Math.PI * (1 - ease(p)));
                if (p === 1) {
                    bc.style.clipPath = "";
                    for (const e of [el, sh]) e.style.visibility = "hidden";
                    return finish();
                }
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    const undo = () => { if (!busy && folds.length) replay(folds.slice(0, -1)); };
    const restart = () => { if (!busy) replay([]); };
    const go = (k: number) => { if (!busy && k >= 0 && k < LEVELS.length) setLvl(k); };

    // pointer: the drag's direction picks one of four crease angles, its midpoint the grid line
    const at = (e: RPE): Pt => { const r = box.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    const onDown = (e: RPE) => {
        if (busy || solved) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        g.current!.drag = at(e); setKbd(false);
    };
    const onMove = (e: RPE) => {
        const p0 = g.current?.drag;
        if (!p0) return;
        const [x, y] = at(e), dx = x - p0[0], dy = y - p0[1];
        if (Math.hypot(dx, dy) < 6) return setLine(null);
        const k = [1, 2, 0, 3][((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 4) + 4) % 4], mx = (x + p0[0]) / 2, my = (y + p0[1]) / 2;
        setLine(clampLine({ k, c: [mx, my, mx - my, mx + my][k] }));
    };
    const onUp = () => { if (!g.current?.drag) return; g.current.drag = undefined; if (line) press(line); };

    const onKey = (e: RKE) => {
        const k = e.key.toLowerCase();
        if (k === "u" || (k === "z" && (e.ctrlKey || e.metaKey))) { e.preventDefault(); return undo(); }
        if (k === "r" && !e.ctrlKey && !e.metaKey) return restart();
        if (e.target !== box.current || busy || solved) return;
        const cur = line ?? { k: 0, c: W / 2 };
        if (!line && k.startsWith("arrow")) setLine(cur); // the first arrow shows the centre line
        else if (k === "arrowleft" || k === "arrowright") setLine(clampLine({ k: cur.k, c: cur.c + (k === "arrowleft" ? -8 : 8) }));
        else if (k === "arrowup" || k === "arrowdown") { const nk = ORDER[(ORDER.indexOf(cur.k) + (k === "arrowup" ? 1 : 3)) % 4]; setLine(clampLine({ k: nk, c: CENTRE[nk] })); }
        else if ((k === "enter" || k === " ") && line) press(line);
        else if (k === "escape") return setLine(null);
        else return;
        e.preventDefault(); setKbd(true);
    };

    const download = () => {
        const M = 56, cv = document.createElement("canvas"), c = cv.getContext("2d")!, G = g.current!;
        cv.width = PW + 2 * M; cv.height = PH + 2 * M + 20;
        c.fillStyle = CREAM; c.fillRect(0, 0, cv.width, cv.height);
        const img = c.createImageData(PW, PH);
        paint(img, G.s, G.tex, G.vein);
        c.putImageData(img, M, M);
        creases(c, G.fs, M);
        c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(M - 10.5, M - 10.5, PW + 21, PH + 21);
        c.fillStyle = INK; c.font = "600 14px Manrope, sans-serif"; c.textAlign = "center";
        c.fillText(`${String(lvl + 1).padStart(2, "0")}  ·  ${folds.length} / ${lv.par}  ·  ${res.match}%`, cv.width / 2, cv.height - M / 2 - 4);
        const a = document.createElement("a");
        a.href = cv.toDataURL("image/png"); // a data: URL: the page's CSP blocks blob:
        a.download = `fold-press-${lvl + 1}.png`;
        a.click();
    };

    const cr = line && !busy ? crease(line) : null;
    const tgt = lv.t.map(svgPath);
    const [bx0, by0, bx1, by1] = lv.t.flat(2).reduce(([a, b, c, d], [x, y]) => [Math.min(a, x), Math.min(b, y), Math.max(c, x), Math.max(d, y)], [W, H, 0, 0]);
    return (
        <div className="card mx-auto max-w-3xl p-3 sm:p-6 select-none" onKeyDown={onKey}>
            <div className="flex items-center gap-3 sm:gap-5 px-1 pb-3 sm:pb-4">
                {/* target card: the shape to print, as a screened proof */}
                <svg viewBox={`${bx0 - 6} ${by0 - 6} ${bx1 - bx0 + 12} ${by1 - by0 + 12}`} className="h-14 sm:h-16 w-auto max-w-[38%] shrink-0 rounded-md border border-stroke/25" style={{ background: CREAM }} role="img" aria-label={`Level ${lvl + 1} target`}>
                    <defs>{INKS.map((c, i) => <pattern key={c} id={`fp-h${i}`} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform={`rotate(${i ? 75 : 15})`}><circle cx="1.1" cy="1.1" r=".85" fill={c} /></pattern>)}</defs>
                    {tgt.map((d, i) => <path key={i} d={d} fill={`url(#fp-h${i})`} style={{ mixBlendMode: "multiply" }} />)}
                    {tgt.map((d, i) => <path key={`k${i}`} d={d} fill="none" stroke={INK} strokeWidth=".7" strokeOpacity=".55" />)}
                </svg>
                <div className="min-w-0">
                    <p className="eyebrow text-paragraph">Level {lvl + 1}</p>
                    <p className="mt-1 text-sm sm:text-base font-semibold text-heading tabular-nums">Folds {folds.length} · Par {lv.par} · Match {res.match}%</p>
                </div>
            </div>

            {/* once solved, the print is matted and framed */}
            <div className={`relative border-solid transition-[padding,border-width,box-shadow,background-color] duration-700 ${solved ? "p-4 pb-2 sm:p-8 sm:pb-3" : ""}`}
                style={{ borderColor: INK, borderWidth: solved ? 9 : 0, backgroundColor: solved ? CREAM : "transparent", backgroundImage: solved ? "url(/art/paper.webp)" : undefined, backgroundSize: "512px", backgroundBlendMode: "overlay", boxShadow: solved ? "inset 0 0 0 1px rgb(255 245 220 / .18), inset 0 3px 12px rgb(20 12 0 / .3), 0 26px 40px -22px rgb(20 12 0 / .75)" : "none" }}>
                <div ref={box} tabIndex={0} role="application" aria-label={`Level ${lvl + 1}. Folds ${folds.length}, par ${lv.par}, match ${res.match}%. Arrow keys choose a fold line, Enter folds, U undoes, R restarts.`}
                    className="relative w-full aspect-[10/7] outline-none focus-visible:ring-2 focus-visible:ring-tertiary rounded-[3px]"
                    style={{ perspective: "1600px", touchAction: "none" }}
                    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { if (g.current) g.current.drag = undefined; setLine(null); }}
                    onFocus={(e) => { if (e.target.matches(":focus-visible")) setKbd(true); }} onBlur={() => { setKbd(false); setLine(null); }}>
                    <div className="absolute inset-0" style={{ filter: "drop-shadow(0 8px 10px rgb(40 25 0 / .28))" }}>
                        <canvas ref={base} width={PW} height={PH} className="absolute inset-0 w-full h-full rounded-[2px]" />
                    </div>
                    <div ref={shadow} className="absolute inset-0 invisible" style={{ background: INK, filter: "blur(9px)", willChange: "transform, opacity" }} />
                    <div ref={flap} className="absolute inset-0 invisible" style={{ willChange: "transform" }}>
                        <canvas ref={flapCv} width={PW} height={PH} className="absolute inset-0 w-full h-full" />
                        {/* the back of the sheet: blank stock, the print showing through a little */}
                        <div ref={back} className="absolute inset-0 opacity-0" style={{ background: `${CREAM} url(/art/paper.webp) 0 0 / 512px`, backgroundBlendMode: "overlay" }} />
                        <div ref={shade} className="absolute inset-0 opacity-0" style={{ background: INK, willChange: "opacity" }} />
                        <div ref={lite} className="absolute inset-0 opacity-0" style={{ background: "#fffaf0", willChange: "opacity" }} />
                    </div>
                    {/* guides: the target's dotted outline, the crease being drawn, and which way the paper turns */}
                    <svg viewBox={`0 0 ${W} ${H}`} className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200 ${busy || solved ? "opacity-0" : ""}`} aria-hidden>
                        {tgt.map((d, i) => <path key={i} d={d} fill="none" stroke={lv.t.length > 1 ? INKS[i] : INK} strokeOpacity=".6" strokeWidth=".75" strokeDasharray="0 1.9" strokeLinecap="round" />)}
                        {cr && cr.ends.length === 2 && (() => {
                            const [[x0, y0], [x1, y1]] = cr.ends, mx = (x0 + x1) / 2, my = (y0 + y1) / 2, [nx, ny] = cr.n, L = 14;
                            return (<g stroke={ORANGE} fill="none" strokeLinecap="round">
                                <path d={`M${x0} ${y0}L${x1} ${y1}`} strokeWidth="1" strokeDasharray="3.2 2.2" />
                                <path d={`M${mx + nx * L} ${my + ny * L}Q${mx + (ny * L) / 2} ${my - (nx * L) / 2} ${mx - nx * L} ${my - ny * L}`} strokeWidth=".9" />
                                <path d={`M${mx - nx * L} ${my - ny * L}l${(nx + ny) * 3.4} ${(ny - nx) * 3.4}M${mx - nx * L} ${my - ny * L}l${(nx - ny) * 3.4} ${(ny + nx) * 3.4}`} strokeWidth=".9" />
                            </g>);
                        })()}
                    </svg>
                </div>
                {solved && <p className="mt-2 sm:mt-3 text-center text-[11px] sm:text-xs font-semibold tracking-[0.14em] tabular-nums" style={{ color: INK }}>{String(lvl + 1).padStart(2, "0")} · {folds.length} / {lv.par} · {res.match}%</p>}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-paragraph min-h-[1.25rem]">{!solved && lv.hint && (kbd ? "Arrow keys pick a line, Enter folds" : lv.hint)}</p>
                <div className="flex items-center gap-2">
                    {solved && <button className="pill-light" onClick={download}><Download size={16} aria-hidden /> PNG</button>}
                    {solved && lvl < LEVELS.length - 1 && <button className="pill-dark" onClick={() => go(lvl + 1)}>Next <ChevronRight size={16} aria-hidden /></button>}
                    <button className="pill-light !px-3" onClick={undo} disabled={!folds.length || busy} aria-label="Undo (U)"><Undo2 size={16} aria-hidden /></button>
                    <button className="pill-light !px-3" onClick={restart} disabled={busy} aria-label="Restart (R)"><RotateCcw size={16} aria-hidden /></button>
                </div>
            </div>

            <nav className="mt-4 flex items-center justify-center gap-1 sm:gap-1.5" aria-label="Levels">
                <button className="p-1 text-paragraph disabled:opacity-30" onClick={() => go(lvl - 1)} disabled={lvl === 0} aria-label="Previous level"><ChevronLeft size={16} /></button>
                {LEVELS.map((L, k) => (
                    <button key={k} onClick={() => go(k)} aria-label={`Level ${k + 1}`} aria-current={k === lvl}
                        className={`grid place-items-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] font-semibold tabular-nums border transition-colors ${k === lvl ? "bg-primary text-btn border-transparent" : "border-stroke/25 text-paragraph"}`}
                        style={best[k] !== undefined && k !== lvl ? (best[k] <= L.par ? { background: MUSTARD, color: INK, borderColor: "transparent" } : { borderColor: MUSTARD }) : undefined}>{k + 1}</button>
                ))}
                <button className="p-1 text-paragraph disabled:opacity-30" onClick={() => go(lvl + 1)} disabled={lvl === LEVELS.length - 1} aria-label="Next level"><ChevronRight size={16} /></button>
            </nav>
        </div>
    );
}
