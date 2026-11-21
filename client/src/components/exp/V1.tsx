import { useEffect, useRef, useState } from "react";
import { company, chapters, pipelines } from "../../data/experience_data";
import { Computer, HOLE } from "./v1/Computer";
import { glyphFor } from "./v1/Glyphs";
import { vizFor } from "./v1/Viz";
import { Interior } from "./v1/Interior";
import { hex, lookAt, perspective, Renderer, type V3 } from "./v1/gl";
import { BLOT, buildScene, STATIONS, type State } from "./v1/Scene";
import { REST_ANG } from "./v1/kit";
import { css } from "./v1/css";

// Experience v1: "Inside the machine". v4's printed computer (2D, one-colour proof) is the hero; scroll
// drifts it, then the camera pushes into its screen. Inside, the work is built in real 3D (WebGL2, a print
// shader: toon bands, halftone, paper grain, ink outlines): one station per system along the ink wire,
// each a small scene of what that system does. Each system's text is one calm HTML plate. At the level-up a
// press roller runs down the view and prints everything behind it in colour, the colour halftone landing
// off-register and snapping in (v4's proof -> print), and the pencil wire becomes ink at a blot. Then the
// camera rewinds and pulls out of the screen; the computer is now the full-colour print.
// One rAF-batched scroll listener drives everything; React renders on resize only.

const [intern, lead] = chapters;
const sys01 = pipelines.filter((p) => p.chapter === "01");
const sys02 = pipelines.filter((p) => p.chapter === "02");
const pad = (n: number) => String(n).padStart(2, "0");

// timeline in "vh units" of pinned scroll (phones run it at 0.9)
const DIVE: [number, number] = [40, 100];
const SLOT = 45;
const P01 = sys01.map((_, k) => 100 + SLOT * k);
const LV = P01[P01.length - 1] + SLOT;                 // level-up slot
const P02 = sys02.map((_, k) => LV + 50 + SLOT * k);
const EXIT: [number, number] = [P02[P02.length - 1] + SLOT, P02[P02.length - 1] + SLOT + 75];
const REWIND = EXIT[0] + 30; // fly back along the wire, then pull out of the screen
const END = EXIT[1] + 55;

