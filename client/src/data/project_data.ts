import Dsa_visualizer from '../assets/Screenshot From 2025-07-03 22-06-01.png';
import portfolio from '../assets/Screenshot From 2025-07-03 22-06-22.png';
import pacman from '../assets/pacman.png'
import code_formatter from '../assets/code_formatter.png'
import dev_plaza from '../assets/dev_plaza.png'
import password_manager from '../assets/password_manager.png'
import ner from '../assets/ner.png'
interface project{
      title:string;
      image_url:string;
      github_repo:string;
      web_url:string;
      project_duration:string;
      description: Array<string>;
      tech_stack:Array<string>;
      
 }

 const projects:project[] =[
    {
        title:"Dsa Visualzer",
        image_url: Dsa_visualizer,
        github_repo:"https://github.com/RamcharanRajpurohit/DSAVisualizer",
        web_url:"https://dsa-visualizer-x87u.onrender.com/",
        project_duration:"2024-2025",
        description: [
      "Visualized core data structures and algorithms like BST, AVL Trees, Stacks, Queues, and Heaps.",
      "Implemented real-time interactive operations such as insertions, deletions, and traversals.",
      "Used Konva.js for smooth canvas rendering with pan and zoom support.",
      "Built with Ruby on Rails for structured MVC backend architecture.",
      "Integrated client-side logic using modular JavaScript and ERB views."
    ],
    tech_stack: [
      "Ruby on Rails",
      "Konva.js",
      "JavaScript",
      "HTML5",
      "CSS3",
      "PostgreSQL",
      "SQLite",
      "Yarn",
      "Webpacker"
    ]
    },
  {
    title: "Dev Plaza",
    image_url: dev_plaza, // placeholder or actual screenshot
    github_repo: "https://github.com/RamcharanRajpurohit/devplaza", // update if different
    web_url: "", // update to your live deployed link
    project_duration: "Jul 2024 – Aug 2024",
    description: [
      "Created a central hub to showcase CP profiles from platforms like LeetCode, Codeforces, GeeksforGeeks, and GitHub.",
      "Fetched and displayed live stats such as problem count, contest rating, GitHub contributions, and achievements.",
      "Implemented dynamic username-based search and public sharing of profile dashboards.",
      "Responsive and minimal UI built for both mobile and desktop users.",
      "Integrated caching and fallback for platforms with unstable APIs or rate limits."
    ],
    tech_stack: [
      "React.js",
      "Tailwind CSS",
      "TypeScript",
      "Node.js",
      "Express.js",
      "REST APIs",
      "Vercel",
      "Axios",
      "Cheerio / Puppeteer (for scraping, if applicable)"
    ]
  },
    {
    title: "Pac-Man Terminal Game",
    image_url: pacman, // use a cool ASCII or screenshot (or placeholder)
    github_repo: "https://github.com/QASIMALVEE/ICS_CP_-DARQ", // if not on GitHub yet, upload it bro!
    web_url: "", // you can leave it empty or link a GitHub README preview
    project_duration: "Oct 2023 – Nov 2023",
    description: [
      "Built a classic Pac-Man game entirely in C, playable in the terminal.",
      "Used ASCII characters and terminal control functions to simulate game graphics and movement.",
      "Implemented game mechanics like ghost AI, food collection, and win/lose conditions.",
      "Handled real-time keyboard input without requiring the Enter key.",
      "Organized the code into multiple modules for game logic, input handling, and rendering."
    ],
    tech_stack: [
      "C",
      "GCC",
      "Linux Terminal",
      "ASCII Graphics",
      "System Calls (termios.h, conio-like input)"
    ]
  },
  {
    title: "Named Entity Recognition (NER)",
    image_url:ner, // drop a graph, confusion matrix, or model architecture here
    github_repo: "https://github.com/RamcharanRajpurohit/NER", // update if different or add later
    web_url: "", // link to demo, report, or Colab notebook if available
    project_duration: "Feb 2024 – Mar 2024",
    description: [
      "Developed a Named Entity Recognition (NER) system using multiple ML and DL models on the Kaggle NER dataset.",
      "Implemented traditional models like Random Forest and Hidden Markov Models (HMM) for baseline comparison.",
      "Built a Recurrent Neural Network (RNN) architecture using Keras to capture sequential dependencies.",
      "Preprocessed token-level labeled data and converted it into suitable formats for classical and deep learning models.",
      "Evaluated models using F1 score, precision, and recall for multiple entity types (ORG, LOC, PER, etc.)."
    ],
    tech_stack: [
      "Python",
      "Scikit-learn",
      "NumPy",
      "Pandas",
      "NLTK",
      "Keras",
      "TensorFlow",
      "matplotlib",
      "HMMlearn",
      "Jupyter Notebook",
      "Kaggle Datasets"
    ]
  },
  {
    title: "Password Manager (Terminal-based)",
    image_url: password_manager, // terminal screenshot or flowchart img
    github_repo: "https://github.com/zero1byte/PasswordManager", // update if different
    web_url: "", // optional: can be a GitHub README or demo video
    project_duration: "Dec 2023 – Jan 2024",
    description: [
      "Built a terminal-based password manager that securely stores passwords using RSA encryption.",
      "Master Key is required at runtime and never stored anywhere—ensuring full data privacy.",
      "Passwords are encrypted with a custom prefix and saved in a local JSON file.",
      "CLI interface built with Bash scripting for quick interaction and automation.",
      "Perfect for users who want a fully offline, transparent, and customizable password tool."
    ],
    tech_stack: [
      "C++",
      "Bash",
      "RSA Encryption",
      "JSON File Handling",
      "Linux Terminal",
      "Shell Scripting"
    ]
  }
]


export default projects;