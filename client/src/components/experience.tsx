import { achievements } from "../data/experience_data";
import { SectionHead } from "./ui";
import V1 from "./exp/V1";
import V4 from "./exp/V4";

// Comparing experience stories: ?exp=1 or 4 (temporary switcher, removed once one is picked).
const versions = { "1": V1, "4": V4 };
const pick = (typeof location !== "undefined" && new URLSearchParams(location.search).get("exp")) || "1";

function Experience() {
    const Story = versions[pick as keyof typeof versions] ?? V1;
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
            <nav className="fixed bottom-4 left-4 z-50 flex gap-1 p-1 rounded-full bg-btnp/80 backdrop-blur border border-stroke/20 shadow-lg text-xs font-semibold" aria-label="Experience version">
                {Object.keys(versions).map((v) => (
                    <a key={v} href={`?exp=${v}#experience`} className={`px-3 py-1.5 rounded-full ${v === pick ? "bg-primary text-btn" : "text-heading"}`}>v{v}</a>
                ))}
            </nav>
        </section>
    );
}

export default Experience;
