function About() {
    return (
        <div className="bg-base p-5 text-base w-full overflow-x-hidden  border-b border-stroke ">
            <div className="max-w-6xl mx-auto">
                <h3 className="font-semibold text-5xl text-center text-base mb-4">
                    About Me
                </h3>
                <p className="text-center text-lg text-base mt-5 mb-10 max-w-4xl mx-auto px-4">
                    I'm a 3rd-year B.Tech student at IIT Jodhpur in the Civil and Infrastructure Engineering branch. I build full stack web applications using the MERN stack and regularly solve DSA problems to improve my coding and problem-solving skills.
                </p>
                
                {/* Grid container with proper responsive behavior */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    
                    {/* Education Card */}
                    <div className="flex flex-col justify-start border-2 rounded-lg p-4 hover:border-highlight border-stroke transition-colors duration-200 min-h-fit">
                        <h4 className="font-semibold text-lg mb-3 text-highlight">Education</h4>
                        <div className="space-y-4">
                            <div className="border-b border-stroke pb-2">
                                <p className="font-medium">B.Tech (2023-2027)</p>
                                <p className="text-sm opacity-80">IIT Jodhpur</p>
                                <p className="text-sm">CGPA: 7.26</p>
                            </div>
                            <div className="border-b border-stroke pb-2">
                                <p className="font-medium">12th (2022)</p>
                                <p className="text-sm opacity-80">Madhuram Vidhya Mandir</p>
                                <p className="text-sm">98.20%</p>
                            </div>
                            <div>
                                <p className="font-medium">10th (2020)</p>
                                <p className="text-sm opacity-80">Madhuram Vidhya Mandir</p>
                                <p className="text-sm">92.67%</p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Skills Card */}
                    <div className="border-2 rounded-lg p-4 hover:border-highlight border-stroke transition-colors duration-200 min-h-fit">
                        <h4 className="font-semibold text-lg mb-3 text-highlight">Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "HTML", "CSS", "JavaScript", "TypeScript", "ReactJS", 
                                "NextJS", "Tailwind CSS", "Framer Motion", "NodeJS", 
                                "ExpressJS", "MongoDB", "Redux Toolkit", "Git", 
                                "GitHub", "Vercel", "Postman", "C++"
                            ].map((skill, index) => (
                                <span 
                                    key={index}
                                    className="bg-stroke px-2 py-1 rounded text-sm hover:bg-highlight  transition-colors duration-200"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="border-2 rounded-lg p-4 hover:border-highlight border-stroke transition-colors duration-200 min-h-fit md:col-span-2 lg:col-span-1">
                        <h4 className="font-semibold text-lg mb-3 text-highlight">Contact</h4>
                        <div className="space-y-2">
                            <p className="break-all">
                                <span className="font-medium">Phone:</span> +91 9680103852
                            </p>
                            <p className="break-all">
                                <span className="font-medium">Email:</span> ramcharanrajpurohit@gmail.com
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default About;








// function About() {
//   return (
//     <>
//       <div className="bg-base p-5">
//         <div>
//           <h3 className="font-semibold text-4xl text-center">
//             About Me
//           </h3>
//           <p className="text-center text-lg mt-5 mb-10">
//             I’m a 3rd-year B.Tech student at IIT Jodhpur in the Civil and Infrastructure Engineering branch. I build full stack web applications using the MERN stack and regularly solve DSA problems to improve my coding and problem-solving skills.
//           </p>
//         </div>

//         {/* Scrolling on mobile, grid on md+ */}
//         <div className="md:grid md:grid-cols-3 flex overflow-x-auto gap-3 text-base scrollbar-hide">

//           {/* Card 1 - Education */}
//           <div className="min-w-[300px] shrink-0 border-2 rounded-lg p-3 hover:border-highlight border-stroke">
//             <p><strong>B.Tech (2023–2027)</strong></p>
//             <p>IIT Jodhpur</p>
//             <p>CGPA: 7.26</p>
//             <br />
//             <p><strong>12th (2022)</strong></p>
//             <p>Madhuram Vidya Mandir</p>
//             <p>98.20%</p>
//             <br />
//             <p><strong>10th (2020)</strong></p>
//             <p>Madhuram Vidya Mandir</p>
//             <p>92.67%</p>
//           </div>

//           {/* Card 2 - Skills */}
//           <div className="min-w-[300px] shrink-0 border-2 rounded-lg p-3 hover:border-highlight border-stroke">
//             <p>HTML, CSS, JavaScript, TypeScript</p>
//             <p>ReactJS, NextJS, Tailwind CSS, Framer Motion</p>
//             <p>NodeJS, ExpressJS, MongoDB, Redux Toolkit</p>
//             <p>Git, GitHub, Vercel, Postman, C++</p>
//           </div>

//           {/* Card 3 - Contact */}
//           <div className="min-w-[300px] shrink-0 border-2 rounded-lg p-3 hover:border-highlight border-stroke">
//             <p><strong>Contact:</strong> +91 9680103852</p>
//             <p><strong>Email:</strong> ramcharanrajpurohit@gmail.com</p>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// }

// export default About;
