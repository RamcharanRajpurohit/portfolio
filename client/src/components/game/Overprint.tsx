import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { LEVELS, W, H, PW, PH, covers, shift, start, step, type Shape } from "./overprint/sim.ts";

// Overprint: each level is a print in two or three colour plates over an ink key. The little ink figure can only stand on
// overprint, where two plates cross and print dark; a single plate is just colour. Drag the plates out of register to
// build the way to the registration mark; reach it and the plates slide back, and the picture prints in register.
// Plates are their own canvases moved by CSS transforms (multiply by day, screen at night); the overprint layer is
// redrawn only while a plate moves; the figure's layer is the only thing drawn every frame.

const INK = "#26201a", CREAM = "#f3e6c4", NIGHT = "#1e2d25";
const INKS = ["#ff6509", "#24493a", "#ecba2a"];
const ANGLE = [15, 75, 0]; // screen angles, as on a press
const M = 1.5; // sheet margin (cells): crop marks, registration marks, colour bar
const DT = 1 / 120;
const FIG = 6; // the figure's own small canvas (cells); its feet sit at (FIG / 2, FEET)
const FEET = 4.4;
type Keys = { l: boolean; r: boolean; j: boolean };

function pathOf(shapes: readonly Shape[]) {
    const p = new Path2D();
    for (const s of shapes) {
        const [k, a, b, c, d] = s, n = s.slice(1) as number[];
        if (k === "r") p.rect(a, b, c, d);
        else if (k === "c" || k === "d") { p.moveTo(a + c, b); p.arc(a, b, c, 0, Math.PI * 2); }
        else if (k === "e") { p.moveTo(a + c, b); p.ellipse(a, b, c, d, 0, 0, Math.PI * 2); }
        else {
            // every polygon wound the same way, so a union of shapes never cancels into a hole
            let area = 0;
            for (let i = 0; i < n.length; i += 2) area += n[i] * n[(i + 3) % n.length] - n[(i + 2) % n.length] * n[i + 1];
            const pts: number[][] = [];
            for (let i = 0; i < n.length; i += 2) pts.push([n[i], n[i + 1]]);
            if (k === "p" && area < 0) pts.reverse();
            pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
            if (k === "p") p.closePath();
        }
    }
    return p;
}
function bbox(shapes: readonly Shape[]) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const add = (x: number, y: number) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const s of shapes) {
        const [k, a, b, c, d] = s;
        if (k === "r") { add(a, b); add(a + c, b + d); }
        else if (k === "c") { add(a - c, b - c); add(a + c, b + c); }
        else if (k === "e") { add(a - c, b - d); add(a + c, b + d); }
        else for (let i = 1; i < s.length; i += 2) add(s[i] as number, s[i + 1] as number);
    }
    return [x0, y0, x1, y1];
}
// a tile with one dot, for halftone screens
function dots(pitch: number, r: number, color: string) {
    const t = document.createElement("canvas");
    t.width = t.height = Math.max(2, Math.round(pitch));
    const c = t.getContext("2d")!;
    c.fillStyle = color;
    c.beginPath(); c.arc(t.width / 2, t.width / 2, r, 0, Math.PI * 2); c.fill();
    return t;
}
function screen(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, deg: number) {
    const pat = ctx.createPattern(tile, "repeat")!;
    pat.setTransform(new DOMMatrix().rotate(deg));
    return pat;
}
function regMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lw: number) {
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x + r * 1.6, y); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y + r * 1.6); ctx.stroke();
}
const saved = () => { try { return Math.min(LEVELS.length - 1, Math.max(0, Number(localStorage.getItem("overprint-level")) || 0)); } catch { return 0; } };

