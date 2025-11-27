import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, BookOpen, Target, TrendingUp, Trophy, Clock, Award, BarChart3, Calendar, CheckCircle2, RefreshCw, Brain } from "lucide-react";
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
    const [quizStats, setQuizStats] = useState(null);

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
                    const [learnerRes, testRes, statsRes, completionsRes, analysisRes, quizStatsRes] = await Promise.allSettled([
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
                        }),
                        fetch("http://localhost:3000/api/quiz/stats", {
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
                        console.log('Dashboard - Test stats data:', statsData);
                        if (statsData.success) {
                            setTestStats(statsData.data);
                        }
                    }

                    // Process test completions
                    if (completionsRes.status === 'fulfilled' && completionsRes.value.ok) {
                        const completionsData = await completionsRes.value.json();
                        console.log('Dashboard - Test completions data:', completionsData);
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

                    // Process quiz statistics
                    if (quizStatsRes.status === 'fulfilled' && quizStatsRes.value.ok) {
                        const quizData = await quizStatsRes.value.json();
                        console.log('Dashboard - Quiz stats data:', quizData);
                        if (quizData.success) {
                            setQuizStats(quizData.stats);
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
        console.log('Dashboard - Refreshing data...');
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
                // Refresh data when user returns to the page
                setTimeout(() => refreshData(), 1000); // Delay to ensure test is saved
            }
        };

        const handleFocus = () => {
            // Also refresh when window gets focus
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
                window.location.href = "/login"; // redirect to login
            }
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative flex items-center justify-center transition-colors duration-200">
                <AnimatedBackground />
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative transition-colors duration-200">
            <AnimatedBackground />
            {/* ================= HEADER ================= */}
            <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#344F1F] rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Learning.AI</h1>
                            </div>
                        </div>

                        <nav className="hidden md:flex space-x-8">
                            <button
                                onClick={() => navigate("/dashboard")}
                                className="text-[#344F1F] font-medium border-b-2 border-[#344F1F] pb-1"
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => navigate("/learn")}
                                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
                            >
                                Learn
                            </button>
                            <button
                                onClick={() => navigate("/test")}
                                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
                            >
                                Tests
                            </button>
                            <button
                                onClick={() => navigate("/quiz-selection")}
                                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
                            >
                                Quiz
                            </button>
                            <button
                                onClick={() => navigate("/profile")}
                                className="text-gray-500 hover:text-[#344F1F] font-medium transition-colors"
                            >
                                Profile
                            </button>
                        </nav>

                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            {user && (
                                <div className="hidden md:block text-right">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {user.name?.split(" ")[0]}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.selectedRoadmap ? getRoadmapTitle(user.selectedRoadmap) : 'Learning Path'}</p>
                                </div>
                            )}
                            <button
                                onClick={refreshData}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Refresh data"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        const response = await fetch('http://localhost:3000/api/test-results/debug/all', {
                                            credentials: 'include'
                                        });
                                        const data = await response.json();
                                        console.log('Debug data:', data);
                                        alert(`Debug: ${data.data?.testResults || 0} test results, ${data.data?.completions || 0} completions`);
                                    } catch (error) {
                                        console.error('Debug error:', error);
                                        alert('Debug failed - check console');
                                    }
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Debug test data"
                            >
                                🐛
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors">
                                <User className="w-5 h-5" />
                            </button>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>



            {/* ================= INTRO ================= */}
            <div className="w-[90%] md:w-3/4 mt-8 text-left">
                {user ? (
                    <h2 className="text-2xl font-semibold text-gray-800">
                        Welcome back, {user.name?.split(" ")[0]}! 👋
                    </h2>
                ) : (
                    <h2 className="text-2xl font-semibold text-gray-800">Loading user...</h2>
                )}
                <p className="text-gray-600 mt-1">
                    Here’s what’s happening with your learners today.
                </p>
            </div>

            {/* ================= MAIN CONTENT ================= */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Tests Completed</p>
                                <p className="text-3xl font-bold">{testStats?.totalTests || 0}</p>
                            </div>
                            <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                                <Target className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-100 text-sm font-medium">Average Score</p>
                                <p className="text-3xl font-bold">{testStats?.averageScore || 0}%</p>
                            </div>
                            <div className="bg-green-400 bg-opacity-30 rounded-lg p-3">
                                <TrendingUp className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-100 text-sm font-medium">Best Score</p>
                                <p className="text-3xl font-bold">{testStats?.bestScore || 0}%</p>
                            </div>
                            <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                                <Trophy className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-100 text-sm font-medium">Study Time</p>
                                <p className="text-3xl font-bold">{testStats?.totalTimeSpent ? `${Math.round(testStats.totalTimeSpent / 60)}m` : '0m'}</p>
                            </div>
                            <div className="bg-orange-400 bg-opacity-30 rounded-lg p-3">
                                <Clock className="w-8 h-8" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quiz Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm font-medium">Quizzes Taken</p>
                                <p className="text-3xl font-bold">{quizStats?.totalQuizzes || 0}</p>
                            </div>
                            <div className="bg-indigo-400 bg-opacity-30 rounded-lg p-3">
                                <Brain className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-pink-100 text-sm font-medium">Quiz Accuracy</p>
                                <p className="text-3xl font-bold">{quizStats?.averageAccuracy || 0}%</p>
                            </div>
                            <div className="bg-pink-400 bg-opacity-30 rounded-lg p-3">
                                <Target className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-teal-100 text-sm font-medium">Quiz Points</p>
                                <p className="text-3xl font-bold">{quizStats?.totalPoints || 0}</p>
                            </div>
                            <div className="bg-teal-400 bg-opacity-30 rounded-lg p-3">
                                <Award className="w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-cyan-100 text-sm font-medium">Current Streak</p>
                                <p className="text-3xl font-bold">{quizStats?.currentStreak || 0}</p>
                            </div>
                            <div className="bg-cyan-400 bg-opacity-30 rounded-lg p-3">
                                <Trophy className="w-8 h-8" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* ========== CURRENT LEARNING PATH ========== */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Current Learning Path</h3>
                            <BookOpen className="w-6 h-6 text-[#344F1F]" />
                        </div>
                        {user?.selectedRoadmap ? (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-[#344F1F] to-[#4a6b2a] rounded-lg p-4 text-white">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                        <span className="font-semibold">Active Path</span>
                                    </div>
                                    <h4 className="text-lg font-bold mb-2">{getRoadmapTitle(user.selectedRoadmap)}</h4>
                                    <div className="flex items-center gap-4 text-sm opacity-90">
                                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                                            {user.skillLevel?.charAt(0).toUpperCase() + user.skillLevel?.slice(1)} Level
                                        </span>
                                        <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                                            {user.learningTimeline?.replace('-', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                                        <span className="text-sm font-bold text-gray-900">Week 1 of 12</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className="bg-gradient-to-r from-[#344F1F] to-[#4a6b2a] h-3 rounded-full transition-all duration-500" style={{ width: '25%' }}></div>
                                    </div>
                                    <div className="text-xs text-gray-500 text-center">25% Complete</div>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-blue-800">Next Milestone</span>
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <p className="text-sm text-blue-700 mb-3">JavaScript Fundamentals</p>
                                    <button
                                        onClick={() => navigate("/learn")}
                                        className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Continue Learning
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500 mb-4">No active learning path</p>
                                <button
                                    onClick={() => navigate("/roadmap")}
                                    className="px-6 py-2 bg-[#344F1F] text-white font-medium rounded-lg hover:bg-[#2a3f1a] transition-colors"
                                >
                                    Choose Your Path
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ========== TEST ACHIEVEMENTS ========== */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Test Achievements</h3>
                            <Award className="w-6 h-6 text-[#344F1F]" />
                        </div>
                        {testCompletions && testCompletions.length > 0 ? (
                            <div className="space-y-4">
                                {testCompletions.slice(0, 3).map((completion) => (
                                    <div key={`${completion.testCategory}-${completion.difficulty}`} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">{completion.testCategory}</h4>
                                                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${completion.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                                        completion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                                            completion.difficulty === 'Hard' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {completion.difficulty}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate("/test")}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Retake
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="bg-white rounded-lg p-3 text-center">
                                                <div className="text-2xl font-bold text-green-600">{completion.bestScore}%</div>
                                                <div className="text-gray-600">Best Score</div>
                                            </div>
                                            <div className="bg-white rounded-lg p-3 text-center">
                                                <div className="text-2xl font-bold text-blue-600">{completion.attemptCount}</div>
                                                <div className="text-gray-600">Attempts</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    onClick={() => navigate("/test")}
                                    className="w-full py-3 bg-gradient-to-r from-[#344F1F] to-[#4a6b2a] text-white font-medium rounded-lg hover:from-[#2a3f1a] hover:to-[#3a5520] transition-all duration-200"
                                >
                                    Take New Test
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Target className="w-8 h-8 text-gray-400" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Tests Completed</h4>
                                <p className="text-gray-500 mb-6">Start your assessment journey to track your progress</p>
                                <button
                                    onClick={() => navigate("/test")}
                                    className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Take Your First Test
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ========== QUIZ PERFORMANCE ========== */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Quiz Performance</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate("/quiz-dashboard")}
                                    className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                                >
                                    View Details
                                </button>
                                <Brain className="w-6 h-6 text-[#344F1F]" />
                            </div>
                        </div>
                        {quizStats && quizStats.totalQuizzes > 0 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-bold text-indigo-600">{quizStats.totalQuizzes}</div>
                                        <div className="text-sm text-gray-600">Quizzes Taken</div>
                                    </div>
                                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-bold text-green-600">{quizStats.averageAccuracy}%</div>
                                        <div className="text-sm text-gray-600">Accuracy</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-bold text-purple-600">{quizStats.totalPoints}</div>
                                        <div className="text-sm text-gray-600">Points Earned</div>
                                    </div>
                                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                                        <div className="text-2xl font-bold text-orange-600">{quizStats.currentStreak}</div>
                                        <div className="text-sm text-gray-600">Current Streak</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/quiz-selection")}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                                >
                                    Take New Quiz
                                </button>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Brain className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h4 className="text-lg font-semibold text-gray-700 mb-2">No Quizzes Taken</h4>
                                <p className="text-gray-500 mb-6">Start with our intelligent quiz system to track your progress</p>
                                <button
                                    onClick={() => navigate("/quiz-selection")}
                                    className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Start First Quiz
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ========== AI INSIGHTS & ANALYTICS ========== */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">AI Insights</h3>
                            <BarChart3 className="w-6 h-6 text-[#344F1F]" />
                        </div>
                        <div className="space-y-4">
                            {weakAreasAnalysis?.strongAreas && weakAreasAnalysis.strongAreas.length > 0 && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <p className="font-semibold text-green-800">Strong Areas</p>
                                    </div>
                                    <p className="text-green-700 text-sm mb-2">
                                        You excel in: {weakAreasAnalysis.strongAreas.slice(0, 2).map(area => area.topic).join(', ')}
                                    </p>
                                    <div className="bg-green-100 rounded-lg p-2">
                                        <div className="text-xs text-green-600">
                                            Average accuracy: <span className="font-bold">{Math.round(weakAreasAnalysis.strongAreas[0]?.accuracy || 0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {weakAreasAnalysis?.weakAreas && weakAreasAnalysis.weakAreas.length > 0 && (
                                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                        <p className="font-semibold text-orange-800">Focus Areas</p>
                                    </div>
                                    <p className="text-orange-700 text-sm mb-2">
                                        Need improvement: {weakAreasAnalysis.weakAreas.slice(0, 2).map(area => area.topic).join(', ')}
                                    </p>
                                    <div className="bg-orange-100 rounded-lg p-2">
                                        <div className="text-xs text-orange-600">
                                            Current accuracy: <span className="font-bold">{Math.round(weakAreasAnalysis.weakAreas[0]?.accuracy || 0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {testStats?.totalTests > 0 && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <p className="font-semibold text-blue-800">Progress Update</p>
                                    </div>
                                    <p className="text-blue-700 text-sm mb-2">
                                        You've completed {testStats.totalTests} tests with an average score of {testStats.averageScore}%
                                    </p>
                                    {testStats.bestScore > testStats.averageScore && (
                                        <div className="bg-blue-100 rounded-lg p-2">
                                            <div className="text-xs text-blue-600">
                                                Your best score: <span className="font-bold">{testStats.bestScore}%</span> - Keep pushing for consistency!
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(!weakAreasAnalysis?.strongAreas?.length && !weakAreasAnalysis?.weakAreas?.length && !testStats?.totalTests) && (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BarChart3 className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-gray-700 mb-2">No Data Yet</h4>
                                    <p className="text-gray-500 mb-4">Take tests to get personalized AI insights</p>
                                    <button
                                        onClick={() => navigate("/test")}
                                        className="px-4 py-2 bg-[#344F1F] text-white font-medium rounded-lg hover:bg-[#2a3f1a] transition-colors"
                                    >
                                        Start Testing
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>


                </div>

                {/* ========== QUIZ STATISTICS (NEW) ========== */}
                {quizStats && quizStats.totalTests > 0 && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Quiz Performance</h3>
                            <button
                                onClick={() => navigate('/quiz-start')}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                            >
                                Take Quiz
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-blue-600">{quizStats.totalTests}</div>
                                <div className="text-sm text-gray-600 mt-1">Quizzes Taken</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-green-600">{quizStats.totalCorrect}</div>
                                <div className="text-sm text-gray-600 mt-1">Correct Answers</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-purple-600">{quizStats.averageScore}%</div>
                                <div className="text-sm text-gray-600 mt-1">Average Score</div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-orange-600">{quizStats.totalQuestions}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Questions</div>
                            </div>
                        </div>

                        {quizStats.categoryStats && Object.keys(quizStats.categoryStats).length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-3">Performance by Topic</h4>
                                <div className="space-y-2">
                                    {Object.entries(quizStats.categoryStats).slice(0, 4).map(([category, stats]) => (
                                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                <span className="font-medium text-gray-700 capitalize">{category}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-600">{stats.count} tests</span>
                                                <span className={`font-bold ${stats.avgScore >= 75 ? 'text-green-600' : stats.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {stats.avgScore}%
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => navigate('/quiz-history')}
                                    className="w-full mt-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    View Full History →
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ========== QUICK ACTIONS ========== */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <button
                            onClick={() => navigate("/learn")}
                            className="group relative overflow-hidden bg-gradient-to-br from-[#344F1F] to-[#4a6b2a] text-white rounded-xl p-6 hover:from-[#2a3f1a] hover:to-[#3a5520] transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                            <BookOpen className="w-8 h-8 mb-4 relative z-10" />
                            <div className="text-left relative z-10">
                                <div className="font-bold text-lg mb-1">Start Learning</div>
                                <div className="text-sm opacity-90">Continue your roadmap</div>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate("/test")}
                            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                            <Target className="w-8 h-8 mb-4 relative z-10" />
                            <div className="text-left relative z-10">
                                <div className="font-bold text-lg mb-1">Take Test</div>
                                <div className="text-sm opacity-90">Assess your skills</div>
                            </div>
                        </button>
                        <button
                            onClick={() => navigate("/quiz-selection")}
                            className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-6 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                            <Brain className="w-8 h-8 mb-4 relative z-10" />
                            <div className="text-left relative z-10">
                                <div className="font-bold text-lg mb-1">Interactive Quiz</div>
                                <div className="text-sm opacity-90">Dynamic MCQ Engine</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setShowRoadmapModal(true)}
                            className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 hover:from-orange-600 hover:to-orange-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
                        >
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white bg-opacity-10 rounded-full -mr-10 -mt-10"></div>
                            <TrendingUp className="w-8 h-8 mb-4 relative z-10" />
                            <div className="text-left relative z-10">
                                <div className="font-bold text-lg mb-1">Change Path</div>
                                <div className="text-sm opacity-90">Switch roadmap</div>
                            </div>
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {user && (
                        <div className="text-center text-sm text-gray-500">
                            Logged in as <span className="font-medium text-gray-700">{user.name}</span> •
                            Learner ID: <span className="font-mono">{user.learnerId}</span>
                        </div>
                    )}
                </div>
            </footer>

            {/* Roadmap Change Modal */}
            {showRoadmapModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Target className="w-5 h-5 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Change Learning Path</h3>
                        </div>
                        <div className="mb-6">
                            <p className="text-gray-600 mb-4">
                                Changing your learning path will reset your current progress including:
                            </p>
                            <ul className="text-sm text-gray-500 space-y-2 mb-4 pl-4">
                                <li>• All category mastery levels</li>
                                <li>• Learning streaks and statistics</li>
                                <li>• Completed assessments</li>
                                <li>• Study time records</li>
                            </ul>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-800 font-medium text-sm">
                                    This action cannot be undone!
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRoadmapModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRoadmapChange}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Reset & Change
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
