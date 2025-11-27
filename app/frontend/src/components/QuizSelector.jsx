import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Target, BookOpen, ArrowRight, Zap, Trophy } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AnimatedBackground from './AnimatedBackground';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function QuizSelector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roadmapCategory, setRoadmapCategory] = useState('');
  const [userProfile, setUserProfile] = useState(null);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative transition-colors duration-300">
      <AnimatedBackground />

      {/* Header with Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Start a Quiz</h2>
              <p className="text-gray-600 dark:text-gray-400">Test your {roadmapCategory || 'development'} knowledge</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Display selected roadmap */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Your Learning Path
                </label>
                <div className="px-4 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-500/30 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                      <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <span className="font-bold text-indigo-900 dark:text-indigo-100 text-lg block">
                        {roadmapCategory || 'Select a roadmap first'}
                      </span>
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">
                        Questions tailored to your path
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-4 py-3 rounded-xl font-semibold capitalize transition-all duration-200 ${difficulty === level
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 transform -translate-y-1'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Number of Questions
                  </span>
                  <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold">
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
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
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
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
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
                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Complete your <button onClick={() => navigate('/roadmap')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">roadmap selection</button> to start
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
