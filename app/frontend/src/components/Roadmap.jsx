import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code, Database, Shield, Smartphone, Globe, Server, Layers, Brain, ClipboardList, Map, ArrowRight } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import GlobalThemeToggle from "./GlobalThemeToggle";
import "../styles/DevvoraStyles.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

const roadmaps = [
  {
    id: "full-stack",
    title: "Full-Stack Development",
    description: "Master both frontend and backend development",
    icon: <Layers className="w-8 h-8" />,
    color: "from-blue-500 to-purple-600",
    skills: ["React/Vue", "Node.js", "Databases", "APIs", "DevOps"]
  },
  {
    id: "frontend",
    title: "Frontend Development",
    description: "Create beautiful and interactive user interfaces",
    icon: <Globe className="w-8 h-8" />,
    color: "from-pink-500 to-rose-600",
    skills: ["HTML/CSS", "JavaScript", "React/Vue", "UI/UX", "Responsive Design"]
  },
  {
    id: "backend",
    title: "Backend Development",
    description: "Build robust server-side applications and APIs",
    icon: <Server className="w-8 h-8" />,
    color: "from-green-500 to-emerald-600",
    skills: ["Node.js/Python", "Databases", "APIs", "Authentication", "Cloud Services"]
  },
  {
    id: "mobile",
    title: "Mobile App Development",
    description: "Develop native and cross-platform mobile applications",
    icon: <Smartphone className="w-8 h-8" />,
    color: "from-orange-500 to-amber-600",
    skills: ["React Native", "Flutter", "iOS/Android", "Mobile UI", "App Store"]
  },
  {
    id: "database",
    title: "Database & Data Science",
    description: "Master data storage, analysis, and machine learning",
    icon: <Database className="w-8 h-8" />,
    color: "from-indigo-500 to-blue-600",
    skills: ["SQL/NoSQL", "Data Analysis", "Python", "Machine Learning", "Big Data"]
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    description: "Protect systems and data from digital threats",
    icon: <Shield className="w-8 h-8" />,
    color: "from-red-500 to-pink-600",
    skills: ["Network Security", "Ethical Hacking", "Cryptography", "Risk Assessment", "Compliance"]
  },
  {
    id: "devops",
    title: "DevOps & Cloud",
    description: "Streamline development and deployment processes",
    icon: <Code className="w-8 h-8" />,
    color: "from-teal-500 to-cyan-600",
    skills: ["Docker", "Kubernetes", "AWS/Azure", "CI/CD", "Infrastructure"]
  },
  {
    id: "ai-ml",
    title: "AI & Machine Learning",
    description: "Build intelligent systems and AI applications",
    icon: <Brain className="w-8 h-8" />,
    color: "from-purple-500 to-violet-600",
    skills: ["Python", "TensorFlow", "Neural Networks", "NLP", "Computer Vision"]
  }
];

const skillLevels = [
  {
    id: "beginner",
    title: "Beginner",
    description: "I'm new to programming and want to start from basics",
    duration: "Start with fundamentals"
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description: "I have some programming experience and want to advance",
    duration: "Build on existing knowledge"
  },
  {
    id: "expert",
    title: "Expert",
    description: "I'm experienced and want to master advanced concepts",
    duration: "Focus on advanced topics"
  }
];

const timelines = [
  { id: "1-month", title: "1 Month", description: "Intensive learning (4-6 hours/day)" },
  { id: "3-months", title: "3 Months", description: "Balanced pace (2-3 hours/day)" },
  { id: "6-months", title: "6 Months", description: "Steady progress (1-2 hours/day)" },
  { id: "1-year", title: "1 Year", description: "Flexible schedule (30 min - 1 hour/day)" }
];

