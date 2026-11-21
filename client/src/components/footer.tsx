import { Scenery } from "./ui";

const columns = [
    { title: "Explore", links: [["About", "#about"], ["Experience", "#experience"], ["Projects", "#projects"], ["Contact", "#contact"]] },
    { title: "Elsewhere", links: [["GitHub", "https://github.com/RamcharanRajpurohit"], ["LinkedIn", "https://www.linkedin.com/in/ramcharan-rajpurohit-1314b7289/"], ["LeetCode", "https://leetcode.com/u/b23ci1032/"], ["Instagram", "https://www.instagram.com/ramcharanpurohit/"], ["Resume", "/Ramcharan_Resume.pdf"]] },
];

function Footer(){
    return (
        <footer className="relative px-4 pt-10 pb-[22vh] overflow-hidden">
            <div className="relative z-10 max-w-6xl mx-auto rounded-3xl bg-primary text-btn p-8 sm:p-12 shadow-2xl">
                <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
                    <div>
                        <p className="text-5xl sm:text-6xl font-bold tracking-[-0.05em] leading-[0.95]">Ramcharan<br />Rajpurohit</p>
                        <a href="#contact" className="pill mt-7 bg-base text-heading">Get in touch</a>
                    </div>
                    {columns.map(({ title, links }) => (
                        <div key={title}>
                            <p className="eyebrow mb-4 opacity-70">{title}</p>
                            <ul className="space-y-2.5 text-sm">
                                {links.map(([label, href]) => (
                                    <li key={label}>
                                        <a href={href} {...(!href.startsWith("#") && { target: "_blank", rel: "noopener noreferrer" })} className="hover:underline underline-offset-4">{label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 h-px bg-current opacity-20" />
                <div className="pt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="block h-9 w-14 bg-current [mask:url(/logo.svg)_no-repeat_center/contain]" aria-hidden="true" />
                    <span className="opacity-70">©Ramcharan Rajpurohit. All rights reserved</span>
                    <a href="#home" className="opacity-70 hover:opacity-100">Back to the top ↑</a>
                </div>
            </div>
            <Scenery />
        </footer>
    );
}
export default Footer;
