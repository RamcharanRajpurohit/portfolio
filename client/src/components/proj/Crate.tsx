import projects from "../../data/project_data";
import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Github } from "lucide-react";

// "Record crate": every project is a printed sleeve standing in a bin. Scroll, drag, swipe or use the arrow keys to
// flip the front sleeve forward; pull one out and it rises, comes forward, and its record slides out and spins.
// One rAF loop drives every transform from a few springs (p = position in the crate, pull = 0..1 out of it) and
// sleeps when they settle. The scene has perspective but no preserve-3d, so sleeves paint in DOM order (back first).

type Project = (typeof projects)[number];
const INK = "#26201a", FOREST = "#24493a", MUSTARD = "#ecba2a", CREAM = "#f3e6c4", ORANGE = "#ff6509";
const N = projects.length;

// seeded from the title, so each sleeve's art is its own and stays the same between visits
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
// greedy word wrap; max(row) gives the characters that fit on each row
function wrap(text: string, max: (row: number) => number, sep = " ") {
    const lines: string[] = [];
    for (const w of text.split(sep)) {
        const l = lines.length - 1;
        if (l >= 0 && (lines[l] + sep + w).length <= max(l)) lines[l] += sep + w;
        else lines.push(w);
    }
    return lines;
}

// stock, plate A, plate B, type colour
const PALETTES = [
    [CREAM, ORANGE, FOREST, INK], [MUSTARD, FOREST, ORANGE, INK], [FOREST, MUSTARD, ORANGE, CREAM],
    [ORANGE, FOREST, MUSTARD, INK], [CREAM, FOREST, MUSTARD, INK], [INK, ORANGE, MUSTARD, CREAM],
];
const art = (i: number) => PALETTES[(i * 5 + 2 + (i >= 6 ? 3 : 0)) % PALETTES.length]; // the second six swap palettes

