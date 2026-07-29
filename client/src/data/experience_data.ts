interface Experience {
    title: string;
    company: string;
    companyUrl: string;
    duration: string;
    description: string[];
    projects: {
        name: string;
        description: string;
    }[];
    tech_stack: string[];
}

interface Achievement {
    title: string;
    organization: string;
    year: string;
    description: string[];
}

const experiences: Experience[] = [
    {
        title: "AI Engineering Intern",
        company: "Powersmy.biz",
        companyUrl: "https://powersmy.biz",
        duration: "Present",
        description: [
            "Working on the AI behind an exam platform built for JEE and NEET coaching institutes.",
            "Built the system that generates entire assessments using an LLM, and a vision-based system that grades students' handwritten answers straight from photos.",
            "Built the pipeline that scores submissions and turns them into learning analytics for each student, with the heavy AI grading running in the background so results come back quickly.",
            "Made the whole thing reliable and fast enough to handle a full school sitting an exam at the same time, across the backend and the AI agent service.",
            "Built Amigo, a student-facing AI companion on LangGraph that routes across specialist agents to serve both text chat and real-time voice, with a child-safety layer for PII protection and risk screening."
        ],
        projects: [
            {
                name: "SchoolConnect Outbound",
                description: "A scalable Node.js backend for managing school admission call campaigns with intelligent scheduling and AI-powered voice calling. Features include campaign management, intelligent scheduling with retry logic, queue-based processing using BullMQ and Redis, and real-time webhook updates."
            },
            {
                name: "Pupil Assess",
                description: "An AI-powered assessment platform for test generation, attempt, grading, and progress tracking. Features smart question banks, AI-powered automatic scoring with detailed feedback, comprehensive performance analysis with automatic gap identification, and student progress monitoring with adaptive remediation."
            },
            {
                name: "Amigo",
                description: "A student-facing AI companion built on LangGraph — a supervisor graph routing to 5 specialist agents over 18 scoped tools, serving both text chat and voice from one shared graph. Built a real-time voice pipeline (LiveKit, code-switching Hindi/English STT, streaming TTS) with token-by-token streaming, plus a child-safety layer with PII tokenisation, a two-stage LLM risk screen with fail-closed severity floors, and an append-only audit ledger."
            }
        ],
        tech_stack: [
            "Python",
            "FastAPI",
            "Node.js",
            "Express.js",
            "TypeScript",
            "MongoDB",
            "Redis",
            "BullMQ",
            "LangChain",
            "LangGraph",
            "LiveKit",
            "Google Generative AI",
            "Deepgram",
            "Docker",
            "REST APIs"
        ]
    }
];

const achievements: Achievement[] = [
    {
        title: "Amazon ML Summer School 2025",
        organization: "Amazon",
        year: "2025",
        description: [
            "Selected for Amazon's intensive Machine Learning program among thousands of applicants from across India.",
            "Learned key ML topics including Supervised Learning, Deep Neural Networks, Generative AI & LLMs, Dimensionality Reduction, and Unsupervised Learning.",
            "Gained hands-on knowledge through sessions led by Amazon Scientists with real-world industry applications.",
            "Interactive Q&A sessions with Applied Scientists working on cutting-edge ML problems at Amazon."
        ]
    }
];

export { achievements };
export default experiences;
