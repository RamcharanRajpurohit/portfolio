import projects from "../../data/project_data";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

// "Register": a poster's ink key plate lies on the press bed; its colour plates ride past on a roller and one
// press (tap, click, Space or Enter) stamps the plate down where it is. The offset from true register (in poster
// px) is the score, and the stamp really prints: each plate is baked into the sheet at its offset, multiplied
// (screened on dark stock), so the finished poster, and the PNG you can download, is the print you made.
// Plates are drawn with Canvas2D (vector shapes, rotated halftone screens), so the export renders the same art with
// the page's fonts; the plate on the roller is a canvas layer moved by transform, and rAF runs only while it moves
// or the press shakes, the game is on screen and the tab is visible.

type Project = (typeof projects)[number];
type Ctx = CanvasRenderingContext2D;
type Draw = (c: Ctx, sc: number) => void;
type Part = (c: Ctx, sc: number, part: number) => void; // part 0: the image area, 1: marks in the margin
type Hit = { dx: number; dy: number; d: number; g: number }; // g: 2 perfect, 1 close, 0 off register
type Plate = { col: string; draw: Part };
type Poster = { p: Project; stock: string; dark: boolean; plates: Plate[]; key: Draw };

const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const N = projects.length;
const IW = 300, IH = 400, M = 16, SW = IW + 2 * M, SH = IH + 2 * M; // image area and sheet, in poster px
const A = 125, PERFECT = 5, CLOSE = 14, LAG = 16; // roller travel; windows in px; display lag judged back (ms)
const LIFT = 0.8; // a plate on the roller shows as a wet preview until it is stamped
const GRADE = ["", "Close", "Perfect"];
const TAU = Math.PI * 2;
const pad = (n: number) => String(n).padStart(2, "0");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// seeded from the title, so each poster's art stays the same between visits (same seeding as the project sleeves)
function rng(s: string) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h = (h + 0x6d2b79f5) | 0;
        let t = Math.imul(h ^ (h >>> 15), 1 | h);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function wrap(text: string, max: number) {
    const lines: string[] = [];
    for (const w of text.split(" ")) {
        const l = lines.length - 1;
        if (l >= 0 && (lines[l] + " " + w).length <= max) lines[l] += " " + w;
        else lines.push(w);
    }
    return lines;
}

// stock, plate A, plate B, type colour: the sleeves' palettes, so a poster matches its project's sleeve
const PALETTES = [
    [CREAM, ORANGE, FOREST, INK], [MUSTARD, FOREST, ORANGE, INK], [FOREST, MUSTARD, ORANGE, CREAM],
    [ORANGE, FOREST, MUSTARD, INK], [CREAM, FOREST, MUSTARD, INK], [INK, ORANGE, MUSTARD, CREAM],
];
const art = (i: number) => PALETTES[(i * 5 + 2 + (i >= 6 ? 3 : 0)) % PALETTES.length];

// a rotated halftone screen: cell and dot radius in poster px, the tile drawn at the canvas's own scale
function screen(c: Ctx, col: string, sc: number, ang: number, cell = 6, r = 1.75) {
    const n = Math.max(2, Math.round(cell * sc)), t = document.createElement("canvas");
    t.width = t.height = n;
    const x = t.getContext("2d")!;
    x.fillStyle = col; x.beginPath(); x.arc(n / 2, n / 2, (r * n) / cell, 0, TAU); x.fill();
    const p = c.createPattern(t, "repeat")!;
    p.setTransform(new DOMMatrix().rotateSelf(ang).scaleSelf(cell / n));
    return p;
}
const circle = (c: Ctx, x: number, y: number, r: number) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
const line = (c: Ctx, x0: number, y0: number, x1: number, y1: number) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
// register marks in the margins and a colour-bar patch: every plate carries them, so misregistration shows there too
function marks(c: Ctx, slot: number) {
    c.lineWidth = 0.9;
    for (const [x, y] of [[-8, IH / 2], [IW + 8, IH / 2], [IW / 2, -8], [IW / 2, IH + 8]]) {
        circle(c, x, y, 4.5); c.stroke();
        line(c, x - 7.5, y, x + 7.5, y); line(c, x, y - 7.5, x, y + 7.5);
    }
    c.fillRect(6 + slot * 13, IH + 4, 10, 8);
}

