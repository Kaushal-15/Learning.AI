import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  Play,
  Book,
  Target,
  Trophy,
  ArrowLeft,
  Star,
  Zap,
  Code,
  Database,
  Globe,
  Server,
  Smartphone,
  Shield,
  Layers,
  Brain,
  Layout
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import Sidebar from "./Sidebar";
import Projects from "./Projects";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

const roadmapIcons = {
  'full-stack': <Layers className="w-6 h-6" />,
  'frontend': <Globe className="w-6 h-6" />,
  'backend': <Server className="w-6 h-6" />,
  'mobile': <Smartphone className="w-6 h-6" />,
  'database': <Database className="w-6 h-6" />,
  'cybersecurity': <Shield className="w-6 h-6" />,
  'devops': <Code className="w-6 h-6" />,
  'ai-ml': <Brain className="w-6 h-6" />
};

const roadmapColors = {
  'full-stack': 'from-blue-500 to-purple-600',
  'frontend': 'from-pink-500 to-rose-600',
  'backend': 'from-green-500 to-emerald-600',
  'mobile': 'from-orange-500 to-amber-600',
  'database': 'from-indigo-500 to-blue-600',
  'cybersecurity': 'from-red-500 to-pink-600',
  'devops': 'from-teal-500 to-cyan-600',
  'ai-ml': 'from-purple-500 to-violet-600'
};

