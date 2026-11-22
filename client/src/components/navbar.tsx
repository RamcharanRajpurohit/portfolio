import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { Menu, X } from "lucide-react";
import { inkButton, inkSwitch } from "./inkTheme";
import { clearPalette } from "./paintedTheme";

const links = [
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#contact", label: "Contact" },
  { href: "#resume", label: "Resume" },
];

const round = "inline-grid place-items-center w-10 h-10 rounded-full bg-btnp/50 backdrop-blur border border-stroke/15 text-heading hover:bg-btnp transition-colors";

function Navbar() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  const items = links.map(({ href, label }) => (
    <li key={label}>
      <a
        href={href}
        onClick={closeMenu}
        className="block px-4 py-2 rounded-full text-sm font-medium text-heading hover:bg-btnp/70 transition-colors"
      >
        {label}
      </a>
    </li>
  ));

  return (
    <nav className="fixed w-full z-[70] top-0 start-0">
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* hand-inked mark, used as a mask so it takes the theme's ink colour */}
        <a href="#home" aria-label="Ramcharan Rajpurohit, home" className="block h-11 w-16 bg-[rgb(var(--headline))] [mask:url(/logo.svg)_no-repeat_center/contain]" />

        <ul className="hidden wrap:flex items-center p-1 rounded-full bg-btnp/75 backdrop-blur-md border border-stroke/15 shadow-sm">
          {items}
        </ul>

        <div className="flex gap-2">
          <button
            ref={inkButton}
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              inkSwitch(() => { clearPalette(); setTheme(next); }, next === "dark"); // the toggle also brings back the site's own colours
            }}
            className={round}
            aria-label="Toggle theme"
          >
            {/* moon by day, sun by night: the bite slides off and the rays grow as the ink spreads */}
            <svg viewBox="0 0 24 24" width="18" height="18" className="sunmoon" aria-hidden="true">
              <mask id="sunmoon-bite"><rect width="24" height="24" fill="#fff" /><circle className="bite" cx="18" cy="6" r="7" /></mask>
              <circle className="disc" cx="12" cy="12" r="8" fill="currentColor" mask="url(#sunmoon-bite)" />
              <g className="rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M12 2.5v2" transform={`rotate(${a} 12 12)`} />)}
              </g>
            </svg>
          </button>
          <button onClick={() => setIsOpen((o) => !o)} type="button" className={`${round} wrap:hidden`} aria-expanded={isOpen}>
            <span className="sr-only">Toggle main menu</span>
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <ul className="wrap:hidden mx-4 p-2 card flex flex-col">{items}</ul>
      )}
    </nav>
  );
}

export default Navbar;