/** One poster: the stock, two or three colour plates (flat, halftone, gradient screen) and the ink key plate. */
function makePoster(round: number): Poster {
    const i = round % N, p = projects[i], r = rng(p.title), [stock, A1, B1, ink] = art(i);
    const dark = stock === FOREST || stock === INK;
    const C1 = [INK, FOREST, MUSTARD, CREAM, ORANGE].find((x) => ![stock, A1, B1, ink].includes(x))!;
    const three = round > 0 && C1 !== (dark ? INK : CREAM); // a third plate only where its ink would show
    const ang = Math.round(r() * 40 - 20), cx = 150 + (r() - 0.5) * 80, cy = 260 + (r() - 0.5) * 50;
    // each motif: a (plate A, flat), b (the shape plate B screens) and the key's outlines
    let a: (c: Ctx) => void, b: (c: Ctx) => void, key: (c: Ctx) => void;
    const motif = i % 6;
    if (motif === 0) { // sun over a ruled sea
        a = (c) => { circle(c, cx, cy - 40, 96); c.fill(); };
        b = (c) => c.fillRect(0, 292, IW, 108);
        key = (c) => {
            c.lineWidth = 2.2; circle(c, cx, cy - 40, 96); c.stroke();
            c.lineWidth = 2.4;
            for (let k = 0; k < 7; k++) line(c, 0, 292 + k * k * 2.3, IW, 292 + k * k * 2.3);
        };
    } else if (motif === 1) { // diagonal bands under a screened panel
        const bands = (c: Ctx, f: (y: number) => void) => { c.save(); c.translate(150, 260); c.rotate((ang * Math.PI) / 180); c.translate(-150, -260); [-2, 0, 2].forEach((k) => f(250 + k * 50)); c.restore(); };
        a = (c) => bands(c, (y) => c.fillRect(-120, y, 540, 30));
        b = (c) => c.fillRect(30, 190, 240, 180);
        key = (c) => { c.lineWidth = 2; c.strokeRect(30, 190, 240, 180); c.lineWidth = 1.2; bands(c, (y) => c.strokeRect(-120, y, 540, 30)); };
    } else if (motif === 2) { // giant initial over a screened field
        const L = p.title[0], f = (c: Ctx) => { c.font = "800 400px Manrope, sans-serif"; c.textAlign = "right"; };
        a = (c) => { f(c); c.fillText(L, 294, 392); };
        b = (c) => c.fillRect(0, 250, IW, 150);
        key = (c) => { f(c); c.lineWidth = 1.8; c.strokeText(L, 294, 392); c.lineWidth = 2.4; line(c, 0, 250, IW, 250); };
    } else if (motif === 3) { // dot field, big near a seeded point
        a = (c) => {
            c.beginPath();
            for (let y = 0; y < 18; y++) for (let x = 0; x < 14; x++) {
                const px = x * 24 + (y % 2) * 12, py = 140 + y * 15, rr = Math.max(0, 10 - Math.hypot(px - cx, py - cy) / 22);
                if (rr > 0.6) { c.moveTo(px + rr, py); c.arc(px, py, rr, 0, TAU); }
            }
            c.fill();
        };
        b = (c) => c.fillRect(0, 232, IW, 140);
        key = (c) => { c.lineWidth = 6; line(c, 0, 384, IW, 384); c.lineWidth = 1.4; c.strokeRect(0, 232, IW, 140); };
    } else if (motif === 4) { // engraved waves over a band, a screened moon
        a = (c) => c.fillRect(0, cy - 30, IW, 400);
        b = (c) => { circle(c, cx, cy - 64, 74); c.fill(); };
        key = (c) => {
            c.lineWidth = 2.2; circle(c, cx, cy - 64, 74); c.stroke();
            for (let k = 0; k < 10; k++) {
                c.beginPath();
                for (let x = 0; x <= IW; x += 10) c.lineTo(x, 200 + k * 20 + Math.sin(x / 34 + k * 0.6 + ang) * 10);
                c.stroke();
            }
        };
    } else { // concentric rings
        a = (c) => { c.lineWidth = 13; for (const rr of [34, 64, 94, 124, 154]) { circle(c, cx, cy, rr); c.stroke(); } };
        b = (c) => { circle(c, cx + 40, cy - 40, 70); c.fill(); };
        key = (c) => { circle(c, cx, cy, 8); c.fill(); c.lineWidth = 1.2; circle(c, cx + 40, cy - 40, 70); c.stroke(); circle(c, cx, cy, 161); c.stroke(); };
    }
    const clip = (c: Ctx, f: () => void) => { c.save(); c.beginPath(); c.rect(0, 0, IW, IH); c.clip(); f(); c.restore(); };
    const plate = (col: string, slot: number, body: Draw): Plate => ({
        col, draw: (c, sc, part) => { if (part) { c.fillStyle = c.strokeStyle = col; marks(c, slot); } else clip(c, () => body(c, sc)); },
    });
    const plates = [
        plate(A1, 1, (c) => { c.fillStyle = c.strokeStyle = A1; a(c); }),
        plate(B1, 2, (c, sc) => { c.fillStyle = screen(c, B1, sc, ang + 45); b(c); }),
    ];
    if (three) plates.push(plate(C1, 3, (c) => { // a gradient screen behind the type, and a printed border
        const t = Math.PI / 12;
        c.fillStyle = c.strokeStyle = C1;
        c.save(); c.translate(150, 200); c.rotate(t); c.beginPath();
        for (let y = -260; y < 260; y += 7) for (let x = -220; x < 220; x += 7) {
            const v = 1 - (Math.cos(t) * y + Math.sin(t) * x + 200) / 400, rr = 3.1 * Math.max(0, Math.min(1, v * 1.15)) ** 1.4;
            if (rr > 0.35) { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); }
        }
        c.fill(); c.restore();
        c.lineWidth = 3; c.strokeRect(9, 9, IW - 18, IH - 18);
    }));
    const sub = wrap(p.subtitle.toUpperCase(), 32), words = wrap(p.title, 11);
    const fs = Math.min(78, 256 / (Math.max(...words.map((w) => w.length)) * 0.6));
    const keyDraw: Draw = (c) => {
        c.fillStyle = c.strokeStyle = ink;
        clip(c, () => { key(c); c.lineWidth = 0.8; c.strokeRect(9, 9, IW - 18, IH - 18); });
        // the type is trapped: a halo of stock knocks the colour out behind it
        c.save(); c.lineJoin = "round"; c.strokeStyle = stock; c.textAlign = "left";
        const text = (s: string, x: number, y: number, font: string, ls: number, lw: number) => {
            c.font = font; (c as Ctx & { letterSpacing: string }).letterSpacing = `${ls}px`; c.lineWidth = lw;
            c.strokeText(s, x, y); c.fillText(s, x, y);
        };
        sub.forEach((l, k) => text(l, 24, 36 + k * 13, "700 9.5px Manrope, sans-serif", 1.4, 3));
        words.forEach((w, k) => text(w, 21, 50 + sub.length * 13 + fs * 0.82 + k * fs * 0.9, `800 ${fs}px Manrope, sans-serif`, -fs * 0.045, fs * 0.16));
        c.restore();
        c.strokeStyle = c.fillStyle = INK; c.lineWidth = 0.8; // crop marks at the trim corners, in registration ink
        for (const [x, y, sx, sy] of [[0, 0, -1, -1], [IW, 0, 1, -1], [0, IH, -1, 1], [IW, IH, 1, 1]]) {
            line(c, x + sx * 4, y, x + sx * 14, y); line(c, x, y + sy * 4, x, y + sy * 14);
        }
        marks(c, 0);
    };
    return { p, stock, dark, plates, key: keyDraw };
}

