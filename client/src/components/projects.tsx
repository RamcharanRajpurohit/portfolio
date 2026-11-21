import projects from "../data/project_data";
import { lazy, Suspense, useState } from "react";
import { Github, ExternalLink } from "lucide-react";
import { SectionHead } from "./ui";

const PREVIEW_COUNT = 2;
// "See all": four ways to browse, the visitor picks one (remembered; ?proj=crate|deck|desk|vending)
const views = { crate: lazy(() => import("./proj/Crate")), deck: lazy(() => import("./proj/Deck")), desk: lazy(() => import("./proj/Desk")), vending: lazy(() => import("./proj/Vending")) };
type View = keyof typeof views;

function Projects() {
  const [showAll, setShowAll] = useState(false);
  const [view, setView] = useState<View>(() => {
    let v = new URLSearchParams(location.search).get("proj");
    try { v ??= localStorage.getItem("proj-view"); } catch { /* storage blocked */ }
    return v && v in views ? (v as View) : "crate";
  });
  const pick = (v: View) => { setView(v); try { localStorage.setItem("proj-view", v); } catch { /* this visit only */ } };
  const All = views[view];
  const hasMore = projects.length > PREVIEW_COUNT;

  return (
    <section id="projects" className="mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 max-w-6xl scroll-mt-16">
      <SectionHead n="03" title="My Projects" />

      {showAll ? (
        <>
          <nav aria-label="Browse projects as" className="mb-8 flex flex-wrap justify-center gap-2">
            {(Object.keys(views) as View[]).map((v) => (
              <button key={v} onClick={() => pick(v)} aria-pressed={v === view} className={`capitalize ${v === view ? "pill-dark" : "pill-light"}`}>{v}</button>
            ))}
          </nav>
          <Suspense fallback={<div className="h-[70vh]" />}><All /></Suspense>
        </>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.slice(0, PREVIEW_COUNT).map((project, i) => (
          <article key={project.title} className="reveal card flex flex-col p-6 sm:p-8 text-heading transition-transform duration-300 hover:-translate-y-1">
            <p className="eyebrow text-paragraph">
              {String(i + 1).padStart(2, "0")} · {project.subtitle}
            </p>
            <h4 className="mt-3 text-4xl font-bold tracking-[-0.04em]">{project.title}</h4>
            <p className="mt-4 text-sm leading-relaxed text-paragraph">{project.description}</p>

            <ul className="mt-5 border-t border-stroke/15">
              {project.highlights.map((point, index) => (
                <li key={index} className="py-2 border-b border-stroke/15 text-sm text-center">
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.tech_stack.slice(0, 5).map((tech, index) => (
                <span key={index} className="px-3 py-1 text-xs font-medium rounded-full border border-stroke/20">
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-auto pt-7 grid grid-cols-2 gap-3">
              <a className={`pill-light ${project.web_url ? "" : "col-span-2"}`} href={project.github_repo} target="_blank" rel="noopener noreferrer">
                <Github size={16} /> GitHub
              </a>
              {project.web_url && (
                <a className="pill-dark" href={project.web_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} /> Live demo
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      )}

      {hasMore && (
        <div className="text-center mt-10">
          <button onClick={() => setShowAll((s) => !s)} className="pill-dark">
            {showAll ? "Show less" : `See all projects (${projects.length - PREVIEW_COUNT} more)`}
          </button>
        </div>
      )}
    </section>
  );
}

export default Projects;
