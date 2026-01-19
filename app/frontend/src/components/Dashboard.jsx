import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    TrendingUp, Users, Award, BarChart3, Clock
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import Sidebar from "./Sidebar";
import "../styles/DevvoraStyles.css";
import { BookOpen, FolderKanban } from "lucide-react";
999
export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [testResults, setTestResults] = useState([])
    const [progressData, setProgressData] = useState(null);
    const [customDocuments, setCustomDocuments] = useState([]);
    const [roadmapHistory, setRoadmapHistory] = useState([]);
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const { isDarkMode } = useTheme();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("http://localhost:3000/api/profile/me", {
                    method: "GET",
                    credentials: "include",
                });
                const data = await res.json();
                if (res.ok && data.success && data.user) {
                    setUser(data.user);

                    // Fetch learning progress
                    try {
                        const progressRes = await fetch(`http://localhost:3000/api/progress/${data.user.selectedRoadmap}`, {
                            method: "GET",
                            credentials: "include",
                        });
                        const progressData = await progressRes.json();
                        if (progressRes.ok && progressData.success) {
                            setProgressData(progressData.data);
                        }
                    } catch (progressErr) {
                        console.error("Error fetching progress:", progressErr);
                    }

                    // Fetch test results filtered by current roadmap AND custom quizzes
                    try {
                        const testRes = await fetch(`http://localhost:3000/api/test-results?limit=5&roadmapType=${data.user.selectedRoadmap}`, {
                            method: "GET",
                            credentials: "include",
                        });
                        const testData = await testRes.json();

                        // Also fetch custom quiz results
                        const customQuizRes = await fetch(`http://localhost:3000/api/quiz?source=custom&limit=5`, {
                            method: "GET",
                            credentials: "include",
                        });
                        const customQuizData = await customQuizRes.json();

                        if (testRes.ok && testData.success) {
                            const allResults = [...(testData.data || [])];
                            if (customQuizData.success && customQuizData.quizzes) {
                                // Convert custom quizzes to test result format
                                const customResults = customQuizData.quizzes.map(quiz => ({
                                    testCategory: quiz.title || 'Custom Quiz',
                                    difficulty: quiz.difficulty,
                                    score: quiz.accuracy || 0,
                                    completedAt: quiz.completedAt || quiz.createdAt,
                                    createdAt: quiz.createdAt,
                                    isCustom: true
                                }));
                                allResults.push(...customResults);
                            }
                            setTestResults(allResults.slice(0, 5));
                        }
                    } catch (testErr) {
                        console.error("Error fetching test results:", testErr);
                    }

                    // Fetch roadmap history for paused roadmaps
                    try {
                        const historyRes = await fetch("http://localhost:3000/api/roadmap-selection/history", {
                            method: "GET",
                            credentials: "include",
                        });
                        const historyData = await historyRes.json();
                        if (historyRes.ok && historyData.success) {
                            setRoadmapHistory(historyData.data || []);
                        }
                    } catch (historyErr) {
                        console.error("Error fetching roadmap history:", historyErr);
                    }

                    // Fetch custom learning documents
                    try {
                        const docsRes = await fetch("http://localhost:3000/api/custom-learning/documents", {
                            method: "GET",
                            credentials: "include",
                        });
                        const docsData = await docsRes.json();
                        if (docsRes.ok && docsData.success) {
                            setCustomDocuments(docsData.documents || []);
                        }
                    } catch (docsErr) {
                        console.error("Error fetching custom documents:", docsErr);
                    }
                } else {
                    navigate("/login");
                }
            } catch (err) {
                console.error("Error fetching user:", err);
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);



    // Calculate real statistics from progress data
    const getCompletedLessons = () => {
        if (!progressData || !progressData.completedLessons) return 0;
        return progressData.completedLessons.length;
    };

    const getTotalLessons = () => {
        // Assuming each roadmap has approximately 40-50 lessons (can be adjusted)
        return 45;
    };

    const getOverallProgress = () => {
        const completed = getCompletedLessons();
        const total = getTotalLessons();
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    };

    const handleChangeRoadmap = () => {
        setShowRoadmapModal(true);
    };

    const confirmRoadmapChange = () => {
        setShowRoadmapModal(false);
        navigate("/roadmap");
    };

    const handleResumeRoadmap = async (roadmapId) => {
        try {
            const res = await fetch("http://localhost:3000/api/roadmap-selection/change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ newRoadmapId: roadmapId })
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload(); // Reload to refresh all data
            }
        } catch (err) {
            console.error("Error resuming roadmap:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* ==================== LEFT SIDEBAR ==================== */}
            <Sidebar />

            {/* ==================== MAIN CONTENT ==================== */}
            <main className="dashboard-main">
                {/* Welcome Card - Enhanced with Gradient */}
                <div className="dashboard-welcome-card animate-fade-in bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    <div className="welcome-card-content relative z-10">
                        <h3 className="welcome-back-text">Welcome back</h3>
                        <h2 className="welcome-name">{user?.name || "Learner"} 👋</h2>
                        <p className="welcome-description">
                            Current Roadmap: <strong>{user?.selectedRoadmap?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Selected'}</strong>
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => navigate("/learn")} className="btn-explore-courses hover:scale-105 hover:shadow-xl transition-all duration-300">
                                Continue Learning
                            </button>
                            <button
                                onClick={handleChangeRoadmap}
                                className="px-6 py-3 bg-white/20 hover:bg-white/35 text-white rounded-full font-semibold transition-all duration-300 border-2 border-white/30 hover:border-white/50 hover:scale-105 hover:shadow-lg"
                            >
                                Change Roadmap
                            </button>
                        </div>
                    </div>
                    <div className="welcome-card-character relative z-10">
                        <div className="character-3d-dashboard animate-float">🧑‍💻</div>
                    </div>
                </div>

                {/* Quick Action CTAs - Enhanced with Gradients */}
                <div className="dashboard-cta-grid">
                    <button onClick={() => navigate("/test")} className="dashboard-cta-card cta-test animate-scale-in hover:scale-105 hover:shadow-xl-cyan transition-all duration-300 bg-gradient-to-br from-cyan-500 to-blue-600">
                        <div className="cta-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4" />
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                            </svg>
                        </div>
                        <div className="cta-content">
                            <h3 className="cta-title">Take Assessment</h3>
                            <p className="cta-description">Test your knowledge and track progress</p>
                        </div>
                        <div className="cta-arrow">→</div>
                    </button>

                    <button onClick={() => navigate("/quiz-selection")} className="dashboard-cta-card cta-quiz animate-scale-in hover:scale-105 hover:shadow-xl-violet transition-all duration-300 bg-gradient-to-br from-violet-500 to-purple-600">
                        <div className="cta-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <div className="cta-content">
                            <h3 className="cta-title">Practice Quiz</h3>
                            <p className="cta-description">Quick practice sessions to reinforce learning</p>
                        </div>
                        <div className="cta-arrow">→</div>
                    </button>

                    <button onClick={() => navigate("/custom-learning")} className="dashboard-cta-card cta-custom animate-scale-in hover:scale-105 hover:shadow-xl-pink transition-all duration-300 bg-gradient-to-br from-pink-500 to-rose-600">
                        <div className="cta-icon-wrapper">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                <path d="M14 2v6h6" />
                                <path d="M12 18v-6" />
                                <path d="M9 15l3-3 3 3" />
                            </svg>
                        </div>
                        <div className="cta-content">
                            <h3 className="cta-title">Custom Learning</h3>
                            <p className="cta-description">Upload your materials and generate quizzes</p>
                        </div>
                        <div className="cta-arrow">→</div>
                    </button>
                </div>

                {/* Stats Cards - Enhanced with Animations */}
                <div className="dashboard-stats-grid">
                    {/* Lessons Completed */}
                    <div className="stat-card animate-fade-in hover:scale-105 hover:shadow-glow-emerald transition-all duration-300">
                        <div className="stat-header">
                            <div className="stat-icon-wrapper stat-icon-blue bg-gradient-to-br from-emerald-400 to-emerald-600">
                                <BookOpen className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className="stat-value text-emerald-600 dark:text-emerald-400">{getCompletedLessons()}</p>
                                <p className="stat-label">Lessons Completed</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar relative overflow-hidden">
                                <div className="stat-progress-fill bg-gradient-to-r from-emerald-400 to-emerald-600 relative" style={{ width: `${getOverallProgress()}%` }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                </div>
                            </div>
                            <span className="stat-percentage text-emerald-600 dark:text-emerald-400 font-semibold">{getOverallProgress()}% of roadmap</span>
                        </div>
                    </div>

                    {/* Tests Taken - Clickable with Enhanced Animation */}
                    <div
                        className="stat-card cursor-pointer animate-fade-in hover:scale-105 hover:shadow-glow-violet transition-all duration-300"
                        onClick={() => navigate("/quiz-selection")}
                        title="View quiz history"
                    >
                        <div className="stat-header">
                            <div className="stat-icon-wrapper stat-icon-purple bg-gradient-to-br from-violet-400 to-violet-600">
                                <FolderKanban className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className="stat-value text-violet-600 dark:text-violet-400">{testResults.length}</p>
                                <p className="stat-label">Tests Taken</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar relative overflow-hidden">
                                <div className="stat-progress-fill stat-progress-purple bg-gradient-to-r from-violet-400 to-violet-600 relative" style={{ width: testResults.length > 0 ? "60%" : "0%" }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                </div>
                            </div>
                            <span className="stat-percentage text-violet-600 dark:text-violet-400 font-semibold">Keep practicing!</span>
                        </div>
                    </div>

                    {/* Average Score - Clickable with Color-Coded Scoring */}
                    <div
                        className="stat-card cursor-pointer animate-fade-in hover:scale-105 hover:shadow-glow-amber transition-all duration-300"
                        onClick={() => navigate("/quiz-selection")}
                        title="View quiz history"
                    >
                        <div className="stat-header">
                            <div className={`stat-icon-wrapper stat-icon-green bg-gradient-to-br ${testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 80
                                ? 'from-emerald-400 to-emerald-600'
                                : testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 60
                                    ? 'from-amber-400 to-amber-600'
                                    : 'from-rose-400 to-rose-600'
                                }`}>
                                <Award className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className={`stat-value ${testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 80
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 60
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                    {testResults.length > 0
                                        ? Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length)
                                        : 0}%
                                </p>
                                <p className="stat-label">Average Score</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar relative overflow-hidden">
                                <div className={`stat-progress-fill stat-progress-green relative bg-gradient-to-r ${testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 80
                                    ? 'from-emerald-400 to-emerald-600'
                                    : testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 60
                                        ? 'from-amber-400 to-amber-600'
                                        : 'from-rose-400 to-rose-600'
                                    }`} style={{
                                        width: testResults.length > 0
                                            ? `${Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length)}%`
                                            : "0%"
                                    }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                </div>
                            </div>
                            <span className={`stat-percentage font-semibold ${testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : testResults.length > 0 && Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length) >= 60
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                {testResults.length > 0 ? "Great progress!" : "Take your first test"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Course Progress Section */}
                <div className="dashboard-section">
                    <div className="section-header-dashboard">
                        <h3 className="section-title-dashboard">Learning Progress</h3>
                        <button onClick={() => navigate("/learn")} className="view-all-link">View All</button>
                    </div>
                    <div className="course-progress-card">
                        <div className="progress-item">
                            <div className="progress-info">
                                <span className="progress-course-name">
                                    {user?.selectedRoadmap?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Your Roadmap'}
                                </span>
                                <span className="progress-percentage">{getOverallProgress()}%</span>
                            </div>
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill progress-orange" style={{ width: `${getOverallProgress()}%` }}></div>
                            </div>
                        </div>
                        {progressData && progressData.completedLessons && progressData.completedLessons.length > 0 ? (
                            <div className="mt-4 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                <p>✅ {getCompletedLessons()} lessons completed out of {getTotalLessons()}</p>
                                <p className="mt-1">🎯 Keep up the great work!</p>
                            </div>
                        ) : (
                            <div className="mt-4 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                <p>Start your learning journey today!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Paused Roadmaps Section */}
                {roadmapHistory.some(h => h.status === 'paused') && (
                    <div className="dashboard-section">
                        <div className="section-header-dashboard">
                            <h3 className="section-title-dashboard">Paused Journeys</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roadmapHistory.filter(h => h.status === 'paused').map((history, index) => (
                                <div key={index} className="bg-white dark:bg-dark-400 rounded-xl p-4 border border-gray-200 dark:border-dark-300 flex items-center justify-between hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-300 flex items-center justify-center text-gray-500 dark:text-cream-200">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-cream-100 capitalize">
                                                {history.roadmapId.replace(/-/g, ' ')}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-cream-300">
                                                Paused on {new Date(history.pausedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleResumeRoadmap(history.roadmapId)}
                                        className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                    >
                                        Resume
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Custom Learning Documents Section */}
                {customDocuments.length > 0 && (
                    <div className="dashboard-section">
                        <div className="section-header-dashboard">
                            <h3 className="section-title-dashboard">Custom Learning Materials</h3>
                            <button onClick={() => navigate("/custom-learning")} className="view-all-link">View All</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customDocuments.slice(0, 6).map((doc, index) => (
                                <div key={index} className="bg-white dark:bg-dark-400 rounded-xl p-4 border border-gray-200 dark:border-dark-300 hover:shadow-md transition-all">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                                            📄
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 dark:text-cream-100 truncate">
                                                {doc.originalName}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-cream-300 mt-1">
                                                {doc.chunkCount} chunks • {(doc.size / 1024).toFixed(1)} KB
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-cream-400 mt-1">
                                                {new Date(doc.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Test Results Table */}
                <div className="dashboard-section">
                    <div className="section-header-dashboard">
                        <h3 className="section-title-dashboard">Recent Test Results</h3>
                        <button className="view-all-link" onClick={() => navigate("/test")}>View All</button>
                    </div>
                    <div className="courses-table-card">
                        <table className="courses-table">
                            <thead>
                                <tr>
                                    <th>Test Category</th>
                                    <th>Difficulty</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {testResults && testResults.length > 0 ? (
                                    testResults.slice(0, 5).map((test, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div className="course-name-cell">
                                                    <div className="course-icon">
                                                        {test.testCategory?.includes('JavaScript') ? '⚡' :
                                                            test.testCategory?.includes('React') ? '⚛️' :
                                                                test.testCategory?.includes('Node') ? '🟢' :
                                                                    test.testCategory?.includes('Database') ? '🗄️' : '📝'}
                                                    </div>
                                                    <span className="course-name-text">{test.testCategory || 'General Test'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${test.difficulty === 'Easy' ? 'status-easy' :
                                                    test.difficulty === 'Medium' ? 'status-medium' :
                                                        test.difficulty === 'Hard' ? 'status-hard' : 'status-expert'
                                                    }`}>
                                                    {test.difficulty || 'Medium'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="rating-cell">
                                                    <span className={`score-value ${test.score >= 80 ? 'score-excellent' :
                                                        test.score >= 60 ? 'score-good' : 'score-needs-improvement'
                                                        }`}>
                                                        {test.score}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="test-date">
                                                    {new Date(test.completedAt || test.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                            <div style={{ color: 'var(--text-gray)' }}>
                                                No test results yet. <button onClick={() => navigate("/test")} style={{ color: 'var(--orange-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Take your first test!</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Graphs Section */}
                <div className="dashboard-graphs-grid">
                    {/* Daily Learning Hours */}
                    <div className="graph-card">
                        <div className="graph-header">
                            <h3 className="graph-title">Learning Activity</h3>
                            <select className="graph-filter">
                                <option>Last 7 days</option>
                                <option>Last 30 days</option>
                                <option>Last 90 days</option>
                            </select>
                        </div>
                        <div className="graph-content">
                            <div className="graph-stats">
                                <div className="graph-stat-item">
                                    <span className="graph-stat-label">Progress</span>
                                    <span className="graph-stat-value">{getCompletedLessons()} Lessons Completed</span>
                                </div>
                            </div>
                            <svg width="100%" height="200" viewBox="0 0 400 200" className="line-chart">
                                <defs>
                                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#FF8A00" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#FF8A00" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {(() => {
                                    const progress = getOverallProgress();
                                    const points = [];
                                    for (let i = 0; i <= 7; i++) {
                                        const x = i * 57;
                                        const y = 180 - (progress * 1.5 * (i / 7));
                                        points.push(`${x},${y}`);
                                    }
                                    return (
                                        <>
                                            <path
                                                d={`M 0 180 L ${points.join(' L ')} L 400 180 Z`}
                                                fill="url(#lineGradient)"
                                            />
                                            <polyline
                                                fill="none"
                                                stroke="#FF8A00"
                                                strokeWidth="3"
                                                points={points.join(' ')}
                                            />
                                            {points.map((point, i) => {
                                                const [x, y] = point.split(',');
                                                return <circle key={i} cx={x} cy={y} r="4" fill="#FF8A00" />;
                                            })}
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>

                    {/* Learning Statistics Pie Chart */}
                    <div className="graph-card">
                        <div className="graph-header">
                            <h3 className="graph-title">Learning Statistics</h3>
                        </div>
                        <div className="graph-content pie-chart-container">
                            {(() => {
                                const completed = getCompletedLessons();
                                const tests = testResults.length;
                                const avgScore = testResults.length > 0
                                    ? Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length)
                                    : 0;

                                const total = completed + tests + avgScore;
                                const lessonsPercent = total > 0 ? (completed / total) * 100 : 33;
                                const testsPercent = total > 0 ? (tests / total) * 100 : 33;
                                const scorePercent = total > 0 ? (avgScore / total) * 100 : 34;

                                const circumference = 2 * Math.PI * 80;
                                const lessonsDash = (lessonsPercent / 100) * circumference;
                                const testsDash = (testsPercent / 100) * circumference;
                                const scoreDash = (scorePercent / 100) * circumference;

                                return (
                                    <>
                                        <svg width="200" height="200" viewBox="0 0 200 200" className="pie-chart">
                                            <circle
                                                cx="100" cy="100" r="80"
                                                fill="none" stroke="#10B981" strokeWidth="40"
                                                strokeDasharray={`${lessonsDash} ${circumference}`}
                                                transform="rotate(-90 100 100)"
                                            />
                                            <circle
                                                cx="100" cy="100" r="80"
                                                fill="none" stroke="#F59E0B" strokeWidth="40"
                                                strokeDasharray={`${testsDash} ${circumference}`}
                                                strokeDashoffset={`-${lessonsDash}`}
                                                transform="rotate(-90 100 100)"
                                            />
                                            <circle
                                                cx="100" cy="100" r="80"
                                                fill="none" stroke="#EF4444" strokeWidth="40"
                                                strokeDasharray={`${scoreDash} ${circumference}`}
                                                strokeDashoffset={`-${lessonsDash + testsDash}`}
                                                transform="rotate(-90 100 100)"
                                            />
                                        </svg>
                                        <div className="pie-chart-legend">
                                            <div className="legend-item">
                                                <div className="legend-color" style={{ background: "#10B981" }}></div>
                                                <div className="legend-text">
                                                    <span className="legend-label">Lessons</span>
                                                    <span className="legend-value">{completed}</span>
                                                </div>
                                            </div>
                                            <div className="legend-item">
                                                <div className="legend-color" style={{ background: "#F59E0B" }}></div>
                                                <div className="legend-text">
                                                    <span className="legend-label">Tests</span>
                                                    <span className="legend-value">{tests}</span>
                                                </div>
                                            </div>
                                            <div className="legend-item">
                                                <div className="legend-color" style={{ background: "#EF4444" }}></div>
                                                <div className="legend-text">
                                                    <span className="legend-label">Avg Score</span>
                                                    <span className="legend-value">{avgScore}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </main>

            {/* Roadmap Change Warning Modal */}
            {showRoadmapModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <div className="bg-white dark:bg-dark-400 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-cream-100 text-center mb-2">
                            Change Learning Roadmap?
                        </h3>
                        <p className="text-gray-600 dark:text-cream-200 text-center mb-6">
                            Your current roadmap progress will be <strong>paused</strong> and saved. You can resume it anytime by changing back to this roadmap.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>💡 Note:</strong> All your progress, completed lessons, and test scores will be preserved. You're not losing anything!
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRoadmapModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-dark-300 text-gray-700 dark:text-cream-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-dark-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRoadmapChange}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-amber-700 transition-all hover:shadow-lg"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}