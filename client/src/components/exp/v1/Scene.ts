import { m4, merge, type Geo, type Item, type M4, type Renderer } from "./gl";
import { makeCtx, type Pending, type State } from "./kit";
import { world } from "./world";
import { stations01 } from "./stations01";
import { stations02 } from "./stations02";
import { labels } from "./labels";

// Inside the machine: the work itself, built in 3D. One station per system stands on a printed board,
// in a row along the ink wire, each a small scene of what that system does. The camera rides the wire
// past them. Drawn in v4's print: cream stock, brown halftone, ink outlines, forest / mustard / orange.
export { BLOT, STATIONS, type State } from "./kit";

// static batching: anything whose transform never changes (checked at several scroll times, including the
// level-up hop) is baked into one big buffer per material, so the frame draws a few dozen meshes, not hundreds
export function buildScene(r: Renderer, st: State, wide: boolean, redraw: () => void): Item[] {
    const pending: Pending[] = [], ctx = makeCtx(st, pending);
    world(ctx);
    stations01(ctx);
    stations02(ctx);
    labels(r, ctx, wide, () => st.T > st.lv + 30, redraw);
    const times = [-2000, 137.3, st.lv + 12, st.lv + 20, 444.4, 3000], keep = st.T;
    const same = (a: M4, b: M4) => a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
    const plain = (p: Pending) => !p.show && !p.frac && (p.mat.mode ?? 0) === 0 && (p.mat.alpha ?? 1) >= 1 &&
        Object.entries(Object.getOwnPropertyDescriptors(p.mat)).every(([k, d]) => k === "proof" || !d.get);
    const groups = new Map<string, { mat: Pending["mat"]; parts: [Geo, M4][] }>(), items: Item[] = [];
    for (const p of pending) {
        const ms = plain(p) ? times.map((t) => { st.T = t; return p.model(); }) : null;
        if (ms && ms.every((m) => same(m, ms[0]))) {
            const m = p.mat, key = [m.print.join(), m.tone ?? 0, m.dot?.join() ?? "", m.outline ?? true, m.hatch ?? 0, m.glow ?? 0, m.cull ?? "back"].join("|");
            if (!groups.has(key)) groups.set(key, { mat: m, parts: [] });
            groups.get(key)!.parts.push([p.geo, ms[0]]);
            continue;
        }
        // a bounding sphere in model space, for culling
        let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < p.geo.p.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p.geo.p[i + k]); hi[k] = Math.max(hi[k], p.geo.p[i + k]); }
        const c = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2), rad = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
        items.push({ mesh: r.mesh(p.geo), mat: p.mat, model: p.model, show: p.show, frac: p.frac, bs: [c[0], c[1], c[2], rad] });
    }
    st.T = keep;
    const ident = m4();
    for (const { mat, parts } of groups.values()) items.unshift({ mesh: r.mesh(merge(parts)), mat, model: () => ident });
    return items;
}