// a canvas in poster px: origin at the image area's top-left, sc device px per poster px
function setup(cv: HTMLCanvasElement, w: number, h: number) {
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const c = cv.getContext("2d")!, sc = w / SW;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.setTransform(sc, 0, 0, sc, M * sc, M * sc);
    return { c, sc };
}
function renderPlate(cv: HTMLCanvasElement, P: Poster, k: number, part: number, w: number, h: number) {
    const { c, sc } = setup(cv, w, h);
    P.plates[k].draw(c, sc, part);
}
// screened over dark stock, multiplied over light stock and the cream margin
const blend = (P: Poster, part: number) => (P.dark && !part ? "screen" : "multiply");
// print one plate (rendered on its own canvas first, so a plate never overprints itself) at its offset
function bake(c: Ctx, P: Poster, part: number, plate: HTMLCanvasElement, dx: number, dy: number) {
    const sc = c.canvas.width / SW;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = blend(P, part);
    c.drawImage(plate, dx * sc, dy * sc);
    c.restore();
}
function compose(cv: HTMLCanvasElement, P: Poster, hits: Hit[], w: number, h: number, tmp: HTMLCanvasElement) {
    const { c } = setup(cv, w, h);
    c.fillStyle = CREAM; c.fillRect(-M, -M, SW, SH);
    c.fillStyle = P.stock; c.fillRect(0, 0, IW, IH);
    hits.forEach((t, k) => [0, 1].forEach((part) => { renderPlate(tmp, P, k, part, w, h); bake(c, P, part, tmp, t.dx, t.dy); }));
    return c;
}

