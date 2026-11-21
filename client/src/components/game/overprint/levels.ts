import type { Level, Shape } from "./sim.ts";

// Each level is a small print, 40 x 25 cells. Plates: ink 0 orange, 1 forest, 2 mustard; x / y: how far a plate slides
// from register; at: where it starts. key: the ink line work, which stays in register. start / goal: the figure's
// feet, and the registration mark it has to stand on.

// line-work helpers
const wins = (x: number, y: number, nx: number, ny: number, sx = 2, sy = 2, w = 1, h = 1): Shape[] => {
    const o: Shape[] = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) o.push(["r", x + i * sx, y + j * sy, w, h]);
    return o;
};
const wave = (y: number, x0 = 0, x1 = 40, a = 0.25, k = 1.4): Shape => {
    const p: number[] = [];
    for (let x = x0; x <= x1; x += 0.5) p.push(x, y + Math.sin(x * k) * a);
    return ["l", ...p];
};
const rays = (cx: number, cy: number, r0: number, r1: number, n: number, a0 = 0): Shape[] =>
    Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return ["l", cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]; });
const zig = (x0: number, x1: number, y0: number, y1: number, step: number, vertical = true): Shape => {
    const p: number[] = [];
    if (vertical) for (let y = y0, i = 0; y <= y1; y += step, i++) p.push(i % 2 ? x1 : x0, y);
    else for (let x = x0, i = 0; x <= x1; x += step, i++) p.push(x, i % 2 ? y1 : y0);
    return ["l", ...p];
};
const bird = (x: number, y: number, s = 0.5): Shape => ["l", x - s, y - s * 0.5, x - s * 0.3, y - s * 0.6, x, y, x + s * 0.3, y - s * 0.6, x + s, y - s * 0.5];
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Shape => {
    const p: number[] = [];
    for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
    return ["l", ...p];
};

