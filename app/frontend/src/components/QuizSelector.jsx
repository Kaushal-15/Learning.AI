import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Start a Quiz</h2>
        <p className="text-gray-600">Test your {roadmapCategory || 'development'} knowledge</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Display selected roadmap */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Learning Path
          </label>
          <div className="px-4 py-3 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="font-semibold text-indigo-900">
                {roadmapCategory || 'Select a roadmap first'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Questions will be from your selected roadmap
          </p>
        </div>

        {/* Difficulty Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['easy', 'medium', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 py-3 rounded-lg font-semibold capitalize transition ${difficulty === level
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Number of Questions: {questionCount}
          </label>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5</span>
            <span>15</span>
            <span>30</span>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={startQuiz}
          disabled={loading || !roadmapCategory}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? 'Starting...' : 'Start Quiz 🚀'}
        </button>

        {!roadmapCategory && (
          <p className="text-sm text-center text-gray-500">
            Complete your <button onClick={() => navigate('/roadmap')} className="text-indigo-600 underline">roadmap selection</button> to start
          </p>
        )}
      </div>
    </div>
  );
}