export default function Overprint() {
    const wrap = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null);
    const roller = useRef<HTMLDivElement>(null), figEl = useRef<HTMLCanvasElement>(null);
    const plateEls = useRef<(HTMLCanvasElement | null)[]>([]), overEl = useRef<HTMLCanvasElement>(null), keyEl = useRef<HTMLCanvasElement>(null), fgEl = useRef<HTMLCanvasElement>(null);
    const [li, setLi] = useState(saved);
    const [max, setMax] = useState(saved);
    const [c, setC] = useState(0); // cell size, CSS px
    const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
    const [started, setStarted] = useState(false);
    const [won, setWon] = useState(false);
    const [sel, setSel] = useState(-1); // plate picked with a number key
    const lv = LEVELS[li];
    const movable = lv.plates.map((p, i) => (p.x || p.y ? i : -1)).filter((i) => i >= 0);

    // everything the loop touches lives here, outside React
    const G = useRef({
        s: start(lv), keys: { l: false, r: false, j: false } as Keys, vis: [] as number[][], vel: [] as number[][], cv: [0, 0], acc: 0, last: 0, raf: 0,
        on: false, seen: false, shown: true, reduce: false, t: 0, squash: [1, 1], face: 1, run: 0, blink: 0, parts: [] as number[][],
        drag: null as null | { id: number; k: number; cand: number[]; x: number; y: number; o: number[] }, hover: -1, sel: -1, overDirty: true,
        paths: [] as Path2D[], kick: () => {}, draw: () => {}, uiDirty: true,
    }).current;
    if (G.sel !== sel) { G.sel = sel; G.uiDirty = true; }

    useEffect(() => {
        const mo = new MutationObserver(() => setDark(document.documentElement.dataset.theme === "dark"));
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        const el = wrap.current!;
        const ro = new ResizeObserver(() => setC(Math.max(6, Math.min(el.clientWidth / (W + 2 * M), (innerHeight * 0.64) / (H + 2 * M)))));
        ro.observe(el);
        return () => { mo.disconnect(); ro.disconnect(); };
    }, []);

    // a new level, or the same one again
    const load = (i: number) => {
        G.s = start(LEVELS[i]);
        G.vis = G.s.offs.map((o) => [...o]); G.vel = G.s.offs.map(() => [0, 0]); G.cv = [0, 0];
        G.parts = []; G.drag = null; G.overDirty = G.uiDirty = true;
        setWon(false); setSel(-1);
    };
    useEffect(() => { load(li); }, [li]); // eslint-disable-line react-hooks/exhaustive-deps

    // the plates, the key plate and the colour bar, for this level, size and theme
    useEffect(() => {
        if (!c) return;
        const dpr = Math.min(2, devicePixelRatio || 1), k = c * dpr;
        const ink = dark ? CREAM : INK, blend = dark ? "screen" : "multiply";
        G.paths = lv.plates.map((p) => pathOf(p.s));
        lv.plates.forEach((p, i) => {
            const cv = plateEls.current[i];
            if (!cv) return;
            const [rx0, rx1] = p.x ?? [0, 0], [ry0, ry1] = p.y ?? [0, 0];
            const [bx0, by0, bx1, by1] = bbox(p.s);
            // only the part that can ever show on the sheet
            const x0 = Math.max(bx0, -M - Math.max(0, rx1)), x1 = Math.min(bx1, W + M - Math.min(0, rx0));
            const y0 = Math.max(by0, -M - Math.max(0, ry1)), y1 = Math.min(by1, H + M - Math.min(0, ry0));
            cv.width = Math.ceil((x1 - x0) * k); cv.height = Math.ceil((y1 - y0) * k);
            Object.assign(cv.style, { left: `${x0 * c}px`, top: `${y0 * c}px`, width: `${cv.width / k * c}px`, height: `${cv.height / k * c}px`, mixBlendMode: blend });
            const ctx = cv.getContext("2d")!;
            ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
            ctx.fillStyle = INKS[p.ink];
            ctx.fill(G.paths[i]);
            // paper showing through a dot screen, so the tint reads as printed, not flat
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = screen(ctx, dots(4.6 * dpr, 1.25 * dpr, "rgba(0,0,0,.85)"), ANGLE[p.ink]);
            ctx.fillRect(0, 0, cv.width, cv.height);
        });
        for (const cv of [overEl.current!, fgEl.current!, keyEl.current!]) { cv.width = Math.round((W + 2 * M) * k); cv.height = Math.round((H + 2 * M) * k); }
        overEl.current!.style.mixBlendMode = blend;
        const fig = figEl.current!;
        fig.width = fig.height = Math.round(FIG * k); fig.style.width = fig.style.height = `${FIG * c}px`;
        // key plate: the picture's line work, always in register
        const kc = keyEl.current!, ctx = kc.getContext("2d")!;
        ctx.setTransform(k, 0, 0, k, M * k, M * k);
        ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineJoin = ctx.lineCap = "round";
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
        ctx.lineWidth = 1.4 / c; ctx.globalAlpha = 0.8;
        for (const p of G.paths) ctx.stroke(p);
        ctx.globalAlpha = 1; ctx.lineWidth = 1.8 / c;
        for (const s of lv.key) if (s[0] === "d") ctx.fill(pathOf([s])); else ctx.stroke(pathOf([s]));
        ctx.restore();
        // crop marks, and a colour bar: each ink, then each pair as it overprints
        ctx.lineWidth = 1 / c; ctx.globalAlpha = 0.7;
        for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) {
            const sx = x ? 1 : -1, sy = y ? 1 : -1;
            ctx.beginPath(); ctx.moveTo(x + sx * 0.3, y); ctx.lineTo(x + sx * 1.2, y); ctx.moveTo(x, y + sy * 0.3); ctx.lineTo(x, y + sy * 1.2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const inks = [...new Set(lv.plates.map((p) => p.ink))], sw = 0.8, gap = 0.2, bar: number[][] = inks.map((i) => [i]);
        for (let a = 0; a < inks.length; a++) for (let b = a + 1; b < inks.length; b++) bar.push([inks[a], inks[b]]);
        const bx = 0.4, by = H + (M - sw) / 2, tile = dots(3.4 * dpr, 1.05 * dpr, ink);
        bar.forEach((set, n) => {
            const x = bx + n * (sw + gap);
            ctx.globalCompositeOperation = blend;
            for (const i of set) { ctx.fillStyle = INKS[i]; ctx.fillRect(x, by, sw, sw); }
            ctx.globalCompositeOperation = "source-over";
            if (set.length < 2) return;
            // the overprint swatch carries the ink screen, as the ground does
            ctx.save(); ctx.beginPath(); ctx.rect(x, by, sw, sw); ctx.clip(); ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 0.7; ctx.fillStyle = screen(ctx, tile, 45); ctx.fillRect(0, 0, kc.width, kc.height); ctx.restore();
        });
        G.overDirty = true;
    }, [lv, c, dark, G]);

    // the loop: physics at a fixed step, springs for the plates, the figure drawn every frame
    useEffect(() => {
        if (!c) return;
        const mq = matchMedia("(prefers-reduced-motion: reduce)");
        const dpr = Math.min(2, devicePixelRatio || 1), k = c * dpr;
        const ink = dark ? CREAM : INK, paper = dark ? INK : CREAM;
        const oc = overEl.current!, fc = fgEl.current!, fg = figEl.current!, octx = oc.getContext("2d")!, fctx = fc.getContext("2d")!, gctx = fg.getContext("2d")!;
        // the overprint's own screen: a light tint with dense ink dots, one tile
        const ot = dots(3.4 * dpr, 1.05 * dpr, ink), otc = ot.getContext("2d")!;
        otc.globalCompositeOperation = "destination-over"; otc.fillStyle = dark ? "rgba(243,230,196,.3)" : "rgba(38,32,26,.28)"; otc.fillRect(0, 0, ot.width, ot.height);
        const opat = screen(octx, ot, 45);
        const at = (i: number) => [k, 0, 0, k, (M + G.vis[i][0]) * k, (M + G.vis[i][1]) * k] as const;

        const drawOver = () => {
            const n = lv.plates.length;
            octx.setTransform(1, 0, 0, 1, 0, 0);
            octx.clearRect(0, 0, oc.width, oc.height);
            // each pair of plates, clipped one by the other (inside the trim): the overprint, where the plates are drawn now
            octx.fillStyle = opat;
            for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
                octx.save(); octx.beginPath(); octx.rect(M * k, M * k, W * k, H * k); octx.clip();
                octx.setTransform(...at(a)); octx.clip(G.paths[a]); octx.setTransform(...at(b)); octx.clip(G.paths[b]);
                octx.setTransform(1, 0, 0, 1, 0, 0); octx.fillRect(M * k, M * k, W * k, H * k); octx.restore();
            }
            // its edges, inked: each plate's outline inside each other plate
            octx.save(); octx.beginPath(); octx.rect(M * k, M * k, W * k, H * k); octx.clip();
            octx.strokeStyle = ink; octx.lineWidth = 1.6 / c;
            for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) if (a !== b) {
                octx.save(); octx.setTransform(...at(a)); octx.clip(G.paths[a]); octx.setTransform(...at(b)); octx.stroke(G.paths[b]); octx.restore();
            }
            octx.restore();
            // every plate prints its own registration marks in the margin; in register they make one dark mark
            octx.globalCompositeOperation = dark ? "screen" : "multiply";
            lv.plates.forEach((p, i) => {
                octx.strokeStyle = INKS[p.ink];
                for (const [mx, my] of [[-M / 2, H / 2], [W + M / 2, H / 2], [W / 2, -M / 2]])
                    regMark(octx, (M + mx + G.vis[i][0]) * k, (M + my + G.vis[i][1]) * k, 0.3 * k, 1.4 * dpr);
            });
            octx.globalCompositeOperation = "source-over";
        };

        // the plate in hand, redrawn only when that changes
        const drawUi = () => {
            const s = G.s;
            fctx.setTransform(1, 0, 0, 1, 0, 0);
            fctx.clearRect(0, 0, fc.width, fc.height);
            fctx.setTransform(k, 0, 0, k, M * k, M * k);
            fctx.lineCap = fctx.lineJoin = "round";
            // the plate in hand: dashed outline, and its register scale in the margin
            const act = G.drag && G.drag.k >= 0 ? G.drag.k : G.sel >= 0 ? G.sel : G.hover;
            if (act >= 0 && !s.won) {
                const p = lv.plates[act], v = s.offs[act]; // where the plate will settle
                fctx.save(); fctx.beginPath(); fctx.rect(0, 0, W, H); fctx.clip(); fctx.translate(v[0], v[1]);
                fctx.setLineDash([0.35, 0.3]); fctx.lineWidth = 1.6 / c; fctx.strokeStyle = ink; fctx.globalAlpha = 0.85;
                fctx.stroke(G.paths[act]); fctx.restore();
                fctx.globalAlpha = 1; fctx.strokeStyle = fctx.fillStyle = ink; fctx.lineWidth = 1.4 / c;
                const scale = (horiz: boolean, [lo, hi]: readonly [number, number], o: number) => {
                    const u = 0.45, base = horiz ? W * 0.68 : H * 0.7; // clear of the centred registration marks
                    fctx.beginPath();
                    for (let t = lo; t <= hi; t++) {
                        const len = t === 0 ? 0.75 : 0.35, q = base + t * u;
                        if (horiz) { fctx.moveTo(q, H + 0.2); fctx.lineTo(q, H + 0.2 + len); } else { fctx.moveTo(W + 0.2, q); fctx.lineTo(W + 0.2 + len, q); }
                    }
                    fctx.stroke();
                    const q = base + o * u;
                    fctx.fillStyle = INKS[p.ink];
                    fctx.beginPath();
                    if (horiz) { fctx.moveTo(q, H + 0.15); fctx.lineTo(q - 0.32, H + 0.8); fctx.lineTo(q + 0.32, H + 0.8); }
                    else { fctx.moveTo(W + 0.15, q); fctx.lineTo(W + 0.8, q - 0.32); fctx.lineTo(W + 0.8, q + 0.32); }
                    fctx.closePath(); fctx.fill(); fctx.stroke();
                };
                if (p.x) scale(true, p.x, v[0]);
                if (p.y) scale(false, p.y, v[1]);
            }
        };
        // the figure, on its own small canvas that moves by transform: the only drawing done every frame
        const drawFig = () => {
            const b = G.s.b, fctx = gctx;
            const fx = b.x + PW / 2 + G.cv[0], fy = b.y + PH + G.cv[1], [sx, sy] = G.squash;
            fg.style.transform = `translate(${((M + fx - FIG / 2) * c).toFixed(1)}px,${((M + fy - FEET) * c).toFixed(1)}px)`;
            fctx.setTransform(1, 0, 0, 1, 0, 0);
            fctx.clearRect(0, 0, fg.width, fg.height);
            fctx.setTransform(k, 0, 0, k, (FIG / 2 - fx) * k, (FEET - fy) * k);
            fctx.lineCap = fctx.lineJoin = "round"; fctx.strokeStyle = fctx.fillStyle = ink;
            // ink specks
            for (const q of G.parts) { fctx.globalAlpha = Math.max(0, q[4]); fctx.beginPath(); fctx.arc(q[0], q[1], q[5], 0, Math.PI * 2); fctx.fill(); }
            fctx.globalAlpha = 1;
            // the printer's devil: an ink bean with a forked tail, in a folded paper hat
            const f = G.face, moving = b.ground && Math.abs(b.vx) > 0.5;
            const sw = moving ? Math.sin(G.run) * Math.min(1, Math.abs(b.vx) / 4) * 0.3 : b.ground ? 0 : 0.18;
            fctx.save(); fctx.translate(fx, fy); fctx.scale(sx, sy); fctx.translate(0, moving ? -Math.abs(Math.sin(G.run)) * 0.09 : 0);
            fctx.lineWidth = 2.4 / c;
            fctx.beginPath(); fctx.moveTo(-0.2, -0.45); fctx.lineTo(-0.2 + sw, 0); fctx.moveTo(0.2, -0.45); fctx.lineTo(0.2 - sw, 0); fctx.stroke();
            const tw = G.reduce ? 0 : Math.sin(G.t * 5) * 0.1;
            fctx.beginPath(); fctx.moveTo(-0.3 * f, -0.62); fctx.quadraticCurveTo(-0.9 * f, -0.55 + tw, -0.78 * f, -1.02 + tw); fctx.stroke();
            fctx.beginPath(); fctx.moveTo(-0.78 * f, -1.22 + tw); fctx.lineTo(-0.63 * f, -0.97 + tw); fctx.lineTo(-0.93 * f, -0.97 + tw); fctx.fill();
            fctx.beginPath(); fctx.ellipse(0, -0.95, 0.5, 0.62, 0, 0, Math.PI * 2); fctx.fill();
            const aw = b.ground ? -sw * 0.5 : -0.25;
            fctx.beginPath(); fctx.moveTo(-0.42, -0.98); fctx.lineTo(-0.64, -0.6 + aw); fctx.moveTo(0.42, -0.98); fctx.lineTo(0.64, -0.6 - aw); fctx.stroke();
            const look = f * 0.12, open = G.blink > 0 ? 0.15 : 1;
            fctx.fillStyle = paper;
            for (const ex of [-0.17, 0.17]) { fctx.beginPath(); fctx.ellipse(ex + look, -1.1, 0.12, 0.16 * open, 0, 0, Math.PI * 2); fctx.fill(); }
            fctx.fillStyle = ink;
            for (const ex of [-0.17, 0.17]) { fctx.beginPath(); fctx.arc(ex + look + f * 0.04, -1.08, 0.06 * open, 0, Math.PI * 2); fctx.fill(); }
            fctx.fillStyle = paper; fctx.lineWidth = 1.4 / c;
            fctx.beginPath(); fctx.moveTo(-0.5, -1.42); fctx.lineTo(0.08 * f, -2.08); fctx.lineTo(0.52, -1.42); fctx.closePath(); fctx.fill(); fctx.stroke();
            fctx.beginPath(); fctx.rect(-0.56, -1.44, 1.12, 0.16); fctx.fill(); fctx.stroke();
            fctx.restore();
        };
        const setPlate = (i: number) => {
            const el = plateEls.current[i], v = G.vis[i];
            if (el && v) el.style.transform = `translate(${(v[0] * c).toFixed(2)}px,${(v[1] * c).toFixed(2)}px)`;
        };
        G.draw = () => {
            if (G.overDirty) { drawOver(); G.overDirty = false; }
            if (G.uiDirty) { drawUi(); G.uiDirty = false; }
            drawFig();
        };
        lv.plates.forEach((_, i) => setPlate(i));
        G.overDirty = G.uiDirty = true;
        G.draw();

        const specks = (x: number, y: number, n: number, up: number) => {
            if (G.reduce) return;
            for (let i = 0; i < n; i++) G.parts.push([x + (Math.random() - 0.5) * 0.9, y - 0.05, (Math.random() - 0.5) * 6, -Math.random() * up, 1, 0.05 + Math.random() * 0.07]);
        };
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - G.last) / 1000);
            G.last = now; G.t += dt; G.reduce = mq.matches;
            const s = G.s, idle = { l: false, r: false, j: false };
            for (G.acc += dt; G.acc >= DT; G.acc -= DT) {
                const ev = step(s, G.sel >= 0 ? idle : G.keys, DT), b = s.b;
                if (ev === "jump") { G.squash = [0.76, 1.3]; specks(b.x + PW / 2, b.y + PH, 3, 2); }
                else if (ev === "land") { G.squash = [1.32, 0.7]; specks(b.x + PW / 2, b.y + PH, 5, 3); }
                else if (ev === "fall") G.cv = [0, 0];
                else if (ev === "win") {
                    G.squash = [0.8, 1.25]; setWon(true); setSel(-1); G.drag = null; G.uiDirty = true;
                    if (!G.reduce) {
                        setTimeout(() => sheet.current?.animate([{ transform: "none" }, { transform: "translateY(3px) scale(.985)" }, { transform: "none" }], { duration: 380, easing: "cubic-bezier(.3,.7,.2,1)" }), 420);
                        roller.current?.animate([{ transform: "translateX(-20%)", opacity: 1 }, { transform: "translateX(560%)", opacity: 1 }], { duration: 900, delay: 120, easing: "cubic-bezier(.5,0,.3,1)" });
                    }
                    const m = Math.min(LEVELS.length - 1, li + 1);
                    setMax((x) => { const y = Math.max(x, m); try { localStorage.setItem("overprint-level", String(y)); } catch { /* private mode */ } return y; });
                }
            }
            const b = s.b;
            if (Math.abs(b.vx) > 0.3) G.face = Math.sign(b.vx);
            G.run += Math.abs(b.vx) * dt * 2.4;
            G.blink = G.blink > 0 ? G.blink - dt : Math.random() < dt * 0.3 ? 0.12 : 0;
            const ease = G.reduce ? 1 : Math.min(1, dt * 11);
            G.squash = G.squash.map((v) => v + (1 - v) * ease);
            G.cv = G.cv.map((v) => (G.reduce ? 0 : v * Math.exp(-dt * 22)));
            // plates: a stiff spring to their cell, a slow one back into register once the level is done
            s.offs.forEach((o, i) => {
                const t = s.won ? [0, 0] : o, v = G.vis[i], vel = G.vel[i];
                if (Math.abs(t[0] - v[0]) + Math.abs(t[1] - v[1]) < 2e-3 && Math.abs(vel[0]) + Math.abs(vel[1]) < 1e-2) {
                    if (v[0] !== t[0] || v[1] !== t[1]) { v[0] = t[0]; v[1] = t[1]; vel[0] = vel[1] = 0; G.overDirty = true; setPlate(i); }
                    return;
                }
                if (G.reduce) { v[0] = t[0]; v[1] = t[1]; vel[0] = vel[1] = 0; }
                else {
                    const kk = s.won ? 110 : 900, dd = s.won ? 13 : 46, h = Math.min(dt, 1 / 50);
                    for (let j = 0; j < 2; j++) { vel[j] += (t[j] - v[j]) * kk * h - vel[j] * dd * h; v[j] += vel[j] * h; }
                }
                G.overDirty = true; setPlate(i);
            });
            for (const q of G.parts) { q[2] *= 0.95; q[3] += 30 * dt; q[0] += q[2] * dt; q[1] += q[3] * dt; q[4] -= dt * 2.2; }
            G.parts = G.parts.filter((q) => q[4] > 0);
            G.draw();
            G.raf = requestAnimationFrame(tick);
        };
        const run = () => {
            const want = G.on && G.seen && G.shown;
            if (want && !G.raf) { G.last = performance.now(); G.acc = 0; G.raf = requestAnimationFrame(tick); }
            if (!want && G.raf) { cancelAnimationFrame(G.raf); G.raf = 0; }
        };
        G.kick = run;
        const io = new IntersectionObserver(([e]) => { G.seen = e.isIntersecting; run(); });
        io.observe(sheet.current!);
        const vis = () => { G.shown = document.visibilityState === "visible"; run(); };
        document.addEventListener("visibilitychange", vis);
        return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); cancelAnimationFrame(G.raf); G.raf = 0; };
    }, [lv, li, c, dark, G]);

    const begin = () => { if (!G.on) { G.on = true; setStarted(true); G.kick(); } wrap.current?.focus({ preventScroll: true }); };
    const restart = () => { load(li); begin(); };
    const next = () => { const n = (li + 1) % LEVELS.length; if (n === li) load(n); else setLi(n); begin(); };
    // move a plate toward an offset a cell at a time; the figure rides along, or stops it
    const slide = (k: number, tx: number, ty: number) => {
        const s = G.s;
        for (let guard = 0; guard < 40 && !s.won; guard++) {
            const o = s.offs[k], dx = Math.sign(tx - o[0]), dy = dx ? 0 : Math.sign(ty - o[1]);
            if (!dx && !dy) break;
            const bx = s.b.x, by = s.b.y;
            if (!shift(s, k, dx, dy)) break;
            G.cv[0] -= s.b.x - bx; G.cv[1] -= s.b.y - by; G.uiDirty = true;
        }
    };

    // pointer: pick the plate under it (if several, the direction of the drag decides) and slide it by whole cells
    const cellAt = (e: React.PointerEvent) => { const r = sheet.current!.getBoundingClientRect(); return [(e.clientX - r.left) / c - M, (e.clientY - r.top) / c - M]; };
    const under = (x: number, y: number) => movable.filter((i) => [[0, 0], [0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]].some(([ax, ay]) => covers(lv.plates[i], G.s.offs[i], x + ax, y + ay)));
    const onDown = (e: React.PointerEvent) => {
        begin();
        if (e.button || G.s.won) return;
        const [x, y] = cellAt(e), cand = under(x, y);
        if (!cand.length) return;
        const k = cand.length === 1 ? cand[0] : -1;
        G.drag = { id: e.pointerId, k, cand, x, y, o: k >= 0 ? [...G.s.offs[k]] : [] }; G.uiDirty = true;
        sheet.current!.setPointerCapture(e.pointerId);
        sheet.current!.style.cursor = "grabbing";
    };
    const onMove = (e: React.PointerEvent) => {
        const [x, y] = cellAt(e), d = G.drag;
        if (!d || d.id !== e.pointerId) {
            if (e.pointerType === "mouse") {
                const h = under(x, y), hv = h.length ? h[h.length - 1] : -1;
                if (hv !== G.hover) { G.hover = hv; G.uiDirty = true; sheet.current!.style.cursor = h.length ? "grab" : ""; }
            }
            return;
        }
        const dx = x - d.x, dy = y - d.y;
        if (d.k < 0) { // several plates here: take one that moves the way the pointer goes
            if (Math.hypot(dx, dy) < 0.4) return;
            const horiz = Math.abs(dx) > Math.abs(dy), fit = d.cand.filter((i) => (horiz ? lv.plates[i].x : lv.plates[i].y));
            d.k = fit.includes(G.sel) ? G.sel : fit.length ? fit[fit.length - 1] : d.cand[d.cand.length - 1];
            d.o = [...G.s.offs[d.k]]; G.uiDirty = true;
        }
        slide(d.k, d.o[0] + Math.round(dx), d.o[1] + Math.round(dy));
    };
    const onUp = (e: React.PointerEvent) => { if (G.drag?.id === e.pointerId) { G.drag = null; G.uiDirty = true; sheet.current!.style.cursor = ""; } };

    const keyOf = (e: React.KeyboardEvent) => {
        const k = e.key.toLowerCase();
        return k === "arrowleft" || k === "a" ? "l" : k === "arrowright" || k === "d" ? "r" : k === "arrowup" || k === "w" || k === " " ? "j" : k === "arrowdown" || k === "s" ? "down" : "";
    };
    const onKey = (e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).tagName === "BUTTON" && (e.key === " " || e.key === "Enter")) return;
        const k = keyOf(e), n = Number(e.key);
        if (n >= 1 && n <= movable.length) { e.preventDefault(); begin(); setSel(sel === movable[n - 1] ? -1 : movable[n - 1]); return; }
        if (e.key === "Escape" && sel >= 0) { e.preventDefault(); setSel(-1); return; }
        if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); return; }
        if (e.key === "Enter" && won) { e.preventDefault(); next(); return; }
        if (!k) return;
        e.preventDefault(); begin();
        if (sel >= 0) { // a picked plate: the arrows nudge it
            const o = G.s.offs[sel];
            slide(sel, o[0] + (k === "l" ? -1 : k === "r" ? 1 : 0), o[1] + (k === "j" ? -1 : k === "down" ? 1 : 0));
        } else if (k !== "down") G.keys[k] = true;
    };
    const onKeyUp = (e: React.KeyboardEvent) => { const k = keyOf(e); if (k && k !== "down") G.keys[k] = false; };
    const hold = (k: keyof Keys) => ({
        onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); begin(); G.keys[k] = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); },
        onPointerUp: () => { G.keys[k] = false; }, onPointerCancel: () => { G.keys[k] = false; }, onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    });

    return (
        <div ref={wrap} tabIndex={0} onKeyDown={onKey} onKeyUp={onKeyUp} onBlur={() => { G.keys = { l: false, r: false, j: false }; }}
            className="group relative mx-auto max-w-5xl outline-none select-none">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                    <p className="eyebrow text-paragraph">Level {li + 1}</p>
                    {lv.hint && <p className="mt-1 text-sm text-heading">{lv.hint}</p>}
                </div>
                <div className="flex items-center gap-2">
                    {movable.map((i, n) => (
                        <button key={i} type="button" onClick={() => { begin(); setSel(sel === i ? -1 : i); }} aria-pressed={sel === i} aria-label={`Plate ${n + 1}`}
                            className={`${sel === i ? "pill-dark" : "pill-light"} !px-3 !py-1.5 tabular-nums`}>
                            <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: INKS[lv.plates[i].ink], boxShadow: "inset 0 0 0 1px rgb(38 32 26 / .3)" }} />{n + 1}
                        </button>
                    ))}
                    <button type="button" className="pill-light !px-3 !py-1.5" onClick={restart} aria-label="Restart level (R)"><RotateCcw size={16} /></button>
                </div>
            </div>

            <div ref={sheet} className="relative mx-auto overflow-hidden touch-none group-focus-visible:outline group-focus-visible:outline-1 group-focus-visible:outline-offset-4 group-focus-visible:outline-stroke/50" role="application" aria-label={`Overprint, level ${li + 1}`}
                style={{ width: c ? (W + 2 * M) * c : "100%", height: c ? (H + 2 * M) * c : "50vh", background: dark ? NIGHT : CREAM, isolation: "isolate", boxShadow: "0 18px 40px -22px rgb(40 30 0 / .6), 0 0 0 1px rgb(var(--stroke) / .18)" }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => { G.hover = -1; G.uiDirty = true; }}>
                <div className="absolute overflow-hidden" style={{ inset: M * c }}>
                    {lv.plates.map((_, i) => <canvas key={`${li}-${i}`} ref={(el) => { plateEls.current[i] = el; }} className="absolute will-change-transform" aria-hidden />)}
                </div>
                <canvas ref={overEl} className="absolute inset-0 w-full h-full" aria-hidden />
                <canvas ref={keyEl} className="absolute inset-0 w-full h-full" aria-hidden />
                <canvas ref={fgEl} className="absolute inset-0 w-full h-full" aria-hidden />
                {/* the registration mark to stand on; it fills in when the sheet is printed */}
                <svg viewBox="-1 -1 2 2" className="absolute" aria-hidden
                    style={{ left: (M + lv.goal[0] - 1.1) * c, top: (M + lv.goal[1] - 1.1) * c, width: 2.2 * c, height: 2.2 * c, color: dark ? CREAM : INK }}>
                    <circle r=".56" fill={won ? "currentColor" : "none"} stroke="currentColor" strokeWidth=".09" style={{ transition: "fill .3s .2s" }} />
                    <path d="M-.95 0H.95M0-.95V.95" stroke="currentColor" strokeWidth=".09" />
                </svg>
                <canvas ref={figEl} className="absolute left-0 top-0 will-change-transform" aria-hidden />
                <div className="absolute inset-0 pointer-events-none opacity-60" style={{ background: "url(/art/paper.webp) 0 0 / 512px", mixBlendMode: "overlay" }} />
                {/* the ink roller that passes over the sheet when it prints in register */}
                <div ref={roller} className="absolute inset-y-0 left-0 w-1/5 pointer-events-none opacity-0" style={{ background: `linear-gradient(90deg, transparent, ${dark ? "rgb(243 230 196 / .22)" : "rgb(38 32 26 / .16)"} 45%, ${dark ? "rgb(243 230 196 / .35)" : "rgb(255 255 255 / .35)"} 55%, transparent)`, mixBlendMode: dark ? "screen" : "multiply" }} aria-hidden />
                {!started && <button type="button" className="pill-dark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={begin}>Play</button>}
                {won && (
                    <button type="button" className="pill-dark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animation: "rise .5s .7s both" }} onClick={next}>
                        Level {(li + 1) % LEVELS.length + 1}
                    </button>
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-paragraph [@media(pointer:coarse)]:hidden">← → walk · ↑ jump · drag a plate, or press its number then arrows · R restart</p>
                <div className="hidden w-full items-center justify-between [@media(pointer:coarse)]:flex">
                    <div className="flex gap-3">
                        <button type="button" className="pill-light !h-14 !w-14 !p-0 text-xl touch-none" aria-label="Left" {...hold("l")}>◀</button>
                        <button type="button" className="pill-light !h-14 !w-14 !p-0 text-xl touch-none" aria-label="Right" {...hold("r")}>▶</button>
                    </div>
                    <button type="button" className="pill-dark !h-14 !w-20 !p-0 text-xl touch-none" aria-label="Jump" {...hold("j")}>▲</button>
                </div>
                <div className="flex gap-1.5 mx-auto sm:mx-0" aria-label="Levels">
                    {LEVELS.map((_, i) => (
                        <button key={i} type="button" disabled={i > max} onClick={() => { setLi(i); begin(); }} aria-label={`Level ${i + 1}`} aria-current={i === li}
                            className={`h-3 w-3 rounded-full border border-stroke/40 ${i === li ? "bg-primary" : i <= max ? "bg-btnp" : "opacity-30"}`} />
                    ))}
                </div>
            </div>
        </div>
    );
}
