import experiences, { achievements } from "../data/experience_data";

function Experience() {
    return (
        <section
            id="experience"
            className="mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-base border-b border-stroke max-w-6xl scroll-mt-16"
        >
            {/* Section Header */}
            <div className="text-center mb-16">
                <h3 className="text-3xl sm:text-4xl font-bold text-base mb-2">
                    Experience
                </h3>
                <div className="w-20 h-1 bg-highlight mx-auto"></div>
            </div>

            {/* Experience Cards */}
            <div className="space-y-8">
                {experiences.map((exp, index) => (
                    <article
                        key={index}
                        className="bg-base rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-stroke group max-w-4xl mx-auto"
                    >
                        <div className="p-6 space-y-4">
                            {/* Experience Header */}
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                <div>
                                    <h4 className="text-xl font-bold text-highlight">
                                        {exp.title}
                                    </h4>
                                    <a
                                        href={exp.companyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-lg font-medium text-base hover:text-highlight transition-colors duration-200"
                                    >
                                        {exp.company} ↗
                                    </a>
                                </div>
                                <span className="inline-flex items-center px-3 py-1 bg-highlight/20 text-highlight text-sm font-medium rounded-full whitespace-nowrap">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                    {exp.duration}
                                </span>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                {exp.description.map((desc, descIndex) => (
                                    <p key={descIndex} className="text-base text-sm leading-relaxed opacity-80">
                                        • {desc}
                                    </p>
                                ))}
                            </div>

                            {/* Projects */}
                            <div className="pt-4">
                                <h5 className="text-base font-semibold text-base mb-3 opacity-90">
                                    Projects Worked On
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {exp.projects.map((project, projIndex) => (
                                        <div
                                            key={projIndex}
                                            className="p-4 rounded-lg border-2 border-stroke hover:border-highlight transition-all duration-200 bg-base"
                                        >
                                            <h6 className="font-semibold text-highlight text-base mb-2">
                                                {project.name}
                                            </h6>
                                            <p className="text-sm text-base opacity-80 leading-relaxed">
                                                {project.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tech Stack */}
                            <div className="pt-4 border-t border-stroke">
                                <h5 className="text-sm font-semibold text-base mb-3 opacity-80">
                                    Technologies Used
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {exp.tech_stack.map((tech, techIndex) => (
                                        <span
                                            key={techIndex}
                                            className="px-3 py-1.5 text-xs font-medium rounded-full text-base border border-stroke hover:border-highlight hover:text-highlight transition-colors duration-200"
                                        >
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            {/* Achievements Section */}
            {achievements.length > 0 && (
                <div className="mt-16">
                    <div className="text-center mb-10">
                        <h4 className="text-2xl sm:text-3xl font-bold text-base mb-2">
                            Achievements & Programs
                        </h4>
                        <div className="w-16 h-1 bg-highlight mx-auto"></div>
                    </div>

                    <div className="space-y-6">
                        {achievements.map((achievement, index) => (
                            <article
                                key={index}
                                className="bg-base rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-stroke group max-w-4xl mx-auto"
                            >
                                <div className="p-6 space-y-4">
                                    {/* Achievement Header */}
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                        <div>
                                            <h5 className="text-xl font-bold text-highlight">
                                                {achievement.title}
                                            </h5>
                                            <p className="text-lg font-medium text-base opacity-80">
                                                {achievement.organization}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center px-3 py-1 bg-amber-500/20 text-amber-500 text-sm font-medium rounded-full whitespace-nowrap">
                                            🏆 {achievement.year}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2">
                                        {achievement.description.map((desc, descIndex) => (
                                            <p key={descIndex} className="text-base text-sm leading-relaxed opacity-80">
                                                • {desc}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default Experience;
