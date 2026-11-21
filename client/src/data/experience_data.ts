interface Achievement {
    title: string;
    organization: string;
    year: string;
    description: string[];
    link?: string;
    linkLabel?: string;
}

export const company = { name: "PowersMy.biz", product: "PupilTree", url: "https://powersmy.biz" };

interface Chapter {
    no: string;
    role: string;
    period: string;
    current?: boolean;
    summary: string;
    points: string[];
    stack: string[];
}

// Two chapters at one company: the growth from intern to lead is the story.
export const chapters: Chapter[] = [
    {
        no: "01",
        role: "AI Engineering Intern",
        period: "Nov 2025 – Sep 2026",
        summary: "Built pieces of the platform alongside the team.",
        points: [
            "Built the LLM pipeline that generates full assessments.",
            "Built vision grading for handwritten answers straight from photos.",
            "Built Amigo, the student companion for text and voice, with a child-safety layer.",
            "Built the pipeline that turns PDFs into question banks.",
        ],
        stack: ["Python", "FastAPI", "Node.js", "MongoDB", "Redis", "LangGraph", "LiveKit", "Gemini"],
    },
    {
        no: "02",
        role: "Lead AI Engineer",
        period: "Oct 2026 – Present",
        current: true,
        summary: "Now own whole products end to end, across backend, AI service and both apps.",
        points: [
            "Lead the AI behind PupilTree's exam, homework and revision platform.",
            "Owned homework from design to release: AI-written questions, PDF and photo import, AI marking, live updates.",
            "Owned PupilRevise, the revision pipeline: a teacher picks what was taught, and AI writes the cheat sheet and questions.",
            "Built a team of specialist AI agents (Flutter, backend, AI service, reviewer, scout, browser tester) that hand work to each other, check each other's changes, and prove them in a real browser before shipping.",
            "Automated testing with Playwright: parallel AI testers walk every teacher and student journey on phone, tablet and desktop.",
            "Run several Claude Code accounts in parallel on one shared set of agents and skills, so multiple features ship at once.",
        ],
        stack: ["Flutter", "FastAPI", "Gemini", "Playwright", "Claude Code", "MongoDB", "Redis"],
    },
];

// One "folder" per system, for the folder-style views. Card lines come straight from the points above.
export const pipelines: { chapter: string; title: string; cards: string[] }[] = [
    { chapter: "01", title: "Assessments", cards: ["LLM pipeline that generates full assessments"] },
    { chapter: "01", title: "Handwritten grading", cards: ["Vision grading for handwritten answers", "Straight from photos"] },
    { chapter: "01", title: "Amigo", cards: ["Student companion for text and voice", "Child-safety layer"] },
    { chapter: "01", title: "PDF → question bank", cards: ["Turns PDFs into question banks"] },
    { chapter: "02", title: "Homework", cards: ["AI-written questions", "PDF and photo import", "AI marking", "Live updates"] },
    { chapter: "02", title: "PupilRevise", cards: ["A teacher picks what was taught", "AI writes the cheat sheet", "And the questions"] },
    { chapter: "02", title: "Agent team", cards: ["Flutter, backend and AI-service specialists", "Reviewer, scout and browser-tester agents", "They check each other's changes", "Proven in a real browser before shipping"] },
    { chapter: "02", title: "Playwright testing", cards: ["Parallel AI testers", "Every teacher and student journey", "Phone, tablet and desktop"] },
    { chapter: "02", title: "Parallel accounts", cards: ["Several Claude Code accounts at once", "One shared set of agents and skills", "Multiple features ship at once"] },
];

const achievements: Achievement[] = [
    {
        title: "Linux Kernel Patch Merged into Mainline",
        organization: "Linux Kernel",
        year: "2026",
        link: "https://github.com/torvalds/linux/commit/f56521ab6f76faeaa5a524320898835454e3bc31",
        linkLabel: "View Commit",
        description: [
            "Authored a Linux kernel patch merged into mainline that fixes a broken mic-mute LED on an HP EliteBook laptop.",
            "Root-caused the issue to a missing audio driver quirk (ALSA/Realtek HDA) and submitted the fix upstream."
        ]
    },
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
