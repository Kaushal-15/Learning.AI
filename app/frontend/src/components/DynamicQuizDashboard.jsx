import { useState, useEffect } from "react";
import {
  Brain,
  Target,
  TrendingUp,
  Clock,
  Award,
  Zap,
  BookOpen,
  BarChart3,
  Flame
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ThemeToggle from "./ThemeToggle";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function DynamicQuizDashboard({ roadmapType = 'frontend' }) {
  const [insights, setInsights] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [roadmapType]);

  const fetchDashboardData = async () => {
    try {
      const [insightsRes, previewRes, recommendationsRes] = await Promise.all([
        fetch(`${API_BASE}/quiz/insights/${roadmapType}`, { credentials: 'include' }),
        fetch(`${API_BASE}/quiz/preview?roadmapType=${roadmapType}&questionCount=10`, { credentials: 'include' }),
        fetch(`${API_BASE}/quiz/recommendations?roadmapType=${roadmapType}`, { credentials: 'include' })
      ]);

      const [insightsData, previewData, recommendationsData] = await Promise.all([
        insightsRes.json(),
        previewRes.json(),
        recommendationsRes.json()
      ]);

      if (insightsData.success) setInsights(insightsData.data);
      if (previewData.success) setPreview(previewData.data);
      if (recommendationsData.success) setRecommendations(recommendationsData.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative p-6">
        <AnimatedBackground />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 dark:bg-dark-300 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-300 dark:bg-dark-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative p-6">
      <AnimatedBackground />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-cream-100 mb-2">
            Dynamic MCQ Dashboard
          </h1>
          <p className="text-gray-600 dark:text-cream-200">
            Personalized learning experience for {roadmapType.charAt(0).toUpperCase() + roadmapType.slice(1)}
          </p>
        </div>

        {/* Learning Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {/* Streak Card */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 border-l-4 border-orange-500 dark:border-orange-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-cream-200">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">
                  {insights?.streak?.current || 0}
                </p>
                <p className="text-xs text-gray-500">
                  Best: {insights?.streak?.longest || 0}
                </p>
              </div>
              <Flame className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          {/* Daily Progress */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 border-l-4 border-green-500 dark:border-green-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-cream-200">Daily Progress</p>
                <p className="text-3xl font-bold text-green-600">
                  {insights?.dailyProgress?.percentage || 0}%
                </p>
                <p className="text-xs text-gray-500">
                  {insights?.dailyProgress?.completed || 0}/{insights?.dailyProgress?.goal || 10}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 border-l-4 border-blue-500 dark:border-blue-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-cream-200">Accuracy</p>
                <p className="text-3xl font-bold text-blue-600">
                  {insights?.accuracy || 0}%
                </p>
                <p className="text-xs text-gray-500">
                  {insights?.totalQuestions || 0} questions
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          {/* Adaptive Level */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6 border-l-4 border-purple-500 dark:border-purple-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-cream-200">Current Level</p>
                <p className="text-2xl font-bold text-purple-600 capitalize">
                  {insights?.adaptiveLevel || 'Easy'}
                </p>
                <p className="text-xs text-gray-500">
                  {insights?.learningVelocity || 'Getting Started'}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Question Bank Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Question Distribution */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-cream-100 mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-blue-500" />
              Question Bank Status
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Fresh Questions</span>
                <span className="text-lg font-bold text-green-600">
                  {preview?.freshQuestions || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-800">Need Review</span>
                <span className="text-lg font-bold text-orange-600">
                  {preview?.reviewQuestions || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-dark-300/50 rounded-lg">
                <span className="text-sm font-medium text-gray-800 dark:text-cream-100">Total Available</span>
                <span className="text-lg font-bold text-gray-600 dark:text-cream-200">
                  {preview?.totalAvailable || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Personalized Recommendations */}
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-cream-100 mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Smart Recommendations
            </h3>

            <div className="space-y-3">
              {recommendations?.suggestions?.map((suggestion, index) => (
                <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-3 border-blue-400">
                  <p className="text-sm text-blue-800">{suggestion}</p>
                </div>
              )) || (
                  <p className="text-gray-500 text-sm">Complete a few quizzes to get personalized recommendations!</p>
                )}
            </div>

            {insights?.nextMilestone && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg border-l-3 border-purple-400">
                <p className="text-sm font-medium text-purple-800">Next Milestone:</p>
                <p className="text-sm text-purple-700">{insights.nextMilestone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Topic Performance */}
        {preview?.topicDistribution && (
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-dark-300 p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-cream-100 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Topic Distribution
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(preview.topicDistribution).map(([topic, stats]) => (
                <div key={topic} className="p-4 border border-gray-200 dark:border-dark-300 rounded-lg hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-800 dark:text-cream-100 mb-2">{topic}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-cream-200">Total:</span>
                      <span className="font-medium text-gray-900 dark:text-cream-100">{stats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Fresh:</span>
                      <span className="font-medium text-green-600">{stats.fresh}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-600">Review:</span>
                      <span className="font-medium text-orange-600">{stats.review}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Features Highlight */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">🚀 Dynamic MCQ Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2" />
              <h4 className="font-semibold">Adaptive Difficulty</h4>
              <p className="text-sm opacity-90">Auto-adjusts based on performance</p>
            </div>
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2" />
              <h4 className="font-semibold">Smart Selection</h4>
              <p className="text-sm opacity-90">Prioritizes weak areas</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2" />
              <h4 className="font-semibold">Spaced Repetition</h4>
              <p className="text-sm opacity-90">Reviews incorrect answers</p>
            </div>
            <div className="text-center">
              <Award className="h-8 w-8 mx-auto mb-2" />
              <h4 className="font-semibold">Progress Tracking</h4>
              <p className="text-sm opacity-90">Detailed analytics & streaks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}