export const LEVELS: Level[] = [
    { // sunset over two hills: lower the sun into the field
        hint: "Walk only where two inks overlap. Drag a plate to move it.",
        plates: [
            { ink: 0, s: [["c", 20, 7, 5.5]], y: [0, 12] },
            { ink: 1, s: [["e", 5, 22, 10, 8], ["e", 35, 21, 9, 8]] },
            { ink: 2, s: [["r", -10, 18, 60, 10]] },
        ],
        key: [
            ...rays(20, 7, 6.6, 8.2, 16, 0.1),
            arc(5, 22, 7.5, 5.8, Math.PI * 1.15, Math.PI * 1.75), arc(5, 22, 4.5, 3.4, Math.PI * 1.2, Math.PI * 1.7), arc(35, 21, 6.6, 5.6, Math.PI * 1.2, Math.PI * 1.85),
            ["l", 0, 20.5, 40, 20.5], ["l", 0, 22.5, 40, 22.5], ["l", 14, 19, 16, 25], ["l", 20, 19, 20, 25], ["l", 26, 19, 24, 25],
            ["r", 33.5, 10.6, 2.6, 2.4], ["l", 33, 10.8, 34.8, 9.2, 36.6, 10.8], ["r", 34.4, 11.6, 0.8, 1.4],
            bird(9, 5), bird(11.5, 3.8, 0.4), bird(30, 9, 0.45),
        ],
        start: [3, 18], goal: [37, 17.05],
    },
    { // a street at dusk: the lit windows make walls where they cross a building
        hint: "Overlaps are walls too.",
        plates: [
            { ink: 1, s: [["r", -10, 19, 60, 6], ["r", 0, 6, 7, 13], ["r", 9, 10, 6, 9], ["r", 17, 4, 5, 15], ["r", 24, 9, 6, 10], ["r", 32, 7, 8, 12]] },
            { ink: 2, s: [["r", -10, 19, 60, 2], ["r", 13, 8, 2, 11], ["r", 28, 5, 2, 14]], x: [-7, 7] },
        ],
        key: [
            ...wins(1, 8, 3, 4, 2, 2.4, 0.9, 1.2), ...wins(10, 12, 2, 2, 2.2, 2.4, 0.9, 1.2), ...wins(18, 6, 2, 4, 2.2, 2.6, 0.9, 1.4),
            ...wins(25, 11, 2, 2, 2.4, 2.4, 1, 1.2), ...wins(33, 9, 3, 3, 2.3, 2.6, 1, 1.3),
            ["r", 2.5, 16.4, 1.6, 2.6], ["r", 18.8, 16.2, 1.6, 2.8], ["r", 35, 16.4, 1.8, 2.6], ["l", 19.5, 4, 19.5, 1.5], ["d", 19.5, 1.3, 0.25],
            ...[2, 6, 10, 14, 18, 22, 26, 30, 34, 38].map((x): Shape => ["l", x, 23, x + 1.8, 23]),
            ["c", 35, 3, 1.6], ["l", 8, 19, 8, 13.5, 9.4, 13.5],
        ],
        start: [3, 19], goal: [37, 18.05],
    },
    { // a lighthouse: its beam lifts you up the tower
        hint: "An overlap carries you when its plate moves.",
        plates: [
            { ink: 0, s: [["r", -10, 21, 60, 6], ["c", 32, 5, 5.5]] },
            { ink: 1, s: [["r", -10, 21, 60, 6], ["r", 21, 3, 4, 18], ["r", 28, 8, 14, 17]] },
            { ink: 2, s: [["r", 11, 19, 14, 2]], y: [-14, 0] },
        ],
        key: [
            ["l", 21, 7, 25, 7], ["l", 21, 11, 25, 11], ["l", 21, 15, 25, 15], ["r", 20.5, 1, 5, 2], ["l", 20.3, 1, 23, -0.6, 25.7, 1], ["r", 22.2, 17.8, 1.6, 3.2],
            ...rays(32, 5, 6.3, 7.5, 14, 0.2),
            ["l", 29, 12, 34, 11.2, 40, 12.4], ["l", 28.6, 16, 33, 15.4, 40, 16.6],
            wave(22.6, 0, 29), wave(24, 0, 29, 0.25, 1.1),
            bird(10, 6), bird(13, 8, 0.4), bird(7, 10, 0.35),
        ],
        start: [4, 21], goal: [32, 7.05],
    },
    { // a computer: drag the window round the screen with you on it
        hint: "Some plates move both ways.",
        plates: [
            { ink: 0, s: [["r", 10, 12, 7, 3]], x: [-3, 16], y: [-9, 5] },
            { ink: 1, s: [["r", -10, 21, 60, 5], ["r", 7, 2, 26, 2], ["r", 7, 17, 26, 2], ["r", 7, 4, 2, 13], ["r", 31, 4, 2, 13], ["r", 17, 19, 6, 2], ["r", 19, 8, 4, 4], ["r", 34, 8, 6, 1]] },
            { ink: 2, s: [["r", -10, 21, 60, 1], ["r", 9, 4, 22, 13], ["r", 34, 4, 6, 5]] },
        ],
        key: [
            ["l", 10, 13, 17, 13], ["d", 10.6, 12.5, 0.18], ["d", 11.3, 12.5, 0.18], ["l", 19, 9, 20.5, 9, 21, 8.4, 23, 8.4],
            ["r", 2, 19.4, 11, 1.4], zig(2.6, 12.4, 19.7, 20.5, 0.9, false), ["e", 26, 20.2, 0.9, 0.7], ["l", 26, 19.5, 26.5, 18, 28, 17.6],
            ["l", 35.2, 4.3, 35.2, 8], ["l", 36.6, 4.6, 36.6, 8], ["l", 38.2, 4.2, 38.8, 8], ["d", 20, 18, 0.3],
        ],
        start: [3, 21], goal: [37, 7.05],
    },
    { // a harbour: the boat ferries you over, and its sail climbs the cliff
        plates: [
            { ink: 0, s: [["r", 9, 17, 9, 3], ["p", 13, 16, 19, 16, 19, 8]], x: [-4, 18] },
            { ink: 1, s: [["r", -10, 17, 16, 9], ["r", 30, 9, 20, 17]] },
            { ink: 2, s: [["r", -10, 19, 60, 7], ["r", 35, 6, 5, 4]] },
        ],
        key: [
            ["l", 19, 7.4, 19, 17], ["l", 9, 18.4, 18, 18.4], ["l", 1, 17, 1, 25], ["l", 4, 17, 4, 25],
            wave(21.4, 6, 30), wave(23, 6, 30, 0.25, 1.1), wave(24.4, 6, 30),
            ["l", 34.4, 6, 37.5, 3.6, 40.6, 6], ["r", 36.8, 7.6, 1.4, 2.4], ["r", 38.8, 7, 0.8, 0.8],
            ["l", 30, 13, 35, 12.4, 40, 13.4], ["l", 30, 17, 36, 16.4, 40, 17.2],
            bird(8, 6), bird(11, 4.6, 0.4), bird(25, 8, 0.45),
        ],
        start: [2, 19], goal: [37.5, 8.05],
    },
    { // a suspension bridge: lift the deck to the cable, then slide the cable across with you on it
        plates: [
            { ink: 0, s: [["r", -40, 21, 120, 1], ["r", 10, 8, 16, 1]], x: [0, 8] },
            { ink: 1, s: [["r", -10, 21, 60, 5], ["r", 5, 5, 3, 16], ["r", 32, 5, 3, 16]] },
            { ink: 2, s: [["r", -10, 19, 40, 2]], y: [-11, 0] },
        ],
        key: [
            arc(20, 5, 13.5, 11, 0.12, Math.PI - 0.12), ["l", 0, 13, 6.5, 5], ["l", 33.5, 5, 40, 13],
            ...[10, 14, 18, 22, 26, 30].map((x): Shape => ["l", x, 5 + 11 * Math.sin(Math.acos((x - 20) / 13.5)) - 0.2, x, 19]),
            ["l", 5, 9, 8, 9], ["l", 32, 9, 35, 9], ["l", 5, 14, 8, 14], ["l", 32, 14, 35, 14],
            wave(23, 0, 40), wave(24.4, 0, 40, 0.25, 1.1), bird(16, 3), bird(19, 2, 0.4),
        ],
        start: [2, 21], goal: [33, 7.05],
    },
    { // an eclipse: the moon lifts you to the sun, the sun carries you on
        plates: [
            { ink: 0, s: [["c", 30, 6, 3], ["r", -40, 21, 120, 1]], x: [-22, 0], at: [-12, 0] },
            { ink: 1, s: [["r", -10, -10, 60, 28], ["r", -10, 21, 60, 5]] },
            { ink: 2, s: [["c", 30, 6, 3]], x: [-24, -10], y: [2, 14], at: [-20, 14] },
        ],
        key: [
            ...rays(30, 6, 3.8, 5.4, 18, 0.15),
            ...[[3, 3], [7, 9], [12, 2], [16, 13], [21, 5], [24, 11], [36, 13], [38, 3], [4, 14], [27, 15], [10, 6], [33, 10]].map(([x, y]): Shape => ["d", x, y, 0.16]),
            wave(22.6, 0, 40), wave(24, 0, 40, 0.25, 1.1), ["l", 0, 18, 40, 18],
        ],
        start: [2, 21], goal: [30, 2.05],
    },
    { // a crane: ride the hook to the jib, then swing the cable over to the building
        plates: [
            { ink: 0, s: [["r", 11, 4, 3, 17], ["r", -40, 21, 120, 1]], x: [-6, 16] },
            { ink: 1, s: [["r", -10, 21, 60, 5], ["r", 2, 4, 3, 17], ["r", 2, 3, 22, 1], ["r", 27, 12, 13, 9]] },
            { ink: 2, s: [["r", 7, 19, 15, 2]], y: [-16, 0] },
        ],
        key: [
            zig(2, 5, 4, 21, 1.5), zig(2, 24, 3, 4, 1, false), ["l", 3.5, 3, 3.5, 0.5, 12, 3], ["l", 3.5, 0.5, 23.5, 3], ["r", -1, 3, 3, 2],
            ["l", 12.5, 21, 12.5, 21.6], ...wins(28.5, 13.5, 5, 3, 2.2, 2.3, 1.2, 1.2), ["l", 27, 12, 27, 10, 40, 10], ["l", 30, 10, 30, 12], ["l", 34, 10, 34, 12],
            bird(18, 8), bird(21, 6.5, 0.4),
        ],
        start: [3, 21], goal: [28, 11.05],
    },
];
