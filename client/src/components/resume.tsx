import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { resume, type Entry } from "../data/resume_data";

// **bold** and [label](href) inside the resume strings
const rich = (s: string) => s.split(/(\*\*.+?\*\*|\[.+?\]\(.+?\))/).map((p, i) => {
  const link = p.match(/^\[(.+)\]\((.+)\)$/);
  if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-semibold text-highlight underline underline-offset-2">{link[1]}</a>;
  return p.startsWith("**") ? <b key={i} className="text-heading">{p.slice(2, -2)}</b> : p;
});

const bullets = (points: string[], dot: string) => (
  <ul className={`mt-1.5 first:mt-0 space-y-1 pl-5 ${dot}`}>{points.map((p) => <li key={p}>{rich(p)}</li>)}</ul>
);

// The resume as a sheet over the page, opened by any link to #resume; back, Esc or × closes it.
function Resume() {
  const [open, setOpen] = useState(() => location.hash === "#resume");
  const pushed = useRef(false);

  useEffect(() => {
    const onHash = () => { pushed.current = location.hash === "#resume"; setOpen(pushed.current); };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const close = () => {
    if (pushed.current) return history.back();
    history.replaceState(null, "", location.pathname + location.search);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.body.style.overflow = "hidden";
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", onKey); };
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Resume" onClick={(e) => e.target === e.currentTarget && close()}
         className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-base/80 backdrop-blur-sm sm:px-4">
      <article className="card relative mx-auto max-w-[800px] min-h-full rounded-none sm:min-h-0 sm:my-8 sm:rounded-2xl px-5 py-6 sm:px-12 sm:py-10 text-sm leading-relaxed text-paragraph">
        <div className="sticky top-0 z-10 -mt-6 sm:-mt-10 py-3 sm:pt-6 flex justify-end gap-2 bg-secondary bg-[url(/art/paper.webp)] bg-[length:512px] bg-blend-overlay border-b border-stroke/15">
          <a href="/Ramcharan_Resume.pdf" download className="pill-dark !px-4 !py-2"><Download size={16} aria-hidden="true" /> Download PDF</a>
          <button onClick={close} autoFocus aria-label="Close resume"
                  className="grid place-items-center w-10 h-10 rounded-full bg-btnp border border-stroke/15 text-heading shadow-sm"><X size={18} /></button>
        </div>

        <header className="pt-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.04em] text-heading">{resume.name}</h2>
          {resume.contact.map((line) => <p key={line} className="mt-1 text-xs sm:text-sm break-words">{rich(line)}</p>)}
        </header>

        {resume.sections.map(({ title, items }) => (
          <section key={title} className="mt-7">
            <h3 className="eyebrow text-heading">{title}</h3>
            <div className="ruler text-heading mt-1 mb-3" />
            {typeof items[0] === "string" ? bullets(items as string[], "list-disc") : (items as Entry[]).map((it) => (
              <div key={it.head} className="mt-3 first:mt-0">
                <div className="flex flex-wrap justify-between gap-x-4">
                  <p className="text-heading">{rich(it.head)}</p>
                  {it.right && <p className="text-xs italic tabular-nums self-center">{rich(it.right)}</p>}
                </div>
                {it.sub && <div className="flex flex-wrap justify-between gap-x-4 text-xs"><i>{it.sub}</i><span>{it.place}</span></div>}
                {it.points && bullets(it.points, "list-[circle]")}
              </div>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
export default Resume;
