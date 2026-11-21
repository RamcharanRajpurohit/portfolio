// Ink-spread theme switch.
// A View Transition snapshots the old page and reveals the live new page through a mask: a sprite of
// N frames of an ink stain growing from the theme toggle (drawn by inkWorker.ts). The sprite is made
// ahead of time, off the main thread (idle after load, after a resize, after each switch), so a click
// costs nothing and each frame of the spread is only a mask-position step.
const DURATION = 2500; // ms, the whole spread
const N = 60, COLS = 6, ROWS = 10; // sprite frames
const PX = 1.4e5; // mask pixels per frame

let sprite: { key: number[] } | undefined, btn: HTMLElement | null = null, drawing = false, busy: ViewTransition | undefined;
const origin = () => {
  const r = btn!.getBoundingClientRect();
  return [innerWidth, innerHeight, r.x + r.width / 2, r.y + r.height / 2];
};
// the sprite still fits if the width and the toggle are unchanged (a height change only stretches it)
const fits = (k: number[], [w, h, x, y] = origin()) => k[0] === w && Math.abs(k[1] / h - 1) < 0.2 && Math.hypot(k[2] - x, k[3] - y) < 2;

let worker: Worker | undefined;
const css = document.createElement('style');
function draw(fresh = false) {
  if (!btn || drawing || (!fresh && sprite && fits(sprite.key)) || !('OffscreenCanvas' in window)) return;
  drawing = true;
  const key = origin(), [W, H, x, y] = key, s = Math.min(1, Math.sqrt(PX / (W * H)));
  worker ??= new Worker(new URL('./inkWorker.ts', import.meta.url), { type: 'module' });
  // a data: URL, since the page's CSP blocks blob: images
  worker.onmessage = ({ data }: MessageEvent<Blob>) => {
    const r = new FileReader();
    r.onload = async () => {
      const img = new Image();
      img.src = r.result as string;
      await img.decode().catch(() => {});
      // parsed now, while idle: a 0.7 MB URL in the keyframes would stall the click for ~1 s
      css.textContent = `html.ink-mask::view-transition-new(root), .ink-drop { mask: url(${img.src}) 0 0 / ${COLS * 100}% ${ROWS * 100}% no-repeat }`;
      if (!css.isConnected) document.head.append(css);
      sprite = { key };
      drawing = false;
    };
    r.readAsDataURL(data);
  };
  worker.postMessage({ w: Math.round(W * s), h: Math.round(H * s), x: x * s, y: y * s, n: N, cols: COLS, rows: ROWS });
}

const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1000 }) : setTimeout(f, 500));
let resized = 0;
addEventListener('resize', () => {
  clearTimeout(resized);
  resized = setTimeout(() => idle(draw), 400);
});
// ref for the theme toggle: the ink starts from its centre, so the sprite is drawn for it ahead of time
export function inkButton(el: HTMLElement | null) {
  btn = el;
  if (el) idle(draw);
}

export async function inkSwitch(apply: () => void, toDark: boolean) {
  busy?.skipTransition();
  if (!document.startViewTransition || !btn || matchMedia('(prefers-reduced-motion: reduce)').matches) return apply();
  const root = document.documentElement, [W, H, x, y] = origin();
  const mask = !!sprite && fits(sprite.key) && CSS.supports('mask-image', 'none');
  // the drop lands at once: frame 0 is painted over the old page while the transition captures it
  const drop = document.createElement('div');
  if (mask) {
    drop.className = 'ink-drop';
    drop.style.cssText = `position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:${toDark ? '#16211b' : '#ecba2a'}`;
    document.body.append(drop);
  }
  root.classList.add('ink');
  root.classList.toggle('ink-mask', mask);
  const vt = (busy = document.startViewTransition(() => {
    drop.remove();
    apply();
  }));
  await vt.ready.catch(() => {});
  const frames = mask
    ? [...Array.from({ length: N }, (_, i) => ({ maskPosition: `${((i % COLS) / (COLS - 1)) * 100}% ${(Math.floor(i / COLS) / (ROWS - 1)) * 100}%`, offset: i / N, easing: 'step-end' })), { maskPosition: '100% 100%', offset: 1 }]
    : { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${Math.hypot(Math.max(x, W - x), Math.max(y, H - y))}px at ${x}px ${y}px)`] }; // sprite not drawn yet
  root.animate(frames, { duration: mask ? DURATION : 700, easing: mask ? 'linear' : 'ease-out', pseudoElement: '::view-transition-new(root)' });
  await vt.finished.catch(() => {});
  if (busy === vt) {
    root.classList.remove('ink', 'ink-mask');
    busy = undefined;
  }
  idle(() => draw(true)); // a fresh stain for next time
}
