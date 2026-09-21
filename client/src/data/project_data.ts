interface project {
  title: string;
  subtitle: string;
  github_repo: string;
  web_url?: string;
  description: string;
  highlights: Array<string>;
  tech_stack: Array<string>;
}

const projects: project[] = [
  {
    title: "DyPol",
    subtitle: "AI Engineering Analyst for Startup Founders",
    github_repo: "https://github.com/RamcharanRajpurohit/dypol",
    web_url: "https://dypol.dev",
    description:
      "Not a dashboard — an AI agent with read access to your GitHub metadata and source code. Ask anything ('why is billing slow this sprint?') and it investigates, runs analysis on real diffs, and answers in plain English with citations grounded in actual data.",
    highlights: [
      "3-tier agent: cached tools → sandboxed code execution",
      "Primitives: run_sql, git, python_exec, semantic search",
      "5-minute setup via GitHub App install",
      "Cited answers — every claim references a PR or file",
    ],
    tech_stack: [
      "Next.js",
      "TypeScript",
      "FastAPI",
      "PostgreSQL",
      "pgvector",
      "Claude Sonnet",
      "E2B Sandboxes",
      "Celery",
      "Redis",
    ],
  },
  {
    title: "AlgoLab",
    subtitle: "Interactive Data Structures & Algorithms Visualizer",
    github_repo: "https://github.com/RamcharanRajpurohit/DSAVisualizer",
    web_url: "https://algolab.rajpurohit.me",
    description:
      "Visualizes core data structures and algorithms — BST, AVL trees, stacks, queues, and heaps — with real-time interactive operations like insertions, deletions, and traversals rendered on a smooth canvas.",
    highlights: [
      "Konva.js canvas rendering with pan & zoom",
      "Real-time interactive tree and heap operations",
      "Ruby on Rails MVC backend architecture",
      "Modular client-side JS with ERB views",
    ],
    tech_stack: ["Ruby on Rails", "Konva.js", "JavaScript", "PostgreSQL"],
  },
  {
    title: "Dev Plaza",
    subtitle: "Competitive Programming Profile Hub",
    github_repo: "https://github.com/RamcharanRajpurohit/devplaza",
    web_url: "https://devplaza.rajpurohit.me",
    description:
      "A central hub that aggregates competitive programming profiles from LeetCode, Codeforces, GeeksforGeeks, and GitHub — showing live stats like problem counts, contest ratings, and contributions in one dashboard.",
    highlights: [
      "Live stats fetched across 4+ platforms",
      "Dynamic username-based search & public sharing",
      "Caching and fallback for unstable / rate-limited APIs",
      "Responsive minimal UI for mobile and desktop",
    ],
    tech_stack: [
      "React.js",
      "TypeScript",
      "Node.js",
      "Express.js",
      "Tailwind CSS",
      "REST APIs",
    ],
  },
  {
    title: "WalletWhiz",
    subtitle: "Full-Stack Expense Tracker with Visual Insights",
    github_repo: "https://github.com/RamcharanRajpurohit/walletwhiz",
    web_url: "https://walletwhiz-eight.vercel.app/dashboard",
    description:
      "A full-stack expense tracker with secure authentication and data visualization — RESTful APIs handle CRUD for expenses and categories while dynamic charts give users visual insight into their spending habits.",
    highlights: [
      "Secure auth via Supabase",
      "Chart.js spending visualizations",
      "RESTful CRUD APIs for expenses & categories",
      "Responsive Next.js + Tailwind frontend",
    ],
    tech_stack: [
      "Next.js",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Supabase",
      "Chart.js",
    ],
  },
  {
    title: "Quiet Hours Scheduler",
    subtitle: "Focus Sessions with Distraction Blocking",
    github_repo: "https://github.com/RamcharanRajpurohit/signsetu",
    web_url: "https://quieth.netlify.app/",
    description:
      "A web app that helps users schedule 'quiet hours' for focused work or study — users get reminders and distracting websites are blocked during scheduled periods.",
    highlights: [
      "Scheduled focus sessions with reminders",
      "Blocks distracting websites during quiet hours",
      "Auth via Supabase, preferences in MongoDB",
      "Clean, user-friendly interface",
    ],
    tech_stack: ["Next.js", "Tailwind CSS", "MongoDB", "Supabase"],
  },
  {
    title: "Pac-Man Terminal Game",
    subtitle: "Classic Pac-Man in C, Played in the Terminal",
    github_repo: "https://github.com/QASIMALVEE/ICS_CP_-DARQ",
    description:
      "A classic Pac-Man game built entirely in C and playable in the terminal — ASCII characters and terminal control functions simulate graphics, ghost AI, and real-time movement.",
    highlights: [
      "Ghost AI, food collection, win/lose mechanics",
      "Real-time keyboard input (no Enter key)",
      "ASCII graphics via terminal control",
      "Modular code: logic, input, rendering",
    ],
    tech_stack: ["C", "GCC", "Linux Terminal", "ASCII Graphics", "termios.h"],
  },
  {
    title: "Password Manager",
    subtitle: "Offline Terminal Password Manager with RSA",
    github_repo: "https://github.com/zero1byte/PasswordManager",
    description:
      "A terminal-based password manager that securely stores passwords using RSA encryption — the master key is required at runtime and never stored, ensuring full offline data privacy.",
    highlights: [
      "RSA-encrypted storage in local JSON",
      "Master key never persisted anywhere",
      "Bash CLI for quick interaction",
      "Fully offline and transparent",
    ],
    tech_stack: ["C++", "Bash", "RSA Encryption", "JSON", "Linux Terminal"],
  },
  {
    title: "Named Entity Recognition",
    subtitle: "ML & DL Models for Token-Level Entity Tagging",
    github_repo: "https://github.com/RamcharanRajpurohit/NER",
    description:
      "A Named Entity Recognition system built with multiple ML and DL models on the Kaggle NER dataset — from Random Forest and HMM baselines to an RNN capturing sequential dependencies.",
    highlights: [
      "Random Forest & HMM baselines vs RNN (Keras)",
      "Evaluated on F1, precision & recall per entity",
      "Token-level preprocessing pipelines",
      "Multiple entity types: ORG, LOC, PER, etc.",
    ],
    tech_stack: [
      "Python",
      "Scikit-learn",
      "Keras",
      "TensorFlow",
      "NLTK",
      "Pandas",
    ],
  },
  {
    title: "ChadWallet",
    subtitle: "Solana Memecoin Trading Terminal",
    github_repo: "https://github.com/RamcharanRajpurohit/chaddex",
    web_url: "https://chaddex.vercel.app",
    description:
      "A Solana memecoin trading terminal and wallet for discovering and trading tokens with live prices — embedded wallets, one-tap swaps, copy-trading, and real-time candlestick charts.",
    highlights: [
      "Privy embedded wallets + Jupiter swaps",
      "Top-trader copy-trading",
      "Real-time charts via lightweight-charts",
      "Resizable multi-panel trading UI",
    ],
    tech_stack: [
      "Next.js",
      "TypeScript",
      "Privy",
      "Solana",
      "Jupiter",
      "lightweight-charts",
    ],
  },
  {
    title: "ChatGPT Side Panel",
    subtitle: "Chrome Extension: ChatGPT in Your Browser Side Panel",
    github_repo: "https://github.com/RamcharanRajpurohit/chatgpt-side-panel",
    description:
      "A Chrome extension (Manifest V3) that opens ChatGPT in the browser's native side panel, toggled with Alt+C from any tab — built as a study companion to read notes and ask doubts side-by-side.",
    highlights: [
      "Instant Alt+C toggle from any tab",
      "Screenshot region selector → instant explanations",
      "declarativeNetRequest + frame patching for iframe embed",
      "Options page synced via chrome.storage",
    ],
    tech_stack: [
      "JavaScript",
      "Chrome Extensions (MV3)",
      "Side Panel API",
      "declarativeNetRequest",
    ],
  },
  {
    title: "InternOrbit",
    subtitle: "Internship Platform Connecting Students & Startups",
    github_repo: "https://github.com/RamcharanRajpurohit/internorbit",
    web_url: "https://internorbit.com",
    description:
      "A platform connecting talented students with startups for internship opportunities — publish listings, manage applications, and track candidates through the hiring pipeline.",
    highlights: [
      "Role-based access for admins & reviewers",
      "Candidate profiles with notes",
      "Full hiring pipeline tracking",
      "CSV export & placement reporting",
    ],
    tech_stack: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Node.js"],
  },
];

export default projects;
