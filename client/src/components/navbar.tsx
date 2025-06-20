import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import {
  Menu,
  X,
  Home,
  User,
  Briefcase,
  Mail,
  FileText,
  Sun,
  Moon
} from "lucide-react";

function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="bg-base fixed w-full z-20 top-0 start-0 border-b border-gray-200 dark:border-gray-600">
      <div className="max-w-screen-xl flex flex-wrap items-center mx-auto p-4 justify-between">
        <h1 className="flex items-center text-base text-2xl font-semibold whitespace-nowrap">
          Ramcharan Rajpurohit
        </h1>

        <div className="flex md:order-2 space-x-3 md:space-x-0">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="px-4 py-2 bg-btnp  rounded"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={handleToggle}
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-base rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Toggle main menu</span>
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          className={`${
            isOpen ? "block" : "hidden"
          } w-full transition-all duration-300 ease-in-out md:flex md:w-auto md:order-1`}
        >
          <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-base md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-base">
            <li>
              <a
                href="#"
                onClick={closeMenu}
                className="flex items-center gap-2 py-2 px-3 text-base bg-bz rounded-sm md:bg-transparent md:text-bz md:p-0 md:dark:text-blue-500"
              >
                <Home size={16} /> Home
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={closeMenu}
                className="flex items-center gap-2 py-2 px-3 text-base rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-bz md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent"
              >
                <User size={16} /> About Me
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={closeMenu}
                className="flex items-center gap-2 py-2 px-3 text-base rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-bz md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent"
              >
                <Briefcase size={16} /> Projects
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={closeMenu}
                className="flex items-center gap-2 py-2 px-3 text-base rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-bz md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent"
              >
                <Mail size={16} /> Contact
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={closeMenu}
                className="flex items-center gap-2 py-2 px-3 text-base rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:hover:text-bz md:p-0 md:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 md:dark:hover:bg-transparent"
              >
                <FileText size={16} /> Resume
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
