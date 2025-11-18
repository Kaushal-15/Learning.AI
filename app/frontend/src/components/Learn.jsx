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
  Brain
} from "lucide-react";

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

// Sample learning roadmap data - this would come from your backend
const getLearningRoadmap = (roadmapType, timeline, skillLevel) => {
  const baseRoadmaps = {
    'full-stack': {
      title: 'Full-Stack Development',
      description: 'Master both frontend and backend development',
      weeks: [
        {
          week: 1,
          title: 'HTML & CSS Fundamentals',
          description: 'Build solid foundation in web markup and styling',
          days: [
            { day: 1, title: 'HTML Structure & Semantics', duration: '2 hours', type: 'theory', completed: false },
            { day: 2, title: 'CSS Basics & Selectors', duration: '2 hours', type: 'theory', completed: false },
            { day: 3, title: 'CSS Flexbox Layout', duration: '3 hours', type: 'practice', completed: false },
            { day: 4, title: 'CSS Grid System', duration: '3 hours', type: 'practice', completed: false },
            { day: 5, title: 'Responsive Design', duration: '2 hours', type: 'project', completed: false },
            { day: 6, title: 'Build Landing Page', duration: '4 hours', type: 'project', completed: false },
            { day: 7, title: 'Review & Practice', duration: '2 hours', type: 'review', completed: false }
          ]
        },
        {
          week: 2,
          title: 'JavaScript Fundamentals',
          description: 'Learn programming concepts and DOM manipulation',
          days: [
            { day: 1, title: 'Variables & Data Types', duration: '2 hours', type: 'theory', completed: false },
            { day: 2, title: 'Functions & Scope', duration: '3 hours', type: 'theory', completed: false },
            { day: 3, title: 'DOM Manipulation', duration: '3 hours', type: 'practice', completed: false },
            { day: 4, title: 'Event Handling', duration: '2 hours', type: 'practice', completed: false },
            { day: 5, title: 'Async JavaScript', duration: '3 hours', type: 'theory', completed: false },
            { day: 6, title: 'Interactive Web App', duration: '4 hours', type: 'project', completed: false },
            { day: 7, title: 'Code Review & Debugging', duration: '2 hours', type: 'review', completed: false }
          ]
        },
        {
          week: 3,
          title: 'React.js Basics',
          description: 'Build dynamic user interfaces with React',
          days: [
            { day: 1, title: 'React Components', duration: '3 hours', type: 'theory', completed: false },
            { day: 2, title: 'Props & State', duration: '3 hours', type: 'practice', completed: false },
            { day: 3, title: 'Event Handling in React', duration: '2 hours', type: 'practice', completed: false },
            { day: 4, title: 'React Hooks', duration: '3 hours', type: 'theory', completed: false },
            { day: 5, title: 'API Integration', duration: '3 hours', type: 'practice', completed: false },
            { day: 6, title: 'Build React App', duration: '5 hours', type: 'project', completed: false },
            { day: 7, title: 'Testing & Deployment', duration: '2 hours', type: 'review', completed: false }
          ]
        },
        {
          week: 4,
          title: 'Backend with Node.js',
          description: 'Server-side development and APIs',
          days: [
            { day: 1, title: 'Node.js Basics', duration: '2 hours', type: 'theory', completed: false },
            { day: 2, title: 'Express.js Framework', duration: '3 hours', type: 'theory', completed: false },
            { day: 3, title: 'REST API Design', duration: '3 hours', type: 'practice', completed: false },
            { day: 4, title: 'Database Integration', duration: '3 hours', type: 'practice', completed: false },
            { day: 5, title: 'Authentication & Security', duration: '3 hours', type: 'theory', completed: false },
            { day: 6, title: 'Full-Stack Project', duration: '6 hours', type: 'project', completed: false },
            { day: 7, title: 'Deployment & DevOps', duration: '2 hours', type: 'review', completed: false }
          ]
        }
      ]
    },
    'frontend': {
      title: 'Frontend Development',
      description: 'Create beautiful and interactive user interfaces',
      weeks: [
        {
          week: 1,
          title: 'Web Fundamentals',
          description: 'HTML, CSS, and responsive design',
          days: [
            { day: 1, title: 'HTML5 Semantic Elements', duration: '2 hours', type: 'theory', completed: false },
            { day: 2, title: 'CSS3 Advanced Features', duration: '3 hours', type: 'theory', completed: false },
            { day: 3, title: 'Flexbox & Grid Mastery', duration: '3 hours', type: 'practice', completed: false },
            { day: 4, title: 'Responsive Design Patterns', duration: '3 hours', type: 'practice', completed: false },
            { day: 5, title: 'CSS Animations', duration: '2 hours', type: 'practice', completed: false },
            { day: 6, title: 'Portfolio Website', duration: '4 hours', type: 'project', completed: false },
            { day: 7, title: 'Cross-browser Testing', duration: '2 hours', type: 'review', completed: false }
          ]
        }
      ]
    }
  };

  return baseRoadmaps[roadmapType] || baseRoadmaps['full-stack'];
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
  const [user, setUser] = useState(null);
  const [roadmapData, setRoadmapData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completedTasks, setCompletedTasks] = useState(new Set());

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
          
          // Generate roadmap based on user preferences
          const roadmap = getLearningRoadmap(
            data.user.selectedRoadmap,
            data.user.learningTimeline,
            data.user.skillLevel
          );
          setRoadmapData(roadmap);
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

  const toggleTaskCompletion = (weekIndex, dayIndex) => {
    const taskId = `${weekIndex}-${dayIndex}`;
    const newCompleted = new Set(completedTasks);
    
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    
    setCompletedTasks(newCompleted);
    
    // Update in backend
    // TODO: Implement API call to save progress
  };

  const getWeekProgress = (week, weekIndex) => {
    const totalTasks = week.days.length;
    const completedCount = week.days.filter((_, dayIndex) => 
      completedTasks.has(`${weekIndex}-${dayIndex}`)
    ).length;
    return Math.round((completedCount / totalTasks) * 100);
  };

  const getTotalProgress = () => {
    if (!roadmapData) return 0;
    const totalTasks = roadmapData.weeks.reduce((sum, week) => sum + week.days.length, 0);
    const completedCount = Array.from(completedTasks).length;
    return Math.round((completedCount / totalTasks) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your learning path...</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
                <div className="w-10 h-10 bg-[#344F1F] rounded-lg flex items-center justify-center">
                  {roadmapIcons[user?.selectedRoadmap]}
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">{roadmapData.title}</h1>
                  <p className="text-sm text-gray-500">{roadmapData.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#344F1F]">{getTotalProgress()}%</div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{Array.from(completedTasks).length}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="pb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-[#344F1F] h-2 rounded-full transition-all duration-500"
                style={{ width: `${getTotalProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Week Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#344F1F]" />
                Timeline
              </h3>
              
              <div className="space-y-2">
                {roadmapData.weeks.map((week, index) => {
                  const progress = getWeekProgress(week, index);
                  const isActive = currentWeek === week.week;
                  
                  return (
                    <div
                      key={week.week}
                      onClick={() => setCurrentWeek(week.week)}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                        isActive 
                          ? 'bg-[#344F1F] text-white border-[#344F1F]' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Week {week.week}</span>
                        <span className="text-sm">{progress}%</span>
                      </div>
                      <div className="text-sm opacity-90 mb-3">{week.title}</div>
                      <div className={`w-full rounded-full h-1.5 ${isActive ? 'bg-white bg-opacity-30' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isActive ? 'bg-white' : 'bg-[#344F1F]'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content - Daily Tasks */}
          <div className="lg:col-span-3">
            {roadmapData.weeks
              .filter(week => week.week === currentWeek)
              .map((week, weekIndex) => (
                <div key={week.week} className="space-y-6">
                  {/* Week Header */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-[#344F1F] text-white rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Week {week.week}: {week.title}</h2>
                        <p className="text-gray-600">{week.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#344F1F]" />
                        <span>{week.days.reduce((sum, day) => sum + parseInt(day.duration), 0)} hours total</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#344F1F]" />
                        <span>{week.days.length} tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#344F1F]" />
                        <span>{getWeekProgress(week, weekIndex)}% complete</span>
                      </div>
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
                          className={`bg-white rounded-lg shadow-sm border p-6 transition-all duration-200 hover:shadow-md ${
                            isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg border-2 ${getTypeColor(day.type)}`}>
                                {getTypeIcon(day.type)}
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Day {day.day}</div>
                                <h3 className="font-semibold text-gray-800">{day.title}</h3>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => toggleTaskCompletion(weekIndex, dayIndex)}
                              className={`p-2 rounded-full transition-all duration-200 ${
                                isCompleted 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
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
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                              isCompleted
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-[#344F1F] text-white hover:bg-[#2a3f1a]'
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
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}