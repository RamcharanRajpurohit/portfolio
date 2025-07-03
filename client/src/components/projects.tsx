import projects from "../data/project_data";
function Projects() {
  return (
    <section className=" mx-auto px-4 sm:px-6 lg:px-10 py-12 bg-base border-b border-stroke ">
      <div className="text-center mb-12">
        <h3 className="text-5xl font-bold text-base mb-4">My Projects</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2  gap-8">
        {projects.map((project) => (
          <div 
            key={project.title} 
            className="bg-base rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-stroke"
          >
            {/* Project Image */}
            <div className="relative h-48 overflow-hidden">
              <img 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                src="https://media.istockphoto.com/id/1467597986/photo/professionally-landscaped-garden-flower-bed.jpg?s=2048x2048&w=is&k=20&c=EkSeVR74NXBQAgY7xgrUt27JP1sIJk51L3vUKT7RmvQ="
                alt={`${project.title} screenshot`}
                loading="lazy"
              />
            </div>
            
            {/* Project Content */}
            <div className="p-6">
              {/* Project Header */}
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-bold text-base flex-1">
                  {project.title}
                </h4>
                <span className="text-sm text-base ml-4 whitespace-nowrap">
                  {project.project_duration}
                </span>
              </div>
              
              {/* Project Description */}
              <div className="mb-4">
                {project.description.map((desc, index) => (
                  <p key={index} className="text-base text-sm mb-2 leading-relaxed">
                    {desc}
                  </p>
                ))}
              </div>
              
              {/* Tech Stack */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-base mb-2">
                  Technologies Used:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack.map((tech, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-blue-100 bg-secondary text-xs font-medium rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-start mt-4 pt-5 border-t">
                <a className="text-md  text-highlight  text-base  flex-1" href={project.github_repo}>
                  Github Repo
                </a>
                <a className={`text-md text-highlight text-base ${project.web_url==""? "hidden":"flex"} `} href={project.web_url}>
                  Live Demo
                </a>
                
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Projects;