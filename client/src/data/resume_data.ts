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
                head: "**AI Engineer at PowersMy.biz**", right: "Oct 2026 – Present",
                points: [
                    "**Digital Homework:** built Classroom-style homework where teachers assign AI questions, PDFs or learning modes and grade with AI, and students get marks, feedback, notifications and deadline reminders.",
                    "**Revision & Remedy:** teachers generate a cheat sheet and questions from the periods they taught, and students attempt them, get **remedial practice** where they fall short, and keep notes per chapter.",
                    "**Learning Modes:** shipped 11 per lesson (Reading, Writing, Solving, Games, Podcast, **WriteBoard** AI whiteboard), with **40 learning signals** and **Elo mastery** suggesting the mode that works per class.",
                    "**Agentic Dev & QA:** specialist **Claude Code** agents own Flutter, backend, AI and DB work, and **Playwright** testers catch bugs and latency before production, with per-call AI cost tracking.",
                ],
            },
            {
                head: "**AI Engineering Intern at PowersMy.biz**", right: "Nov 2025 – Sep 2026",
                points: [
                    "Owned an AI assessment platform from zero to production, now part of the daily study routine of 1,000+ students preparing for JEE, NEET, KCET, and board exams.",
                    "**Handwritten Evaluation:** engineered a vision-based grader that awards step-wise partial marks against teachers’ model solutions and explains each mark, cutting result turnaround from 3 to 4 days of manual checking to under 5 minutes.",
                    "**Question Generation:** designed a pipeline assembling papers from generative, syllabus, PYQ, and bank sources into competitive, school, or custom patterns, plus a PDF importer (Mistral OCR, DocLayout-YOLO, Gemini) that digitizes full 180-question sets with diagrams intact.",
                    "**Agentic AI (Amigo):** architected a conversational companion where a LangGraph supervisor routes 5 specialist agents over 18 scoped tools, serving text chat and LiveKit voice in Hindi and English.",
                    "**Distributed Systems:** split evaluation into an asynchronous queue across 2 services that returns objective scores instantly while subjective responses are processed in the background.",
                    "**Cloud & DevOps:** led GCP deployment on Cloud Run with a VPC connector, autoscaling, and concurrency tuning to absorb traffic spikes, shipped through GitHub Actions pipelines.",
                ],
            },
        ] },
        { title: "Projects", items: [
            {
                head: "**DyPol:** Engineering Activity & Insights", right: "[Live Site](https://www.dypol.dev/) | [GitHub](https://github.com/RamcharanRajpurohit/DyPol)",
                points: [
                    "Built a platform to track engineering activity across teams and projects, generating weekly reports, contributor insights, PR tracking, and stalled-work alerts from GitHub data.",
                    "Developed a natural-language engineering assistant using LangGraph orchestration, specialized agents, vector embeddings with Chroma and MongoDB, and GitHub REST and GraphQL APIs, with tool scoping, delegation limits, and cost tracking.",
                ],
            },
            {
                head: "**AlgoLab (DSA Visualizer):** Interactive Algorithm Learning Platform", right: "[Live Site](https://algolab.rajpurohit.me/) | [GitHub](https://github.com/RamcharanRajpurohit/DSAVisualizer)",
                points: [
                    "Developed an interactive algorithm learning platform in **Next.js** and TypeScript that animates 40+ algorithms step by step across sorting, stacks and queues, linked lists, heaps, BST, AVL, B-trees and graphs.",
                    "Built playback with pause, step back and scrub, live pseudocode and variables, an explanation for every step, quizzes and a sorting race mode.",
                ],
            },
        ] },
        { title: "Achievements", items: [
            "Authored a **Linux kernel** patch merged into mainline, fixing a broken mic-mute LED on a personal HP laptop after root-causing the missing audio driver quirk. [Commit](https://github.com/torvalds/linux/commit/f56521ab6f76faeaa5a524320898835454e3bc31)",
            "Selected for **Amazon Summer School 2025**.",
            "Ranked **1st of 150** in IIT Jodhpur’s AI Chess Tournament, unbeaten in 300 games as white and black.",
            "Achieved **2nd District Rank** in Class 12 RBSE Board Exams with a 98.20% aggregate.",
        ] },
        { title: "Technical Skills", items: [
            "**AI/ML & GenAI:** LangGraph, LangChain, Multi-Agent Systems, Gemini API, OpenAI API, Claude API, Vision Models, OCR, RAG, Realtime Voice Agents (LiveKit, STT, TTS), LLM Evals, Batch API",
            "**Agentic Engineering:** Claude Code (Subagents, Skills), MCP, AI Code Review, Parallel Agents",
            "**Programming Languages:** C++, C, Python, JavaScript, TypeScript, Dart",
            "**Frontend Development:** React.js, Next.js, TailwindCSS, Flutter",
            "**Backend Development:** Node.js, FastAPI, GraphQL, WebSockets, SSE Streaming, MongoDB, Redis",
            "**Cloud & Testing:** GCP Cloud Run, Docker, GitHub Actions (CI/CD), Playwright, Pytest, Sentry, Linux",
        ] },
        { title: "Leadership", items: [
            "As Core Member of the Dramatics Society (**Dramebazz**), IIT Jodhpur, coordinated events and creative direction, and directed stage productions at **Inter IIT Cultural Meet 7.0**.",
        ] },
    ],
};
