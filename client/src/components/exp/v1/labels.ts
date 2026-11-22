import { chain, grid, hex, m4, merge, RX, RY, S, T, type Geo, type M4, type Renderer, type V3 } from "./gl";
import { BLOT, REST_ANG, STATIONS, type Ctx } from "./kit";
import { chapters, pipelines } from "../../../data/experience_data";

// The words live in the world: each system's text is printed on the board in front of its station, tilted up a
// little like a floor sign so it reads from that station's camera. Drawn once to a canvas (white on transparent)
// and tinted by the shader in the board's ink: dark ink on the cream proof, cream on the green print.

const W = 1024, H = 600;
const pad = (n: number) => String(n).padStart(2, "0");

function paint(cv: HTMLCanvasElement, eyebrow: [string, string], title: string, lines: string[], no?: string, strike?: string) {
    const c = cv.getContext("2d")!;
    c.clearRect(0, 0, W, H);
    c.fillStyle = c.strokeStyle = "#fff";
    const font = (w: number, px: number, sp = 0) => { c.font = `${w} ${px}px Manrope, ui-sans-serif, system-ui, sans-serif`; (c as unknown as { letterSpacing: string }).letterSpacing = `${sp}px`; };
    font(700, 26, 4);
    c.fillText(eyebrow[0].toUpperCase(), 24, 48);
    const r = eyebrow[1].toUpperCase();
    c.fillText(r, W - 24 - c.measureText(r).width, 48);
    let y = 112, x = 24;
    if (strike) {
        font(700, 34, 0);
        c.globalAlpha = 0.75; c.fillText(strike, 24, y); c.fillRect(24, y - 12, c.measureText(strike).width, 3); c.globalAlpha = 1;
        y += 30;
    }
    if (no) {
        c.lineWidth = 3; c.beginPath(); c.arc(24 + 38, y + 40, 36, 0, Math.PI * 2); c.stroke();
        font(800, 30, 0); c.fillText(no, 24 + 38 - c.measureText(no).width / 2, y + 51);
        x = 24 + 96;
    }
    // the title: as large as fits on one line, else two lines
    let size = 104;
    font(800, size, -4);
    while (c.measureText(title).width > W - x - 24 && size > 64) font(800, (size -= 4), -3);
    const words = title.split(" "), tl: string[] = [];
    for (const w of words) { const t = tl.length ? `${tl[tl.length - 1]} ${w}` : w; if (tl.length && c.measureText(t).width <= W - x - 24) tl[tl.length - 1] = t; else tl.push(w); }
    tl.forEach((l, i) => c.fillText(l, x, y + size * 0.82 + i * size * 0.98));
    y += size * 0.98 * tl.length + 34;
    font(600, 38, 0);
    for (const l of lines) {
        const ws = l.split(" "), rows: string[] = [];
        for (const w of ws) { const t = rows.length ? `${rows[rows.length - 1]} ${w}` : w; if (rows.length && c.measureText(t).width <= W - 24 - 76) rows[rows.length - 1] = t; else rows.push(w); }
        c.fillText("—", 24, y);
        rows.forEach((row, i) => c.fillText(row, 76, y + i * 46));
        y += rows.length * 46 + 10;
    }
    // the ruler along the foot, as on the print cards
    c.globalAlpha = 0.6; c.fillRect(24, H - 22, W - 48, 2);
    for (let t = 24; t <= W - 24; t += 16) c.fillRect(t, H - (t % 80 === 24 ? 40 : 32), 2, t % 80 === 24 ? 18 : 10);
    c.globalAlpha = 1;
}

// a floor sign: hinged at its near edge, tilted up, turned to face the camera angle `ang`
const sign = (w: number, h: number) => grid((u, v) => [(u - 0.5) * w, 0, -v * h], 1, 1);
const place = (base: V3, ang: number, local: V3, tilt: number) => chain(T(...base), RY(ang), T(...local), RX(tilt));

// silkscreen marks: [x, y, z, text, width, facing angle if printed upright (else flat on the board), always dark ink]
export type Silk = [number, number, number, string, number, number?, boolean?][];

