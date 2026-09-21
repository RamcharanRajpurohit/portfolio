import projects from "../data/project_data";
import { useState } from "react";
import { Github, ExternalLink } from "lucide-react";

const PREVIEW_COUNT = 2;

function Projects() {
  const [showAll, setShowAll] = useState(false);
  const displayedProjects = showAll ? projects : projects.slice(0, PREVIEW_COUNT);
  const hasMore = projects.length > PREVIEW_COUNT;

  return (
    <section
      id="projects"
      className="mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-base border-b border-stroke max-w-6xl scroll-mt-16"
    >
      {/* Section Header */}
      <div className="text-center mb-16">
        <h3 className="text-3xl sm:text-4xl font-bold text-base mb-2">
          My Projects
        </h3>
        <div className="w-20 h-1 bg-highlight mx-auto"></div>
      </div>

      {/* Projects Grid — two columns on large screens like the reference design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {displayedProjects.map((project) => (
          <article
            key={project.title}
            className="group flex flex-col rounded-lg border border-stroke bg-base p-6 sm:p-7 shadow-md transition-all duration-300 hover:border-highlight hover:shadow-lg hover:-translate-y-0.5"
          >
            {/* Title + Subtitle */}
            <h4 className="text-2xl font-bold tracking-wide uppercase text-heading">
              {project.title}
            </h4>
            <p className="mt-1 text-sm text-paragraph">{project.subtitle}</p>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-paragraph">
              {project.description}
            </p>

            {/* Highlights (metric bullets) */}
            <ul className="mt-4 space-y-1.5">
              {project.highlights.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-xs font-mono text-base opacity-80"
                >
                  <span className="text-highlight">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {/* Tech Stack chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tech_stack.map((tech, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-xs font-mono tracking-wide bg-secondary border border-stroke/30 rounded-md text-base transition-colors duration-200 group-hover:border-highlight/50"
                >
                  {tech}
                </span>
              ))}
            </div>

            {/* Links */}
            <div className="mt-6 pt-4 border-t border-stroke flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-stroke rounded-md text-base transition-colors duration-200 hover:border-highlight hover:text-highlight"
                href={project.github_repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={14} />
                GitHub
              </a>
              {project.web_url && (
                <a
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-highlight/60 rounded-md text-highlight transition-colors duration-200 hover:bg-highlight hover:text-base"
                  href={project.web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} />
                  Live Demo
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* See All Projects Button */}
      {!showAll && hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-3 text-sm font-medium text-highlight border-2 border-highlight rounded-lg hover:bg-highlight hover:text-base transition-all duration-300 hover:shadow-lg"
          >
            See All Projects ({projects.length - PREVIEW_COUNT} more)
          </button>
        </div>
      )}

      {/* Show Less Button */}
      {showAll && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(false)}
            className="px-6 py-3 text-sm font-medium text-base bg-highlight rounded-lg hover:bg-highlight/80 transition-all duration-300 hover:shadow-lg"
          >
            Show Less
          </button>
        </div>
      )}
    </section>
  );
}

export default Projects;
