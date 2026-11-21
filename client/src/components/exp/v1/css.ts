// Styles for v1 "Inside the machine": the 2D computer, the window into the 3D inside, and the HTML overlays.
export const css = `
.v1-stage { --reg: 0; --m: 1; --ink: 1; }
.v1-win { position: absolute; left: 0; top: 0; overflow: hidden; transform-origin: 0 0; background: #e9dcb6; }
.v1-view { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.v1-view canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.v1-back { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.v1-back .v1i-pencil, .v1-back .v1i-ink, .v1-back .v1i-blot { display: none; }
.v1-bk { position: absolute; inset: 0; overflow: hidden; will-change: transform; }
[data-z="1"] .v1-cable path { filter: none; }
.v1-inkout { stroke-dasharray: 1; stroke-dashoffset: var(--ink, 1); }
.v1-marks { opacity: calc(var(--reg) * (1 - var(--reg)) * 4); }
.v1-glare { opacity: .18; }
.v1-flash { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at 50% 50%, #fff8e6, #f3e6c4 60%, #e9cf86); }
.v1-roller { position: absolute; left: -2%; right: -2%; top: 0; height: 46px; margin-top: -23px; pointer-events: none; opacity: 0; border-radius: 26px;
  background: linear-gradient(180deg, #14110d 0%, #4d4335 30%, #8a7a60 42%, #3a3229 62%, #14110d 100%);
  box-shadow: 0 16px 26px -6px rgb(0 0 0 / .5), 0 -3px 0 rgb(255 101 9 / .9); }
.v1-plate { position: absolute; opacity: 0; visibility: hidden; will-change: transform, opacity; }
.v1-plate .v1-lines li { display: flex; gap: .6rem; }
.v1-ticket { position: absolute; opacity: 0; }
.v1-ticket [data-r] + [data-r], .v1-ticket[data-print="1"] [data-r]:first-child { display: none; }
.v1-ticket[data-print="1"] [data-r] + [data-r] { display: inline; }
.v1-tag span + span, [data-print="1"] .v1-tag span:first-child { display: none; }
[data-print="1"] .v1-tag span + span { display: inline; }
`;
