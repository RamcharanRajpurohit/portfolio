import { MdEmail } from "react-icons/md";
import { BsWhatsapp } from "react-icons/bs";
function Contact(){
    return(
        <>
        <section className="text-base bg-base px-4 md:px-12 mx-auto pt-8 pb-12 max-w-screen-lg">
            <div className="flex flex-col justify-center items-center gap-4 mb-8">
                <p className="text-lg font-medium">GET IN TOUCH</p>
                <h4 className="text-4xl font-bold">Contact Me</h4>
            </div>
            <div className="bg-base border border-stroke shadow-lg flex flex-col justify-center items-center gap-6 w-full rounded-xl  p-4 sm:p-6 md:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-md">
                    <a href="mailto:ramcharanrajpurohit@gmail.com" className=" flex-1 flex justify-center items-center gap-2 bg-base border border-stroke hover:shadow-md transition-all duration-200 rounded-lg w-full px-6 py-4 text-center font-medium hover:border-opacity-80">
                        <MdEmail></MdEmail> 
                        <p>Email Me</p>
                    </a>
                    <a href="https://wa.me/9680103852" target="_blank" rel="noopener noreferrer" className=" flex  justify-center items-center gap-2 flex-1 bg-base border border-stroke hover:shadow-md transition-all duration-200 rounded-lg w-full px-6 py-4 text-center font-medium hover:border-opacity-80">
                        <BsWhatsapp></BsWhatsapp>
                        <p>Whatsapp</p>
                    </a>
                </div>
                <div className="flex flex-col justify-center items-center gap-6 w-full max-w-lg">
                    <div className="text-center">
                        <p className="font-medium">Or send a message</p>
                        <div className="w-16 h-0.5 bg-stroke mx-auto mt-2"></div>
                    </div>
                    <div className="flex flex-col justify-center items-center gap-4 w-full">
                        <input 
                            type="text" 
                            placeholder="Your Name"
                            className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none" 
                        />
                        <input 
                            type="email" 
                            placeholder="Your Email"
                            className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none" 
                        />
                        <textarea 
                            placeholder="Your Message"
                            rows={5}
                            className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none resize-vertical"
                        ></textarea>
                        <button className="bg-base border border-stroke hover:shadow-md hover:border-opacity-80 font-semibold py-3 px-8 rounded-lg w-full transition-all duration-200" type="submit">
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        </section>
        </>
    );
}
export default Contact;