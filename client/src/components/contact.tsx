import { useState } from "react";
import type { FormEvent } from "react";
import { MdEmail, MdCheck, MdError } from "react-icons/md";
import { BsWhatsapp } from "react-icons/bs";
import { SectionHead } from "./ui";

function Contact() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const phoneNumber = "919680103852";
    const email = "ramcharanrajpurohit@gmail.com";

    // Phone -> open the native app; PC/laptop -> open the web version.
    const [isMobile] = useState<boolean>(() =>
        typeof navigator !== "undefined" &&
        (/Android|iPhone|iPad|iPod|webOS|BlackBerry|Windows Phone|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
            (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1))
    );

    const whatsappHref = isMobile
        ? `https://wa.me/${phoneNumber}`
        : `https://web.whatsapp.com/send?phone=${phoneNumber}`;
    const emailHref = isMobile
        ? `mailto:${email}`
        : `https://mail.google.com/mail/?view=cm&fs=1&to=${email}`;

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
            <section id="contact" className="reveal text-heading px-4 md:px-12 mx-auto py-20 sm:py-28 max-w-screen-md scroll-mt-16">
                <SectionHead n="04" title="Contact Me" sub="GET IN TOUCH" />

                <div className="card flex flex-col justify-center items-center gap-6 w-full p-5 sm:p-8 md:p-10">
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
                        <a href={emailHref} target="_blank" rel="noopener noreferrer" className="pill-light flex-1 w-full py-3">
                            <MdEmail />
                            <p>Email Me</p>
                        </a>
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="pill-light flex-1 w-full py-3">
                            <BsWhatsapp />
                            <p>Whatsapp</p>
                        </a>
                    </div>
                    
                    <div className="flex flex-col justify-center items-center gap-6 w-full max-w-lg">
                        <div className="text-center">
                            <p className="font-medium">Or send a message</p>
                            <div className="ruler w-24 mx-auto mt-2"></div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col justify-center items-center gap-4 w-full">
                            <input 
                                required
                                name="name"
                                type="text" 
                                placeholder="Your Name"
                                disabled={isSubmitting}
                                className="bg-base/60 border border-stroke/20 focus:border-highlight focus:ring-2 focus:ring-highlight/30 rounded-xl px-4 py-3 placeholder:text-paragraph/70 w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                            />
                            <input 
                                name="email"
                                type="email" 
                                required
                                pattern="^[\w\.-]+@[\w\.-]+\.\w{2,}$"
                                placeholder="Your Email"
                                disabled={isSubmitting}
                                className="bg-base/60 border border-stroke/20 focus:border-highlight focus:ring-2 focus:ring-highlight/30 rounded-xl px-4 py-3 placeholder:text-paragraph/70 w-full transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                            />
                            <textarea 
                                required
                                id="message"
                                name="message"
                                placeholder="Your Message"
                                rows={5}
                                disabled={isSubmitting}
                                className="bg-base/60 border border-stroke/20 focus:border-highlight focus:ring-2 focus:ring-highlight/30 rounded-xl px-4 py-3 placeholder:text-paragraph/70 w-full transition-all duration-200 outline-none resize-vertical disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                className="pill-dark w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed" 
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