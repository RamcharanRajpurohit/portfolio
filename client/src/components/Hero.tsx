import { ArrowDown, FileText } from 'lucide-react';
import { Scenery } from './ui';

function Hero(){
    return(
        <section id='home' className="relative min-h-[100svh] overflow-hidden px-4 pt-28 sm:pt-36 pb-[14vh] sm:pb-[30vh]">
            <div className="relative z-10 flex flex-col items-center">
                <h2 className="mt-5 text-center font-bold tracking-[-0.05em] leading-[0.95] text-heading text-[2.6rem] sm:text-6xl lg:text-7xl">
                    Hi, I'm Ramcharan
                </h2>
                <p className="mt-4 max-w-md text-center text-sm sm:text-base text-paragraph">I build LLM and vision-powered products, both the user-facing features and the backend APIs behind them.</p>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <a href="#projects" className="pill-light">See my work <ArrowDown size={16} aria-hidden="true" /></a>
                    <a href="#resume" className="pill-dark"><FileText size={16} aria-hidden="true" /> Resume</a>
                </div>


            </div>

            <Scenery>
                {/* me, standing on the hill on the left */}
                <img src="/art/me-standing-cut.webp" alt="Ramcharan Rajpurohit" fetchPriority="high"
                     className="me absolute w-auto" />
            </Scenery>
            <a href="#about" className="absolute z-10 bottom-5 left-1/2 -translate-x-1/2 text-xl text-[rgb(255_245_220)] drop-shadow" aria-label="Scroll down">↓</a>
        </section>
    );
}
export default Hero;
