import Dsa_visualizer from '../assets/Screenshot From 2025-07-03 22-06-01.png';
import pacman from '../assets/pacman.png'
import dev_plaza from '../assets/dev_plaza.png'
import password_manager from '../assets/password_manager.png'
import ner from '../assets/ner.png'
import walletwhiz from '../assets/walletwhiz.png'
import qhours from '../assets/qhour.png'
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
    image_url: dev_plaza, 
    github_repo: "https://github.com/RamcharanRajpurohit/devplaza", 
    web_url: "https://devplaza.vercel.app/", 
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
     title:"WalletWhiz",
     image_url:walletwhiz,
     github_repo:"https://github.com/RamcharanRajpurohit/walletwhiz",
     web_url:"https://walletwhiz-eight.vercel.app/dashboard",
     project_duration:"2025-Present",
     description:[
      "Developed a full-stack expense tracker application with user authentication and data visualization.",
      "Implemented secure user registration and login using supabase authentication services.",
      "Created RESTful APIs with Node.js and Express.js to handle CRUD operations for expenses and categories.",
      "Designed a responsive frontend using Next.js and Tailwind CSS for an intuitive user experience.",
      "Integrated Chart.js to provide users with visual insights into their spending habits through dynamic charts."
     ],
     tech_stack:[
      "Next.js",
      "Node.js",
      "Express.js",
      "MongoDB",
      "supabase",
      "Tailwind CSS",
      "Chart.js",
      "Vercel",
      "netlify"
     ]
  },{
    title: "Quiet Hours Scheduler",
    image_url: qhours,
    github_repo: "https://github.com/RamcharanRajpurohit/signsetu",
    web_url: "https://quieth.netlify.app/",
    project_duration: "Aug-Sep 2025",
    description: [
      "Developed a web app to help users schedule 'quiet hours' for focused work or study.",
      "Users will get reminders and block distracting websites during these periods.",
      "Building a clean and user-friendly interface with Next.js and Tailwind CSS.",
      "Supabse is being used for user authentication and MongoDB for storing user preferences and schedules."
    ],
    tech_stack: [
      "Next.js",
      "Tailwind CSS",
      "MongoDB",
      "Supabase",
      "Vercel"
    ]
  },
   {
    title: "Pac-Man Terminal Game",
    image_url: pacman, 
    github_repo: "https://github.com/QASIMALVEE/ICS_CP_-DARQ", 
    web_url: "",
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
    title: "Password Manager (Terminal-based)",
    image_url: password_manager, 
    github_repo: "https://github.com/zero1byte/PasswordManager", 
    web_url: "", 
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
  },
   {
    title: "Named Entity Recognition (NER)",
    image_url:ner, 
    github_repo: "https://github.com/RamcharanRajpurohit/NER",
    web_url: "",
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
]


export default projects;