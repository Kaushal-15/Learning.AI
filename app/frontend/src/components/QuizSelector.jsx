import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Target, BookOpen, ArrowRight, Zap, Trophy, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedBackground from './AnimatedBackground';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function QuizSelector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roadmapCategory, setRoadmapCategory] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dashboard-dark');
    } else {
      document.documentElement.classList.remove('dashboard-dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/me`, {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        console.log('QuizSelector - User profile:', data.user);
        if (data.success && data.user) {
          setUserProfile(data.user);

          // Map user's roadmap to category
          // Backend stores: 'frontend', 'backend', 'full-stack', 'mobile', 'ai-ml', 'devops', 'database', 'cybersecurity'
          const roadmapMap = {
            'frontend': 'Frontend',
            'backend': 'Backend',
            'full-stack': 'Full-Stack',
            'mobile': 'Mobile',
            'ai-ml': 'AI & ML',
            'devops': 'DevOps',
            'cybersecurity': 'Security',
            'database': 'Database'
          };

          const category = roadmapMap[data.user.selectedRoadmap] || '';
          console.log('QuizSelector - Selected roadmap:', data.user.selectedRoadmap, '-> Category:', category);
          setRoadmapCategory(category);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  const startQuiz = () => {
    if (!roadmapCategory) {
      setError('Please complete roadmap selection first.');
      return;
    }

    navigate('/quiz', {
      state: {
        category: roadmapCategory,
        difficulty,
        limit: questionCount,
        roadmapType: userProfile?.selectedRoadmap
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 relative transition-colors duration-300">
      <AnimatedBackground />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 bg-white dashboard-dark:bg-[#0a0a0a] border-2 border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        title={isDarkMode ? "Light Mode" : "Dark Mode"}
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-[#ecd69f]" /> : <Moon className="w-5 h-5 text-gray-700" />}
      </button>

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl">
          <div className="bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-xl p-8 border border-gray-200 dashboard-dark:border-[#1a1a1a] transition-all duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dashboard-dark:text-[#ecd69f] mb-2">Start a Quiz</h2>
              <p className="text-gray-600 dashboard-dark:text-[#b8a67d]">Test your {roadmapCategory || 'development'} knowledge</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 dashboard-dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 dashboard-dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Display selected roadmap */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dashboard-dark:text-[#ecd69f] mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Your Learning Path
                </label>
                <div className="px-4 py-4 bg-orange-50 dashboard-dark:bg-orange-900/20 border-2 border-orange-100 dashboard-dark:border-orange-500/30 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dashboard-dark:bg-orange-800 rounded-lg">
                      <BookOpen className="w-5 h-5 text-orange-600 dashboard-dark:text-orange-400" />
                    </div>
                    <div>
                      <span className="font-bold text-orange-900 dashboard-dark:text-orange-100 text-lg block">
                        {roadmapCategory || 'Select a roadmap first'}
                      </span>
                      <span className="text-xs text-orange-600 dashboard-dark:text-orange-400">
                        Questions tailored to your path
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dashboard-dark:text-[#ecd69f] mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-4 py-3 rounded-2xl font-semibold capitalize transition-all duration-300 ${difficulty === level
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 transform -translate-y-1'
                        : 'bg-gray-100 dashboard-dark:bg-[#1a1a1a] text-gray-600 dashboard-dark:text-[#b8a67d] hover:bg-gray-200 dashboard-dark:hover:bg-[#2a2a2a]'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dashboard-dark:text-[#ecd69f] mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Number of Questions
                  </span>
                  <span className="bg-orange-100 dashboard-dark:bg-orange-900/50 text-orange-700 dashboard-dark:text-orange-300 px-3 py-1 rounded-full text-xs font-bold">
                    {questionCount} Questions
                  </span>
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dashboard-dark:bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-orange-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dashboard-dark:text-[#b8a67d] mt-2 font-medium">
                    <span>5</span>
                    <span>15</span>
                    <span>30</span>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={startQuiz}
                disabled={loading || !roadmapCategory}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  'Starting...'
                ) : (
                  <>
                    Start Quiz
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {!roadmapCategory && (
                <p className="text-sm text-center text-gray-500 dashboard-dark:text-[#b8a67d]">
                  Complete your <button onClick={() => navigate('/roadmap')} className="text-orange-600 dashboard-dark:text-orange-400 font-medium hover:underline">roadmap selection</button> to start
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
