// Draws the ink-spread mask sprite for inkTheme.ts off the main thread: one "arrival time" field
// (noise lobes, cut-off islands, winding tendrils, fibre hairs) and n thresholds of it, as a PNG.
type Job = { w: number; h: number; x: number; y: number; n: number; cols: number; rows: number };

const G = Array.from({ length: 256 }, (_, i) => [Math.cos(i * 2.399963), Math.sin(i * 2.399963)]); // gradients
const grad = (x: number, y: number, fx: number, fy: number) => {
  let k = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  k = Math.imul(k ^ (k >>> 13), 1274126177);
  const g = G[(k ^ (k >>> 16)) & 255];
  return g[0] * fx + g[1] * fy;
};
const gn = (x: number, y: number) => { // gradient noise, about -0.7..0.7
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = grad(ix, iy, fx, fy), b = grad(ix + 1, iy, fx - 1, fy), c = grad(ix, iy + 1, fx, fy - 1), d = grad(ix + 1, iy + 1, fx - 1, fy - 1);
  return a + (b - a) * ux + (c - a + (a - b - c + d) * ux) * uy;
};
const fbm = (x: number, y: number) => {
  let s = 0, a = 0.5;
  for (let i = 0; i < 5; i++, a *= 0.5) {
    s += a * gn(x, y);
    [x, y] = [1.6 * x - 1.2 * y, 1.2 * x + 1.6 * y];
  }
  return s;
};
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

onmessage = async ({ data: { w, h, x, y, n, cols, rows } }: MessageEvent<Job>) => {
  const R = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)), m = Math.min(w, h), seed = Math.random() * 100;
  const t = new Float32Array(w * h), st = new Float32Array(w * h);
  for (let j = 0, i = 0; j < h; j++) for (let k = 0; k < w; k++, i++) {
    const dx = k - x, dy = j - y, d = Math.hypot(dx, dy) + 1e-3, r = d / R, g = smooth(0, 0.6, r); // noise grows with distance, so the stain stays one connected drop
    const qx = (k / m) * 2.2 + seed, qy = (j / m) * 2.2 + seed, wx = fbm(qx, qy), wy = fbm(qx + 5.2, qy + 1.3);
    const lobes = fbm(qx + 1.8 * wx, qy + 1.8 * wy);
    const vein = Math.min(1, Math.max(0, 1 - Math.abs(fbm(qx * 3 + 2.5 * wx, qy * 3 + 2.5 * wy)) * 2.5)) ** 5;
    const hair = (1 - Math.abs(gn((dx / d) * 30 + seed, (dy / d) * 30 + seed) * 1.4)) ** 10 * smooth(0.02, 0.1, r);
    t[i] = r - 0.45 * lobes * g - 0.12 * vein * g - 0.02 * hair;
    st[i] = fbm(qx * 5 + 4 * wx, qy * 5 + 4 * wy);
  }
  // pixels per unit of t, so the edge is anti-aliased over its true width however steep the noise
  const px = new Float32Array(w * h);
  for (let j = 0, i = 0; j < h; j++) for (let k = 0; k < w; k++, i++) {
    const gx = t[i + (k < w - 1 ? 1 : 0)] - t[i - (k > 0 ? 1 : 0)], gy = t[i + (j < h - 1 ? w : 0)] - t[i - (j > 0 ? w : 0)];
    px[i] = 2 / Math.max(Math.hypot(gx, gy), 1e-6);
  }
  // frame thresholds by inked area: the drop lands and swells gently, runs, then the far corner dissolves
  const sorted = t.slice().sort(), last = sorted[t.length - 1];
  const th = Array.from({ length: n }, (_, i) => {
    const area = (1 - (1 - i / (n - 1)) ** 3) ** 3;
    return i === n - 1 ? last + 0.06 : Math.max(sorted[Math.floor(area * (t.length - 1))], sorted[0] + 6 / R);
  });
  const W = w * cols, img = new ImageData(W, h * rows), a = img.data;
  for (let f = 0; f < n; f++) {
    const ox = (f % cols) * w, oy = Math.floor(f / cols) * h;
    for (let j = 0, i = 0; j < h; j++) for (let k = 0; k < w; k++, i++) {
      const u = th[f] - t[i], band = Math.min(1, Math.max(0, 1 + u / 0.05)); // u > 0: inked
      a[((oy + j) * W + ox + k) * 4 + 3] = 255 * Math.max(smooth(-0.75, 0.75, u * px[i]), band * band * 0.75 * smooth(0.05, 0.25, st[i]));
    }
  }
  const cv = new OffscreenCanvas(W, h * rows);
  cv.getContext('2d')!.putImageData(img, 0, 0);
  postMessage(await cv.convertToBlob());
};