/** The front of a sleeve: offset colour plates over the stock, halftone screens, then the ink key plate with the type. */
const Cover = memo(function Cover({ p, i }: { p: Project; i: number }) {
    const r = rng(p.title), [stock, A, B, ink] = art(i), dark = stock === FOREST || stock === INK;
    const blend: CSSProperties = { mixBlendMode: dark ? "screen" : "multiply" };
    const ang = Math.round(r() * 40 - 20), off = 4 + r() * 5, id = `cr${i}`;
    const motif = i % 6;
    const cx = 150 + (r() - 0.5) * 80, cy = 190 + (r() - 0.5) * 40;
    let a, b, key;
    if (motif === 0) { // sun over a ruled horizon
        a = <circle cx={cx} cy={cy - 20} r={92} fill={A} />;
        b = <circle cx={cx + off} cy={cy - 20 + off} r={92} fill={`url(#${id}d)`} />;
        key = <g stroke={ink} strokeWidth="2.4">{[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M0 ${236 + k * k * 2.2}H300`} />)}</g>;
    } else if (motif === 1) { // diagonal bands
        a = <g transform={`rotate(${ang} 150 150)`} fill={A}>{[-2, 0, 2].map((k) => <rect key={k} x="-100" y={180 + k * 46} width="500" height="30" />)}</g>;
        b = <rect x={30 + off} y={110 + off} width="240" height="170" fill={`url(#${id}d)`} />;
        key = <rect x="30" y="110" width="240" height="170" fill="none" stroke={ink} strokeWidth="2" />;
    } else if (motif === 2) { // giant initial, misregistered
        const L = p.title[0];
        const t = { fontSize: 300, fontWeight: 800, textAnchor: "end" } as const;
        a = <text x="296" y="318" {...t} fill={A}>{L}</text>;
        b = <text x={296 + off * 1.6} y={318 - off} {...t} fill={`url(#${id}d)`}>{L}</text>;
        key = <text x="296" y="318" {...t} fill="none" stroke={ink} strokeWidth="1.6">{L}</text>;
    } else if (motif === 3) { // halftone dot field, big near a seeded point
        const dots = [];
        for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) {
            const px = x * 24 + (y % 2) * 12, py = 120 + y * 15, d = Math.hypot(px - cx, py - cy - 40);
            const rr = Math.max(0, 9.5 - d / 22);
            if (rr > 0.6) dots.push(<circle key={`${x}-${y}`} cx={px} cy={py} r={rr} />);
        }
        a = <g fill={A}>{dots}</g>;
        b = <rect x="0" y={150 + off * 3} width="300" height="150" fill={`url(#${id}d)`} />;
        key = <path d="M0 296H300" stroke={ink} strokeWidth="6" />;
    } else if (motif === 4) { // engraved waves
        const waves = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
            let d = "";
            for (let x = 0; x <= 300; x += 10) d += `${x ? "L" : "M"}${x} ${(150 + k * 17 + Math.sin(x / 34 + k * 0.6 + ang) * 10).toFixed(1)}`;
            return <path key={k} d={d} />;
        });
        a = <rect x="0" y={cy - 30} width="300" height="160" fill={A} />;
        b = <circle cx={cx} cy={cy - 50} r={70} fill={`url(#${id}d)`} />;
        key = <g fill="none" stroke={ink} strokeWidth="2.2">{waves}</g>;
    } else { // concentric rings
        a = <g fill="none" stroke={A} strokeWidth="13">{[34, 64, 94, 124].map((rr) => <circle key={rr} cx={cx} cy={cy} r={rr} />)}</g>;
        b = <circle cx={cx + off} cy={cy - off} r={70} fill={`url(#${id}d)`} />;
        key = <circle cx={cx} cy={cy} r={8} fill={ink} />;
    }
    const sub = wrap(p.subtitle.toUpperCase(), () => 32);
    const words = wrap(p.title, () => 11), fs = Math.min(72, 252 / (Math.max(...words.map((w) => w.length)) * 0.6));
    return (
        <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full" aria-hidden>
            <defs>
                <pattern id={`${id}d`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={`rotate(${ang + 45})`}><circle cx="3" cy="3" r="1.7" fill={B} /></pattern>
            </defs>
            <rect width="300" height="300" fill={stock} />
            <g style={blend}>{a}</g>
            <g style={blend}>{b}</g>
            {key}
            {/* ring wear: the record inside has pressed its outline into the card */}
            <circle cx="150" cy="150" r="136" fill="none" stroke={dark ? CREAM : INK} strokeOpacity=".09" strokeWidth="7" />
            {/* the type is trapped: a halo of stock knocks the art out behind it */}
            <g fill={ink} fontFamily="Manrope, sans-serif" stroke={stock} strokeLinejoin="round" paintOrder="stroke">
                {sub.map((l, k) => <text key={k} x="24" y={30 + k * 13} fontSize="9.5" fontWeight="700" letterSpacing="1.4" strokeWidth="3">{l}</text>)}
                {words.map((w, k) => <text key={k} x="22" y={44 + sub.length * 13 + fs * 0.82 + k * fs * 0.9} fontSize={fs} fontWeight="800" letterSpacing={-fs * 0.045} strokeWidth={fs * 0.16}>{w}</text>)}
            </g>
        </svg>
    );
});

/** The record label: title above the spindle, the stack set in lines below it. */
const Label = memo(function Label({ p, i }: { p: Project; i: number }) {
    const [, A, B] = art(i), fill = A === FOREST ? FOREST : A, ink = A === FOREST ? CREAM : INK;
    const chord = (y: number) => 2 * Math.sqrt(Math.max(0, 92 * 92 - y * y)) - 18;
    let fs = 12, lines: string[] = [];
    for (; fs > 6; fs -= 0.5) {
        const lh = fs * 1.25;
        lines = wrap(p.tech_stack.join(" · "), (row) => Math.floor(chord(22 + (row + 1) * lh) / (fs * 0.6)), " · ");
        if (22 + lines.length * lh < 84) break;
    }
    const title = wrap(p.title, () => 14), tf = title.length > 1 ? 15 : 18;
    return (
        <svg viewBox="-100 -100 200 200" className="absolute inset-[26%] w-[48%] h-[48%]" aria-hidden>
            <defs><pattern id={`lb${i}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.2" fill={B} /></pattern></defs>
            <circle r="100" fill={fill} />
            <path d="M-100 0A100 100 0 0 1 100 0Z" fill={`url(#lb${i})`} opacity=".45" />
            <circle r="94" fill="none" stroke={ink} strokeWidth="1" opacity=".6" />
            <g fill={ink} fontFamily="Manrope, sans-serif" textAnchor="middle">
                {title.map((t, k) => <text key={k} y={-58 + k * tf + (title.length > 1 ? 0 : 8)} fontSize={tf} fontWeight="800" letterSpacing="-.5">{t}</text>)}
                {lines.map((l, k) => <text key={k} y={22 + (k + 1) * fs * 1.25} fontSize={fs} fontWeight="600">{l}</text>)}
            </g>
            <path d="M-92 4H-14M14 4H92" stroke={ink} strokeWidth=".8" opacity=".5" />
            <circle r="5.5" fill={INK} />
        </svg>
    );
});

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const SPIN = 200; // 33⅓ rpm in degrees per second

export default function Crate() {
    const box = useRef<HTMLDivElement>(null), wall = useRef<HTMLDivElement>(null), walls = useRef<(HTMLDivElement | null)[]>([]);
    const sl = useRef<(HTMLDivElement | null)[]>([]), btn = useRef<(HTMLButtonElement | null)[]>([]);
    const rec = useRef<HTMLDivElement>(null), spin = useRef<HTMLDivElement>(null), back = useRef<HTMLButtonElement>(null);
    const [cur, setCur] = useState(0);
    const [open, setOpen] = useState(false);
    const [shown, setShown] = useState(0); // the sleeve that is (or was last) out of the crate
    const [size, setSize] = useState({ w: 0, W: 0, H: 0, wide: false });
    const S = useRef({
        p: 0, v: 0, t: 0, pull: 0, pv: 0, pt: 0, hov: 0, ht: 0, rv: 0, brake: false, drag: false, anim: null as Animation | null,
        raf: 0, last: 0, reduce: false, out: 0, kick: () => {},
    }).current;

    // sizes come from the column width; sleeves are square, W px
    useEffect(() => {
        const el = box.current!;
        const ro = new ResizeObserver(() => {
            const w = el.clientWidth, wide = w >= 900, W = Math.round(wide ? Math.min(350, w * 0.31) : Math.min(260, w * 0.64));
            setSize({ w, W, H: Math.round(W * (wide ? 1.78 : 1.86)), wide });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // the loop: springs in, transforms out
    useEffect(() => {
        const { W, H, w, wide } = size;
        if (!W) return;
        const mq = matchMedia("(prefers-reduced-motion: reduce)");
        const floor = H - W * 0.3, gap = W * 0.062, rise = W * 0.028, D = W * 0.78, cw = W * 0.61;
        // where the pulled sleeve ends up, relative to its spot in the crate (centre-bottom on the floor)
        const out = wide ? { x: -w * 0.27, y: H / 2 + W * 0.5 - floor, z: W * 0.12, ry: 3, rz: -2.5 } : { x: -W * 0.24, y: H * 0.4 + W * 0.42 - floor, z: 0, ry: 3, rz: -2.5 };
        const slide = wide ? W * 0.56 : W * 0.44;
        // the bin: back wall, two side walls (seen from inside), and the front planks drawn flat over everything
        const box3d = [`translate3d(0,0,${-D}px)`, `translate3d(${-cw}px,0,${-D / 2}px) rotateY(90deg)`, `translate3d(${cw}px,0,${-D / 2}px) rotateY(-90deg)`];
        // write only the properties that changed, so a moving sleeve is a transform/opacity update and nothing else
        const cache = new WeakMap<HTMLElement, Record<string, string>>();
        const put = (el: HTMLElement | null, props: Record<string, string | number>) => {
            if (!el) return;
            let c = cache.get(el);
            if (!c) cache.set(el, (c = {}));
            for (const k in props) { const v = String(props[k]); if (c[k] !== v) { c[k] = v; el.style.setProperty(k, v); } }
        };
        const apply = () => {
            const { p, pull, hov } = S, sway = clamp(S.v * 1.6, -7, 7), front = Math.round(S.t);
            const drop = W * 0.5 * smooth(0.2, 1, pull), fade = 1 - smooth(0.15, 0.7, pull);
            for (let i = 0; i < N; i++) {
                const d = i - p;
                let x = 0, y: number, z: number, rx: number, ry = 0, rz = 0, o = 1;
                if (d >= 0) { // standing: the front one is lifted a little, the rest lean back against each other
                    const f = Math.min(d, 1);
                    y = -mix(W * 0.08 + (i === front ? hov * W * 0.05 : 0), 0, f) - d * rise;
                    z = -d * gap; rx = mix(2, 8, f) + d * 0.7 + sway * Math.min(d, 2) / 2;
                    o = 1 - smooth(6.2, 7.2, d);
                } else { // flipped: tips forward toward you until it is edge on to the eye (about 45deg), then it is gone
                    const u = -d;
                    y = -W * 0.08 + W * 0.22 * smooth(0, 1, u); z = W * 0.12 * smooth(0, 1, u);
                    rx = 2 - 80 * smooth(0, 1, u); o = 1 - smooth(0.42, 0.58, u);
                }
                if (i === S.out && pull > 0.001) { // up out of the crate, then forward to the front of the stage
                    const up = smooth(0, 0.5, pull), fw = smooth(0.32, 1, pull);
                    y = mix(mix(y, -W * 0.9, up), out.y, fw); z = mix(z, out.z, fw); x = out.x * fw;
                    rx = mix(mix(rx, 0, up), 0, fw); ry = out.ry * fw; rz = out.rz * fw; o = 1;
                } else { y += drop; o *= fade; } // the rest of the crate sinks away
                if (o < 0.005) y += W * 20; // parked out of sight (and out of reach of clicks) without a repaint
                put(sl.current[i], { width: `${W}px`, height: `${W}px`, left: `${-W / 2}px`, top: `${-W}px`, opacity: o.toFixed(3), "z-index": i === S.out && pull > 0.45 ? 30 : 0,
                    transform: `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)` });
            }
            const vis = { opacity: fade.toFixed(3), visibility: fade > 0.004 ? "visible" : "hidden" };
            put(wall.current, { width: `${W * 1.26}px`, height: `${W * 0.42}px`, left: `${-W * 0.63}px`, top: `${-W * 0.3}px`, ...vis, transform: `translateY(${drop.toFixed(1)}px)` });
            box3d.forEach((t, k) => put(walls.current[k], { width: `${k ? D : cw * 2}px`, height: `${W * 0.4}px`, left: `${k ? -D / 2 : -cw}px`, top: `${-W * 0.4}px`, ...vis, transform: `translateY(${drop.toFixed(1)}px) ${t}` }));
            const s = S.reduce ? (pull > 0.5 ? 1 : 0) : smooth(0.55, 1, pull);
            put(rec.current, { transform: `translateX(${(slide * s).toFixed(1)}px)` });
        };
        const tick = (now: number) => {
            // fixed small steps, so a slow frame doesn't slow the motion down (or blow the springs up)
            let left = Math.min(0.1, (now - S.last) / 1000);
            S.last = now;
            if (S.reduce) { S.p = S.t; S.v = 0; S.pull = S.pt; S.pv = 0; S.hov = S.ht; S.rv = 0; }
            else for (; left > 1e-6; left -= 1 / 120) {
                const dt = Math.min(left, 1 / 120);
                if (!S.drag) { S.v += (220 * (S.t - S.p) - 21 * S.v) * dt; S.p += S.v * dt; } // a little overshoot: weight
                S.pv += (60 * (S.pt - S.pull) - 14 * S.pv) * dt; S.pull += S.pv * dt;
                S.hov += (S.ht - S.hov) * Math.min(1, dt * 14);
                // the record runs up to 33⅓ once it is out, coasts down when it goes back; a finger on it brakes.
                // The turning itself is a compositor animation; the loop only eases its rate and then sleeps.
                if (!S.brake) {
                    const goal = S.pt && S.pull > 0.7 ? SPIN : 0;
                    S.rv = goal > S.rv ? Math.min(goal, S.rv + 240 * dt) : Math.max(goal, S.rv - 420 * dt); // motor torque
                    if (S.anim && S.anim.playbackRate !== S.rv / SPIN) S.anim.playbackRate = S.rv / SPIN;
                }
            }
            apply();
            const still = !S.drag && !S.brake && Math.abs(S.t - S.p) < 5e-4 && Math.abs(S.v) < 5e-3 && Math.abs(S.pt - S.pull) < 5e-4
                && Math.abs(S.pv) < 5e-3 && Math.abs(S.ht - S.hov) < 1e-3 && S.rv === (S.pt && !S.reduce ? SPIN : 0);
            if (still) { S.p = S.t; S.pull = S.pt; S.v = S.pv = 0; apply(); S.raf = 0; }
            else S.raf = requestAnimationFrame(tick);
        };
        S.kick = () => { S.reduce = mq.matches; if (!S.raf) { S.last = performance.now(); S.raf = requestAnimationFrame(tick); } };
        S.kick();
        return () => { cancelAnimationFrame(S.raf); S.raf = 0; };
    }, [size, S]);

    // one rotation, looping forever on the compositor; its playbackRate is the record's speed
    useEffect(() => {
        const a = spin.current?.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 360000 / SPIN, iterations: Infinity });
        if (!a) return;
        a.playbackRate = S.rv / SPIN; S.anim = a;
        return () => { a.cancel(); S.anim = null; };
    }, [shown, size.W, S]);

    const go = (i: number) => {
        const t = clamp(i, 0, N - 1);
        S.t = t; setCur(t); S.kick();
        if (btn.current.some((b) => b === document.activeElement)) btn.current[t]?.focus({ preventScroll: true });
    };
    const pullOut = (i: number) => {
        S.t = i; S.out = i; S.pt = 1; S.ht = 0;
        setCur(i); setShown(i); setOpen(true); S.kick();
    };
    const putBack = () => {
        S.pt = 0; setOpen(false); S.kick();
        btn.current[S.out]?.focus({ preventScroll: true });
    };
    useEffect(() => { if (open) back.current?.focus({ preventScroll: true }); }, [open]);

    // scroll flips through the crate; at either end the page scrolls on as usual
    const stage = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = stage.current!;
        let idle = 0;
        const onWheel = (e: WheelEvent) => {
            if (S.pt) return;
            const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if ((S.t <= 0 && d < 0) || (S.t >= N - 1 && d > 0)) return;
            e.preventDefault();
            S.t = clamp(S.t + d / (e.deltaMode ? 3 : 100), 0, N - 1); S.kick();
            clearTimeout(idle);
            idle = window.setTimeout(() => { S.t = Math.round(S.t); setCur(S.t); S.kick(); }, 110);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [S]);

    // drag (mouse: either axis; touch: sideways, the page keeps vertical panning). Down or left flips forward.
    const drag = useRef({ id: -1, x: 0, y: 0, p0: 0, axis: "", moved: false, hist: [] as [number, number][] }).current;
    const onDown = (e: React.PointerEvent) => {
        if (S.pt || e.button) return;
        Object.assign(drag, { id: e.pointerId, x: e.clientX, y: e.clientY, p0: S.p, axis: "", moved: false, hist: [] });
    };
    const onMove = (e: React.PointerEvent) => {
        if (e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.axis) {
            if (Math.hypot(dx, dy) < 7) return;
            drag.axis = e.pointerType === "mouse" && Math.abs(dy) > Math.abs(dx) ? "y" : "x";
            drag.moved = true; S.drag = true; S.ht = 0;
            stage.current!.setPointerCapture(e.pointerId);
        }
        const step = size.W * 0.34, raw = drag.p0 + (drag.axis === "y" ? dy : -dx) / step;
        S.p = raw < 0 ? raw / 3 : raw > N - 1 ? N - 1 + (raw - N + 1) / 3 : raw; // rubber band past the ends
        drag.hist.push([performance.now(), S.p]);
        if (drag.hist.length > 6) drag.hist.shift();
        S.kick();
    };
    const onUp = (e: React.PointerEvent) => {
        if (e.pointerId !== drag.id) return;
        drag.id = -1;
        if (!S.drag) return;
        S.drag = false;
        const h = drag.hist, [t0, p0] = h[0] ?? [0, S.p], [t1, p1] = h[h.length - 1] ?? [1, S.p];
        S.v = t1 > t0 ? clamp(((p1 - p0) / (t1 - t0)) * 1000, -30, 30) : 0;
        go(Math.round(S.p + S.v * 0.12));
    };

    // the record turns under a finger: drag it round, let go and it spins back up
    const turn = useRef({ id: -1, a: 0, t: 0 }).current;
    const angle = (e: React.PointerEvent) => { const r = spin.current!.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; };
    const recDown = (e: React.PointerEvent) => { e.stopPropagation(); turn.id = e.pointerId; turn.a = angle(e); turn.t = performance.now(); S.brake = true; S.rv = 0; S.anim?.pause(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); S.kick(); };
    const recMove = (e: React.PointerEvent) => {
        if (e.pointerId !== turn.id) return;
        const a = angle(e), now = performance.now(), da = ((a - turn.a + 540) % 360) - 180;
        if (S.anim) S.anim.currentTime = ((Number(S.anim.currentTime) || 0) + da * (360000 / SPIN) / 360 + 3.6e6) % 3.6e6;
        S.rv = clamp(da / Math.max(1, now - turn.t) * 1000, -1500, 1500) * 0.6 + S.rv * 0.4;
        turn.a = a; turn.t = now;
    };
    const recUp = (e: React.PointerEvent) => { if (e.pointerId === turn.id) { turn.id = -1; S.brake = false; if (S.anim) { S.anim.playbackRate = S.rv / SPIN; S.anim.play(); } S.kick(); } };

    const onKey = (e: React.KeyboardEvent) => {
        const k = e.key;
        if (k === "Escape" && S.pt) { e.preventDefault(); putBack(); return; }
        if (S.pt) return;
        const to = k === "ArrowRight" || k === "ArrowDown" ? cur + 1 : k === "ArrowLeft" || k === "ArrowUp" ? cur - 1 : k === "Home" ? 0 : k === "End" ? N - 1 : null;
        if (to !== null) { e.preventDefault(); go(to); }
    };

    const p = projects[shown], { W, H, wide } = size;
    return (
        <div ref={box} className="relative select-none" onKeyDown={onKey}>
            <div ref={stage} className="relative overflow-hidden touch-pan-y" style={{ height: H || "70vh", cursor: open ? "default" : "grab" }}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                onClickCapture={(e) => { if (drag.moved) { e.stopPropagation(); drag.moved = false; } }}>
                {W > 0 && (
                    <div className="absolute inset-0">
                        {/* perspective sits on the floor point itself, so its children paint in DOM order (no preserve-3d) */}
                        <div className="absolute left-1/2" style={{ top: H - W * 0.3, perspective: W * 2.3, perspectiveOrigin: `0 ${-W * 2.3}px` }}>
                            {[0, 1, 2].map((k) => <div key={k} ref={(el) => { walls.current[k] = el; }} className="cloth absolute will-change-[transform,opacity] [transform-origin:50%_100%]" style={{ visibility: "hidden", boxShadow: "inset 0 0 0 999px rgb(20 14 8 / .42), inset 0 3px 0 rgb(243 230 196 / .25)" }} aria-hidden />)}
                            {projects.map((_, k) => {
                                const i = N - 1 - k; // back of the crate first: painted in DOM order
                                const pr = projects[i];
                                return (
                                    <div key={pr.title} ref={(el) => { sl.current[i] = el; }} style={{ opacity: 0 }} className="absolute will-change-[transform,opacity] [transform-origin:50%_100%]">
                                        {i === shown && (
                                            <div ref={rec} className="absolute inset-[3%] will-change-transform" aria-hidden={!open}>
                                                <div ref={spin} className="absolute inset-0 rounded-full will-change-transform touch-none cursor-grab"
                                                    onPointerDown={recDown} onPointerMove={recMove} onPointerUp={recUp} onPointerCancel={recUp}
                                                    style={{ background: `radial-gradient(circle, transparent 23%, ${INK} 23.5%, ${INK} 25%, transparent 25.5% 31%, rgb(0 0 0 / .5) 31.5%, transparent 32% 67%, rgb(0 0 0 / .5) 67.5%, transparent 68%), repeating-radial-gradient(circle, #2c251e 0 1px, #1b1612 1px 3px)`, boxShadow: "0 14px 30px -12px rgb(0 0 0 / .6), inset 0 0 0 1.5px rgb(243 230 196 / .14)" }}>
                                                    <Label p={projects[shown]} i={shown} />
                                                </div>
                                                {/* the light stays where it is while the record turns under it */}
                                                <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "conic-gradient(from 20deg, transparent 0 8%, rgb(243 230 196 / .16) 12%, transparent 17% 50%, rgb(243 230 196 / .12) 60%, transparent 66%)", WebkitMask: "radial-gradient(circle, transparent 25%, #000 26%)", mask: "radial-gradient(circle, transparent 25%, #000 26%)" }} />
                                            </div>
                                        )}
                                        <button ref={(el) => { btn.current[i] = el; }} type="button" tabIndex={i === cur && !open ? 0 : -1}
                                            aria-label={i === cur ? `${pr.title}: pull out` : pr.title} aria-hidden={open}
                                            onClick={() => (open ? undefined : i === cur ? pullOut(i) : go(i))}
                                            onPointerEnter={() => { if (i === cur && !open) { S.ht = 1; S.kick(); } }}
                                            onPointerLeave={() => { S.ht = 0; S.kick(); }}
                                            className="absolute inset-0 overflow-hidden rounded-[3px] outline-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#ff6509]"
                                            style={{ boxShadow: "0 -8px 22px -6px rgb(20 14 8 / .45), inset 0 0 0 1px rgb(38 32 26 / .35)", cursor: open ? "default" : "pointer" }}>
                                            <Cover p={pr} i={i} />
                                            <span className="absolute inset-0 pointer-events-none opacity-60" style={{ background: "url(/art/paper.webp) 0 0 / 256px", mixBlendMode: "overlay" }} />
                                            {/* the open edge of the sleeve, where the record comes out */}
                                            <span className="absolute inset-y-0 right-0 w-[3px] pointer-events-none" style={{ background: "linear-gradient(90deg, rgb(0 0 0 / .25), rgb(255 255 255 / .2))" }} />
                                        </button>
                                    </div>
                                );
                            })}
                            <div ref={wall} className="absolute pointer-events-none will-change-[transform,opacity]" style={{ zIndex: 10 }} aria-hidden><CrateFront /></div>
                        </div>
                    </div>
                )}
            </div>

            {/* browsing controls */}
            <div className={`mt-4 flex items-center justify-center gap-3 transition-opacity duration-300 ${open ? (wide ? "opacity-0 pointer-events-none" : "hidden") : ""}`} aria-hidden={open}>
                <button type="button" className="pill-light !px-3" onClick={() => go(cur - 1)} disabled={cur === 0} tabIndex={open ? -1 : 0} aria-label="Previous"><ChevronLeft size={18} /></button>
                <span className="eyebrow tabular-nums text-paragraph w-16 text-center" aria-live="polite">{String(cur + 1).padStart(2, "0")} / {N}</span>
                <button type="button" className="pill-light !px-3" onClick={() => go(cur + 1)} disabled={cur === N - 1} tabIndex={open ? -1 : 0} aria-label="Next"><ChevronRight size={18} /></button>
                <button type="button" className="pill-dark" onClick={() => pullOut(cur)} tabIndex={open ? -1 : 0}>Pull out</button>
            </div>

            {/* liner notes, beside the record on wide screens and under it on phones */}
            {open && (
                <div className={wide ? "absolute right-0 top-0 w-[42%] flex items-center" : "relative -mt-20 mb-2"} style={wide ? { height: H } : undefined}>
                    <section key={shown} aria-label={p.title} className="card p-6 sm:p-7 text-heading motion-safe:animate-[rise_.55s_.3s_cubic-bezier(.2,.7,.2,1)_both]">
                        <p className="eyebrow leading-snug text-paragraph">{p.subtitle}</p>
                        <h4 className="mt-2 text-3xl sm:text-4xl font-bold tracking-[-0.04em]">{p.title}</h4>
                        <p className="mt-3 text-sm leading-relaxed text-paragraph">{p.description}</p>
                        <ul className="mt-4 border-t border-stroke/15">
                            {p.highlights.map((h) => <li key={h} className="py-1.5 border-b border-stroke/15 text-sm">{h}</li>)}
                        </ul>
                        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Stack">
                            {p.tech_stack.map((t) => <li key={t} className="px-2.5 py-0.5 text-xs font-medium rounded-full border border-stroke/20">{t}</li>)}
                        </ul>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                            <a className="pill-light" href={p.github_repo} target="_blank" rel="noopener noreferrer"><Github size={16} /> GitHub</a>
                            {p.web_url && <a className="pill-dark" href={p.web_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Live demo</a>}
                            <button ref={back} type="button" className="pill-light ml-auto" onClick={putBack}>Back to crate</button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

/** The front of the bin: two printed planks with a gap between them (the sleeves show through it) and a hand hole,
 *  in the binding colour (forest by day, leather at night). */
const plank = "cloth absolute inset-x-0 overflow-hidden rounded-[3px]";
const edge = { boxShadow: "inset 0 0 0 1.5px rgb(38 32 26 / .6), inset 0 3px 0 rgb(243 230 196 / .22), 0 10px 18px -12px rgb(0 0 0 / .7)" };
function Grain({ seed }: { seed: number }) {
    return (
        <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" aria-hidden>
            <g stroke={CREAM} strokeWidth=".9" fill="none" opacity=".2">
                {[0, 1, 2].map((k) => <path key={k} d={`M0 ${14 + k * 15 + seed}q70 ${-4 + k * 3} 140 0t130 ${2 - k} 130 1`} />)}
            </g>
            <rect y="34" width="400" height="26" fill="url(#crdots)" opacity=".3" />
            <g fill={INK} opacity=".75"><circle cx="16" cy="30" r="2.6" /><circle cx="384" cy="30" r="2.6" /></g>
        </svg>
    );
}
function CrateFront() {
    return (
        <>
            <svg width="0" height="0" className="absolute"><defs><pattern id="crdots" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.3" fill={INK} /></pattern></defs></svg>
            <div className={`${plank} top-0 h-[47%]`} style={edge}>
                <Grain seed={0} />
                <span className="absolute left-1/2 top-[30%] h-[34%] w-[18%] -translate-x-1/2 rounded-full" style={{ background: INK, boxShadow: "inset 0 3px 4px rgb(0 0 0 / .6), 0 1px 0 rgb(243 230 196 / .25)" }} />
            </div>
            <div className={`${plank} bottom-0 h-[44%]`} style={edge}><Grain seed={4} /></div>
        </>
    );
}
