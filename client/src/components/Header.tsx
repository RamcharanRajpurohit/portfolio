import Navabar from "./navbar";

function Header(){
  return(
    <>
    <Navabar/>
    </>
  )
}
export default Header;





// import React, { useState } from 'react';
// 
// interface HeaderProps {
//   name?: string;
//   className?: string;
// }

// const Header: React.FC<HeaderProps> = ({ 
//   name = "Your Name", 
//   className = "" 
// }) => {
//   const [isMenuOpen, setIsMenuOpen] = useState(false);
//   const [isDarkMode, setIsDarkMode] = useState(false);

//   const navItems = [
//     { label: 'Home', href: '#home', icon: Home },
//     { label: 'About', href: '#about', icon: User },
//     { label: 'Portfolio', href: '#portfolio', icon: Briefcase },
//     { label: 'Resume', href: '#resume', icon: FileText },
//     { label: 'Contact', href: '#contact', icon: Mail },
//   ];

//   const toggleMenu = () => {
//     setIsMenuOpen(!isMenuOpen);
//   };

//   const toggleDarkMode = () => {
//     setIsDarkMode(!isDarkMode);
//   };

//   return (
//     <header className={`${
//       isDarkMode 
//         ? 'bg-gray-900 shadow-gray-800' 
//         : 'bg-white shadow-lg'
//     } shadow-lg sticky top-0 z-50 transition-all duration-300 ${className}`}>
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex items-center h-16">
//           {/* Left side - Name/Logo */}
//           <div className="flex-shrink-0">
//             <a 
//               href="#home" 
//               className={`text-2xl font-bold transition-colors duration-200 ${
//                 isDarkMode 
//                   ? 'text-white hover:text-blue-400' 
//                   : 'text-gray-900 hover:text-blue-600'
//               }`}
//               aria-label="Home"
//             >
//               {name}
//             </a>
//           </div>

//           {/* Middle - Navigation (Desktop) - Centered */}
//           <nav className="hidden md:flex flex-1 justify-center" role="navigation" aria-label="Main navigation">
//             <div className="flex space-x-8">
//               {navItems.map((item) => {
//                 const IconComponent = item.icon;
//                 return (
//                   <a
//                     key={item.label}
//                     href={item.href}
//                     className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
//                       isDarkMode
//                         ? 'text-gray-300 hover:text-blue-400 hover:bg-gray-800'
//                         : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
//                     }`}
//                     aria-label={item.label}
//                   >
//                     <IconComponent size={16} />
//                     <span>{item.label}</span>
//                   </a>
//                 );
//               })}
//             </div>
//           </nav>

//           {/* Right side - Toggle Buttons */}
//           <div className="flex items-center space-x-2">
//             {/* Dark Mode Toggle */}
//             <button
//               onClick={toggleDarkMode}
//               className={`p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset ${
//                 isDarkMode
//                   ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-800 focus:ring-yellow-400'
//                   : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
//               }`}
//               aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
//             >
//               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
//             </button>

//             {/* Mobile Menu Toggle */}
//             <button
//               onClick={toggleMenu}
//               className={`md:hidden inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset ${
//                 isDarkMode
//                   ? 'text-gray-300 hover:text-white hover:bg-gray-800 focus:ring-gray-500'
//                   : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:ring-blue-500'
//               }`}
//               aria-expanded={isMenuOpen}
//               aria-label="Toggle navigation menu"
//             >
//               {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
//             </button>
            
//             {/* Desktop CTA Button */}
//             <div className="hidden md:block ml-2">
//               <a
//                 href="#contact"
//                 className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
//                   isDarkMode
//                     ? 'bg-blue-600 hover:bg-blue-700 text-white'
//                     : 'bg-blue-600 hover:bg-blue-700 text-white'
//                 }`}
//               >
//                 Get In Touch
//               </a>
//             </div>
//           </div>
//         </div>

//         {/* Mobile Navigation Menu */}
//         <div className={`md:hidden transition-all duration-300 ease-in-out ${
//           isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
//         }`}>
//           <nav className="px-2 pt-2 pb-3 space-y-1 bg-gray-50 rounded-lg mt-2" role="navigation" aria-label="Mobile navigation">
//             {navItems.map((item) => {
//               const IconComponent = item.icon;
//               return (
//                 <a
//                   key={item.label}
//                   href={item.href}
//                   className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 hover:bg-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
//                   onClick={() => setIsMenuOpen(false)}
//                   aria-label={item.label}
//                 >
//                   <IconComponent size={18} />
//                   <span>{item.label}</span>
//                 </a>
//               );
//             })}
//           </nav>
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Header;