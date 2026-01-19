import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Filter, MoreVertical, Users, Clock, 
    BookOpen, Play, Pause, Settings, Eye, Trash2,
    Calendar, CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import "../styles/DevvoraStyles.css";

const ExamCard = ({ exam, onStart, onPause, onView, onDelete }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-100';
            case 'paused': return 'text-yellow-600 bg-yellow-100';
            case 'ended': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return <CheckCircle size={16} />;
            case 'paused': return <AlertCircle size={16} />;
            case 'ended': return <XCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <div className="exam-card">
            <div className="exam-card-header">
                <div className="exam-title">
                    <h3>{exam.title}</h3>
                    <p>{exam.description}</p>
                </div>
                <div className={`exam-status ${getStatusColor(exam.status)}`}>
                    {getStatusIcon(exam.status)}
                    <span>{exam.status}</span>
                </div>
            </div>
            
            <div className="exam-stats">
                <div className="stat">
                    <Users size={16} />
                    <span>{exam.totalAttempts || 0} attempts</span>
                </div>
                <div className="stat">
                    <BookOpen size={16} />
                    <span>{exam.totalQuestions} questions</span>
                </div>
                <div className="stat">
                    <Clock size={16} />
                    <span>{exam.duration} minutes</span>
                </div>
                <div className="stat">
                    <Calendar size={16} />
                    <span>{new Date(exam.startTime).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div className="exam-details">
                <div className="detail-row">
                    <span>Access Code:</span>
                    <code className="access-code">{exam.examCode}</code>
                </div>
                <div className="detail-row">
                    <span>Passing Score:</span>
                    <span>{exam.passingScore}%</span>
                </div>
                <div className="detail-row">
                    <span>Exam Type:</span>
                    <span className="exam-type">{exam.examType || 'static'}</span>
                </div>
            </div>
            
            <div className="exam-actions">
                {exam.status === 'active' ? (
                    <button className="action-btn pause-btn" onClick={() => onPause(exam._id)}>
                        <Pause size={16} />
                        Pause
                    </button>
                ) : (
                    <button className="action-btn start-btn" onClick={() => onStart(exam._id)}>
                        <Play size={16} />
                        Start
                    </button>
                )}
                <button className="action-btn view-btn" onClick={() => onView(exam._id)}>
                    <Eye size={16} />
                    View
                </button>
                <button className="action-btn settings-btn" onClick={() => onView(exam._id)}>
                    <Settings size={16} />
                    Manage
                </button>
                <button className="action-btn delete-btn" onClick={() => onDelete(exam._id)}>
                    <Trash2 size={16} />
                    Delete
                </button>
            </div>
        </div>
    );
};

export default function AdminExamList() {
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/list`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setExams(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch exams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartExam = async (examId) => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'active' }),
                credentials: 'include'
            });
            if (res.ok) {
                fetchExams(); // Refresh the list
            }
        } catch (error) {
            console.error('Failed to start exam:', error);
        }
    };

    const handlePauseExam = async (examId) => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'paused' }),
                credentials: 'include'
            });
            if (res.ok) {
                fetchExams(); // Refresh the list
            }
        } catch (error) {
            console.error('Failed to pause exam:', error);
        }
    };

    const handleViewExam = (examId) => {
        navigate(`/admin/exams/${examId}/manage`);
    };

    const handleDeleteExam = async (examId) => {
        if (window.confirm('Are you sure you want to delete this exam?')) {
            try {
                const res = await fetch(`${API_BASE}/exams/admin/${examId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (res.ok) {
                    fetchExams(); // Refresh the list
                }
            } catch (error) {
                console.error('Failed to delete exam:', error);
            }
        }
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            exam.examCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || exam.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className={`admin-exam-list-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading exams...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-exam-list-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
            <header className="exam-list-header">
                <div className="header-title">
                    <h1>Exam Management</h1>
                    <p>Create, manage, and monitor your exams</p>
                </div>
                <button 
                    className="create-exam-btn"
                    onClick={() => navigate('/admin/exams/create')}
                >
                    <Plus size={20} />
                    Create New Exam
                </button>
            </header>

            <div className="exam-list-controls">
                <div className="search-filter-bar">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search exams..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-box">
                        <Filter size={18} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="ended">Ended</option>
                        </select>
                    </div>
                </div>
                
                <div className="exam-stats-summary">
                    <div className="summary-stat">
                        <span className="stat-number">{exams.length}</span>
                        <span className="stat-label">Total Exams</span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-number">{exams.filter(e => e.status === 'active').length}</span>
                        <span className="stat-label">Active</span>
                    </div>
                    <div className="summary-stat">
                        <span className="stat-number">{exams.reduce((sum, e) => sum + (e.totalAttempts || 0), 0)}</span>
                        <span className="stat-label">Total Attempts</span>
                    </div>
                </div>
            </div>

            <div className="exam-list-content">
                {filteredExams.length === 0 ? (
                    <div className="empty-state">
                        <BookOpen size={48} />
                        <h3>No exams found</h3>
                        <p>
                            {searchTerm || filterStatus !== 'all' 
                                ? 'Try adjusting your search or filter criteria'
                                : 'Create your first exam to get started'
                            }
                        </p>
                        {!searchTerm && filterStatus === 'all' && (
                            <button 
                                className="create-first-exam-btn"
                                onClick={() => navigate('/admin/exams/create')}
                            >
                                <Plus size={20} />
                                Create Your First Exam
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="exams-grid">
                        {filteredExams.map(exam => (
                            <ExamCard
                                key={exam._id}
                                exam={exam}
                                onStart={handleStartExam}
                                onPause={handlePauseExam}
                                onView={handleViewExam}
                                onDelete={handleDeleteExam}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}