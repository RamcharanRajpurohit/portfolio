import { Github, Linkedin,Instagram} from 'lucide-react';
import { TbBrandLeetcode } from "react-icons/tb";
import HeroImage from '../assets/IMG_20250104_225126_873.jpeg';
function Hero(){
    return(
        <>
        <section id='home' className="max-w-screen-lg  mx-auto px-4 sm:px-6 lg:px-8 bg-base border-b border-stroke ">
            <div className="grid lg:grid-cols-7 lg:gap-x-8 xl:gap-x-12 lg:items-center">
                <div className="lg:col-span-3 mt-20  flex items-center justify-center">
                   <img className="w-full max-w-[180px] sm:max-w-[200px] md:max-w-[220px] lg:max-w-[200px] xl:max-w-[220px] h-auto rounded-md my-10 " src={HeroImage} alt ="Ramcharan Rajpurohit - AI Engineering Intern" width="448" height="448" loading="eager" fetchPriority="high"/>
                </div>
            <div className="lg:col-span-4 sm:mt-auto md:mt-20 xl:mt-10 ">
                <h2 className="text-center text-base block font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-5">Hi, I'm Ramcharan</h2>
                <span className='flex items-center justify-center'>
                <p className="text-base block text-center md:w-2/4">A Full Stack Developer passionate about building performant, user-friendly, and scalable applications.</p></span>
                <div className="flex mt-4 lg:mt-7 items-center gap-3 justify-center ">
                     <a href="https://github.com/RamcharanRajpurohit" className='md:border-2 border p-1 rounded mb-2  hover:border-highlight transition-colors duration-200' target="_blank" rel="noopener noreferrer" aria-label="Visit Ramcharan's GitHub profile">
                            <Github className="md:w-8 md:h-8 w-5 h-5  text-base " aria-hidden="true" />
                     </a>
                     <a href="https://leetcode.com/u/b23ci1032/" className='md:border-2 border p-1 rounded mb-2 border-base hover:border-highlight transition-colors duration-200' target="_blank" rel="noopener noreferrer" aria-label="Visit Ramcharan's LeetCode profile">
                            <TbBrandLeetcode className="md:w-8 md:h-8 w-5 h-5  text-base" aria-hidden="true" />
                     </a>
                     <a href="https://www.linkedin.com/in/ramcharan-rajpurohit-1314b7289/" className='md:border-2 border p-1 rounded mb-2 border-base hover:border-highlight transition-colors duration-200' target="_blank" rel="noopener noreferrer" aria-label="Visit Ramcharan's LinkedIn profile">
                             <Linkedin className="md:w-8 md:h-8 w-5 h-5  text-base " aria-hidden="true" />
                     </a>
                   
                    <a href="https://www.instagram.com/ramcharanpurohit/" className='md:border-2 border p-1 rounded mb-2 border-base hover:border-highlight transition-colors duration-200' target="_blank" rel="noopener noreferrer" aria-label="Visit Ramcharan's Instagram profile">
                          < Instagram className="md:w-8 md:h-8 w-5 h-5  text-base " aria-hidden="true" />
                    </a>                    
                </div>
            </div>
            </div>
        </section>
        </>
    );
}
export default Hero;

 
   