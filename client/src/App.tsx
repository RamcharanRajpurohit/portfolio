
import Header from "./components/Header";
import Hero from "./components/Hero";
import About from "./components/about";
import Experience from "./components/experience";
import Projects from "./components/projects";
import Footer from "./components/footer";
import Contact from "./components/contact";
 function App() {
  return(<>
  {/* Skip to main content link for accessibility */}
  <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-highlight focus:text-white focus:top-0 focus:left-0">
    Skip to main content
  </a>
  <Header></Header>
  <div id="main-content">
    <Hero></Hero>
    <About></About>
    <Experience></Experience>
    <Projects></Projects>
    <Contact></Contact>
  </div>
  <Footer></Footer>

  </>
  )
}
export default App;
