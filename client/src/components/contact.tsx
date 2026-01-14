import { useState } from "react";
import type { FormEvent } from "react";
import { MdEmail, MdCheck, MdError } from "react-icons/md";
import { BsWhatsapp } from "react-icons/bs";

function Contact() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        setIsSubmitting(true);
        setSubmissionStatus('idle');

        try {
            const response: Response = await fetch("https://formspree.io/f/mjkrzjaq", {
                method: "POST",
                body: formData,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                setSubmissionStatus('success');
                form.reset();
                // Auto-hide success message after 5 seconds
                setTimeout(() => {
                    setSubmissionStatus('idle');
                }, 4000);
            } else {
                setSubmissionStatus('error');
                // Auto-hide error message after 5 seconds
                setTimeout(() => {
                    setSubmissionStatus('idle');
                }, 4000);
            }
        } catch (error) {
            setSubmissionStatus('error');
            setTimeout(() => {
                setSubmissionStatus('idle');
            }, 4000);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <section id="contact" className="text-base bg-base px-4 md:px-12 mx-auto pt-8 pb-12 max-w-screen-lg border-b border-stroke mb-3 scroll-mt-16">
                <div className="flex flex-col justify-center items-center gap-4 mb-8">
                    <p className="text-lg font-medium">GET IN TOUCH</p>
                    <h4 className="text-4xl font-bold">Contact Me</h4>
                </div>
                
                <div className="bg-base border border-stroke shadow-lg flex flex-col justify-center items-center gap-6 w-full rounded-xl p-4 sm:p-6 md:p-8">
                    {/* Status Messages */}
                    {submissionStatus === 'success' && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg w-full max-w-lg">
                            <MdCheck className="text-green-600" />
                            <p className="font-medium">Message sent successfully! I'll get back to you soon.</p>
                        </div>
                    )}
                    
                    {submissionStatus === 'error' && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg w-full max-w-lg">
                            <MdError className="text-red-600" />
                            <p className="font-medium">Something went wrong. Please try again or contact me directly.</p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-md">
                        <a href="mailto:ramcharanrajpurohit@gmail.com" className="flex-1 flex justify-center items-center gap-2 bg-base border border-stroke hover:shadow-md transition-all duration-200 rounded-lg w-full px-6 py-4 text-center font-medium hover:border-opacity-80">
                            <MdEmail />
                            <p>Email Me</p>
                        </a>
                        <a href="https://wa.me/+919680103852" target="_blank" rel="noopener noreferrer" className="flex justify-center items-center gap-2 flex-1 bg-base border border-stroke hover:shadow-md transition-all duration-200 rounded-lg w-full px-6 py-4 text-center font-medium hover:border-opacity-80">
                            <BsWhatsapp />
                            <p>Whatsapp</p>
                        </a>
                    </div>
                    
                    <div className="flex flex-col justify-center items-center gap-6 w-full max-w-lg">
                        <div className="text-center">
                            <p className="font-medium">Or send a message</p>
                            <div className="w-16 h-0.5 bg-stroke mx-auto mt-2"></div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center gap-4 w-full">
                            <input 
                                required
                                name="name"
                                type="text" 
                                placeholder="Your Name"
                                disabled={isSubmitting}
                                className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                            />
                            <input 
                                name="email"
                                type="email" 
                                required
                                pattern="^[\w\.-]+@[\w\.-]+\.\w{2,}$"
                                placeholder="Your Email"
                                disabled={isSubmitting}
                                className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                            />
                            <textarea 
                                required
                                name="message"
                                placeholder="Your Message"
                                rows={5}
                                disabled={isSubmitting}
                                className="bg-base border border-stroke focus:border-opacity-80 focus:ring-2 focus:ring-stroke focus:ring-opacity-30 rounded-lg px-4 py-3 w-full transition-all duration-200 outline-none resize-vertical disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                className="bg-base border border-stroke hover:shadow-md hover:border-opacity-80 font-semibold py-3 px-8 rounded-lg w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Contact;