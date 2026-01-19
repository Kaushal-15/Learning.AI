import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    BarChart2, Download, ChevronLeft,
    CheckCircle, XCircle, TrendingUp, FileText
} from 'lucide-react';
import "../styles/DevvoraStyles.css";

export default function ExamAnalytics() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [analytics, setAnalytics] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    useEffect(() => {
        fetchData();
    }, [examId]);

    const fetchData = async () => {
        try {
            const [analyticsRes, resultsRes] = await Promise.all([
                fetch(`${API_BASE}/exams/admin/${examId}/analytics`, { credentials: 'include' }),
                fetch(`${API_BASE}/exams/admin/${examId}/results`, { credentials: 'include' })
            ]);

            const analyticsData = await analyticsRes.json();
            const resultsData = await resultsRes.json();

            if (analyticsData.success) setAnalytics(analyticsData.data);
            if (resultsData.success) setResults(resultsData.data);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        const headers = ["User ID", "Score", "Accuracy", "Correct", "Total", "Time Taken (s)", "Status", "Submitted At"];
        const rows = results.map(r => [
            r.userId,
            r.score.toFixed(2),
            r.accuracy.toFixed(2),
            r.correctAnswers,
            r.totalQuestions,
            r.timeTaken,
            r.status,
            new Date(r.submittedAt).toLocaleString()
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `exam_results_${examId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="loading-container">Loading analytics...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div className="header-content">
                    <button className="back-link" onClick={() => navigate('/admin/exams')}>
                        <ChevronLeft size={20} />
                        Back to Exams
                    </button>
                    <h1>Exam Analytics</h1>
                    <p>Performance overview and detailed results</p>
                </div>
                <button className="export-btn" onClick={exportToCSV}>
                    <Download size={18} />
                    Export CSV
                </button>
            </header>

            <div className="analytics-overview">
                <div className="stat-card premium-card">
                    <TrendingUp className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-label">Total Attempts</span>
                        <span className="stat-value">{analytics?.totalAttempts || 0}</span>
                    </div>
                </div>
                <div className="stat-card premium-card">
                    <CheckCircle className="stat-icon success" />
                    <div className="stat-info">
                        <span className="stat-label">Avg. Score</span>
                        <span className="stat-value">
                            {(results.reduce((acc, r) => acc + r.score, 0) / (results.length || 1)).toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="question-stats premium-card">
                    <h3>Question Performance</h3>
                    <div className="question-list">
                        {analytics?.questionStats.map((q, idx) => (
                            <div key={idx} className="question-stat-item">
                                <div className="q-info">
                                    <span className="q-number">Q{idx + 1}</span>
                                    <p className="q-content">{q.content}</p>
                                </div>
                                <div className="q-performance">
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${q.correctRate}%` }}
                                        ></div>
                                    </div>
                                    <span className="rate-value">{q.correctRate.toFixed(1)}% Correct</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="detailed-results premium-card">
                    <h3>Candidate Results</h3>
                    <div className="results-table-wrapper">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Candidate</th>
                                    <th>Score</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map(result => (
                                    <tr key={result._id}>
                                        <td><code>{result.userId}</code></td>
                                        <td>{result.score.toFixed(1)}%</td>
                                        <td>
                                            <span className={`status-pill ${result.status}`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td>{Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