export function labels(r: Renderer, { st, add }: Ctx, wide: boolean, printedAt: () => boolean, redraw: () => void, silk: Silk) {
    const sys01 = pipelines.filter((p) => p.chapter === "01"), all = pipelines;
    const w = wide ? 1.2 : 1.0, h = (w * H) / W, geo = sign(w, h), tilt = 0.22;
    // desktop: front-left of the station; phone: straight in front (the view is tall and narrow)
    const local: V3 = wide ? [-0.95, 0.02, 1.15] : [0, 0.02, 1.25];
    const jobs: (() => void)[] = [];
    const make = (text: () => void, ang: number, base: V3, tint: () => V3, fade?: () => number) => {
        const cv = document.createElement("canvas"), tex = r.texture(false);
        cv.width = W; cv.height = H;
        jobs.push(() => { drawTo = cv; text(); r.upload(tex, cv); r.mipmap(tex); });
        const m: M4 = place(base, ang, local, tilt);
        add(geo, Object.defineProperties({ proof: hex("#ffffff"), mode: 3, tex, alpha: 0.999, outline: false, cull: "none" } as Parameters<Ctx["add"]>[1], { print: { get: tint }, ...(fade && { alpha: { get: fade } }) }), () => m);
    };
    let drawTo: HTMLCanvasElement;
    const ink = () => (st.dark ? hex("#f3e6c4") : hex("#26201a")), cream = hex("#f3e6c4");
    all.forEach((s, i) => {
        const list = s.chapter === "01" ? sys01 : all.filter((p) => p.chapter === "02"), n = list.indexOf(s) + 1;
        const print = s.chapter === "02";
        make(() => paint(drawTo, [`${print ? "Print run" : "Proof"} · ${s.chapter}`, `${pad(n)} / ${pad(list.length)}`], s.title, s.cards, pad(n)), REST_ANG[i], STATIONS[i],
            () => (print || printedAt() ? cream : ink()));
    });
    const [intern, lead] = chapters;
    // the level-up sign fades in as you near it, so it doesn't give itself away from the start
    make(() => paint(drawTo, ["Level up", "01 → 02"], lead.role, [lead.period], undefined, intern.role), -0.55, BLOT, () => hex("#ff6509"),
        () => Math.min(0.999, Math.max(0, (st.T - st.lv + 60) / 30)));
    // silkscreen: one atlas of 128x64 cells, flat quads on the board and the chip tops, one mesh
    const cols = 8, rows = Math.ceil(silk.length / cols), atlas = document.createElement("canvas"), stex = r.texture(false);
    atlas.width = cols * 128; atlas.height = rows * 64;
    jobs.push(() => {
        const c = atlas.getContext("2d")!, font = (px: number) => (c.font = `700 ${px}px ui-monospace, Menlo, Consolas, monospace`);
        c.clearRect(0, 0, atlas.width, atlas.height);
        c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
        silk.forEach(([, , , t], i) => { font(44); font(Math.floor(44 * Math.min(1, 116 / c.measureText(t).width))); c.fillText(t, (i % cols) * 128 + 64, Math.floor(i / cols) * 64 + 34); });
        r.upload(stex, atlas); r.mipmap(stex);
    });
    const cell = (i: number): Geo => {
        const g = grid((u, v) => [u - 0.5, 0, (0.5 - v) * 0.5], 1, 1), col = i % cols, row = Math.floor(i / cols);
        g.uv = g.uv.map((t, k) => (k % 2 ? 1 - (row + 1 - t) / rows : (col + t) / cols));
        return g;
    };
    const flat = m4();
    for (const dark of [false, true]) {
        const parts = silk.flatMap(([x, y, z, , w, ang, d], i) => (!!d === dark ? [[cell(i), ang === undefined ? chain(T(x, y, z), S(w)) : chain(T(x, y, z), RY(ang), RX(Math.PI / 2), S(w))] as [Geo, M4]] : []));
        add(merge(parts), Object.defineProperties({ proof: hex("#ffffff"), mode: 3, tex: stex, alpha: 0.999, outline: false, cull: "none" } as Parameters<Ctx["add"]>[1],
            { print: { get: dark ? () => hex("#26201a") : () => (printedAt() ? cream : ink()) } }), () => flat);
    }

    const run = () => jobs.forEach((j) => j());
    run();
    // Manrope may still be loading: repaint once it is in
    document.fonts?.ready.then(() => { run(); redraw(); });
}
