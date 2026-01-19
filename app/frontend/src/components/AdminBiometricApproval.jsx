import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, CheckCircle, XCircle, AlertCircle, Search,
    Filter, User, Calendar, Clock, Camera, RefreshCw
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function AdminBiometricApproval() {
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, approved, rejected
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState(null);

    // Helper function to ensure base64 image has data URL prefix
    const getImageSrc = (base64String) => {
        if (!base64String) return '';
        // If already has data URL prefix, return as is
        if (base64String.startsWith('data:')) return base64String;
        // Otherwise, add the prefix
        return `data:image/jpeg;base64,${base64String}`;
    };

    // Fetch verifications
    const fetchVerifications = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/biometric/pending`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setVerifications(data.data);
            } else {
                setError(data.message || 'Failed to fetch verifications');
            }
        } catch (err) {
            console.error('Error fetching verifications:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVerifications();
    }, []);

    // Approve verification
    const handleApprove = async (id) => {
        if (!window.confirm('Are you sure you want to approve this student?')) return;

        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE}/biometric/${id}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                // Remove from list or update status
                setVerifications(prev => prev.filter(v => v._id !== id));
                alert('Student approved successfully');
            } else {
                alert(data.message || 'Failed to approve');
            }
        } catch (err) {
            console.error('Error approving:', err);
            alert('Failed to approve. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    // Reject verification
    const handleReject = async (id) => {
        const reason = prompt('Please enter reason for rejection:');
        if (!reason) return;

        setProcessingId(id);
        try {
            const res = await fetch(`${API_BASE}/biometric/${id}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
                credentials: 'include'
            });
            const data = await res.json();

            if (data.success) {
                setVerifications(prev => prev.filter(v => v._id !== id));
                alert('Student rejected successfully');
            } else {
                alert(data.message || 'Failed to reject');
            }
        } catch (err) {
            console.error('Error rejecting:', err);
            alert('Failed to reject. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    // Filter verifications
    const filteredVerifications = verifications.filter(v => {
        const matchesSearch =
            v.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.registerNumber.toLowerCase().includes(searchTerm.toLowerCase());

        // Currently API only returns pending, but if we expand it:
        const matchesFilter = filter === 'all' || v.status === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className={`admin-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
            {/* Header */}
            <header className="admin-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/admin/dashboard')}>
                        <ChevronLeft size={20} />
                        Back
                    </button>
                    <h1>Biometric Approvals</h1>
                </div>
                <div className="header-right">
                    <button className="refresh-btn" onClick={fetchVerifications}>
                        <RefreshCw size={20} />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Controls */}
            <div className="admin-controls">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or register number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="approvals-grid">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading verifications...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <AlertCircle size={48} />
                        <p>{error}</p>
                        <button onClick={fetchVerifications}>Try Again</button>
                    </div>
                ) : filteredVerifications.length === 0 ? (
                    <div className="empty-state">
                        <CheckCircle size={48} />
                        <p>No pending verifications found</p>
                    </div>
                ) : (
                    filteredVerifications.map(verification => (
                        <div key={verification._id} className="approval-card">
                            <div className="approval-header">
                                <div className="student-info">
                                    <h3>{verification.studentName}</h3>
                                    <span className="reg-number">{verification.registerNumber}</span>
                                </div>
                                <div className="exam-tag">
                                    {verification.examId?.title || 'Unknown Exam'}
                                </div>
                            </div>

                            <div className="photo-comparison">
                                <div className="photo-box">
                                    <span className="photo-label">Reference Photo</span>
                                    <img
                                        src={getImageSrc(verification.referencePhoto)}
                                        alt="Reference"
                                        className="student-photo"
                                        onError={(e) => {
                                            console.error('Failed to load image');
                                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%23999" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                                        }}
                                    />
                                </div>
                                {/* If we had a live photo to compare against, show it here */}
                                {/* For initial approval, we just check the reference photo quality */}
                            </div>

                            <div className="approval-meta">
                                <div className="meta-item">
                                    <Calendar size={16} />
                                    <span>{new Date(verification.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="meta-item">
                                    <Clock size={16} />
                                    <span>{new Date(verification.createdAt).toLocaleTimeString()}</span>
                                </div>
                            </div>

                            <div className="approval-actions">
                                <button
                                    className="reject-btn"
                                    onClick={() => handleReject(verification._id)}
                                    disabled={processingId === verification._id}
                                >
                                    <XCircle size={20} />
                                    Reject
                                </button>
                                <button
                                    className="approve-btn"
                                    onClick={() => handleApprove(verification._id)}
                                    disabled={processingId === verification._id}
                                >
                                    <CheckCircle size={20} />
                                    Approve
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx>{`
                .admin-container {
                    padding: 2rem;
                    min-height: 100vh;
                    background: ${isDarkMode ? '#0f172a' : '#f8fafc'};
                }

                .admin-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .header-left h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                }

                .back-btn, .refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .back-btn {
                    background: transparent;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                }

                .back-btn:hover {
                    background: ${isDarkMode ? '#1e293b' : '#e2e8f0'};
                }

                .refresh-btn {
                    background: #3b82f6;
                    color: white;
                }

                .refresh-btn:hover {
                    background: #2563eb;
                }

                .admin-controls {
                    margin-bottom: 2rem;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
                    border-radius: 0.75rem;
                    max-width: 400px;
                }

                .search-box svg {
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                }

                .search-box input {
                    border: none;
                    background: transparent;
                    width: 100%;
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                    outline: none;
                }

                .approvals-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .approval-card {
                    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
                    border-radius: 1rem;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .approval-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .student-info h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    color: ${isDarkMode ? '#f1f5f9' : '#1e293b'};
                    margin-bottom: 0.25rem;
                }

                .reg-number {
                    font-size: 0.875rem;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    font-family: monospace;
                }

                .exam-tag {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.5rem;
                    background: ${isDarkMode ? '#334155' : '#f1f5f9'};
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    border-radius: 0.25rem;
                    max-width: 120px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .photo-box {
                    width: 100%;
                    aspect-ratio: 4/3;
                    background: ${isDarkMode ? '#0f172a' : '#f8fafc'};
                    border-radius: 0.5rem;
                    overflow: hidden;
                    position: relative;
                }

                .photo-label {
                    position: absolute;
                    top: 0.5rem;
                    left: 0.5rem;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }

                .student-photo {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .approval-meta {
                    display: flex;
                    gap: 1rem;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                    font-size: 0.875rem;
                }

                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .approval-actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: auto;
                }

                .approve-btn, .reject-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .approve-btn {
                    background: #10b981;
                    color: white;
                }

                .approve-btn:hover:not(:disabled) {
                    background: #059669;
                }

                .reject-btn {
                    background: ${isDarkMode ? '#334155' : '#f1f5f9'};
                    color: #ef4444;
                }

                .reject-btn:hover:not(:disabled) {
                    background: #fee2e2;
                }

                .approve-btn:disabled, .reject-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .empty-state, .error-state, .loading-state {
                    grid-column: 1 / -1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    text-align: center;
                    color: ${isDarkMode ? '#94a3b8' : '#64748b'};
                }

                .empty-state svg, .error-state svg {
                    margin-bottom: 1rem;
                    color: ${isDarkMode ? '#334155' : '#cbd5e1'};
                }

                .error-state svg {
                    color: #ef4444;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
