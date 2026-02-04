import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Play, Pause, Square, BarChart2, Eye,
    RefreshCw, Settings, Users, Trash2, X, AlertTriangle
} from 'lucide-react';
import "../styles/DevvoraStyles.css";

export default function AdminExamDashboard() {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ show: false, examId: null, examTitle: '' });
    const [deleting, setDeleting] = useState(false);
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;

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
            console.error("Failed to fetch exams:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (examId, newStatus) => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            if (res.ok) fetchExams();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleRegenerateCode = async (examId) => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/regenerate-code`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) fetchExams();
        } catch (error) {
            console.error("Failed to regenerate code:", error);
        }
    };

    const handleDeleteClick = (examId, examTitle) => {
        setDeleteModal({ show: true, examId, examTitle });
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${deleteModal.examId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setDeleteModal({ show: false, examId: null, examTitle: '' });
                fetchExams();
            }
        } catch (error) {
            console.error("Failed to delete exam:", error);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal({ show: false, examId: null, examTitle: '' });
    };

    if (loading) return <div className="loading-container">Loading exams...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1 className="text-gray-900 dark:text-cream-100">Exam Management</h1>
                    <p className="text-gray-600 dark:text-cream-200">Create and manage your examination sessions</p>
                </div>
                <div className="header-actions">
                    <button className="secondary-btn" onClick={() => navigate('/admin/biometrics')}>
                        <Users size={20} />
                        Biometric Approvals
                    </button>
                    <button className="create-btn" onClick={() => navigate('/admin/exams/create')}>
                        <Plus size={20} />
                        Create New Exam
                    </button>
                </div>
            </header>

            {exams.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon dark:bg-dark-500 dark:text-gray-400">
                        <BarChart2 size={48} />
                    </div>
                    <h3 className="dark:text-cream-100">No exams yet</h3>
                    <p className="dark:text-gray-400">Create your first exam to get started</p>
                    <button className="create-btn" onClick={() => navigate('/admin/exams/create')}>
                        <Plus size={20} />
                        Create Exam
                    </button>
                </div>
            ) : (
                <div className="exam-grid">
                    {exams.map(exam => (
                        <div key={exam._id} className="exam-card premium-card">
                            <div className="exam-card-header">
                                <div className="exam-info">
                                    <h3 className="text-gray-900 dark:text-cream-100">{exam.title}</h3>
                                    <span className={`status-badge ${exam.status}`}>
                                        {exam.status.toUpperCase()}
                                    </span>
                                </div>
                                <button
                                    className="delete-btn-icon"
                                    onClick={() => handleDeleteClick(exam._id, exam.title)}
                                    title="Delete Exam"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="exam-code-box">
                                <span className="code-label">Access Code</span>
                                <div className="code-value dark:bg-dark-500">
                                    <code className="dark:text-orange-400">{exam.examCode}</code>
                                    <button onClick={() => handleRegenerateCode(exam._id)} title="Regenerate Code" className="dark:text-gray-400 dark:hover:text-cream-100">
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="exam-stats">
                                <div className="stat-item dark:text-gray-400">
                                    <Users size={16} />
                                    <span>{exam.activeSessions} Active</span>
                                </div>
                                <div className="stat-item dark:text-gray-400">
                                    <BarChart2 size={16} />
                                    <span>{exam.totalAttempts} Submissions</span>
                                </div>
                            </div>

                            <div className="exam-card-actions">
                                <div className="status-controls">
                                    {exam.status === 'paused' || exam.status === 'draft' ? (
                                        <button onClick={() => handleStatusUpdate(exam._id, 'active')} title="Start/Resume">
                                            <Play size={18} />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleStatusUpdate(exam._id, 'paused')} title="Pause">
                                            <Pause size={18} />
                                        </button>
                                    )}
                                    <button onClick={() => handleStatusUpdate(exam._id, 'completed')} title="End Exam">
                                        <Square size={18} />
                                    </button>
                                </div>

                                <div className="view-controls">
                                    <button onClick={() => navigate(`/admin/exams/${exam._id}/students`)} title="Manage Students">
                                        <Users size={18} />
                                    </button>
                                    <button onClick={() => navigate(`/admin/exams/${exam._id}/monitor`)} title="Monitor Candidates">
                                        <Eye size={18} />
                                    </button>
                                    <button onClick={() => navigate(`/admin/exams/${exam._id}/analytics`)} title="View Results">
                                        <BarChart2 size={18} />
                                    </button>
                                    <button onClick={() => navigate(`/admin/exams/${exam._id}/edit`)} title="Settings">
                                        <Settings size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.show && (
                <div className="modal-overlay" onClick={handleDeleteCancel}>
                    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header dark:border-dark-300">
                            <div className="modal-icon warning">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="dark:text-cream-100">Delete Exam</h3>
                            <button className="modal-close dark:text-gray-400 dark:hover:bg-dark-300" onClick={handleDeleteCancel}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="dark:text-gray-300">Are you sure you want to delete <strong className="dark:text-cream-100">"{deleteModal.examTitle}"</strong>?</p>
                            <p className="warning-text">This will permanently delete:</p>
                            <ul className="warning-list dark:text-gray-400">
                                <li>All exam questions</li>
                                <li>All student sessions</li>
                                <li>All exam attempts and results</li>
                                <li>All proctoring logs</li>
                            </ul>
                            <p className="warning-text"><strong>This action cannot be undone.</strong></p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={handleDeleteCancel} disabled={deleting}>
                                Cancel
                            </button>
                            <button className="btn-danger" onClick={handleDeleteConfirm} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