// Fetch learning roadmap data from backend - dynamic learning paths
const fetchLearningRoadmap = async (roadmapType, learningTimeline) => {
  try {
    const res = await fetch(`${API_BASE}/daily-learning/${roadmapType}`, {
      credentials: "include"
    });
    const data = await res.json();

    if (res.ok && data.success && data.data) {
      // Transform the daily learning data into weeks structure
      const learningContent = data.data;

      // Determine target weeks based on timeline
      let targetWeeks = 4; // Default
      if (learningTimeline === '3-months') targetWeeks = 12;
      else if (learningTimeline === '6-months') targetWeeks = 24;
      else if (learningTimeline === '1-year') targetWeeks = 52;

      // Group by weeks dynamically
      const weeksMap = new Map();

      // Calculate distribution
      const totalDays = learningContent.length;
      const daysPerWeek = Math.ceil(totalDays / targetWeeks);

      learningContent.forEach((dayContent, index) => {
        let weekNum;
        if (totalDays < targetWeeks) {
          weekNum = Math.floor((index / totalDays) * targetWeeks) + 1;
        } else {
          weekNum = Math.floor(index / daysPerWeek) + 1;
        }

        if (weekNum > targetWeeks) weekNum = targetWeeks;

        if (!weeksMap.has(weekNum)) {
          weeksMap.set(weekNum, {
            week: weekNum,
            title: `Week ${weekNum} Learning`,
            description: dayContent.topic || 'Continue your learning journey',
            days: []
          });
        }

        const getTypeFromDifficulty = (difficulty) => {
          if (!difficulty) return 'theory';
          const types = ['theory', 'practice', 'project', 'review'];
          const index = ['Beginner', 'Intermediate', 'Advanced'].indexOf(difficulty);
          return types[Math.min(index + 1, types.length - 1)] || 'theory';
        };

        weeksMap.get(weekNum).days.push({
          day: dayContent.day,
          title: dayContent.topic,
          duration: '2-3 hours', // Default duration
          type: getTypeFromDifficulty(dayContent.difficultyLevel),
          completed: false,
          learningGoals: dayContent.learningGoals,
          learningOptions: dayContent.learningOptions,
          miniRecap: dayContent.miniRecap,
          practiceSuggestions: dayContent.practiceSuggestions,
          optionalChallenge: dayContent.optionalChallenge
        });
      });

      for (let i = 1; i <= targetWeeks; i++) {
        if (!weeksMap.has(i)) {
          weeksMap.set(i, {
            week: i,
            title: `Week ${i} - Review & Practice`,
            description: 'Take this week to review previous concepts and practice.',
            days: []
          });
        }
      }

      const weeks = Array.from(weeksMap.values()).sort((a, b) => a.week - b.week);

      const roadmapRes = await fetch(`${API_BASE}/roadmaps/${roadmapType}`, {
        credentials: "include"
      });
      const roadmapData = await roadmapRes.json();

      return {
        title: roadmapData.success ? roadmapData.data.title : roadmapType,
        description: roadmapData.success ? roadmapData.data.description : 'Your learning journey',
        weeks: weeks
      };
    }
    return null;
  } catch (err) {
    console.error("Error fetching learning roadmap:", err);
    return null;
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'theory': return <Book className="w-4 h-4" />;
    case 'practice': return <Code className="w-4 h-4" />;
    case 'project': return <Target className="w-4 h-4" />;
    case 'review': return <Star className="w-4 h-4" />;
    default: return <Circle className="w-4 h-4" />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case 'theory': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'practice': return 'bg-green-100 text-green-700 border-green-200';
    case 'project': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'review': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export default function Learn() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'projects'

  // Apply dashboard-dark class when theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dashboard-dark');
    } else {
      document.documentElement.classList.remove('dashboard-dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile/me`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (res.ok && data.success && data.user) {
          setUser(data.user);

          if (!data.user.hasCompletedOnboarding) {
            navigate("/roadmap");
            return;
          }

          if (data.user.selectedRoadmap) {
            const roadmap = await fetchLearningRoadmap(
              data.user.selectedRoadmap,
              data.user.learningTimeline || '3-months'
            );
            if (roadmap) {
              setRoadmapData(roadmap);
            }
          }
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (user?.selectedRoadmap && roadmapData) {
        try {
          const res = await fetch(`${API_BASE}/progress/${user.selectedRoadmap}`, {
            credentials: 'include'
          });
          const data = await res.json();

          if (data.success && data.data) {
            const completedSet = new Set();
            data.data.completedLessons.forEach(lesson => {
              completedSet.add(lesson.lessonId);
            });
            setCompletedTasks(completedSet);
          }
        } catch (err) {
          console.error('Error fetching progress:', err);
        }
      }
    };

    fetchProgress();
  }, [user?.selectedRoadmap, roadmapData]);

  const toggleTaskCompletion = (weekIndex, dayIndex) => {
    const taskId = `${weekIndex}-${dayIndex}`;
    const newCompleted = new Set(completedTasks);

    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }

    setCompletedTasks(newCompleted);

    const updateBackend = async () => {
      try {
        await fetch(`${API_BASE}/progress/complete-lesson`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            roadmapId: user.selectedRoadmap,
            lessonId: taskId,
            timeSpent: 60
          })
        });
      } catch (err) {
        console.error('Error saving progress:', err);
        setCompletedTasks(prev => {
          const reverted = new Set(prev);
          if (reverted.has(taskId)) reverted.delete(taskId);
          else reverted.add(taskId);
          return reverted;
        });
      }
    };

    updateBackend();
  };

  const getWeekProgress = (week, weekIndex) => {
    const totalTasks = week.days.length;
    if (totalTasks === 0) return 0;
    const completedCount = week.days.filter((_, dayIndex) =>
      completedTasks.has(`${weekIndex}-${dayIndex}`)
    ).length;
    return Math.round((completedCount / totalTasks) * 100);
  };

  const getTotalProgress = () => {
    if (!roadmapData || !roadmapData.weeks) return 0;
    const totalTasks = roadmapData.weeks.reduce((sum, week) => sum + week.days.length, 0);
    if (totalTasks === 0) return 0;
    const completedCount = Array.from(completedTasks).length;
    return Math.round((completedCount / totalTasks) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dashboard-dark:bg-black relative flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dashboard-dark:text-[#ecd69f]">Loading your learning path...</p>
        </div>
      </div>
    );
  }

  if (!roadmapData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#FFECC0] via-[#f9f4e3] to-[#344F1F]">
        <div className="text-center">
          <p className="text-gray-700">No learning path found. Please complete onboarding first.</p>
          <button
            onClick={() => navigate("/roadmap")}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Complete Setup
          </button>
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
        <div className="min-h-screen bg-gray-50 relative learn-page-container">
          {/* Header */}
          <header className="bg-white dashboard-dark:bg-[#0a0a0a] shadow-sm border-b border-gray-200 dashboard-dark:border-[#1a1a1a] transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                      {roadmapIcons[user?.selectedRoadmap]}
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900 dashboard-dark:text-[#ecd69f]">{roadmapData.title}</h1>
                      <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d]">{roadmapData.description}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500 dashboard-dark:text-[#ecd69f]">{getTotalProgress()}%</div>
                    <div className="text-xs text-gray-500 dashboard-dark:text-[#b8a67d]">Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dashboard-dark:text-[#ecd69f]">{Array.from(completedTasks).length}</div>
                    <div className="text-xs text-gray-500 dashboard-dark:text-[#b8a67d]">Completed</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pb-4">
                <div className="w-full bg-gray-200 dashboard-dark:bg-[#1a1a1a] rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getTotalProgress()}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar - Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-sm border border-gray-200 dashboard-dark:border-[#1a1a1a] p-6 sticky top-8 transition-all duration-300 hover:shadow-lg space-y-6">

                  {/* View Selector */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] mb-4 flex items-center gap-2">
                      <Layout className="w-5 h-5 text-[#344F1F]" />
                      View
                    </h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setViewMode('timeline')}
                        className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border-2 ${viewMode === 'timeline'
                          ? 'bg-orange-50 border-orange-500 text-orange-700 dashboard-dark:bg-orange-900/20 dashboard-dark:text-orange-400'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600 dashboard-dark:bg-[#1a1a1a] dashboard-dark:text-[#b8a67d]'
                          }`}
                      >
                        <Calendar className="w-5 h-5" />
                        <span className="font-medium">Timeline</span>
                      </button>
                      <button
                        onClick={() => setViewMode('projects')}
                        className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 border-2 ${viewMode === 'projects'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 dashboard-dark:bg-purple-900/20 dashboard-dark:text-purple-400'
                          : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600 dashboard-dark:bg-[#1a1a1a] dashboard-dark:text-[#b8a67d]'
                          }`}
                      >
                        <Code className="w-5 h-5" />
                        <span className="font-medium">Capstone Projects</span>
                      </button>
                    </div>
                  </div>

                  {/* Timeline Navigation (Only show in timeline mode) */}
                  {viewMode === 'timeline' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#344F1F]" />
                        Weeks
                      </h3>

                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {roadmapData.weeks.map((week, index) => {
                          const progress = getWeekProgress(week, index);
                          const isActive = currentWeek === week.week;

                          return (
                            <div
                              key={week.week}
                              onClick={() => setCurrentWeek(week.week)}
                              className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${isActive
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-500 shadow-lg'
                                : 'bg-gray-50 dashboard-dark:bg-[#0a0a0a] hover:bg-gray-100 dashboard-dark:hover:bg-[#1a1a1a] text-gray-700 dashboard-dark:text-[#ecd69f] border-gray-200 dashboard-dark:border-[#1a1a1a] hover:border-orange-300'
                                }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">Week {week.week}</span>
                                <span className="text-sm">{progress}%</span>
                              </div>
                              <div className="text-sm opacity-90 mb-3 truncate">{week.title}</div>
                              <div className={`w-full rounded-full h-1.5 ${isActive ? 'bg-white bg-opacity-30' : 'bg-gray-200 dashboard-dark:bg-[#1a1a1a]'}`}>
                                <div
                                  className={`h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-white' : 'bg-gradient-to-r from-orange-500 to-orange-600'
                                    }`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="lg:col-span-3">
                {viewMode === 'projects' ? (
                  <Projects roadmapId={user?.selectedRoadmap} />
                ) : (
                  roadmapData.weeks
                    .filter(week => week.week === currentWeek)
                    .map((week, weekIndex) => (
                      <div key={week.week} className="space-y-6">
                        {/* Week Header */}
                        <div className="bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-sm border border-gray-200 dashboard-dark:border-[#1a1a1a] p-6 transition-all duration-300">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                              <Trophy className="w-6 h-6" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-gray-900 dashboard-dark:text-[#ecd69f]">Week {week.week}: {week.title}</h2>
                              <p className="text-gray-600 dashboard-dark:text-[#b8a67d]">{week.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6 text-sm text-gray-500 dashboard-dark:text-[#b8a67d]">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                <span>{week.days.reduce((sum, day) => sum + parseInt(day.duration), 0)} hours total</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-orange-500" />
                                <span>{week.days.length} tasks</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-500" />
                                <span>{getWeekProgress(week, weekIndex)}% complete</span>
                              </div>
                            </div>

                            {/* Read Week Overview Button */}
                            <button
                              onClick={() => navigate('/LearnPaths', {
                                state: {
                                  roadmapId: user?.selectedRoadmap,
                                  week: week.week,
                                  day: 1,
                                  dayData: week.days[0] || { title: week.title, topic: week.title },
                                  roadmapTitle: roadmapData.title,
                                  weekOverview: true
                                }
                              })}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                              <Book className="w-4 h-4" />
                              Read
                            </button>
                          </div>
                        </div>

                        {/* Daily Tasks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {week.days.map((day, dayIndex) => {
                            const taskId = `${weekIndex}-${dayIndex}`;
                            const isCompleted = completedTasks.has(taskId);

                            return (
                              <div
                                key={day.day}
                                className={`bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-sm border-2 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isCompleted ? 'border-green-500 bg-green-50 dashboard-dark:bg-green-900/20' : 'border-gray-200 dashboard-dark:border-[#1a1a1a]'
                                  }`}
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg border-2 ${getTypeColor(day.type)}`}>
                                      {getTypeIcon(day.type)}
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d]">Day {day.day}</div>
                                      <h3 className="font-semibold text-gray-800 dashboard-dark:text-[#ecd69f]">{day.title}</h3>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => toggleTaskCompletion(weekIndex, dayIndex)}
                                    className={`p-2 rounded-full transition-all duration-300 ${isCompleted
                                      ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                                      : 'bg-gray-200 dashboard-dark:bg-[#1a1a1a] text-gray-400 dashboard-dark:text-[#b8a67d] hover:bg-gray-300 dashboard-dark:hover:bg-[#2a2a2a]'
                                      }`}
                                  >
                                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                  </button>
                                </div>

                                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {day.duration}
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(day.type)}`}>
                                    {day.type.charAt(0).toUpperCase() + day.type.slice(1)}
                                  </span>
                                </div>
                                <button
                                  onClick={() => navigate('/LearnPaths', {
                                    state: {
                                      roadmapId: user?.selectedRoadmap,
                                      week: week.week,
                                      day: day.day,
                                      dayData: day,
                                      roadmapTitle: roadmapData.title
                                    }
                                  })}
                                  className={`w-full py-3 px-4 rounded-2xl font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg ${isCompleted
                                    ? 'bg-green-100 dashboard-dark:bg-green-900/30 text-green-700 dashboard-dark:text-green-400 hover:bg-green-200 dashboard-dark:hover:bg-green-900/40'
                                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                                    }`}
                                >
                                  <Play className="w-4 h-4" />
                                  {isCompleted ? 'Review' : 'Start Learning'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}