import projects from "../data/project_data";
import { useState } from "react";

function Projects() {
  const [showAll, setShowAll] = useState(false);
  const displayedProjects = showAll ? projects : projects.slice(0, 2);

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

      {/* Projects Grid */}
      <div className="grid grid-cols-1 gap-6">
        {displayedProjects.map((project) => (
          <article 
            key={project.title} 
            className="bg-base rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-stroke group max-w-2xl mx-auto"
          >
            {/* Project Image */}
            <div className="relative h-40 overflow-hidden">
              <img 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                src={project.image_url}
                alt={`${project.title} screenshot`}
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            
            {/* Project Content */}
            <div className="p-5 space-y-3">
              {/* Project Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                <h4 className="text-lg font-bold text-base">
                  {project.title}
                </h4>
                <span className="text-xs text-base opacity-60 whitespace-nowrap">
                  {project.project_duration}
                </span>
              </div>
              
              {/* Project Description */}
              <div className="space-y-1">
                {project.description.map((desc, index) => (
                  <p key={index} className="text-base text-xs leading-relaxed opacity-80">
                    {desc}
                  </p>
                ))}
              </div>
              
              {/* Tech Stack */}
              <div className="pt-1">
                <h5 className="text-xs font-semibold text-base mb-2 opacity-70">
                  Tech Stack
                </h5>
                <div className="flex flex-wrap gap-1">
                  {project.tech_stack.map((tech, index) => (
                    <span 
                      key={index}
                      className="px-2 py-0.5 bg-secondary text-xs font-medium rounded-md text-base border border-stroke/30 hover:border-highlight/50 transition-colors duration-200"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Project Links */}
              <div className="flex gap-2 pt-3 border-t border-stroke/30">
                <a 
                  className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-highlight border border-highlight rounded-md hover:bg-highlight hover:text-base transition-all duration-200 transform hover:scale-105" 
                  href={project.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
                {project.web_url && (
                  <a 
                    className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-base bg-highlight rounded-md hover:bg-highlight/80 hover:shadow-md transition-all duration-200 transform hover:scale-105" 
                    href={project.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* See All Projects Button */}
      {!showAll && projects.length > 2 && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(true)}
            className="px-6 py-3 text-sm font-medium text-highlight border-2 border-highlight rounded-lg hover:bg-highlight hover:text-base transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            See All Projects ({projects.length - 2} more)
          </button>
        </div>
      )}

      {/* Show Less Button */}
      {showAll && (
        <div className="text-center mt-8">
          <button
            onClick={() => setShowAll(false)}
            className="px-6 py-3 text-sm font-medium text-base bg-highlight rounded-lg hover:bg-highlight/80 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            Show Less
          </button>
        </div>
      )}
    </section>
  );
}

export default Projects;