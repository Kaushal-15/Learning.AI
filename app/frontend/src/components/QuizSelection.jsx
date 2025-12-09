import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Target,
  Brain,
  Play,
  Trophy,
  Star,
  Zap
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import Sidebar from "./Sidebar";
import "../styles/DevvoraStyles.css";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";



const quizTypes = [
  {
    id: 'quick',
    name: 'Quick Quiz',
    difficulty: 'easy',
    questions: 10,
    time: 15,
    description: 'Fast-paced quiz for quick practice',
    icon: <Zap className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'standard',
    name: 'Standard Quiz',
    difficulty: 'medium',
    questions: 20,
    time: 30,
    description: 'Balanced quiz for comprehensive practice',
    icon: <Target className="w-8 h-8" />,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'challenge',
    name: 'Challenge Quiz',
    difficulty: 'hard',
    questions: 15,
    time: 25,
    description: 'Advanced questions for skill testing',
    icon: <Brain className="w-8 h-8" />,
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'expert',
    name: 'Expert Quiz',
    difficulty: 'advanced',
    questions: 12,
    time: 20,
    description: 'Expert-level questions for mastery',
    icon: <Trophy className="w-8 h-8" />,
    color: 'from-orange-500 to-red-600'
  },
  {
    id: 'mixed',
    name: 'Mixed Quiz',
    difficulty: 'mixed',
    questions: 25,
    time: 40,
    description: 'All difficulty levels combined',
    icon: <Star className="w-8 h-8" />,
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'adaptive',
    name: 'Adaptive Quiz',
    difficulty: 'adaptive',
    questions: 20,
    time: 35,
    description: 'AI-powered difficulty adjustment in real-time',
    icon: <Brain className="w-8 h-8" />,
    color: 'from-gradient-to-r from-purple-600 to-pink-600',
    isAdaptive: true
  }
];

