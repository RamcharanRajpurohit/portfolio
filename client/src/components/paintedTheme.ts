// A visitor-painted theme: the palette of a print made in the Draw toy becomes the site's colour tokens.
// Inline custom properties on <html> win over both the day and night rules; the theme toggle clears them.
export type Palette = [string, string, string, string]; // stock, plate A, plate B, type colour (hex)
const KEY = "painted-theme";
const VARS = ["--bg", "--text", "--headline", "--stroke", "--main", "--paragraph", "--highlight", "--tertiary", "--cloth", "--btn", "--btn-text", "--btn-bg", "--secondary"];

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export function applyPalette(p: Palette, save = true) {
    const [stock, A, B, type] = p.map(rgb);
    const light = (0.2126 * stock[0] + 0.7152 * stock[1] + 0.0722 * stock[2]) / 255 > 0.45;
    const values = [stock, type, type, type, type, mix(type, stock, 0.3), A, B, B, type, stock, mix(stock, type, 0.12), light ? mix(stock, [255, 250, 235], 0.55) : mix(stock, type, 0.1)];
    const s = document.documentElement.style;
    VARS.forEach((v, i) => s.setProperty(v, values[i].join(" ")));
    if (save) try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: this visit only */ }
}

export function clearPalette() {
    const s = document.documentElement.style;
    VARS.forEach((v) => s.removeProperty(v));
    try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }
}

export function restorePalette() {
    try { const p = localStorage.getItem(KEY); if (p) applyPalette(JSON.parse(p), false); } catch { /* ignore a bad entry */ }
}
