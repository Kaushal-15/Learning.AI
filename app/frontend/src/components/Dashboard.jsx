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
    const [showRoadmapModal, setShowRoadmapModal] = useState(false);
    const { isDarkMode } = useTheme();

    // Apply dashboard-dark class when theme changes
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dashboard-dark');
        } else {
            document.documentElement.classList.remove('dashboard-dark');
        }
    }, [isDarkMode]);

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

                    // Fetch test results
                    try {
                        const testRes = await fetch("http://localhost:3000/api/test-results?limit=5", {
                            method: "GET",
                            credentials: "include",
                        });
                        const testData = await testRes.json();
                        if (testRes.ok && testData.success) {
                            setTestResults(testData.data || []);
                        }
                    } catch (testErr) {
                        console.error("Error fetching test results:", testErr);
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
                {/* Welcome Card */}
                <div className="dashboard-welcome-card">
                    <div className="welcome-card-content">
                        <h3 className="welcome-back-text">Welcome back</h3>
                        <h2 className="welcome-name">{user?.name || "Learner"} 👋</h2>
                        <p className="welcome-description">
                            Current Roadmap: <strong>{user?.selectedRoadmap?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Selected'}</strong>
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => navigate("/learn")} className="btn-explore-courses">
                                Continue Learning
                            </button>
                            <button
                                onClick={handleChangeRoadmap}
                                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-semibold transition-all duration-300 border-2 border-white/30"
                            >
                                Change Roadmap
                            </button>
                        </div>
                    </div>
                    <div className="welcome-card-character">
                        <div className="character-3d-dashboard">🧑‍💻</div>
                    </div>
                </div>

                {/* Quick Action CTAs */}
                <div className="dashboard-cta-grid">
                    <button onClick={() => navigate("/test")} className="dashboard-cta-card cta-test">
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

                    <button onClick={() => navigate("/quiz-selection")} className="dashboard-cta-card cta-quiz">
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
                </div>

                {/* Stats Cards */}
                <div className="dashboard-stats-grid">
                    {/* Lessons Completed */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon-wrapper stat-icon-blue">
                                <BookOpen className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className="stat-value">{getCompletedLessons()}</p>
                                <p className="stat-label">Lessons Completed</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar">
                                <div className="stat-progress-fill" style={{ width: `${getOverallProgress()}%` }}></div>
                            </div>
                            <span className="stat-percentage">{getOverallProgress()}% of roadmap</span>
                        </div>
                    </div>

                    {/* Tests Taken - Clickable */}
                    <div
                        className="stat-card cursor-pointer hover:shadow-xl transition-all duration-300"
                        onClick={() => navigate("/quiz-selection")}
                        title="View quiz history"
                    >
                        <div className="stat-header">
                            <div className="stat-icon-wrapper stat-icon-purple">
                                <FolderKanban className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className="stat-value">{testResults.length}</p>
                                <p className="stat-label">Tests Taken</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar">
                                <div className="stat-progress-fill stat-progress-purple" style={{ width: testResults.length > 0 ? "60%" : "0%" }}></div>
                            </div>
                            <span className="stat-percentage">Keep practicing!</span>
                        </div>
                    </div>

                    {/* Average Score - Clickable */}
                    <div
                        className="stat-card cursor-pointer hover:shadow-xl transition-all duration-300"
                        onClick={() => navigate("/quiz-selection")}
                        title="View quiz history"
                    >
                        <div className="stat-header">
                            <div className="stat-icon-wrapper stat-icon-green">
                                <Award className="stat-icon" />
                            </div>
                            <div className="stat-value-container">
                                <p className="stat-value">
                                    {testResults.length > 0
                                        ? Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length)
                                        : 0}%
                                </p>
                                <p className="stat-label">Average Score</p>
                            </div>
                        </div>
                        <div className="stat-footer">
                            <div className="stat-progress-bar">
                                <div className="stat-progress-fill stat-progress-green" style={{
                                    width: testResults.length > 0
                                        ? `${Math.round(testResults.reduce((acc, test) => acc + (test.score || 0), 0) / testResults.length)}%`
                                        : "0%"
                                }}></div>
                            </div>
                            <span className="stat-percentage">
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
        </div>
    );
}