const RES = 3; // the 2D computer's raster resolution factor (see the comp layer)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const out3 = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// camera inside: a spline through two kinds of keys. Rest keys hold still while a plate is read, each from its own
// angle around the station; excursion keys between them roam the machine: a low swing out to the pillars, a rise
// over a table looking down, a sweep past the big chips, a run along the ink line after the blot.
type Key = { t: number; eye: V3; at: V3; hold?: number; pace?: number };
// rest view of station k (or the blot): framed on the station AND its printed floor sign (labels.ts), seen from REST_ANG
function view(base: V3, ang: number, wide: boolean): [V3, V3] {
    const c = Math.cos(ang), s = Math.sin(ang), rot = (p: V3): V3 => [base[0] + c * p[0] + s * p[2], base[1] + p[1], base[2] - s * p[0] + c * p[2]];
    const t: V3 = wide ? [-0.55, 0.17, 0.5] : [0, 0.17, 0.55];
    return [rot([t[0] - 0.1, t[1] + (wide ? 2.15 : 2.6), t[2] + (wide ? 1.75 : 1.7)]), rot(t)];
}
function makeKeys(wide: boolean): Key[] {
    const rest = (t: number, k: number): Key => { const [eye, at] = view(STATIONS[k], REST_ANG[k], wide); return { t, eye, at, pace: 0.75 }; };
    const z = (k: number) => STATIONS[k][2];
    const [le, la] = view(BLOT, -0.55, wide);
    // an excursion: an offset from the midpoint of the two rest views around it (so the path never doubles back),
    // looking ahead at the next station; its time is set from path length in timing()
    const exc = (off: V3, at: V3): Key => ({ t: 0, eye: off, at, pace: 1 });
    const keys: Key[] = [
        { t: DIVE[0], eye: [-0.2, 1.5, 3.4], at: [0.3, 0.25, -0.4] },
        { t: DIVE[1], eye: [-0.85, 1.85, 2.75], at: [0.0, 0.22, 0.25] },
        rest(P01[0] + 22, 0),
        exc([0.75, -0.75, 0], [0.3, 0.25, z(1) - 0.2]),    // out to the pillars
        rest(P01[1] + 22, 1),
        exc([0.7, 0.15, 0], [0.3, 0, z(2) + 0.1]),         // up over the table
        rest(P01[2] + 22, 2),
        exc([-0.7, -0.95, 0], [0.3, 0.25, z(3) - 0.2]),     // past the big chips
        rest(P01[3] + 22, 3),
        { t: LV + 25, eye: le, at: la, pace: 0.75 },
        exc([0.3, -0.6, 0], [0.3, 0.25, z(4) - 0.1]),      // down along the ink line
        rest(P02[0] + 22, 4),
        exc([1.0, -0.95, 0], [0.3, 0.25, z(5) - 0.2]),     // out to the pillars
        rest(P02[1] + 22, 5),
        exc([0.7, 0.15, 0], [0.3, 0, z(6)]),               // over the table
        rest(P02[2] + 22, 6),
        exc([-0.7, -0.95, 0], [0.3, 0.25, z(7) - 0.2]),     // past the chips
        rest(P02[3] + 22, 7),
        exc([1.0, -0.95, 0], [0.3, 0.25, z(8) - 0.2]),     // pillars again
        rest(P02[4] + 22, 8),
        (() => { const [e2, a2] = view(STATIONS[8], REST_ANG[8] - 0.12, wide); return { t: EXIT[0], eye: [e2[0], e2[1] + 0.12, e2[2] - 0.25] as V3, at: a2, pace: 0.6 }; })(), // a last slow drift until the rewind
    ];
    keys.forEach((k, i) => {
        if (k.pace !== 1) return;
        const a = keys[i - 1].eye, b = keys[i + 1].eye, o = k.eye;
        k.eye = [(a[0] + b[0]) / 2 + o[0], (a[1] + b[1]) / 2 + o[1], (a[2] + b[2]) / 2 + o[2]];
        const pa = keys[i - 1].at, pb = keys[i + 1].at; // look between the two stations, leaning a little to its side
        k.at = [(pa[0] + pb[0]) / 2 + o[0] * 0.2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
        k.t = (keys[i - 1].t + keys[i + 1].t) / 2;
    });
    return keys;
}
// centripetal Catmull-Rom (Barry-Goldman): no cusps or overshoot where the path turns back on itself
function cr(p0: V3, p1: V3, p2: V3, p3: V3, u: number): V3 {
    const d = (a: V3, b: V3) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), t = t1 + (t2 - t1) * u;
    const L = (a: V3, b: V3, ta: number, tb: number): V3 => { const w = (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w]; };
    const a1 = L(p0, p1, 0, t1), a2 = L(p1, p2, t1, t2), a3 = L(p2, p3, t2, t3);
    return L(L(a1, a2, 0, t2), L(a2, a3, t1, t3), t1, t2);
}
function cam(KEYS: Key[], s: number): [V3, V3] {
    const n = KEYS.length, i = Math.min(n - 2, Math.max(0, Math.floor(s))), u = Math.min(1, s - i);
    const pt = (j: number, f: "eye" | "at"): V3 => { // mirrored end points so the first/last segments are well defined
        if (j >= 0 && j < n) return KEYS[j][f];
        const a = KEYS[j < 0 ? 0 : n - 1][f], b = KEYS[j < 0 ? 1 : n - 2][f];
        return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
    };
    return [cr(pt(i - 1, "eye"), pt(i, "eye"), pt(i + 1, "eye"), pt(i + 2, "eye"), u), cr(pt(i - 1, "at"), pt(i, "at"), pt(i + 1, "at"), pt(i + 2, "at"), u)];
}
// camera timing by ARC LENGTH: a monotone Hermite from scroll time to distance travelled along the eye path, its
// slope at each key set by the key's pace (stations slower so the floor text reads): speed rises and falls evenly
function timing(KEYS: Key[]) {
    const n = KEYS.length, N = 40, len: number[] = [0], idx: number[] = [0];
    let prev = cam(KEYS, 0)[0], acc = 0;
    for (let q = 1; q <= (n - 1) * N; q++) {
        const e = cam(KEYS, q / N)[0];
        acc += Math.hypot(e[0] - prev[0], e[1] - prev[1], e[2] - prev[2]); prev = e;
        len.push(acc); idx.push(q / N);
    }
    const A = KEYS.map((_, i) => len[i * N]);
    // excursion keys (pace 1) take their time from the path: placed between their fixed neighbours in proportion to
    // distance, so the camera does not race one leg and crawl the next
    const tt = KEYS.map((k) => k.t);
    for (let i = 1; i < n - 1; i++) {
        if (KEYS[i].pace !== 1) continue;
        let a = i - 1, b = i + 1;
        while (a > 0 && KEYS[a].pace === 1) a--;
        while (b < n - 1 && KEYS[b].pace === 1) b++;
        tt[i] = KEYS[a].t + ((KEYS[b].t - KEYS[a].t) * (A[i] - A[a])) / (A[b] - A[a] || 1);
    }
    const slope = (i: number) => {
        const a = i > 0 ? (A[i] - A[i - 1]) / (tt[i] - tt[i - 1]) : 0, b = i < n - 1 ? (A[i + 1] - A[i]) / (tt[i + 1] - tt[i]) : 0;
        return (i > 0 && i < n - 1 ? (a + b) / 2 : a + b) * (KEYS[i].pace ?? 1);
    };
    return (t: number) => {
        let a = A[n - 1];
        if (t <= tt[0]) a = 0;
        else if (t < tt[n - 1]) {
            let i = 0;
            while (t > tt[i + 1]) i++;
            const h = tt[i + 1] - tt[i], u = (t - tt[i]) / h, D = A[i + 1] - A[i] || 1e-6;
            const m0 = Math.min(slope(i) * h, 2.9 * D), m1 = Math.min(slope(i + 1) * h, 2.9 * D); // Fritsch-Carlson: monotone
            const u2 = u * u, u3 = u2 * u;
            a = A[i] + (3 * u2 - 2 * u3) * D + (u3 - 2 * u2 + u) * m0 + (u3 - u2) * m1;
        }
        let lo = 0, hi = len.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (len[mid] < a) lo = mid; else hi = mid; }
        return idx[lo] + (idx[hi] - idx[lo]) * ((a - len[lo]) / (len[hi] - len[lo] || 1));
    };
}

