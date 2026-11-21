import type { CSSProperties } from "react";

// The v4 vintage-print computer (copied, not shared, so v4 stays untouched), with two changes for v1:
// the screen is a real hole (the world inside the machine is drawn underneath it), and it carries
// the line: a graphite pencil cable that leads into the back of the case, and an ink line that runs
// out from under it once the print run is done. --reg / --m drive the colour plates as in v4.

export const INK = "#26201a";
// screen hole in viewBox units (viewBox 0 0 260 250)
export const HOLE = { x: 63, y: 52, w: 94, h: 68 };

const rr = (x: number, y: number, w: number, h: number, r: number) =>
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const hole = rr(HOLE.x, HOLE.y, HOLE.w, HOLE.h, 6);

// hand-inked lines in viewBox units: the pencil comes down from above into the back of the case,
// the ink leaves from under the keyboard and runs on down the page
function wave(x0: number, y0: number, dy: number, n: number, drift: number) {
    let d = "";
    for (let i = 0; i <= n; i++) {
        const s = i / n, y = y0 + dy * s, ramp = Math.min(1, s * 7);
        const x = x0 + drift * ((1 - Math.cos(Math.min(1, s * 5) * Math.PI)) / 2) + ramp * (13 * Math.sin(y / 31) + 0.8 * Math.sin(y * 0.37));
        d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
}
const cable = wave(196, 22, -1500, 380, 46);
const inkOut = wave(112, 224, 1700, 420, 44);

const plate = (dx: number, dy: number): CSSProperties => ({ transform: `translate(calc(var(--m) * ${dx}px), calc(var(--m) * ${dy}px))`, opacity: "calc(var(--reg) * 3)", mixBlendMode: "multiply" });

export function Computer() {
    const mark = (x: number, y: number) => (
        <g key={`${x}${y}`} transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="1.2" fill="none">
            <circle r="6" /><path d="M-10 0H10M0-10V10" />
        </g>
    );
    return (
        <svg viewBox="0 0 260 250" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
            <defs>
                <pattern id="v1dots" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.25" fill="#8a6326" /></pattern>
                <pattern id="v1fine" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2" cy="2" r=".7" fill="#a57f38" /></pattern>
                <pattern id="v1keys" width="11" height="7" patternUnits="userSpaceOnUse" patternTransform="skewX(-42)"><rect x="1.2" y="1.2" width="8.4" height="4.6" rx="1" fill="none" stroke={INK} strokeWidth=".9" /></pattern>
                {/* v4's pencil (graphite grain + boil) and ink (soft wobble) filters */}
                <filter id="v1-pencil" x="-20%" y="-2%" width="140%" height="104%">
                    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="1" result="g" />
                    <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -.9" result="m" />
                    <feComposite in="SourceGraphic" in2="m" operator="in" result="p" />
                    <feTurbulence type="turbulence" baseFrequency=".05" numOctaves="2" seed="1" result="w"><animate attributeName="seed" values="1;4;7;2" dur=".4s" calcMode="discrete" repeatCount="indefinite" /></feTurbulence>
                    <feDisplacementMap in="p" in2="w" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <filter id="v1-ink" x="-20%" y="-2%" width="140%" height="104%">
                    <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="3"><animate attributeName="seed" values="3;8;5;9" dur=".4s" calcMode="discrete" repeatCount="indefinite" /></feTurbulence>
                    <feDisplacementMap in="SourceGraphic" scale="3" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </defs>
            <g className="v1-cable" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={cable} stroke="rgb(var(--paragraph))" strokeWidth="1.2" filter="url(#v1-pencil)" />
                <path className="v1-inkout" d={inkOut} pathLength={1} stroke="rgb(var(--highlight))" strokeWidth="2.4" filter="url(#v1-ink)" />
            </g>
            <ellipse cx="122" cy="234" rx="104" ry="8" fill={INK} opacity=".18" />
            {/* paper stock, screen cut out */}
            <g fill="#f3e6c4">
                <path d="M46 30 76 10H210L180 30Z" /><path d="M180 30 210 10V150L180 170Z" /><path d={rr(40, 30, 140, 140, 10) + hole} fillRule="evenodd" />
                <path d="M30 210 50 188H200L185 210Z" /><path d="M30 210H185V218H30Z" /><path d="M185 210 200 188V196L185 218Z" />
            </g>
            {/* colour plates */}
            <g style={plate(10, 14)}>
                <path d="M180 30 210 10V150L180 170Z" fill="url(#v1dots)" /><path d={rr(40, 30, 140, 140, 10) + hole} fillRule="evenodd" fill="url(#v1fine)" />
                <path d="M30 210H185V218H30ZM185 210 200 188V196L185 218Z" fill="url(#v1dots)" />
            </g>
            <g style={plate(-8, -14)}><path d={rr(55, 45, 110, 82, 8) + hole} fillRule="evenodd" fill="#d6c08a" /><path d="M46 30 76 10H210L180 30Z" fill="#e9cf86" /></g>
            <g style={plate(14, -12)}><circle cx="62" cy="148" r="5" fill="#ff6509" /><path d="M50 188H200L185 210H30Z" fill="#f0c43a" opacity=".55" /></g>
            {/* key plate (ink), always in register */}
            <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinejoin="round">
                <path d="M46 30 76 10H210L180 30M180 30 210 10V150L180 170" /><rect x="40" y="30" width="140" height="140" rx="10" />
                <rect x="55" y="45" width="110" height="82" rx="8" strokeWidth="1.6" /><path d={hole} strokeWidth="2.6" />
                <circle cx="62" cy="148" r="5" strokeWidth="1.6" /><path d="M64 158v7M70 158v7M76 158v7M82 158v7M88 158v7" strokeWidth="1.4" />
                <path d="M30 210 50 188H200L185 210ZM30 210V218H185L200 196V188M185 210V218" />
                <path d="M57 192H184L176 205H48Z" fill="url(#v1keys)" stroke="none" />
            </g>
            <rect x="118" y="144" width="48" height="5" rx="2" fill={INK} />
            {/* the glass: a curved highlight we pass through on the way in */}
            <path className="v1-glare" d="M70 60Q92 54 122 56L116 62Q92 60 72 68Z M136 104Q146 102 151 92L152 100Q146 108 138 110Z" fill="#fff" opacity=".22" />
            <g className="v1-marks">{[mark(14, 16), mark(246, 16), mark(14, 236), mark(246, 236)]}</g>
        </svg>
    );
}
