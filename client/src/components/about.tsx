import { SectionHead } from "./ui";

const skills: [string, string[]][] = [
    ["AI, ML & GenAI", ["LangGraph", "LangChain", "Multi-Agent Systems", "Gemini API", "OpenAI API", "Claude API", "Vision Models", "OCR", "Realtime Voice Agents (LiveKit)", "STT / TTS", "RAG & Embeddings", "Prompt Engineering", "LangSmith"]],
    ["Agentic Engineering", ["Claude Code", "Specialist Subagents", "Skills", "MCP", "AI Code Review", "Parallel Agent Workflows"]],
    ["Programming Languages", ["Python", "TypeScript", "JavaScript", "Dart", "C++", "C"]],
    ["Frontend Development", ["Flutter", "Bloc", "React.js", "Next.js", "Redux", "Tailwind CSS", "Framer Motion", "HTML5", "CSS3"]],
    ["Backend Development", ["FastAPI", "Node.js", "Express.js", "REST APIs", "GraphQL", "WebSockets", "Socket.IO", "SSE Streaming", "WebRTC", "JWT", "OAuth 2.0", "Pydantic", "MongoDB", "Redis"]],
    ["Testing", ["Pytest", "Playwright", "Flutter Widget & Integration Tests"]],
    ["Cloud & Tools", ["GCP (Cloud Run, Cloud Tasks, Storage)", "Firebase", "Docker", "GitHub Actions", "Sentry", "OpenTelemetry", "PostHog", "Git", "Linux", "Postman", "Vercel"]],
];

function About() {
    return (
        <section id="about" className="reveal px-4 py-20 sm:py-28 scroll-mt-16 text-base">
            <div className="max-w-screen-lg mx-auto">
                <SectionHead n="01" title="About Me" sub="Currently, a final-year B.Tech student at IIT Jodhpur. I build AI products using LLMs and computer vision, working on both user-facing features and the backend APIs behind them, and I get them running reliably in production." />

                {/* Grid container with proper responsive behavior */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-flow-row-dense gap-5 w-full text-heading">

                    {/* Education Card */}
                    <div className="plate p-8 flex flex-col">
                        <h4 className="eyebrow mb-4 text-paragraph">Education</h4>
                        <div className="space-y-4">
                            <div className="border-b border-stroke/15 pb-3">
                                <p className="font-medium">B.Tech (2023-2027)</p>
                                <p className="text-sm opacity-80">IIT Jodhpur</p>
                                <p className="text-sm">CGPA: 7.24</p>
                            </div>
                            <div className="border-b border-stroke/15 pb-3">
                                <p className="font-medium">12th (2022)</p>
                                <p className="text-sm opacity-80">Madhuram Vidhya Mandir</p>
                                <p className="text-sm">98.20%</p>
                            </div>
                            <div>
                                <p className="font-medium">10th (2020)</p>
                                <p className="text-sm opacity-80">Madhuram Vidhya Mandir</p>
                                <p className="text-sm">92.67%</p>
                            </div>
                        </div>
                    </div>

                    {/* Skills Card: groups as on my resume, plus the agent work */}
                    <div className="plate p-8 md:col-span-2 lg:row-span-2">
                        <h4 className="eyebrow mb-4 text-paragraph">Technical Skills</h4>
                        <div className="space-y-4">
                            {skills.map(([group, items]) => (
                                <div key={group}>
                                    <p className="eyebrow !text-[10px] mb-2 text-paragraph">{group}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {items.map((skill) => (
                                            <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium border border-stroke/20 hover:bg-primary hover:text-btn transition-colors duration-200">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="plate p-8">
                        <h4 className="eyebrow mb-4 text-paragraph">Contact</h4>
                        <div className="space-y-2">
                            <p className="break-all">
                                <span className="font-medium">Phone:</span> +91 9680103852
                            </p>
                            <p className="break-all">
                                <span className="font-medium">Email:</span> ramcharanrajpurohit@gmail.com
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default About;