type Geo = { vw: number; vh: number; wide: boolean; f: number; cx: number; cy: number; cw: number };
const measure = (el: HTMLElement): Geo => {
    const vw = el.clientWidth, vh = el.clientHeight, wide = vw >= 900 && vw / vh >= 1.1;
    // the printed computer: large, on the right (desktop) / top (phone)
    const cw = wide ? Math.min(0.66 * vh, 0.42 * vw, 600) : Math.min(0.86 * vw, 0.42 * vh, 360);
    return { vw, vh, wide, f: wide ? 1 : 0.9, cw, cx: wide ? vw * 0.68 : vw / 2, cy: wide ? vh * 0.53 : cw * 0.5 + 70 };
};

function ChapterCard({ c, print }: { c: typeof intern; print?: boolean }) {
    return (
        <article className={`${print ? "plate" : "card"} p-5 sm:p-8 text-heading`}>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 eyebrow text-paragraph">
                <span>{company.name} · {company.product}</span><span className="text-tertiary">{c.period}</span>
            </div>
            <div className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-4">
                <span className="grid place-items-center w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full border border-stroke/40 text-sm font-bold">{c.no}</span>
                <h4 className="text-[28px] sm:text-4xl font-extrabold tracking-[-0.045em] leading-[1.02]">{c.role}</h4>
            </div>
            {print && <p className="mt-4 text-base sm:text-xl font-bold tracking-[-0.02em] leading-snug">{c.points[0]}</p>}
            <p className="mt-3 text-sm sm:text-base text-paragraph leading-relaxed">{c.summary}</p>
            <ul className="mt-5 hidden sm:flex flex-wrap gap-1.5">
                {c.stack.map((s) => <li key={s} className="rounded-full border border-stroke/30 px-2.5 py-1 text-[11px] font-semibold text-heading">{s}</li>)}
            </ul>
            <div className="ruler mt-5 text-heading" />
        </article>
    );
}

