import { useId, type JSX, type ReactNode } from "react";

// Line-art glyphs, one per system, for the faces of the boxes that fly out of the v1 computer.
// Drawn in currentColor (+ --v1-acc for one accent), so the same art prints as a green CRT proof (chapter 01)
// and as cream + gold ink on the forest plate (chapter 02). Outlines only; halftone dots for shade.

// a slightly wavy hand-ruled line, and a cursive scribble of n loops
const ln = (x: number, y: number, w: number) => `M${x} ${y}q${w / 4} -1.4 ${w / 2} 0t${w / 2} 0`;
const hand = (x: number, y: number, n: number) => `M${x} ${y}` + "c2-9 8-11 7-3s-6 7-2 6 6-6 7-5".repeat(n);

function Svg({ children }: { children: (u: string) => ReactNode }) {
    const u = "v1g" + useId().replace(/[^a-zA-Z0-9]/g, "");
    return (
        <svg viewBox="0 0 320 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden
            fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <style>{css}</style>
            <defs>
                <pattern id={`${u}d`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                    <circle cx="2.5" cy="2.5" r="1.1" fill="currentColor" stroke="none" />
                </pattern>
            </defs>
            {children(u)}
        </svg>
    );
}
const dots = (u: string) => `url(#${u}d)`;

// 01 · an exam sheet whose next question block slides out of the pipeline into the last empty slot
const Assessments = () => (
    <Svg>{(u) => <>
        <path d="M28 42V150Q28 196 74 196H118V186H76Q36 186 36 150V42Z" fill={dots(u)} stroke="none" opacity=".4" />
        <path d="M28 42V150Q28 196 74 196H118M58 42V152Q58 166 72 166H118M126 166H132M126 196H132" />
        <path d="M19 22L28 42M67 22L58 42" />
        <ellipse cx="43" cy="22" rx="24" ry="6" />
        <path d="M34 19l5 1-1 4-5-1zM46 17l5 0 0 4-5 0z" strokeWidth="1.4" className="v1g-acc" />
        <circle cx="46" cy="98" r="9" strokeWidth="1.8" />
        <path d="M46 98l5-5" className="v1g-acc" strokeWidth="1.8" />
        <path d="M40 104h12" strokeWidth="1.2" />
        <rect x="118" y="161" width="9" height="40" rx="3" />
        <ellipse cx="133" cy="181" rx="5" ry="15" />
        <path d="M282 44V36H158M290 36V28H166M290 28V196H282M282 36V204H274" strokeWidth="1.6" />
        <path d="M274 44L290 28V196L274 212Z" fill={dots(u)} stroke="none" opacity=".3" />
        <rect x="150" y="44" width="124" height="168" rx="4" />
        <path d={ln(162, 60, 56)} strokeWidth="3.2" />
        <circle cx="254" cy="62" r="9" className="v1g-acc" />
        <path d="M160 76H264" strokeWidth="1.2" />
        {[88, 120, 152].map((y) => (
            <g key={y}>
                <rect x="162" y={y} width="14" height="14" rx="2" />
                <path d={ln(186, y + 4, 70) + ln(186, y + 12, 44)} strokeWidth="1.8" />
            </g>
        ))}
        <rect x="157" y="180" width="110" height="26" rx="3" strokeWidth="1.2" strokeDasharray="3 5" />
        <g className="v1g-slide v1g-acc">
            <rect x="162" y="186" width="14" height="14" rx="2" />
            <path d={ln(186, 190, 70) + ln(186, 198, 44)} strokeWidth="1.8" />
        </g>
    </>}</Svg>
);

// 01 · a phone photo of a handwritten answer: a scan line sweeps it, then the mark lands
const Grading = () => (
    <Svg>{(u) => <>
        <path d="M114 22Q116 14 126 14H204Q220 14 220 30V198Q220 212 212 214" strokeWidth="1.6" />
        <path d="M212 36L220 30V198L212 206Z" fill={dots(u)} stroke="none" opacity=".4" />
        <rect x="104" y="20" width="108" height="200" rx="16" />
        <rect x="114" y="36" width="88" height="166" rx="8" strokeWidth="1.6" />
        <circle cx="158" cy="28" r="2" />
        <path d="M101 70V88" strokeWidth="3" />
        <path d="M122 56V48H132M184 48H194V56M194 182V190H184M132 190H122V182" className="v1g-acc" strokeWidth="1.8" />
        <path d={hand(126, 82, 7)} strokeWidth="1.8" />
        <path d={hand(126, 110, 5) + "M178 104h8M178 109h8"} strokeWidth="1.8" />
        <path d={hand(130, 146, 3)} strokeWidth="2.4" />
        <path d="M124 160Q150 156 174 162" strokeWidth="1.4" />
        <g className="v1g-scan">
            <rect x="116" y="44" width="84" height="10" fill={dots(u)} stroke="none" opacity=".5" />
            <path d="M116 56H200" className="v1g-acc" strokeWidth="2.6" />
        </g>
        <path d="M180 152L194 168L244 106" className="v1g-acc v1g-mark" pathLength={1} strokeWidth="5" />
    </>}</Svg>
);

// 01 · the companion: a friendly speech bubble with a voice, inside the child-safety shield
const Amigo = () => (
    <Svg>{(u) => <>
        <mask id={`${u}m`}>
            <path d="M160 18C186 30 214 32 236 30C238 110 220 180 160 222C100 180 82 110 84 30C106 32 134 30 160 18Z" fill="#fff" />
            <path d="M160 34C182 44 206 46 222 45C222 112 206 168 160 204C114 168 98 112 98 45C114 46 138 44 160 34Z" fill="#000" />
        </mask>
        <rect x="160" y="0" width="100" height="240" fill={dots(u)} stroke="none" mask={`url(#${u}m)`} opacity=".55" />
        <path d="M160 18C186 30 214 32 236 30C238 110 220 180 160 222C100 180 82 110 84 30C106 32 134 30 160 18Z" strokeWidth="2.6" />
        <path d="M160 34C182 44 206 46 222 45C222 112 206 168 160 204C114 168 98 112 98 45C114 46 138 44 160 34Z" strokeWidth="1.2" strokeDasharray="2 6" />
        <path d="M136 62H184Q204 62 204 82V96Q204 116 184 116H150L134 130L138 116Q116 114 116 94V82Q116 62 136 62Z" />
        <path d="M158 62Q156 52 166 48" />
        <circle cx="146" cy="86" r="3.4" fill="currentColor" stroke="none" />
        <circle cx="176" cy="86" r="3.4" fill="currentColor" stroke="none" />
        <path d="M150 98Q161 108 172 98" />
        <g className="v1g-acc" strokeWidth="4">
            {[8, 18, 30, 16, 36, 22, 28, 12, 6].map((h, i) => (
                <path key={i} d={`M${124 + i * 9} ${156 - h / 2}v${h}`} className="v1g-bar" style={{ animationDelay: `${-i * 0.37}s` }} />
            ))}
        </g>
    </>}</Svg>
);

// 01 · a PDF page; its questions fly out one card at a time into an index-card drawer
const PdfBank = () => (
    <Svg>{(u) => <>
        <g transform="rotate(-7 76 96)">
            <path d="M40 34V26H128V146H120" strokeWidth="1.6" />
            <path d="M32 34H104L120 50V154H32Z" />
            <path d="M104 34V50H120" strokeWidth="1.6" />
            <rect x="40" y="42" width="34" height="15" rx="2" className="v1g-acc" strokeWidth="1.6" />
            <text x="44.5" y="53.5" className="v1g-lbl v1g-accf">PDF</text>
            <path d={ln(40, 72, 70) + ln(40, 82, 56) + ln(40, 92, 66) + ln(40, 110, 70) + ln(40, 120, 48) + ln(40, 138, 62)} strokeWidth="1.6" />
        </g>
        <path d="M128 90Q186 22 224 76" className="v1g-acc" strokeWidth="1.4" strokeDasharray="1 6" />
        <path d="M288 140L302 128V202L288 214Z" fill={dots(u)} stroke="none" opacity=".45" />
        <path d="M176 140L190 128H302L288 140M302 128V202L288 214" />
        <path d="M206 120V112H220L223 105H241L244 112H286V128" strokeWidth="1.6" />
        <path d="M196 140V118H250L253 111H271L274 118H280V140" />
        <path d={ln(204, 127, 60) + ln(204, 134, 40)} strokeWidth="1.4" />
        <rect x="176" y="140" width="112" height="74" rx="4" />
        <rect x="218" y="152" width="24" height="13" rx="2" strokeWidth="1.6" />
        <path d="M222 156h16" strokeWidth="1.2" />
        <path d="M218 176H242Q242 188 230 188Q218 188 218 176Z" fill={dots(u)} />
        <g className="v1g-fly v1g-acc">
            <rect x="212" y="72" width="34" height="22" rx="2" transform="rotate(12 229 83)" />
            <path d="M218 80h20M218 86h14" strokeWidth="1.6" transform="rotate(12 229 83)" />
        </g>
    </>}</Svg>
);

// 02 · a worksheet: marked answers, a pencil mid-answer, PDF and photo dropping in from the import tray, a live pulse
const Homework = () => (
    <Svg>{(u) => <>
        <g transform="rotate(4 200 112)">
            <rect x="134" y="28" width="132" height="168" rx="4" />
            <path d={ln(148, 46, 52)} strokeWidth="3" />
            <path d="M146 58H254" strokeWidth="1.2" />
            {[76, 108, 140].map((y, i) => (
                <g key={y}>
                    <circle cx="153" cy={y + 4} r="6" strokeWidth="1.6" />
                    <path d={ln(168, y, 62) + (i < 2 ? ln(168, y + 9, 40) : "")} strokeWidth="1.6" />
                    {i < 2 && <path d={`M236 ${y + 4}l6 6 12-14`} className="v1g-acc" strokeWidth="3" />}
                </g>
            ))}
            <path d={hand(168, 152, 3)} strokeWidth="1.8" />
        </g>
        <g transform="translate(213 158) rotate(40)">
            <path d="M14 -6H72V6H14ZM14 0H72M0 0L14 -6M0 0L14 6" />
            <path d="M0 0L4 -1.7V1.7Z" fill="currentColor" />
            <path d="M72 -6V6M77 -6V6" strokeWidth="1.4" />
            <path d="M77 -6H82Q86 -6 86 0Q86 6 82 6H77" className="v1g-acc" />
        </g>
        <g transform="rotate(-9 62 160)">
            <rect x="40" y="134" width="44" height="52" rx="2" />
            <rect x="45" y="139" width="34" height="30" strokeWidth="1.4" />
            <path d="M47 167L57 154L64 161L69 155L77 167" strokeWidth="1.6" />
            <circle cx="70" cy="146" r="3" className="v1g-acc" />
        </g>
        <g transform="rotate(9 100 156)">
            <path d="M84 128H108L116 136V184H84Z" />
            <text x="88" y="148" className="v1g-lbl" style={{ fontSize: 8 }}>PDF</text>
            <path d={ln(89, 160, 22) + ln(89, 168, 16)} strokeWidth="1.4" />
        </g>
        <path d="M118 186L130 174V190L118 202Z" fill={dots(u)} stroke="none" opacity=".45" />
        <path d="M26 186L38 174H130L118 186M130 174V190L118 202" strokeWidth="1.8" />
        <rect x="26" y="186" width="92" height="16" rx="2" />
        <circle cx="282" cy="24" r="4.5" className="v1g-accf" />
        <circle cx="282" cy="24" r="4.5" className="v1g-acc v1g-pulse" strokeWidth="1.6" />
        <text x="250" y="27.5" className="v1g-lbl v1g-accf" style={{ fontSize: 9 }}>LIVE</text>
    </>}</Svg>
);

// 02 · the teacher ticks off what was taught; out come a folded cheat sheet and question cards
const Revise = () => (
    <Svg>{(u) => <>
        <path d="M124 44V210Q124 216 118 216H30M130 50V214Q130 222 122 222H34" strokeWidth="1.4" />
        <path d="M124 50H130V214Q130 222 122 222H34V216H118Q124 216 124 210Z" fill={dots(u)} stroke="none" opacity=".4" />
        <rect x="24" y="36" width="100" height="180" rx="8" />
        <rect x="54" y="26" width="40" height="18" rx="5" />
        <circle cx="74" cy="33" r="3" strokeWidth="1.6" />
        {[66, 102, 138, 174].map((y, i) => (
            <g key={y}>
                <rect x="36" y={y} width="16" height="16" rx="3" strokeWidth="1.8" />
                <path d={ln(62, y + 5, 48) + ln(62, y + 12, 30)} strokeWidth="1.6" />
                {i < 3 && <path d={`M38 ${y + 7}l6 7 12-17`} className="v1g-acc v1g-tick" pathLength={1} strokeWidth="3.2" style={{ animationDelay: `${i * 0.45}s` }} />}
            </g>
        ))}
        <path d="M136 122Q150 98 166 112" strokeDasharray="1 6" />
        <path d="M160 104L167 113L157 116" />
        <path d="M212 44L252 60V156L212 140Z" fill={dots(u)} stroke="none" opacity=".4" />
        <path d="M172 60L212 44L252 60L292 44V140L252 156L212 140L172 156Z" />
        <path d="M212 44V140M252 60V156" strokeWidth="1.6" />
        <path d="M180 66L204 56.4" className="v1g-acc" strokeWidth="3.2" />
        <path d="M180 82L204 72.4M180 92L200 84M180 106L204 96.4M180 116L196 109.6M180 130L204 120.4" strokeWidth="1.5" />
        <path d="M260 62L284 52.4M260 76L280 68M260 90L284 80.4" strokeWidth="1.5" />
        <rect x="262" y="94" width="20" height="26" rx="2" strokeWidth="1.4" transform="skewY(-21.8)" style={{ transformOrigin: "262px 94px" }} />
        <g transform="rotate(-7 210 196)">
            <rect x="184" y="174" width="52" height="40" rx="3" />
            <text x="204" y="201" className="v1g-lbl" style={{ fontSize: 17 }}>?</text>
        </g>
        <g transform="rotate(6 270 192)">
            <rect x="246" y="170" width="50" height="40" rx="3" className="v1g-acc" />
            <text x="265" y="197" className="v1g-lbl v1g-accf" style={{ fontSize: 17 }}>?</text>
        </g>
    </>}</Svg>
);

export const glyphFor: Record<string, () => JSX.Element> = {
    "Assessments": Assessments,
    "Handwritten grading": Grading,
    "Amigo": Amigo,
    "PDF → question bank": PdfBank,
    "Homework": Homework,
    "PupilRevise": Revise,
};

const css = `
.v1g-acc { stroke: var(--v1-acc, currentColor); }
.v1g-accf { fill: var(--v1-acc, currentColor); stroke: none; }
.v1g-lbl { fill: currentColor; stroke: none; font-size: 10px; font-weight: 800; letter-spacing: .1em; font-family: Manrope, ui-sans-serif, sans-serif; }
.v1g-lbl.v1g-accf { fill: var(--v1-acc, currentColor); }
.v1g-slide { animation: v1g-slide 5s cubic-bezier(.3,.7,.3,1) infinite; }
@keyframes v1g-slide { 0%, 12% { transform: translate(-38px, -6px) scale(.4); opacity: 0; } 20% { opacity: 1; } 42%, 88% { transform: none; opacity: 1; } 100% { transform: none; opacity: 0; } }
.v1g-slide, .v1g-bar, .v1g-pulse, .v1g-fly { transform-box: fill-box; transform-origin: center; }
.v1g-scan { animation: v1g-scan 4.5s ease-in-out infinite; }
@keyframes v1g-scan { 0% { transform: none; opacity: 0; } 6% { opacity: 1; } 40% { transform: translateY(126px); opacity: 1; } 48%, 100% { transform: translateY(126px); opacity: 0; } }
.v1g-mark, .v1g-tick { stroke-dasharray: 1; }
.v1g-mark { animation: v1g-mark 4.5s ease-out infinite; }
@keyframes v1g-mark { 0%, 42% { stroke-dashoffset: 1; opacity: 1; } 56%, 90% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 0; } }
.v1g-bar { animation: v1g-bar 3s ease-in-out infinite; }
@keyframes v1g-bar { 0%, 100% { transform: scaleY(1); } 25% { transform: scaleY(.45); } 50% { transform: scaleY(1.25); } 75% { transform: scaleY(.7); } }
.v1g-fly { animation: v1g-fly 5s ease-in-out infinite; }
@keyframes v1g-fly { 0% { transform: translate(-100px, -4px) rotate(-20deg) scale(.6); opacity: 0; } 10% { opacity: 1; } 45% { transform: translate(-46px, -48px) rotate(-6deg); } 70% { transform: none; opacity: 1; } 84%, 100% { transform: translate(-6px, 34px) rotate(0); opacity: 0; } }
.v1g-pulse { animation: v1g-pulse 3s ease-out infinite; }
@keyframes v1g-pulse { 0% { transform: scale(1); opacity: .9; } 60%, 100% { transform: scale(3.2); opacity: 0; } }
.v1g-tick { animation: v1g-tick 5s ease-in-out infinite both; }
@keyframes v1g-tick { 0%, 8% { stroke-dashoffset: 1; opacity: 1; } 22%, 86% { stroke-dashoffset: 0; opacity: 1; } 96%, 100% { stroke-dashoffset: 0; opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .v1g-slide, .v1g-scan, .v1g-mark, .v1g-bar, .v1g-fly, .v1g-tick { animation: none; }
  .v1g-scan, .v1g-pulse { display: none; }
}`;
