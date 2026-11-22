// Verbatim from public/Ramcharan_Resume.pdf (source: resume/Ramcharan_Resume.tex). **bold** and [label](href) are rendered by components/resume.tsx.
export interface Entry { head: string; right?: string; sub?: string; place?: string; points?: string[] }

export const resume: { name: string; contact: string[]; sections: { title: string; items: Entry[] | string[] }[] } = {
    name: "Ramcharan Rajpurohit",
    contact: [
        "+91-9680103852 | [ramcharanrajpurohit@gmail.com](mailto:ramcharanrajpurohit@gmail.com) | [b23ci1032@iitj.ac.in](mailto:b23ci1032@iitj.ac.in)",
        "[GitHub](https://github.com/RamcharanRajpurohit) | [LinkedIn](https://www.linkedin.com/in/ramcharan-rajpurohit-1314b7289/) | [Website](https://rajpurohit.me/) | [Codolio](https://codolio.com/profile/RamcharanRajpurohit)",
    ],
    sections: [
        { title: "Education", items: [{ head: "**IIT Jodhpur**", right: "Sep 2023 – May 2027", sub: "Bachelor of Technology", place: "Jodhpur, Rajasthan" }] },
        { title: "Work Experience", items: [
            {
                head: "**Lead AI Engineer at PowersMy.biz**", right: "Oct 2026 – Present",
                points: [
                    "**Product Ownership:** promoted to lead the AI behind PupilTree’s exam, homework and revision platform; owned homework end to end (AI-written questions, PDF/photo import, AI marking, live updates).",
                    "**Revision AI (PupilRevise):** designed a revision pipeline where a teacher picks what was taught and AI writes the cheat sheet and the questions.",
                    "**Agentic Engineering:** architected a team of specialist AI agents (Flutter, backend, AI service, reviewer, scout, browser tester) that check each other’s changes and prove them in a real browser, running across parallel **Claude Code** accounts to ship features at once.",
                    "**Test Automation:** built parallel **Playwright** AI testers that walk every teacher and student journey on phone, tablet and desktop.",
                ],
            },
            {
                head: "**AI Engineering Intern at PowersMy.biz**", right: "Nov 2025 – Sep 2026",
                points: [
                    "Built a production AI assessment platform for JEE and NEET coaching institutes serving **1,000+ concurrent exam-takers** (FastAPI, LangGraph, React, Flutter, MongoDB, Redis, GCP).",
                    "**Agentic AI (Amigo):** architected a student-facing AI companion on LangGraph, where a supervisor graph routes to **5 specialist agents** over **18 scoped tools**, with a LiveKit voice pipeline for code-switching Hindi and English speech, streaming synthesis, and barge-in handling.",
                    "**AI Safety & Access Control:** gated every agent data access behind a **scope-checked broker** with an append-only audit ledger, screening each turn with PII tokenisation and a fail-closed risk classifier.",
                    "**Multimodal AI:** engineered an evaluation pipeline using vision models to grade handwritten subjective answers across 8 question formats and identify learning gaps.",
                    "**Document AI:** shipped a pipeline turning exam PDFs into a structured question bank, running **Mistral OCR** and a **DocLayout-YOLO** figure detector in parallel with per-subject Gemini extraction.",
                    "**Backend & Cloud:** optimized high-concurrency exam APIs (Redis caching, atomic MongoDB operations, off-thread bcrypt), designed an asynchronous grading queue across 2 services, and led GCP deployment on Cloud Run with auto-scaling for exam-day traffic spikes.",
                ],
            },
        ] },
        { title: "Projects", items: [
            {
                head: "**DyPol** – Engineering Activity & Insights", right: "[Live Site](https://www.dypol.dev/) | [GitHub](https://github.com/RamcharanRajpurohit/DyPol)",
                points: [
                    "Built a platform to track engineering activity across teams and projects, generating weekly reports, contributor insights, PR tracking, and stalled-work alerts from GitHub data.",
                    "Developed a natural-language engineering assistant with LangGraph agents, Chroma and MongoDB vector embeddings, and GitHub REST and GraphQL APIs, with tool scoping, delegation limits, and cost tracking.",
                ],
            },
            {
                head: "**DSA Visualizer** – Interactive Algorithm Learning Platform", right: "[Live Site](https://algolab.rajpurohit.me/) | [GitHub](https://github.com/RamcharanRajpurohit/DSAVisualizer)",
                points: [
                    "Developed a framework-free algorithm visualizer in raw ES6 and HTML5 Canvas, animating 15+ sorting, graph, and tree algorithms on a class-based OOP engine where each algorithm is a plug-in subclass, with frame-by-frame controls for recursion tracing and backward stepping.",
                ],
            },
        ] },
        { title: "Technical Skills", items: [
            "**AI/ML & GenAI:** LangGraph, LangChain, Multi-Agent Systems, Gemini API, OpenAI API, Claude API, Vision Models, OCR, RAG, Realtime Voice Agents (LiveKit, STT, TTS), Prompt Engineering",
            "**Agentic Engineering:** Claude Code, Specialist Subagents, Skills, MCP, AI Code Review, Parallel Agents",
            "**Programming Languages:** C++, C, Python, JavaScript, TypeScript, Dart",
            "**Frontend Development:** React.js, Next.js, HTML5, CSS3, TailwindCSS, Redux, Flutter",
            "**Backend Development:** Node.js, Express.js, FastAPI, REST APIs, GraphQL, WebSockets, SSE Streaming, WebRTC, JWT, OAuth 2.0, MongoDB, Redis",
            "**Cloud, Testing & Tools:** GCP (Cloud Run, Cloud Tasks), Docker, GitHub Actions, CI/CD, Playwright, Pytest, Sentry, Git, Linux, Vercel",
        ] },
        { title: "Achievements", items: [
            "Authored a **Linux kernel** patch merged into mainline, fixing a broken mic-mute LED on a personal HP laptop after root-causing the missing audio driver quirk. [Commit](https://github.com/torvalds/linux/commit/f56521ab6f76faeaa5a524320898835454e3bc31)",
            "Achieved **2nd District Rank** in Class 12 RBSE Board Exams with a 98.20% aggregate.",
        ] },
        { title: "Leadership", items: [
            "Core Member, Dramatics Society (**Dramebazz**), IIT Jodhpur; coordinated events and creative direction, and directed stage productions at **Inter IIT Cultural Meet 7.0**.",
        ] },
    ],
};
