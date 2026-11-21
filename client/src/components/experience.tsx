import { achievements } from "../data/experience_data";
import { SectionHead } from "./ui";
import Story from "./exp/V1";

function Experience() {
    return (
        <section id="experience" className="scroll-mt-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28">
                <SectionHead n="02" title="Experience" />
            </div>
            <Story />
            <div className="mx-auto px-4 sm:px-6 lg:px-8 pb-20 max-w-5xl">
            {achievements.length > 0 && (
                <div className="mt-24">
                    <SectionHead n="02·b" title="Achievements & Programs" />

                    <div className="grid gap-5 md:grid-cols-2">
                        {achievements.map((achievement, index) => (
                            <article key={index} className="reveal plate p-8 flex flex-col gap-4 text-heading">
                                <div className="flex justify-between gap-3 eyebrow text-paragraph">
                                    <span>{achievement.organization}</span>
                                    <span className="text-tertiary">{achievement.year}</span>
                                </div>
                                <h5 className="text-2xl font-bold tracking-[-0.03em]">{achievement.title}</h5>
                                <ul className="space-y-2">
                                    {achievement.description.map((desc, descIndex) => (
                                        <li key={descIndex} className="text-sm leading-relaxed text-paragraph">{desc}</li>
                                    ))}
                                </ul>
                                {achievement.link && (
                                    <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="pill-dark self-start mt-auto">
                                        {achievement.linkLabel || "View"} ↗
                                    </a>
                                )}
                            </article>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </section>
    );
}

export default Experience;
