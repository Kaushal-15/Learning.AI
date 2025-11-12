import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* =========================
          HERO SECTION WITH NAVIGATION
      ========================== */}
      <section className="w-full min-h-screen flex flex-col bg-color2 text-color1">
        {/* NAVBAR */}
        <nav className="w-full flex justify-between items-center px-6 sm:px-10 md:px-16 lg:px-24 py-6 relative">
          {/* LOGO */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wide">
            LEARNING.AI
          </h1>

          {/* DESKTOP NAV LINKS */}
          <ul className="hidden md:flex space-x-10 text-lg font-medium">
            <li className="hover:text-[#2b3e1a] cursor-pointer transition-all duration-200">Study</li>
            <li className="hover:text-[#2b3e1a] cursor-pointer transition-all duration-200">Home</li>
            <li className="hover:text-[#2b3e1a] cursor-pointer transition-all duration-200">About</li>
            <li className="hover:text-[#2b3e1a] cursor-pointer transition-all duration-200">Dynamic MCQs</li>
          </ul>

          {/* GET STARTED BUTTON (Desktop) */}
          <button
            onClick={() => navigate("/signup")}
            className="hidden md:block bg-color1 text-color2 px-5 py-2 rounded-xl font-semibold hover:bg-[#2b3e1a] transition-all duration-200"
          >
            Get Started
          </button>

          {/* HAMBURGER MENU */}
          <div
            className="md:hidden flex flex-col justify-between w-7 h-6 cursor-pointer z-50"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span
              className={`block h-1 rounded-md bg-color1 transition-all duration-300 ${
                isOpen ? "rotate-45 translate-y-2.5" : ""
              }`}
            ></span>
            <span
              className={`block h-1 rounded-md bg-color1 transition-all duration-300 ${
                isOpen ? "opacity-0" : ""
              }`}
            ></span>
            <span
              className={`block h-1 rounded-md bg-color1 transition-all duration-300 ${
                isOpen ? "-rotate-45 -translate-y-2.5" : ""
              }`}
            ></span>
          </div>

          {/* MOBILE MENU */}
          {isOpen && (
            <div className="absolute top-20 left-0 w-full bg-color1 text-color2 flex flex-col items-center space-y-6 py-8 text-lg font-medium shadow-lg md:hidden transition-all duration-300">
              <a href="#" className="hover:text-[#f6db97]">Study</a>
              <a href="#" className="hover:text-[#f6db97]">Home</a>
              <a href="#" className="hover:text-[#f6db97]">About</a>
              <a href="#" className="hover:text-[#f6db97]">Dynamic MCQs</a>
              <button
                onClick={() => navigate("/signup")}
                className="mt-4 bg-color2 text-color1 px-5 py-2 rounded-xl font-semibold hover:bg-[#f6db97] transition-all duration-200"
              >
                Get Started
              </button>
            </div>
          )}
        </nav>

        {/* HERO CONTENT */}
        <div className="flex flex-col justify-center flex-grow px-6 sm:px-10 md:px-16 lg:px-24 py-10">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              Unleash the Power of <br className="hidden sm:block" />
              <span className="text-color1">AI-Driven Personalized</span> <br className="hidden sm:block" />
              Learning and MCQs
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-color1/80">
              Welcome to <span className="font-semibold">Learning.AI</span>, where personalized skills education
              meets cutting-edge AI technology and dynamic MCQs.
            </p>

            <button
              onClick={() => navigate("/signup")}
              className="mt-4 px-6 py-3 bg-color1 text-color2 rounded-xl text-lg font-semibold hover:bg-[#2b3e1a] transition-all duration-200"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* =========================
          PERSONALIZED PATHWAYS
      ========================== */}
      <section className="w-full min-h-screen flex flex-col items-end justify-center bg-color1 text-color2 px-6 sm:px-10 md:px-16 lg:px-24 py-20">
        <div className="max-w-3xl text-right space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
            Personalized <br /> Pathways
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-color2/90">
            Our cutting-edge AI analyzes your skills, interests, and learning style to create a unique educational
            plan that helps you achieve your goals.
          </p>

          <button
            onClick={() => navigate("/signup")}
            className="mt-4 px-6 py-3 bg-color2 text-color1 rounded-xl text-lg font-semibold hover:bg-[#f6db97] transition-all duration-200"
          >
            Explore Now
          </button>
        </div>
      </section>

      {/* =========================
          DISCOVER THE FUTURE OF EDUCATION
      ========================== */}
      <section className="w-full bg-color2 text-color1 flex flex-col items-center justify-center py-20 px-6 sm:px-10 md:px-16 lg:px-24 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-6">
          Discover the Future of Education
        </h2>

        <p className="max-w-2xl text-base sm:text-lg md:text-xl text-color1/80">
          Our AI Assistant analyzes your skills, interests, and learning style to craft a unique educational plan
          tailored for you.
        </p>
      </section>

      {/* =========================
          FEATURE CARDS SECTION
      ========================== */}
      <section className="w-full bg-color1 text-color2 py-20 px-6 sm:px-10 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="border border-color2 rounded-xl p-6 hover:bg-[#3e5b25] transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-4">Personalized Pathways</h3>
            <p className="text-color2/90">
              Our AI technology analyzes your skills, interests, and learning style to create a personalized educational plan.
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-color2 rounded-xl p-6 hover:bg-[#3e5b25] transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-4">Dynamic MCQs</h3>
            <p className="text-color2/90">
              Our AI-powered dynamic MCQs adapt to your learning progress, strengthening your understanding
              with every attempt.
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-color2 rounded-xl p-6 hover:bg-[#3e5b25] transition-all duration-300">
            <h3 className="text-2xl font-semibold mb-4">Competitive Exam Prep</h3>
            <p className="text-color2/90">
              Get personalized question sets and learning paths to help you master competitive exams with
              confidence.
            </p>
          </div>
        </div>
      </section>

      {/* =========================
          EMPOWERING LEARNERS
      ========================== */}
      <section className="w-full bg-color2 text-color1 flex flex-col items-start justify-center py-20 px-6 sm:px-10 md:px-16 lg:px-24">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-snug">
            Empowering Learners
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-color1/80">
            Our AI-powered Dynamic MCQs help learners significantly boost their learning outcomes with
            personalized performance tracking.
          </p>

          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-3 bg-color1 text-color2 rounded-xl text-lg font-semibold hover:bg-[#2b3e1a] transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </section>
    </>
  );
}
