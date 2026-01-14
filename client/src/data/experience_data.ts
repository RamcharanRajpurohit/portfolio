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
            "Working on AI-powered educational platforms and intelligent calling systems.",
            "Developing and integrating AI agents for automated voice calling and parent engagement.",
            "Building backend services with FastAPI and Node.js for scalable AI applications."
        ],
        projects: [
            {
                name: "SchoolConnect Outbound",
                description: "A scalable Node.js backend for managing school admission call campaigns with intelligent scheduling and AI-powered voice calling. Features include campaign management, intelligent scheduling with retry logic, queue-based processing using BullMQ and Redis, and real-time webhook updates."
            },
            {
                name: "Pupil Assess",
                description: "An AI-powered assessment platform for test generation, attempt, grading, and progress tracking. Features smart question banks, AI-powered automatic scoring with detailed feedback, comprehensive performance analysis with automatic gap identification, and student progress monitoring with adaptive remediation."
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
