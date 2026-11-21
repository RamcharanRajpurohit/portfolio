import type React from "react";

/** Engraved cloud bank (drifting, tiles seamlessly) over painted hills, pinned to the bottom of its parent. */
export function Scenery({ hills = true, className = "", children }: { hills?: boolean; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`scenery pointer-events-none absolute inset-x-0 bottom-0 ${className}`}>
      <div className="clouds" aria-hidden="true" />
      {hills && <img src="/art/hills.webp" alt="" aria-hidden="true" className="hills" />}
      {children}
    </div>
  );
}

/** Numbered chapter heading, e.g. (02) Where I've worked. */
export function SectionHead({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="text-center mb-12 sm:mb-16">
      <span className="inline-grid place-items-center w-8 h-8 rounded-full border border-stroke/30 text-[11px] font-semibold text-paragraph">
        {n}
      </span>
      <h3 className="mt-4 text-4xl sm:text-5xl font-bold tracking-[-0.04em] text-heading">{title}</h3>
      {sub && <p className="mt-4 max-w-2xl mx-auto text-paragraph leading-relaxed">{sub}</p>}
    </div>
  );
}