export default function Roadmap() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: choice, 1: roadmap, 2: skill level, 3: timeline
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState(null);
  const [selectedTimeline, setSelectedTimeline] = useState(null);
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [error, setError] = useState(null);

  const handleRoadmapSelect = (roadmapId) => {
    setSelectedRoadmap(roadmapId);
    setStep(2);
  };

  const handleSkillLevelSelect = (skillLevel) => {
    setSelectedSkillLevel(skillLevel);
    setStep(3);
  };

  const handleJoinExam = async () => {
    if (!examCode.trim()) {
      setError("Please enter an exam code");
      return;
    }

    setValidatingCode(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/exams/validate-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ examCode: examCode.toUpperCase() })
      });

      const data = await res.json();

      if (res.ok) {
        navigate(`/exam/${data.data._id}`);
      } else {
        setError(data.message || "Invalid exam code");
      }
    } catch (err) {
      console.error("Exam validation error:", err);
      setError("Failed to validate exam code. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleTimelineSelect = async (timeline) => {
    setSelectedTimeline(timeline);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/roadmap-selection/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          selectedRoadmap,
          skillLevel: selectedSkillLevel,
          learningTimeline: timeline
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to dashboard
        navigate("/dashboard");
      } else {
        setError(data.message || "Failed to save preferences");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("Failed to save preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <section className="min-h-screen w-full flex flex-col items-center bg-gray-50 dark:bg-gradient-dark relative px-6 py-8">
      <GlobalThemeToggle />
      <AnimatedBackground />
      {/* Header */}
      <div className="w-full max-w-6xl mb-8 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-cream-100 mb-2">
            {step === 0 && "Welcome to Learning.AI"}
            {step === 1 && "Choose Your Learning Path"}
            {step === 2 && "What's Your Current Level?"}
            {step === 3 && "Select Your Timeline"}
          </h1>
          <p className="text-gray-600 dark:text-cream-200">
            {step === 0 && "How would you like to start your journey today?"}
            {step === 1 && "Select the technology path you want to master"}
            {step === 2 && "Help us customize your learning experience"}
            {step === 3 && "Choose a timeline that fits your schedule"}
          </p>
        </div>

        {/* Progress Bar */}
        {step > 0 && (
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= stepNum ? "bg-green-600 dark:bg-green-500 text-white" : "bg-gray-300 dark:bg-dark-300 text-gray-600 dark:text-cream-200"
                    }`}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-16 h-1 mx-2 ${step > stepNum ? "bg-green-600 dark:bg-green-500" : "bg-gray-300 dark:bg-dark-300"
                      }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 0: Initial Choice */}
      {step === 0 && (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          {/* Attend Test Option */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 dark:border-dark-300 p-8 flex flex-col items-center text-center group hover:border-green-500/50 transition-all duration-300">
            <div className="w-20 h-20 rounded-2xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 mb-6 group-hover:scale-110 transition-transform">
              <ClipboardList className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-cream-100 mb-4">Attend Test</h2>
            <p className="text-gray-600 dark:text-cream-200 mb-8">
              Have an exam code? Join a pre-configured test or assessment immediately.
            </p>
            <div className="w-full space-y-4">
              <input
                type="text"
                placeholder="Enter Exam Code (e.g. EXAM123)"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-300 border border-gray-200 dark:border-dark-200 text-gray-800 dark:text-cream-100 focus:ring-2 focus:ring-green-500 outline-none transition-all uppercase"
              />
              <button
                onClick={handleJoinExam}
                disabled={validatingCode}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {validatingCode ? "Validating..." : "Join Test"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Course Roadmap Option */}
          <div
            onClick={() => setStep(1)}
            className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-200 dark:border-dark-300 p-8 flex flex-col items-center text-center group hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Map className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-cream-100 mb-4">Course Roadmap</h2>
            <p className="text-gray-600 dark:text-cream-200 mb-8">
              New to the platform? Choose a learning path and get a customized 30-day roadmap.
            </p>
            <div className="mt-auto w-full">
              <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                Explore Roadmaps
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Roadmap Selection */}
      {step === 1 && (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {roadmaps.map((roadmap) => (
            <div
              key={roadmap.id}
              onClick={() => handleRoadmapSelect(roadmap.id)}
              className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${roadmap.color} flex items-center justify-center text-white mb-4`}>
                {roadmap.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-cream-100 mb-2">{roadmap.title}</h3>
              <p className="text-gray-600 dark:text-cream-200 text-sm mb-4">{roadmap.description}</p>
              <div className="space-y-1">
                {roadmap.skills.map((skill, index) => (
                  <span key={index} className="inline-block bg-gray-100 dark:bg-dark-300/50 text-gray-700 dark:text-cream-200 text-xs px-2 py-1 rounded mr-1 mb-1">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Skill Level Selection */}
      {step === 2 && (
        <div className="w-full max-w-4xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {skillLevels.map((level) => (
              <div
                key={level.id}
                onClick={() => handleSkillLevelSelect(level.id)}
                className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-dark-300 p-8 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl text-center"
              >
                <h3 className="text-2xl font-bold text-gray-800 dark:text-cream-100 mb-3">{level.title}</h3>
                <p className="text-gray-600 dark:text-cream-200 mb-4">{level.description}</p>
                <p className="text-sm text-green-600 dark:text-green-400 font-semibold">{level.duration}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={goBack}
              className="px-6 py-2 bg-gray-300 dark:bg-dark-300 text-gray-700 dark:text-cream-200 rounded-lg hover:bg-gray-400 dark:hover:bg-dark-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Timeline Selection */}
      {step === 3 && (
        <div className="w-full max-w-4xl relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timelines.map((timeline) => (
              <div
                key={timeline.id}
                onClick={() => handleTimelineSelect(timeline.id)}
                className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 cursor-pointer transform hover:scale-105 transition-all duration-200 hover:shadow-xl text-center"
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-cream-100 mb-3">{timeline.title}</h3>
                <p className="text-gray-600 dark:text-cream-200 text-sm">{timeline.description}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-100 dark:bg-red-400/20 border border-red-400 dark:border-red-400/30 text-red-700 dark:text-red-300 rounded-lg text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center mt-8">
            <button
              onClick={goBack}
              disabled={loading}
              className="px-6 py-2 bg-gray-300 dark:bg-dark-300 text-gray-700 dark:text-cream-200 rounded-lg hover:bg-gray-400 dark:hover:bg-dark-200 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>

          {loading && (
            <div className="flex justify-center mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400"></div>
            </div>
          )}
        </div>
      )}

      {error && step < 3 && (
        <div className="mt-6 p-4 bg-red-100 dark:bg-red-400/20 border border-red-400 dark:border-red-400/30 text-red-700 dark:text-red-300 rounded-lg text-center relative z-10">
          {error}
        </div>
      )}
    </section>
  );
}