// one calm diagram plate per system: proof = cream card, print = forest plate
function SystemPlate({ s, n, of, wide }: { s: (typeof pipelines)[number]; n: number; of: number; wide: boolean }) {
    const print = s.chapter === "02";
    const Pic = vizFor[s.title] ?? glyphFor[s.title];
    return (
        <article className={`${print ? "plate" : "card"} p-5 sm:p-7 text-heading`} style={print ? { ["--v1-acc" as string]: "rgb(245 196 53)" } : undefined}>
            <div className="flex justify-between eyebrow text-paragraph"><span>{print ? "Print run" : "Proof"} · {s.chapter}</span><span>{pad(n)} / {pad(of)}</span></div>
            <div className="mt-3 sm:mt-4 flex items-center gap-3">
                <span className="grid place-items-center w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full border border-stroke/40 text-xs sm:text-sm font-bold">{pad(n)}</span>
                <h3 className="text-[26px] sm:text-[40px] font-extrabold tracking-[-0.045em] leading-[1.02]">{s.title}</h3>
            </div>
            <div className={`mt-4 sm:mt-5 grid gap-4 sm:gap-5 items-center ${wide ? "grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]" : "grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"}`}>
                <div className={`${print ? "" : "text-heading"} aspect-[4/3]`}>{Pic && <Pic />}</div>
                <ul className="v1-lines space-y-2 text-[13px] sm:text-[15px] font-semibold leading-snug">
                    {s.cards.map((l) => <li key={l}><span className="text-highlight">—</span>{l}</li>)}
                </ul>
            </div>
            <div className="ruler mt-4 sm:mt-5 text-heading" />
        </article>
    );
}

function LevelPlate() {
    return (
        <article className="plate p-6 sm:p-8 text-heading">
            <div className="flex justify-between eyebrow text-paragraph"><span>Level up</span><span className="text-highlight">01 → 02</span></div>
            <p className="mt-5 text-sm sm:text-base font-semibold text-paragraph line-through decoration-2">{intern.role}</p>
            <h3 className="mt-1 text-[34px] sm:text-[52px] font-extrabold tracking-[-0.05em] leading-[1]">{lead.role}</h3>
            <p className="mt-3 eyebrow text-highlight">{lead.period}</p>
            <div className="ruler mt-5 text-heading" />
        </article>
    );
}

// reduced motion / no WebGL: everything readable, nothing moves
function Static() {
    const [wide, setWide] = useState(() => innerWidth >= 900);
    useEffect(() => {
        const on = () => setWide(innerWidth >= 900);
        addEventListener("resize", on);
        return () => removeEventListener("resize", on);
    }, []);
    const row = (c: typeof intern, print?: boolean) => (
        <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,300px)] items-center" data-print={print ? "1" : "0"} style={{ ["--reg" as string]: print ? 1 : 0, ["--m" as string]: print ? 0 : 1 }}>
            <ChapterCard c={c} print={print} />
            <div className="relative mx-auto w-56 md:w-full aspect-[26/25] [&_.v1-cable]:hidden [&_.v1-marks]:hidden">
                <div className="absolute rounded-md" style={{ left: "24%", top: "20.8%", width: "36.2%", height: "27.2%", background: print ? "#24493a" : "#e9dcb6" }} />
                <Computer />
            </div>
        </div>
    );
    return (
        <div className="v1-static max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-10 flex flex-col gap-8">
            {row(intern)}
            <div className="grid gap-5 md:grid-cols-2">{sys01.map((s, i) => <SystemPlate key={s.title} s={s} n={i + 1} of={sys01.length} wide={wide} />)}</div>
            <div className="mt-8"><LevelPlate /></div>
            {row(lead, true)}
            <div className="grid gap-5 md:grid-cols-2">{sys02.map((s, i) => <SystemPlate key={s.title} s={s} n={i + 1} of={sys02.length} wide={wide} />)}</div>
        </div>
    );
}

