import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
    LogOut, 
    User, 
    BookOpen, 
    Target, 
    TrendingUp, 
    Trophy, 
    Clock, 
    Award, 
    BarChart3, 
    Calendar, 
    CheckCircle2, 
    RefreshCw, 
    Brain,
    Search,
    Bell,
    Settings,
    Activity,
    Star,
    ArrowUp,
    Plus,
    ChevronRight,
    PlayCircle,
    Users,
    Zap
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ThemeToggle from "./ThemeToggle";

import "../index.css";

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [learnerData, setLearnerData] = useState(null);
    const [testResults, setTestResults] = useState([]);
    const [testStats, setTestStats] = useState(null);
    const [testCompletions, setTestCompletions] = useState([]);
    const [weakAreasAnalysis, setWeakAreasAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Helper function to map roadmap names
    const getRoadmapKey = (roadmap) => {
        const mapping = {
            'frontend': 'frontend-development',
            'backend': 'backend-development',
            'full-stack': 'full-stack-development',
            'mobile': 'mobile-development',
            'ai-ml': 'ai-machine-learning',
            'devops': 'devops-cloud',
            'database': 'database-data-science'
        };
        return mapping[roadmap] || roadmap;
    };

    // ✅ Fetch logged-in user details and check onboarding status
    useEffect(() => {
        const fetchUserAndData = async () => {
            try {
                // Fetch user profile
                const userRes = await fetch("http://localhost:3000/api/profile/me", {
                    method: "GET",
                    credentials: "include",
                });
                const userData = await userRes.json();

                if (userRes.ok && userData.success && userData.user) {
                    setUser(userData.user);

                    // Check if user has completed onboarding
                    if (!userData.user.hasCompletedOnboarding) {
                        navigate("/roadmap");
                        return;
                    }

                    const roadmapKey = getRoadmapKey(userData.user.selectedRoadmap);

                    // Fetch all data in parallel to reduce loading time
                    const [learnerRes, testRes, statsRes, completionsRes, analysisRes] = await Promise.allSettled([
                        fetch("http://localhost:3000/api/learners/me", {
                            method: "GET",
                            credentials: "include",
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }),
                        fetch("http://localhost:3000/api/test-results?limit=5", {
                            method: "GET",
                            credentials: "include",
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }),
                        fetch("http://localhost:3000/api/test-results/stats", {
                            method: "GET",
                            credentials: "include",
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }),
                        fetch(`http://localhost:3000/api/test-results/completions?roadmapType=${roadmapKey}`, {
                            method: "GET",
                            credentials: "include",
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }),
                        fetch(`http://localhost:3000/api/test-results/analysis/weak-areas?roadmapType=${roadmapKey}`, {
                            method: "GET",
                            credentials: "include",
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        })
                    ]);

                    // Process learner data
                    if (learnerRes.status === 'fulfilled' && learnerRes.value.ok) {
                        const learnerData = await learnerRes.value.json();
                        if (learnerData.success) {
                            setLearnerData(learnerData.data);
                        }
                    }

                    // Process test results
                    if (testRes.status === 'fulfilled' && testRes.value.ok) {
                        const testData = await testRes.value.json();
                        if (testData.success) {
                            setTestResults(testData.data);
                        }
                    }

                    // Process test statistics
                    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
                        const statsData = await statsRes.value.json();
                        if (statsData.success) {
                            setTestStats(statsData.data);
                        }
                    }

                    // Process test completions
                    if (completionsRes.status === 'fulfilled' && completionsRes.value.ok) {
                        const completionsData = await completionsRes.value.json();
                        if (completionsData.success) {
                            setTestCompletions(completionsData.data);
                        }
                    }

                    // Process weak areas analysis
                    if (analysisRes.status === 'fulfilled' && analysisRes.value.ok) {
                        const analysisData = await analysisRes.value.json();
                        if (analysisData.success) {
                            setWeakAreasAnalysis(analysisData.data);
                        }
                    }

                } else {
                    console.warn("Not logged in:", userData.message);
                    navigate("/login");
                }
            } catch (err) {
                console.error("Error fetching user:", err);
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndData();
    }, [navigate, refreshKey]);

    // Listen for navigation state changes (from test completion)
    useEffect(() => {
        if (location.state?.refresh) {
            refreshData();
        }
    }, [location.state]);

    // Handle roadmap change
    const handleRoadmapChange = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/profile/reset-progress", {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                setShowRoadmapModal(false);
                navigate("/roadmap");
            } else {
                console.error("Failed to reset progress");
            }
        } catch (err) {
            console.error("Error resetting progress:", err);
        }
    };

    // Refresh data
    const refreshData = () => {
        setLoading(true);
        setTestStats(null);
        setTestCompletions([]);
        setTestResults([]);
        setWeakAreasAnalysis(null);
        setRefreshKey(prev => prev + 1);
    };

    // Auto-refresh when component becomes visible (user returns from test)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(() => refreshData(), 1000);
            }
        };

        const handleFocus = () => {
            setTimeout(() => refreshData(), 1000);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // ✅ Logout function
    const logout = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) {
                localStorage.clear();
                setUser(null);
                window.location.href = "/login";
            }
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 dark:border-amber-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const getRoadmapTitle = (roadmap) => {
        const roadmapTitles = {
            'full-stack': 'Full-Stack Development',
            'frontend': 'Frontend Development',
            'backend': 'Backend Development',
            'mobile': 'Mobile App Development',
            'database': 'Database & Data Science',
            'cybersecurity': 'Cybersecurity',
            'devops': 'DevOps & Cloud',
            'ai-ml': 'AI & Machine Learning'
        };
        return roadmapTitles[roadmap] || roadmap;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
            <AnimatedBackground />
            <div className="absolute top-4 right-4 z-10">
                <ThemeToggle />
            </div>
            {/* Professional Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo & Brand */}
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Learning.AI</h1>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Professional Learning Platform</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="flex items-center gap-2 px-4 py-2 text-white dark:text-white bg-blue-600 dark:bg-gray-700 rounded-lg font-medium"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Dashboard
                            </button>
                            <button
                                onClick={() => navigate("/learn")}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Learn
                            </button>
                            <button
                                onClick={() => navigate("/test")}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Tests
                            </button>
                            <button
                                onClick={() => navigate("/quiz-selection")}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Quiz
                            </button>
                        </nav>

                        {/* Right Actions */}
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <Search className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <Bell className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={refreshData}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            
                            {/* User Menu */}
                            <div className="flex items-center gap-3 pl-3 border-l border-gray-300 dark:border-gray-700">
                                <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">
                                        {user?.name?.charAt(0) || 'U'}
                                    </span>
                                </div>
                                <button
                                    onClick={logout}
                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>



            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* Welcome Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                Welcome back, {user?.name?.split(" ")[0] || 'Learner'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                {getRoadmapTitle(user?.selectedRoadmap)} • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => navigate("/test")}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-orange-600 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                New Test
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Tests Completed */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <Target className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats?.totalTests || 0}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Tests Completed</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ArrowUp className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">+12% this week</span>
                        </div>
                    </div>

                    {/* Average Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-500 dark:text-purple-400" />
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats?.averageScore || 0}%</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ArrowUp className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-sm">+5% improvement</span>
                        </div>
                    </div>

                    {/* Best Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats?.bestScore || 0}%</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Best Score</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 text-sm">Personal Best</span>
                        </div>
                    </div>

                    {/* Study Time */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                                <Clock className="w-6 h-6 text-green-500 dark:text-green-400" />
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{testStats?.totalTimeSpent ? `${Math.round(testStats.totalTimeSpent / 60)}m` : '0m'}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Study Time</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 text-sm">Active today</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Learning Path Progress */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Learning Progress</h3>
                                <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>

                            {user?.selectedRoadmap ? (
                                <div className="space-y-6">
                                    {/* Current Path */}
                                    <div className="bg-gradient-to-r from-amber-400/10 to-orange-500/10 border border-amber-400/20 rounded-lg p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                                            <span className="text-amber-400 font-medium">Active Learning Path</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{getRoadmapTitle(user.selectedRoadmap)}</h4>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="bg-amber-400/20 text-amber-300 px-2 py-1 rounded">
                                                {user.skillLevel?.charAt(0).toUpperCase() + user.skillLevel?.slice(1)} Level
                                            </span>
                                            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                                                {user.learningTimeline?.replace('-', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Overall Progress</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">Week 3 of 12</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
                                        </div>
                                        <div className="text-xs text-gray-400 text-center">25% Complete</div>
                                    </div>

                                    {/* Next Steps */}
                                    <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">Next Milestone</span>
                                            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        </div>
                                        <p className="text-gray-900 dark:text-white font-medium mb-3">JavaScript Fundamentals</p>
                                        <button
                                            onClick={() => navigate("/learn")}
                                            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            Continue Learning
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">No active learning path</p>
                                    <button
                                        onClick={() => navigate("/roadmap")}
                                        className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                        Choose Your Path
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Test Achievements */}
                    <div className="space-y-6">
                        {/* Recent Tests */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Tests</h3>
                                <button 
                                    onClick={() => navigate("/test")}
                                    className="text-amber-400 hover:text-amber-300 text-sm font-medium"
                                >
                                    View All
                                </button>
                            </div>

                            {testCompletions && testCompletions.length > 0 ? (
                                <div className="space-y-4">
                                    {testCompletions.slice(0, 3).map((completion, index) => (
                                        <div key={index} className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{completion.testCategory}</h4>
                                                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                                                            completion.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                                            completion.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            completion.difficulty === 'Hard' ? 'bg-orange-500/20 text-orange-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {completion.difficulty}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-green-400 font-bold">{completion.bestScore}%</span>
                                                <span className="text-gray-600 dark:text-gray-400">{completion.attemptCount} attempts</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Target className="w-8 h-8 mx-auto mb-3 text-gray-500" />
                                    <p className="text-gray-400 text-sm mb-3">No tests completed yet</p>
                                    <button
                                        onClick={() => navigate("/test")}
                                        className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                        Take Your First Test
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate("/test")}
                                    className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-amber-400/10 to-orange-500/10 border border-amber-400/20 rounded-lg hover:from-amber-400/20 hover:to-orange-500/20 transition-all"
                                >
                                    <div className="w-8 h-8 bg-amber-400/20 rounded-lg flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-gray-900 dark:text-white font-medium text-sm">Take Assessment</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">Test your knowledge</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate("/quiz-selection")}
                                    className="w-full flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <Brain className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-gray-900 dark:text-white font-medium text-sm">Practice Quiz</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">Quick practice session</p>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => navigate("/learn")}
                                    className="w-full flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <BookOpen className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-gray-900 dark:text-white font-medium text-sm">Continue Learning</p>
                                        <p className="text-gray-600 dark:text-gray-400 text-xs">Resume your path</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}