export default function QuizSelection() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [selectedQuizType, setSelectedQuizType] = useState(null);

  useEffect(() => {
    const fetchUserAndQuizzes = async () => {
      try {
        // Fetch user data
        const userRes = await fetch(`${API_BASE}/profile/me`, {
          credentials: 'include'
        });
        const userData = await userRes.json();

        if (userData.success) {
          setUser(userData.user);

          // Fetch recent quizzes
          const quizRes = await fetch(`${API_BASE}/quiz?limit=5`, {
            credentials: 'include'
          });
          const quizData = await quizRes.json();

          if (quizData.success) {
            setRecentQuizzes(quizData.data);
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndQuizzes();
  }, [navigate]);

  const handleQuizTypeClick = (quizType) => {
    if (quizType.isAdaptive) {
      // For adaptive quiz, go directly to creation
      createQuiz(quizType, true);
    } else {
      // For regular quizzes, show mode selection modal
      setSelectedQuizType(quizType);
      setShowModeSelection(true);
    }
  };

  const createQuiz = async (quizType, isAdaptive = false) => {
    setCreating(true);
    setShowModeSelection(false);

    try {
      const response = await fetch(`${API_BASE}/quiz/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          roadmapType: user?.selectedRoadmap || 'frontend',
          difficulty: quizType.difficulty === 'adaptive' ? 'easy' : quizType.difficulty,
          questionCount: quizType.questions,
          timeLimit: quizType.time,
          adaptiveDifficulty: isAdaptive
        })
      });

      const data = await response.json();

      if (data.success) {
        navigate(`/quiz/${data.data._id}`);
      } else {
        alert('Failed to create quiz. Please try again.');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getRoadmapTitle = (roadmap) => {
    const titles = {
      'frontend': 'Frontend Development',
      'backend': 'Backend Development',
      'full-stack': 'Full-Stack Development',
      'mobile': 'Mobile Development',
      'ai-ml': 'AI & Machine Learning',
      'devops': 'DevOps & Cloud',
      'database': 'Database & Data Science',
      'cybersecurity': 'Cybersecurity'
    };
    return titles[roadmap] || roadmap;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-cream-300 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-cream-100">Loading quiz options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
          <AnimatedBackground />

          {/* Header */}
          <header className="bg-white/90 dark:bg-dark-400/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-dark-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="p-2 text-gray-400 dark:text-cream-200 hover:text-gray-600 dark:hover:text-cream-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100">Interactive Quiz</h1>
                  <p className="text-gray-600 dark:text-cream-200">
                    Test your knowledge in {getRoadmapTitle(user?.selectedRoadmap)}
                  </p>
                </div>
              </div>
            </div>
          </header>





          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Quiz Types */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100 mb-6">Choose Your Quiz Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quizTypes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 hover:shadow-xl transition-all duration-200"
                    >
                      <div className={`w-16 h-16 bg-gradient-to-r ${quiz.color} rounded-lg flex items-center justify-center text-white mb-4`}>
                        {quiz.icon}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-cream-100 mb-2">{quiz.name}</h3>
                      <p className="text-gray-600 dark:text-cream-200 text-sm mb-4">{quiz.description}</p>

                      <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-cream-200">Questions:</span>
                          <span className="font-semibold text-gray-900 dark:text-cream-100">{quiz.questions}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-cream-200">Time Limit:</span>
                          <span className="font-semibold text-gray-900 dark:text-cream-100">{quiz.time} minutes</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-cream-200">Difficulty:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                            quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              quiz.difficulty === 'hard' ? 'bg-orange-100 text-orange-700' :
                                quiz.difficulty === 'advanced' ? 'bg-red-100 text-red-700' :
                                  'bg-purple-100 text-purple-700'
                            }`}>
                            {quiz.difficulty}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleQuizTypeClick(quiz)}
                        disabled={creating}
                        className={`w-full py-3 px-4 bg-gradient-to-r ${quiz.color} text-white rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Play className="w-4 h-4" />
                        {creating ? 'Creating...' : quiz.isAdaptive ? 'Start Adaptive Quiz' : 'Select Mode'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiz History */}
              <div className="lg:col-span-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100 mb-6">Quiz History</h2>
                <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6">
                  {recentQuizzes.length > 0 ? (
                    <div className="space-y-4">
                      {recentQuizzes.map((quiz) => (
                        <div
                          key={quiz._id}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/quiz/${quiz._id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-800 text-sm">{quiz.title}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${quiz.status === 'completed' ? 'bg-green-100 text-green-700' :
                              quiz.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                              {quiz.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>Accuracy: {quiz.accuracy}%</div>
                            <div>Points: {quiz.points}</div>
                            <div>Questions: {quiz.correctAnswers}/{quiz.totalQuestions}</div>
                            <div>Time: {quiz.timeLimit}m</div>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            {new Date(quiz.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No quizzes taken yet</p>
                      <p className="text-xs">Start your first quiz to see history here!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mode Selection Modal */}
          {showModeSelection && selectedQuizType && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${selectedQuizType.color} rounded-lg flex items-center justify-center text-white mx-auto mb-4`}>
                    {selectedQuizType.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedQuizType.name}</h3>
                  <p className="text-gray-600">Choose your quiz mode</p>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Static Mode */}
                  <button
                    onClick={() => createQuiz(selectedQuizType, false)}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Static Mode</h4>
                        <p className="text-sm text-gray-600">Fixed difficulty throughout the quiz</p>
                      </div>
                    </div>
                  </button>

                  {/* Adaptive Mode */}
                  <button
                    onClick={() => createQuiz(selectedQuizType, true)}
                    className="w-full p-4 border-2 border-purple-200 bg-purple-50 rounded-lg hover:border-purple-300 hover:bg-purple-100 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Adaptive Mode ✨</h4>
                        <p className="text-sm text-gray-600">AI adjusts difficulty based on your performance</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded inline-block">
                      Recommended for personalized learning
                    </div>
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h5 className="font-semibold text-gray-800 mb-2">How Adaptive Mode Works:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Starts at {selectedQuizType.difficulty} difficulty</li>
                    <li>• Increases difficulty after 2 quick correct answers</li>
                    <li>• Decreases difficulty immediately after wrong answers</li>
                    <li>• Provides optimal learning challenge</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowModeSelection(false)}
                  className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )};
        </div>
      </div>
    </div>
  );
}