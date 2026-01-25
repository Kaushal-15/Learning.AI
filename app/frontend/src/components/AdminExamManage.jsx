import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Users, Clock, BookOpen, Play, Pause,
    Settings, Eye, Download, RefreshCw, AlertCircle, Target, Save
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import "../styles/DevvoraStyles.css";

export default function AdminExamManage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const [exam, setExam] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [routingConfig, setRoutingConfig] = useState(null);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    useEffect(() => {
        if (examId) {
            fetchExamDetails();
            fetchCandidates();
            fetchResults();
        }
    }, [examId]);

    const fetchExamDetails = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setExam(data.data);
                setRoutingConfig(data.data.adaptiveRouting || {
                    easy: { correct: ['easy', 'medium'], wrong: ['easy'] },
                    medium: { correct: ['medium', 'hard'], wrong: ['easy', 'medium'] },
                    hard: { correct: ['hard'], wrong: ['medium'] }
                });
            }
        } catch (error) {
            console.error('Failed to fetch exam details:', error);
        }
    };

    const fetchCandidates = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/candidates`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setCandidates(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/results`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setResults(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            if (res.ok) {
                fetchExamDetails();
            }
        } catch (error) {
            console.error('Failed to update exam status:', error);
        }
    };

    const handleRoutingChange = (level, type, targets) => {
        setRoutingConfig(prev => ({
            ...prev,
            [level]: {
                ...prev[level],
                [type]: targets
            }
        }));
    };

    const saveRoutingConfig = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adaptiveRouting: routingConfig }),
                credentials: 'include'
            });
            if (res.ok) {
                alert('Routing rules saved successfully!');
            } else {
                alert('Failed to save routing rules.');
            }
        } catch (error) {
            console.error('Failed to save routing:', error);
            alert('Error saving routing rules.');
        }
    };

    if (loading || !exam) {
        return (
            <div className={`admin-exam-manage-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading exam details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-exam-manage-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
            <header className="exam-manage-header">
                <button className="back-btn" onClick={() => navigate('/admin/exams')}>
                    <ChevronLeft size={20} />
                    Back to Exams
                </button>
                <div className="exam-info">
                    <h1>{exam.title}</h1>
                    <p>Access Code: <code>{exam.examCode}</code></p>
                </div>
                <div className="exam-controls">
                    {exam.status === 'active' ? (
                        <button
                            className="control-btn pause-btn"
                            onClick={() => handleStatusChange('paused')}
                        >
                            <Pause size={18} />
                            Pause Exam
                        </button>
                    ) : (
                        <button
                            className="control-btn start-btn"
                            onClick={() => handleStatusChange('active')}
                        >
                            <Play size={18} />
                            Start Exam
                        </button>
                    )}
                    <button className="control-btn refresh-btn" onClick={() => window.location.reload()}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </header>

            <div className="exam-manage-content">
                <div className="exam-tabs">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab ${activeTab === 'candidates' ? 'active' : ''}`}
                        onClick={() => setActiveTab('candidates')}
                    >
                        Live Candidates ({candidates.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'results' ? 'active' : ''}`}
                        onClick={() => setActiveTab('results')}
                    >
                        Results ({results.length})
                    </button>
                    {(exam.isAdaptive || exam.examType === 'dynamic') && (
                        <button
                            className={`tab ${activeTab === 'routing' ? 'active' : ''}`}
                            onClick={() => setActiveTab('routing')}
                        >
                            Routing Rules
                        </button>
                    )}
                </div>

                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <div className="overview-content">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <Users size={24} />
                                    <div>
                                        <span className="stat-number">{results.length}</span>
                                        <span className="stat-label">Total Attempts</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <Clock size={24} />
                                    <div>
                                        <span className="stat-number">{candidates.length}</span>
                                        <span className="stat-label">Active Sessions</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <BookOpen size={24} />
                                    <div>
                                        <span className="stat-number">{exam.totalQuestions}</span>
                                        <span className="stat-label">Questions</span>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <AlertCircle size={24} />
                                    <div>
                                        <span className="stat-number">{exam.status}</span>
                                        <span className="stat-label">Status</span>
                                    </div>
                                </div>
                            </div>

                            <div className="exam-details-grid">
                                <div className="detail-section">
                                    <h3>Exam Information</h3>
                                    <div className="detail-list">
                                        <div className="detail-item">
                                            <span>Duration:</span>
                                            <span>{exam.duration} minutes</span>
                                        </div>
                                        <div className="detail-item">
                                            <span>Passing Score:</span>
                                            <span>{exam.passingScore}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span>Exam Type:</span>
                                            <span>{exam.examType || 'static'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span>Start Time:</span>
                                            <span>{new Date(exam.startTime).toLocaleString()}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span>End Time:</span>
                                            <span>{new Date(exam.endTime).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h3>Quick Actions</h3>
                                    <div className="action-buttons">
                                        <button className="action-button">
                                            <Eye size={18} />
                                            Preview Questions
                                        </button>
                                        <button className="action-button">
                                            <Download size={18} />
                                            Export Results
                                        </button>
                                        <button className="action-button">
                                            <Settings size={18} />
                                            Exam Settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'candidates' && (
                        <div className="candidates-content">
                            {candidates.length === 0 ? (
                                <div className="empty-state">
                                    <Users size={48} />
                                    <h3>No active candidates</h3>
                                    <p>No students are currently taking this exam</p>
                                </div>
                            ) : (
                                <div className="candidates-list">
                                    {candidates.map(candidate => (
                                        <div key={candidate._id} className="candidate-card">
                                            <div className="candidate-info">
                                                <h4>{candidate.studentName || `Student ${candidate.userId}`}</h4>
                                                {candidate.registerNumber && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400">Reg: {candidate.registerNumber}</p>
                                                )}
                                                <p>Started: {new Date(candidate.startTime).toLocaleTimeString()}</p>
                                            </div>
                                            <div className="candidate-progress">
                                                <span>Question {candidate.currentQuestionIndex + 1} of {exam.totalQuestions}</span>
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${((candidate.currentQuestionIndex + 1) / exam.totalQuestions) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="candidate-time">
                                                <Clock size={16} />
                                                <span>{Math.floor(candidate.timeRemaining / 60)}:{(candidate.timeRemaining % 60).toString().padStart(2, '0')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'results' && (
                        <div className="results-content">
                            {results.length === 0 ? (
                                <div className="empty-state">
                                    <BookOpen size={48} />
                                    <h3>No results yet</h3>
                                    <p>Results will appear here once students complete the exam</p>
                                </div>
                            ) : (
                                <div className="results-table">
                                    <div className="table-header">
                                        <span>Name</span>
                                        <span>Register No.</span>
                                        <span>Score</span>
                                        <span>Time Taken</span>
                                        <span>Status</span>
                                        <span>Completed</span>
                                    </div>
                                    {results.map(result => (
                                        <div key={result._id} className="table-row">
                                            <span>{result.studentName || `Student ${result.userId}`}</span>
                                            <span>{result.registerNumber || 'N/A'}</span>
                                            <span className={`score ${result.score >= exam.passingScore ? 'pass' : 'fail'}`}>
                                                {result.score.toFixed(1)}%
                                            </span>
                                            <span>{Math.floor(result.timeTaken / 60)}:{(result.timeTaken % 60).toString().padStart(2, '0')}</span>
                                            <span className={`status ${result.status}`}>{result.status}</span>
                                            <span>{new Date(result.submittedAt).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'routing' && routingConfig && (
                        <div className="routing-content">
                            <div className="routing-header">
                                <h3>Adaptive Routing Configuration</h3>
                                <p>Define how the exam difficulty changes based on student performance.</p>
                            </div>

                            <div className="routing-rules-grid">
                                {['easy', 'medium', 'hard'].map(level => (
                                    <div key={level} className="routing-rule-card">
                                        <div className={`rule-header ${level}`}>
                                            <Target size={20} />
                                            <span>Current: {level.toUpperCase()}</span>
                                        </div>
                                        <div className="rule-body">
                                            <div className="rule-group">
                                                <label className="text-green-600 font-bold">If Correct → Next Question can be:</label>
                                                <div className="checkbox-group">
                                                    {['easy', 'medium', 'hard'].map(target => (
                                                        <label key={target} className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={routingConfig[level]?.correct?.includes(target)}
                                                                onChange={(e) => {
                                                                    const current = routingConfig[level]?.correct || [];
                                                                    const newTargets = e.target.checked
                                                                        ? [...current, target]
                                                                        : current.filter(t => t !== target);
                                                                    handleRoutingChange(level, 'correct', newTargets);
                                                                }}
                                                            />
                                                            {target}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rule-group">
                                                <label className="text-red-600 font-bold">If Wrong → Next Question can be:</label>
                                                <div className="checkbox-group">
                                                    {['easy', 'medium', 'hard'].map(target => (
                                                        <label key={target} className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={routingConfig[level]?.wrong?.includes(target)}
                                                                onChange={(e) => {
                                                                    const current = routingConfig[level]?.wrong || [];
                                                                    const newTargets = e.target.checked
                                                                        ? [...current, target]
                                                                        : current.filter(t => t !== target);
                                                                    handleRoutingChange(level, 'wrong', newTargets);
                                                                }}
                                                            />
                                                            {target}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="routing-actions">
                                <button className="save-btn" onClick={saveRoutingConfig}>
                                    <Save size={18} />
                                    Save Rules
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}