function About() {
    return (<>
    <div className="bg-base p-5">
        <div>
            <h3 className="font-semibold text-4xl text-center text-base ">
            About Me
            </h3>
            <p className="text-center text-lg text-base mt-5 mb-10">
                I’m a 3rd-year B.Tech student at IIT Jodhpur in the Civil and Infrastructure Engineering branch. I build full stack web applications using the MERN stack and regularly solve DSA problems to improve my coding and problem-solving skills.
            </p>
         </div>
         <div className="grid grid-cols-9 text-base gap-3 ">
           <div className="col-span-3 border-2 rounded-lg p-3 hover:border-highlight border-stroke flex flex-col justify-center ">
            <div className="">
                <p>Btech   (2023-2027)</p>
                <p> IIT Jodhpur</p>
                <p>CGPA : 7.26</p>
            </div>
            <div>
                <p>12th (2022)</p>
                <p>Madhuram Vidhya Mandir </p>
                <p>98.20%</p>
            </div>
            <div>
                <p>10th (2020)</p>
                <p> Madhuram Vidhya Mandir </p>
                <p>92.67%</p>
            </div>
           </div>
           <div className="col-span-3 border-2 rounded-lg p-3 hover:border-highlight border-stroke ">HTML
CSS JavaScript TypeScript ReactJS NextJS Tailwind CSS Framer MotionNodeJS ExpressJS MongoDB Redux Toolkit Git GitHub Vercel Postman C++
</div>
           <div className="col-span-3 border-2 rounded-lg p-3 hover:border-highlight border-stroke ">
            <p>contact: +91 9680103852</p>
            <p>Email : ramcharanrajpurohit@gmail.com</p>
           </div>
         </div>
    </div>
        </>
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
