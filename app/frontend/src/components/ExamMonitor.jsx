import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users, AlertTriangle, Clock, CheckCircle,
    ChevronLeft, RefreshCw, ShieldAlert
} from 'lucide-react';
import "../styles/DevvoraStyles.css";

export default function ExamMonitor() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;

    useEffect(() => {
        fetchCandidates();
        const interval = setInterval(fetchCandidates, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, [examId]);

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
            console.error("Failed to fetch candidates:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="loading-container">Loading candidates...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <button className="back-link" onClick={() => navigate('/admin/exams')}>
                        <ChevronLeft size={20} />
                        Back to Exams
                    </button>
                    <h1>Real-time Monitoring</h1>
                    <p>Tracking {candidates.length} active candidates</p>
                </div>
                <div className="monitor-status">
                    <span className="live-indicator">LIVE</span>
                    <button className="refresh-btn" onClick={fetchCandidates}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </header>

            <div className="monitor-grid">
                <div className="candidate-list premium-card">
                    <table className="monitor-table">
                        <thead>
                            <tr>
                                <th>Candidate ID</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th>Time Left</th>
                                <th>Violations</th>
                                <th>Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.map(candidate => (
                                <tr key={candidate._id} className={candidate.violations > 2 ? 'warning-row' : ''}>
                                    <td>
                                        <div className="user-info">
                                            <Users size={16} />
                                            <code>{candidate.userId}</code>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-pill ${candidate.status}`}>
                                            {candidate.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="progress-mini">
                                            <span>Q{candidate.currentQuestionIndex + 1}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="time-info">
                                            <Clock size={14} />
                                            <span>{formatTime(candidate.timeRemaining)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`violation-info ${candidate.violations > 0 ? 'has-violations' : ''}`}>
                                            <ShieldAlert size={14} />
                                            <span>{candidate.violations}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {new Date(candidate.lastHeartbeat).toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                            {candidates.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        No active candidates found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