// smooth shake noise (a few incommensurate sines, not random jumps)
const nz = (t: number, a: number) => Math.sin(t * a) * 0.6 + Math.sin(t * a * 1.71 + 1.3) * 0.4;

export default function Register() {
    const root = useRef<HTMLDivElement>(null), bed = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null);
    const paper = useRef<HTMLCanvasElement>(null), keyCv = useRef<HTMLCanvasElement>(null);
    const layers = useRef<HTMLCanvasElement[]>([]); // the plate on the roller: its image area, and its margin marks
    const shade = useRef<HTMLDivElement>(null), carriage = useRef<HTMLDivElement>(null), badge = useRef<HTMLDivElement>(null);
    const drops = useRef<(HTMLSpanElement | null)[]>([]);
    const [W, setW] = useState(0);
    const [round, setRound] = useState(0);
    const [n, setN] = useState(0); // counts sheets put on the bed
    const [plate, setPlate] = useState(0);
    const [phase, setPhase] = useState<"ready" | "run" | "done">("ready");
    const [hits, setHits] = useState<Hit[]>([]);
    const [combo, setCombo] = useState(0);
    const [fb, setFb] = useState<(Hit & { c: number }) | null>(null);
    const [font, setFont] = useState(false);
    const P = useMemo(() => makePoster(round), [round]);
    const S = useRef({
        ph: 0.5, w: 0, tri: true, surge: 0, wob: 0, seed: 0, t0: 0, last: 0, raf: 0, run: false, busy: false, hold: -1, frozen: false,
        x: A, y: 0, k: 1, trauma: 0, seen: false, input: 0, slide: false, reduce: false, hits: [] as Hit[],
        tmp: null as HTMLCanvasElement | null, kick: () => {},
    }).current;
    S.hits = hits;
    const H = Math.round((W * SH) / SW);
    const px = () => { const d = Math.min(2, devicePixelRatio || 1); return [Math.round(W * d), Math.round(H * d)] as const; };

    useEffect(() => {
        S.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
        Promise.all([document.fonts.load("800 60px Manrope"), document.fonts.load("700 10px Manrope")]).finally(() => setFont(true));
        const el = root.current!; // captured: the observer can still fire once after a tab switch unmounts the game
        const ro = new ResizeObserver(() => setW(Math.min(380, el.clientWidth - 48)));
        ro.observe(el);
        return () => ro.disconnect();
    }, [S]);

    // the roller: phase runs on a triangle or a sine wave; later posters surge in speed and wobble up and down
    const at = (ph: number, now: number) => {
        const f = ph - Math.floor(ph), e = Math.min(1, Math.max(0, (now - S.t0) / 420));
        const wave = S.tri ? 1 - 4 * Math.abs(f - 0.5) : -Math.cos(TAU * ph);
        return [A * wave + (S.reduce ? 0 : 210 * (1 - e) ** 3), S.wob * Math.cos(3 * Math.PI * (ph - 0.25))];
    };
    const rate = (now: number) => (now < S.t0 ? 0 : S.w * (1 + S.surge * Math.sin(now * 0.0021 + S.seed)));
    const place = () => {
        for (const l of layers.current) l.style.transform = `translate(${(S.x * S.k).toFixed(2)}px,${(S.y * S.k).toFixed(2)}px)`;
        if (carriage.current) carriage.current.style.transform = `translateX(${(S.x * S.k).toFixed(2)}px)`;
    };

    useEffect(() => {
        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - S.last) / 1000);
            S.last = now;
            if (S.run) {
                if (!S.frozen) { S.ph += rate(now) * dt; [S.x, S.y] = at(S.ph, now); place(); }
                if (now - S.input > 30000 && !S.frozen) { S.run = false; setPhase("ready"); } // nobody is playing
            }
            if (S.trauma > 0 && bed.current) {
                S.trauma = Math.max(0, S.trauma - dt * 2.6);
                const s = S.trauma ** 2 * 10, t = now / 1000;
                bed.current.style.transform = s > 0.02 ? `translate(${(s * nz(t, 47)).toFixed(2)}px,${(s * nz(t + 9, 53)).toFixed(2)}px) rotate(${(s * 0.06 * nz(t + 3, 41)).toFixed(3)}deg)` : "";
            }
            S.raf = (S.run || S.trauma > 0) && S.seen && !document.hidden ? requestAnimationFrame(tick) : 0;
        };
        S.kick = () => { if (!S.raf && S.seen && !document.hidden && (S.run || S.trauma > 0)) { S.last = performance.now(); S.raf = requestAnimationFrame(tick); } };
        const io = new IntersectionObserver(([e]) => { S.seen = e.isIntersecting; S.kick(); });
        io.observe(root.current!);
        const vis = () => S.kick();
        document.addEventListener("visibilitychange", vis);
        return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); cancelAnimationFrame(S.raf); S.raf = 0; };
    }, [S]); // eslint-disable-line react-hooks/exhaustive-deps

    // a new sheet: print the stock and the key, bake the plates already stamped (after a resize), slide it in
    useLayoutEffect(() => {
        if (!W || !font) return;
        const [w, h] = px();
        S.k = W / SW; S.tmp ??= document.createElement("canvas");
        compose(paper.current!, P, S.hits, w, h, S.tmp);
        const { c, sc } = setup(keyCv.current!, w, h);
        P.key(c, sc);
        const el = sheet.current;
        if (S.slide && el) {
            S.slide = false;
            el.getAnimations().forEach((a) => a.cancel());
            el.animate(S.reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: "translateX(125%) rotate(6deg)" }, { transform: "translateX(-2%) rotate(-.6deg)", offset: 0.75 }, { transform: "none" }],
                { duration: S.reduce ? 300 : 640, easing: "cubic-bezier(.2,.8,.3,1)" });
        }
    }, [W, P, n, font]); // eslint-disable-line react-hooks/exhaustive-deps

    // the plate on the roller
    useLayoutEffect(() => {
        if (!W || !font) return;
        const [w, h] = px(), on = plate < P.plates.length;
        layers.current.forEach((l, part) => { if (on) renderPlate(l, P, plate, part, w, h); l.style.opacity = on ? String(LIFT) : "0"; });
        place();
    }, [W, P, plate, font, n]); // eslint-disable-line react-hooks/exhaustive-deps

    // start the roller for this plate; speed ramps with the poster number
    useEffect(() => {
        if (phase !== "run" || plate >= P.plates.length) return;
        const lvl = round + plate * 0.34, v = S.reduce ? 110 : Math.min(300, 165 * 1.1 ** lvl); // px/s through register
        S.tri = S.reduce || round < 2 || (round + plate) % 2 === 0;
        S.w = S.tri ? v / (4 * A) : v / (TAU * A);
        S.surge = !S.reduce && round >= 3 && (round + plate) % 3 ? Math.min(0.55, 0.22 + 0.08 * (round - 3)) : 0;
        S.wob = !S.reduce && round >= 4 && (round + plate) % 2 === 0 ? Math.min(14, 7 + round) : 0;
        S.seed = round * 1.7 + plate; S.ph = 0.5; S.t0 = performance.now() + (plate === 0 ? 450 : 0);
        S.hold = -1; S.frozen = false; S.run = true; S.busy = false; S.kick();
    }, [phase, plate, P, n]); // eslint-disable-line react-hooks/exhaustive-deps

    const start = () => { S.input = performance.now(); setPhase("run"); };
    const next = async (to?: number) => {
        if (S.busy) return;
        S.run = false; S.busy = true;
        await sheet.current?.animate(S.reduce ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: "none" }, { transform: "translateX(-130%) rotate(-7deg)" }],
            { duration: S.reduce ? 250 : 420, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" }).finished.catch(() => {});
        S.slide = true; S.hits = []; S.x = A + 210; S.y = 0;
        setRound((r) => to ?? r + 1); setN((k) => k + 1); setPlate(0); setHits([]); setFb(null);
        if (to === 0) setCombo(0);
        S.input = performance.now(); setPhase("run");
    };

    const stamp = async (ts: number, frozen = false) => {
        if (S.busy || !S.run) return;
        S.busy = true; S.input = performance.now();
        if (!frozen) { S.ph += rate(ts) * (ts - LAG - S.last) / 1000; [S.x, S.y] = at(S.ph, ts - LAG); }
        S.run = false; S.frozen = false; place();
        const { x, y } = S, d = Math.round(Math.hypot(x, y)), g = d <= PERFECT ? 2 : d <= CLOSE ? 1 : 0;
        const k = plate, col = P.plates[k].col, ls = layers.current, T = `translate(${(x * S.k).toFixed(2)}px,${(y * S.k).toFixed(2)}px)`;
        const rm = S.reduce;
        const anim = (f: Keyframe[], o: KeyframeAnimationOptions) => Promise.all(ls.map((l) => l.animate(f, { ...o, fill: "forwards" }).finished)).catch(() => {});
        // anticipation (the platen lifts the plate a hair), then it comes down hard
        await anim(rm ? [{ opacity: LIFT }, { opacity: 1 }] : [{ transform: `${T} scale(1)`, opacity: LIFT }, { transform: `${T} scale(1.025)`, opacity: 0.9, offset: 0.4 }, { transform: `${T} scale(.993)`, opacity: 1 }],
            { duration: rm ? 120 : 110, easing: "cubic-bezier(.55,0,.9,.5)" });
        // thunk
        const c = g === 2 ? combo + 1 : 0;
        setCombo(c);
        setFb({ dx: x, dy: y, d, g, c });
        if (!rm) {
            S.trauma = Math.min(1, S.trauma + [0.45, 0.55, 0.75][g]); S.kick();
            shade.current?.animate([{ opacity: 0.28 }, { opacity: 0 }], { duration: 320, easing: "ease-out" });
            if (g) splash(col, g);
            if (g === 2) await wait(70); // hit-stop: the press holds down a moment on a perfect stamp
            // ink squish as the platen lifts
            await anim([{ transform: `${T} scale(.993)` }, { transform: `${T} scale(1.008,1.004)`, offset: 0.45 }, { transform: `${T} scale(1)` }],
                { duration: 200, easing: "cubic-bezier(.2,.7,.3,1)" });
        }
        if (!paper.current) return; // the game was switched away mid-stamp
        ls.forEach((l, part) => { bake(paper.current!.getContext("2d")!, P, part, l, x, y); l.getAnimations().forEach((a) => a.cancel()); l.style.opacity = "0"; });
        const h = [...S.hits, { dx: x, dy: y, d, g }];
        S.hits = h; setHits(h);
        await wait(rm ? 250 : 180);
        S.x = A + 210; S.y = 0;
        setPlate(k + 1);
        if (k + 1 >= P.plates.length) {
            setPhase("done"); S.busy = false;
            if (!rm) sheet.current?.animate([{ transform: "none" }, { transform: "translateY(-10px) rotate(-.8deg) scale(1.015)", offset: 0.35 }, { transform: "none" }], { duration: 650, easing: "cubic-bezier(.3,.7,.3,1)" });
        }
    };

    // ink squeezed out from under the plate's edges
    const splash = (col: string, g: number) => {
        const k = S.k;
        drops.current.forEach((s, j) => {
            if (!s) return;
            const side = j % 4, u = Math.random(), bx = side % 2 ? (side === 1 ? IW : 0) : u * IW, by = side % 2 ? u * IH : side === 0 ? 0 : IH;
            const ox = side === 1 ? 1 : side === 3 ? -1 : u - 0.5, oy = side === 0 ? -1 : side === 2 ? 1 : u - 0.5, dist = (10 + Math.random() * 18) * g;
            const x0 = (bx + M + S.x) * k, y0 = (by + M + S.y) * k;
            s.style.background = col;
            s.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${x0 + ox * dist}px,${y0 + oy * dist}px) scale(.2)`, opacity: 0 }],
                { duration: 380 + j * 15, easing: "cubic-bezier(.1,.7,.3,1)" });
        });
    };

    // the result badge lands like a rubber stamp
    useLayoutEffect(() => {
        if (!fb || !badge.current || S.reduce) return;
        badge.current.animate([{ transform: "rotate(-8deg) scale(1.9)", opacity: 0 }, { transform: "rotate(-8deg) scale(.92)", opacity: 1, offset: 0.6 }, { transform: "rotate(-8deg) scale(1)" }],
            { duration: 260, easing: "cubic-bezier(.3,.6,.4,1)" });
    }, [fb, S]);

    const done = phase === "done";
    const act = (ts: number) => {
        if (phase === "ready") start();
        else if (phase === "run") stamp(ts);
        else next();
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key !== " " && e.key !== "Enter") return;
        const t = e.target as HTMLElement;
        if (t !== root.current && t.dataset.main === undefined) return; // other buttons keep their own keys
        e.preventDefault();
        if (!e.repeat) act(e.timeStamp);
    };
    // on the bed a mouse or pen press acts at once; a touch holds the plate and stamps on release (a scroll cancels it)
    const onDown = (e: PointerEvent) => {
        if (e.button || done) return;
        if (e.pointerType !== "touch") { act(e.timeStamp); return; }
        S.hold = e.pointerId;
        if (S.run && !S.busy) {
            S.frozen = true; S.input = performance.now();
            S.ph += rate(e.timeStamp) * (e.timeStamp - LAG - S.last) / 1000; [S.x, S.y] = at(S.ph, e.timeStamp - LAG); place();
        }
    };
    const onUp = (e: PointerEvent) => {
        if (e.pointerId !== S.hold) return;
        S.hold = -1;
        if (phase === "ready") start();
        else if (S.frozen) stamp(e.timeStamp, true);
    };
    const onCancel = (e: PointerEvent) => { if (e.pointerId === S.hold) { S.hold = -1; S.frozen = false; } };

    const download = () => {
        const sc = 3, cv = document.createElement("canvas"), w = SW * sc, h = SH * sc;
        const c = compose(cv, P, hits, w, h, document.createElement("canvas"));
        P.key(c, sc);
        const img = new Image();
        img.onload = () => { // the paper grain, as on the page
            c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "overlay"; c.globalAlpha = 0.55;
            const pat = c.createPattern(img, "repeat")!;
            pat.setTransform(new DOMMatrix().scaleSelf((180 * sc) / img.width));
            c.fillStyle = pat; c.fillRect(0, 0, w, h);
            const a = document.createElement("a");
            a.download = `${P.p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-print.png`;
            a.href = cv.toDataURL("image/png"); // a data: URL, since the page's CSP allows no blob: images
            a.click();
        };
        img.src = "/art/paper.webp";
    };

    const ring = "outline-none focus-visible:ring-4 focus-visible:ring-[#ff6509] focus-visible:ring-offset-2";
    return (
        <div ref={root} tabIndex={0} role="group" aria-label={`Register: ${P.p.title}`} onKeyDown={onKey}
            onKeyUp={(e) => { if (e.key === " " && (e.target as HTMLElement).dataset.main !== undefined) e.preventDefault(); }}
            className={`mx-auto max-w-[620px] rounded-2xl select-none ${ring}`}>
            <div className="mb-3 flex items-center justify-between gap-3 px-1 text-heading">
                <span className="eyebrow min-w-[5.5rem] text-paragraph tabular-nums">Poster {pad(round + 1)}</span>
                <ol className="flex items-start gap-3" aria-label="Plates">
                    {P.plates.map((pl, k) => (
                        <li key={k} className="flex flex-col items-center gap-1">
                            {/* a colour-bar patch: solid once printed, a dot of its ink while waiting, ringed while on the roller */}
                            <span className="block h-5 w-5 rounded-[3px]"
                                style={{ background: k < hits.length ? pl.col : `radial-gradient(${pl.col} 0 3px, ${CREAM} 3.5px)`, boxShadow: `inset 0 0 0 1.5px ${INK}${k === plate && !done ? ", 0 0 0 2px rgb(var(--bg)), 0 0 0 4px rgb(var(--text))" : ""}` }} />
                            <span className="eyebrow h-3 text-[10px] tabular-nums text-paragraph">{k < hits.length ? `${hits[k].d}px` : ""}</span>
                        </li>
                    ))}
                </ol>
                <span className="eyebrow min-w-[5.5rem] text-right tabular-nums">{combo > 1 ? `Combo ×${combo}` : ""}</span>
            </div>

            <div ref={bed} className="cloth relative overflow-hidden rounded-2xl px-6 pt-5 pb-7 touch-pan-y cursor-pointer will-change-transform"
                style={{ boxShadow: "inset 0 0 0 9px rgb(0 0 0 / .12), inset 0 0 0 10px rgb(243 230 196 / .25), 0 24px 50px -24px rgb(0 0 0 / .6)" }}
                onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onCancel}>
                {/* the roller with a ruler: the carriage carries the plate's colour, the notch is true register */}
                <div className="relative mx-auto mb-4 h-3 rounded-full" style={{ width: W || "100%", background: `linear-gradient(${INK}, #4a3f33 35%, ${INK})`, boxShadow: "inset 0 1px 0 rgb(243 230 196 / .25)" }}>
                    <div className="ruler absolute inset-x-3 -bottom-[3px] text-[#f3e6c4]" style={{ opacity: 0.35 }} />
                    <div className="absolute left-1/2 -top-2 h-0 w-0 -translate-x-1/2" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `7px solid ${ORANGE}` }} />
                    <div className="absolute left-1/2 top-1/2 -ml-4 -mt-[9px] h-[18px] w-8" aria-hidden>
                        <div ref={carriage} className="h-full w-full rounded-[4px] will-change-transform" style={{ background: P.plates[Math.min(plate, P.plates.length - 1)].col, boxShadow: `inset 0 0 0 1.5px ${INK}, 0 3px 6px -2px rgb(0 0 0 / .5)`, opacity: done ? 0 : 1 }} />
                    </div>
                </div>

                <div ref={sheet} className="relative mx-auto isolate" style={{ width: W, height: H || "60vh" }}>
                    <canvas ref={paper} role="img" aria-label={`${P.p.title}: ${P.p.subtitle}`} className="absolute inset-0 h-full w-full" style={{ boxShadow: "0 18px 30px -16px rgb(0 0 0 / .7), 0 0 0 1px rgb(0 0 0 / .15)" }} />
                    <canvas ref={keyCv} className="absolute inset-0 h-full w-full" aria-hidden />
                    {[0, 1].map((part) => <canvas key={part} ref={(l) => { if (l) layers.current[part] = l; }} className="absolute inset-0 h-full w-full will-change-transform" style={{ mixBlendMode: blend(P, part), opacity: 0 }} aria-hidden />)}
                    <span className="pointer-events-none absolute inset-0" style={{ background: `url(/art/paper.webp) 0 0 / ${Math.round((180 * W) / SW)}px`, mixBlendMode: "overlay", opacity: 0.55 }} />
                    <div ref={shade} className="pointer-events-none absolute -inset-6 opacity-0" style={{ background: `radial-gradient(closest-side, ${INK}, transparent)` }} />
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => <span key={j} ref={(s) => { drops.current[j] = s; }} className="pointer-events-none absolute left-0 top-0 -ml-[3px] -mt-[3px] h-[7px] w-[7px] rounded-full opacity-0" />)}
                    <div aria-live="polite" className="pointer-events-none absolute -right-3 -top-3">
                        {fb && (
                            <div ref={badge} className="eyebrow flex items-center gap-1.5 rounded-full px-3 py-1.5 tabular-nums"
                                style={{ transform: "rotate(-8deg)", color: INK, background: [CREAM, MUSTARD, ORANGE][fb.g], boxShadow: `inset 0 0 0 1.5px ${INK}, 0 6px 14px -6px rgb(0 0 0 / .6)` }}>
                                {GRADE[fb.g] && <b>{GRADE[fb.g]}</b>}<span>{fb.d}px</span>{fb.g === 2 && fb.c > 1 && <b>×{fb.c}</b>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-4 text-center text-sm text-paragraph">Stamp each colour in register</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                {done && <button type="button" className={`pill-light ${ring}`} onClick={download}>Download print</button>}
                <button type="button" data-main className={`pill-dark min-w-[9rem] !py-3 touch-manipulation ${ring}`}
                    onPointerDown={(e) => { if (!e.button && !done) act(e.timeStamp); }}
                    onClick={(e) => { if (done || e.detail === 0) act(performance.now()); }}>
                    {phase === "ready" ? "Start" : done ? "Next poster" : "Stamp"}
                </button>
                {(round > 0 || hits.length > 0) && <button type="button" className={`pill-light ${ring}`} onClick={() => next(0)}>Restart</button>}
            </div>
        </div>
    );
}