export default function V1() {
    const [mode, setMode] = useState<"3d" | "static">(() => (matchMedia("(prefers-reduced-motion: reduce)").matches || !document.createElement("canvas").getContext("webgl2") ? "static" : "3d"));
    return <>
        <style>{css}</style>
        {mode === "static" ? <Static /> : <Dive onFail={() => setMode("static")} />}
    </>;
}

function Dive({ onFail }: { onFail: () => void }) {
    const track = useRef<HTMLDivElement>(null);
    const stage = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const win = useRef<HTMLDivElement>(null);
    const view = useRef<HTMLDivElement>(null);
    const bkWin = useRef<HTMLDivElement>(null);
    const bkIn = useRef<HTMLDivElement>(null);
    const comp = useRef<HTMLDivElement>(null);
    const flash = useRef<HTMLDivElement>(null);
    const roller = useRef<HTMLDivElement>(null);
    const ticket = useRef<HTMLDivElement>(null);
    const cards = useRef<(HTMLDivElement | null)[]>([]);
    const [g, setG] = useState<Geo | null>(null);

    useEffect(() => {
        const st = stage.current!;
        const ro = new ResizeObserver(() => setG((o) => { const n = measure(st); return o && o.vw === n.vw && Math.abs(o.vh - n.vh) < 2 ? o : n; }));
        ro.observe(st);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!g) return;
        const { vw, vh, wide, f, cx, cy, cw } = g;
        const unit = (vh * f) / 100;
        track.current!.style.height = `${END * unit + vh}px`;
        const cv = canvas.current!, dpr = Math.min(1.5, devicePixelRatio || 1);
        cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
        let r: Renderer;
        try { r = new Renderer(cv); } catch (e) { console.warn("v1: WebGL2 unavailable, static layout", e); onFail(); return; }
        const st: State = { T: 0, lv: LV, ink: 0, blot: 0, dark: document.documentElement.dataset.theme === "dark" };
        const KEYS = makeKeys(wide), keyIndex = timing(KEYS);
        let raf = 0, visible = true, p = 0, target = 0, last = 0, settled = false, lastReg = -1, lastInk = -1;
        // scroll only sets a target; each frame the rendered progress p eases toward it (exponential, frame-rate
        // independent, tau 0.12s), so wheel steps glide instead of stepping. Track offset is read on resize only.
        const trackTop = track.current!.getBoundingClientRect().top + scrollY;
        const readTarget = () => (scrollY - trackTop) / unit;
        const onScroll = () => { target = readTarget(); settled = false; if (!raf) raf = requestAnimationFrame(tick); };
        const tick = (now: number) => {
            raf = 0;
            if (!visible) return;
            const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
            last = now;
            if (Math.abs(target - p) > 180) p = target - Math.sign(target - p) * 180; // a jump (e.g. a nav link) skims, not crawls
            p += (target - p) * (1 - Math.exp(-dt / 0.12));
            if (Math.abs(target - p) < 0.02) p = target;
            const moving = frame(p, dt);
            if (p !== target || moving || !settled) { settled = p === target && !moving; raf = requestAnimationFrame(tick); } else last = 0;
        };
        const items = buildScene(r, st, wide, () => onScroll());
        const fov = wide ? (34 * Math.PI) / 180 : (46 * Math.PI) / 180, aspect = vw / vh;
        const [card1, card2] = cards.current;

        // the screen hole of the 2D computer, in stage px at scale 1
        const ch = (cw * 250) / 260;
        const ox = (cw * (HOLE.x + HOLE.w / 2)) / 260, oy = (ch * (HOLE.y + HOLE.h / 2)) / 250;
        const hx = cx - cw / 2 + ox, hy = cy - ch / 2 + oy, hw = (cw * HOLE.w) / 260, hh = (cw * HOLE.h) / 260;
        const Send = Math.max(vw / hw, vh / hh) * 1.15;
        comp.current!.style.transformOrigin = `${ox * RES}px ${oy * RES}px`;

        // the camera rig: the rendered eye and look-at ease toward the path (eye tau 0.16s, look-at 0.22s), so any
        // corner in the path's speed is low-passed away; dt 0 snaps (first frame, resize)
        const rigE: V3 = [0, 0, 0], rigA: V3 = [0, 0, 0];
        // the view direction may turn at most TURN rad/s: no quick head-turns even if the path asks for one
        const TURN = 0.45, dir: V3 = [0, 0, -1];
        const turn = (eye: V3, at: V3, dt: number, dir: V3, lag = 0) => {
            const v: V3 = [at[0] - eye[0], at[1] - eye[1], at[2] - eye[2]], L = Math.hypot(...v) || 1, d: V3 = [v[0] / L, v[1] / L, v[2] / L];
            const ang = Math.acos(Math.min(1, Math.max(-1, d[0] * dir[0] + d[1] * dir[1] + d[2] * dir[2]))), max = dt ? Math.min(2.5, TURN + 0.03 * lag) * dt : Math.PI; // turns faster only while catching up a fast scroll
            if (ang > max) { const w = max / ang; for (let i = 0; i < 3; i++) d[i] = dir[i] + (d[i] - dir[i]) * w; const n = Math.hypot(...d); for (let i = 0; i < 3; i++) d[i] /= n; }
            for (let i = 0; i < 3; i++) { dir[i] = d[i]; at[i] = eye[i] + d[i] * L; }
            return ang > max;
        };
        const ease = (cur: V3, to: V3, dt: number, tau: number) => { const k = dt ? 1 - Math.exp(-dt / tau) : 1; let d = 0; for (let i = 0; i < 3; i++) { cur[i] += (to[i] - cur[i]) * k; d = Math.max(d, Math.abs(to[i] - cur[i])); } return d > 2e-4; };
        const frame = (T: number, dt = 0): boolean => {
            const after = T >= EXIT[0];
            st.T = T; st.dark = document.documentElement.dataset.theme === "dark";
            const sc = stage.current!.style;

            // --- the 2D computer: drifts and turns a little, then the camera pushes into its screen ---
            const zoom = after ? 1 - seg(T, REWIND, EXIT[1]) : seg(T, ...DIVE);
            const ez = smooth(zoom), S = Send ** ez, c = smooth(seg(zoom, 0, 0.5));
            const drift = after ? seg(T, EXIT[1], END + 40) : seg(T, -100, DIVE[0]);
            const tilt = (after ? 1 : -1) * lerp(5, 1.5, drift) * (1 - c), dy = lerp(30, -20, drift) * (1 - c);
            const scx = hx + c * (vw / 2 - hx), scy = hy + c * (vh / 2 - hy) + dy;
            const cs = comp.current!.style;
            cs.transform = `translate(${(scx - hx).toFixed(2)}px,${(scy - hy).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg) scale(${(S / RES).toFixed(5)})`;
            cs.visibility = S > Send * 0.95 ? "hidden" : "visible";
            stage.current!.dataset.z = zoom > 0.02 ? "1" : "0";
            // the inside is seen through the hole: scale the window onto the hole, counter-scale its content
            // (Chrome's "performant expand & collapse" trick: transforms only)
            const w = hw * S * 1.03, h = hh * S * 1.03;
            const L = Math.max(0, scx - w / 2), R = Math.min(vw, scx + w / 2), Tp = Math.max(0, scy - h / 2), B = Math.min(vh, scy + h / 2);
            const sx = Math.max(1e-4, (R - L) / vw), sy = Math.max(1e-4, (B - Tp) / vh), k = Math.min(1, Math.max(w / vw, h / vh));
            win.current!.style.transform = `translate(${L.toFixed(2)}px,${Tp.toFixed(2)}px) scale(${sx.toFixed(5)},${sy.toFixed(5)})`;
            view.current!.style.transform = `translate(${((scx - (k * vw) / 2 - L) / sx).toFixed(2)}px,${((scy - (k * vh) / 2 - Tp) / sy).toFixed(2)}px) scale(${(k / sx).toFixed(5)},${(k / sy).toFixed(5)})`;
            // outside, the computer is the proof until we come back out: then its colour plates snap into register
            // in a few press-like steps, not per frame: each change repaints the big computer layer
            const reg = Math.round((after ? smooth(seg(T, REWIND + 20, EXIT[1] + 10)) : 0) * 6) / 6;
            const inkOut = Math.round((after ? seg(T, EXIT[1] - 5, END) : 0) * 8) / 8;
            if (reg !== lastReg) { sc.setProperty("--reg", reg.toFixed(3)); sc.setProperty("--m", (1 - reg).toFixed(3)); lastReg = reg; }
            if (inkOut !== lastInk) { sc.setProperty("--ink", (1 - inkOut).toFixed(3)); lastInk = inkOut; }
            stage.current!.dataset.print = reg > 0.5 ? "1" : "0";

            // --- inside: the 3D stations ---
            // on the way out the camera sweeps back along the same path (by key index, no station slow-downs)
            const sIdx = after ? lerp(KEYS.length - 1, 0, smooth(seg(T, EXIT[0], EXIT[1]))) : keyIndex(T);
            const [eyeT, atT] = cam(KEYS, sIdx);
            const movingE = ease(rigE, eyeT, dt, 0.3), movingA = ease(rigA, atT, dt, 0.3), capped = turn(rigE, rigA, dt, dir, Math.abs(target - T)), moving = movingE || movingA || capped, eye = rigE, at = rigA;
            const proj = perspective(fov, aspect, 0.02, 60);
            const roll = seg(T, LV + 4, LV + 30), snap = 1 - out3(seg(T, LV + 18, LV + 46)), printed = T > LV + 30;
            st.blot = T < LV + 2 ? 0 : out3(seg(T, LV + 2, LV + 16)) * (1 + 0.15 * Math.sin(seg(T, LV + 2, LV + 20) * Math.PI));
            st.ink = seg(T, LV + 10, P02[P02.length - 1] + 30);
            r.draw(items, lookAt(eye, at), proj, {
                eye, shadowAt: wide ? at : undefined, shadowSize: 3.2, far: 12, // phones: no shadow pass
                ink: st.dark ? hex("#f3e6c4") : hex("#26201a"), light: [-0.55, 0.85, 0.42], dot: 4.2 * dpr,
                roll: T < LV + 4 ? cv.height + 10 : printed ? -10 : (1 - roll) * cv.height,
                mis: [snap * 11 * dpr, -snap * 8 * dpr], outline: (wide ? 1.15 : 1.0) * dpr * (2 * Math.tan(fov / 2)) / cv.height, fog: 5,
            });
            // the painted backdrop: a printed copy revealed behind the roller (transforms only, both rasterised once)
            const rv = T > LV + 4 ? roll : 0;
            bkWin.current!.style.transform = `translate3d(0,${((rv - 1) * vh).toFixed(1)}px,0)`;
            bkIn.current!.style.transform = `translate3d(0,${((1 - rv) * vh).toFixed(1)}px,0)`;

            // --- overlays ---
            flash.current!.style.opacity = (Math.max(0, 1 - Math.abs(zoom - 0.88) / 0.1) * 0.5).toFixed(3);
            roller.current!.style.opacity = roll > 0 && roll < 1 ? "1" : "0";
            roller.current!.style.transform = `translateY(${(roll * vh).toFixed(1)}px)`;
            card1!.style.opacity = (after ? 0 : 1 - seg(zoom, 0, 0.3)).toFixed(3);
            card1!.style.transform = `translateX(${(-seg(zoom, 0, 0.3) * 80).toFixed(1)}px)`;
            const c2 = after ? seg(T, EXIT[1] - 15, EXIT[1] + 20) : 0;
            card2!.style.opacity = c2.toFixed(3);
            card2!.style.transform = `translateX(${(-(1 - out3(c2)) * 80).toFixed(1)}px)`;
            const tk = ticket.current!;
            tk.style.opacity = String(seg(T, DIVE[1] - 5, DIVE[1] + 8) * (1 - seg(T, EXIT[0], EXIT[0] + 10)));
            tk.dataset.print = T > LV + 14 ? "1" : "0";
            return moving;
        };
        const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) onScroll(); }, { rootMargin: "50% 0px" });
        io.observe(track.current!);
        r.onPaper = onScroll;
        const mo = new MutationObserver(onScroll);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        p = target = readTarget();
        frame(p);
        addEventListener("scroll", onScroll, { passive: true });
        return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); io.disconnect(); mo.disconnect(); r.dispose(); };
    }, [g, onFail]);

    const wide = g?.wide ?? true;
    return (
        <div ref={track} className="v1 relative" style={{ height: "760vh" }}>
            <div ref={stage} className="v1-stage sticky top-0 h-screen overflow-hidden">
                <div ref={win} className="v1-win" style={{ width: g?.vw, height: g?.vh }}>
                    <div ref={view} className="v1-view" style={{ width: g?.vw, height: g?.vh }}>
                        <div className="v1-back">
                            <div className="v1-bk" style={{ ["--reg" as string]: 0, ["--m" as string]: 1 }}><Interior /></div>
                            <div ref={bkWin} className="v1-bk"><div ref={bkIn} className="v1-bk" style={{ ["--reg" as string]: 1, ["--m" as string]: 0 }}><Interior /></div></div>
                        </div>
                        <canvas ref={canvas} aria-hidden />
                    </div>
                </div>
                {g && (
                    // laid out RES times larger and scaled down, on its own layer: rasterised once, still crisp deep into the zoom
                    <div ref={comp} className="absolute will-change-transform" style={{ left: g.cx - g.cw / 2 + (HOLE.x + HOLE.w / 2) / 260 * g.cw * (1 - RES), top: g.cy - (g.cw * 125) / 260 + (HOLE.y + HOLE.h / 2) / 250 * (g.cw * 250 / 260) * (1 - RES), width: g.cw * RES }}>
                        <div className="relative w-full aspect-[26/25]">
                            <Computer />
                            <div className="v1-tag absolute left-1/2 -bottom-2 -translate-x-1/2 whitespace-nowrap eyebrow text-heading" style={{ fontSize: 10 * RES }}><span>1-colour proof</span><span>Full-colour print</span></div>
                        </div>
                    </div>
                )}
                <div ref={flash} className="v1-flash" />
                <div ref={roller} className="v1-roller" />
                {[intern, lead].map((c, i) => (
                    <div key={c.no} ref={(el) => { cards.current[i] = el; }} className="absolute" style={wide
                        ? { left: Math.max(28, ((g?.vw ?? 0) - 1240) / 2 + 28), top: "50%", width: Math.min(500, (g?.vw ?? 0) * 0.38), translate: "0 -46%" }
                        : { left: 12, right: 12, bottom: 14, opacity: i ? 0 : 1 }}>
                        <ChapterCard c={c} print={!!i} />
                    </div>
                ))}
                {/* the words are printed into the 3D world (labels.ts); the same text stays here for screen readers */}
                <div className="sr-only">
                    {sys01.map((s, i) => <SystemPlate key={s.title} s={s} n={i + 1} of={sys01.length} wide={wide} />)}
                    <LevelPlate />
                    {sys02.map((s, i) => <SystemPlate key={s.title} s={s} n={i + 1} of={sys02.length} wide={wide} />)}
                </div>
                <div ref={ticket} className="v1-ticket pill-light !py-1.5 !px-4 gap-2 text-xs" style={wide ? { right: 28, top: 84 } : { left: "50%", top: 70, translate: "-50% 0", whiteSpace: "nowrap" }}>
                    <span className="font-bold"><span data-r>{intern.role}</span><span data-r>{lead.role}</span></span>
                    <span className="v1-tag eyebrow !text-[10px] text-paragraph"><span>· Proof</span><span>· Print</span></span>
                </div>
            </div>
        </div>
    );
}
