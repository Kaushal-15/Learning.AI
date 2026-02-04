import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, User, Hash, Camera, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function BiometricApproval({ examId = null }) {
    const { isDarkMode } = useTheme();
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Helper function to ensure base64 data has proper prefix
    const ensureBase64Prefix = (base64Data) => {
        if (!base64Data) return '';
        if (base64Data.startsWith('data:image')) return base64Data;
        return `data:image/jpeg;base64,${base64Data}`;
    };

    useEffect(() => {
        fetchPendingVerifications();
    }, [examId]);

    const fetchPendingVerifications = async () => {
        setLoading(true);
        setError('');

        try {
            const url = examId
                ? `${API_BASE}/biometric/pending/${examId}`
                : `${API_BASE}/biometric/pending`;

            const response = await fetch(url, {
                credentials: 'include'
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to fetch verifications');
            }

            setVerifications(data.data);
        } catch (err) {
            console.error('Error fetching verifications:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (biometricId) => {
        setActionLoading(true);

        try {
            const response = await fetch(`${API_BASE}/biometric/${biometricId}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to approve');
            }

            // Remove from list
            setVerifications(prev => prev.filter(v => v._id !== biometricId));
            setSelectedVerification(null);

            alert('Biometric verification approved successfully');
        } catch (err) {
            console.error('Error approving:', err);
            alert(err.message || 'Failed to approve verification');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (biometricId) => {
        const reason = prompt('Please provide a reason for rejection:');

        if (!reason) return;

        setActionLoading(true);

        try {
            const response = await fetch(`${API_BASE}/biometric/${biometricId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to reject');
            }

            // Remove from list
            setVerifications(prev => prev.filter(v => v._id !== biometricId));
            setSelectedVerification(null);

            alert('Biometric verification rejected');
        } catch (err) {
            console.error('Error rejecting:', err);
            alert(err.message || 'Failed to reject verification');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`biometric-approval ${isDarkMode ? 'dark' : ''}`}>
                <div className="loading-state">
                    <Clock size={48} className="spinner" />
                    <p>Loading verifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`biometric-approval ${isDarkMode ? 'dark' : ''}`}>
            <div className="approval-header">
                <Camera size={32} />
                <h2>Biometric Verification Approvals</h2>
                <p>{verifications.length} pending verification(s)</p>
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {verifications.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle size={64} />
                    <h3>All Caught Up!</h3>
                    <p>No pending biometric verifications</p>
                </div>
            ) : (
                <div className="verifications-grid">
                    {verifications.map((verification) => (
                        <div
                            key={verification._id}
                            className={`verification-card ${selectedVerification?._id === verification._id ? 'selected' : ''}`}
                            onClick={() => setSelectedVerification(verification)}
                        >
                            <div className="verification-photo">
                                <img
                                    src={ensureBase64Prefix(verification.referencePhoto)}
                                    alt={verification.studentName}
                                    className="photo-preview"
                                />
                            </div>

                            <div className="verification-info">
                                <div className="info-row">
                                    <User size={16} />
                                    <span>{verification.studentName}</span>
                                </div>
                                <div className="info-row">
                                    <Hash size={16} />
                                    <span>{verification.registerNumber}</span>
                                </div>
                                {verification.examId && (
                                    <div className="info-row">
                                        <span className="exam-title">{verification.examId.title}</span>
                                    </div>
                                )}
                            </div>

                            <div className="verification-actions">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(verification._id);
                                    }}
                                    disabled={actionLoading}
                                    className="btn-approve"
                                >
                                    <CheckCircle size={18} />
                                    Approve
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReject(verification._id);
                                    }}
                                    disabled={actionLoading}
                                    className="btn-reject"
                                >
                                    <XCircle size={18} />
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .biometric-approval {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .biometric-approval.dark {
                    color: #f1f5f9;
                }

                .approval-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .approval-header svg {
                    color: #3b82f6;
                    margin-bottom: 1rem;
                }

                .approval-header h2 {
                    font-size: 1.875rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }

                .approval-header p {
                    color: #64748b;
                }

                .error-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 1rem;
                    background: #fee2e2;
                    color: #dc2626;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .loading-state, .empty-state {
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .empty-state svg {
                    color: #10b981;
                    margin-bottom: 1rem;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: #64748b;
                }

                .verifications-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .verification-card {
                    background: ${isDarkMode ? '#1e293b' : '#ffffff'};
                    border: 2px solid ${isDarkMode ? '#334155' : '#e2e8f0'};
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .verification-card:hover {
                    border-color: #3b82f6;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
                }

                .verification-card.selected {
                    border-color: #3b82f6;
                    background: ${isDarkMode ? '#334155' : '#eff6ff'};
                }

                .verification-photo {
                    margin-bottom: 1rem;
                }

                .photo-preview {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 0.5rem;
                }

                .verification-info {
                    margin-bottom: 1rem;
                }

                .info-row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                }

                .info-row svg {
                    color: #64748b;
                }

                .exam-title {
                    font-weight: 600;
                    color: #3b82f6;
                }

                .verification-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .btn-approve, .btn-reject {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.2s;
                }

                .btn-approve {
                    background: #10b981;
                    color: white;
                }

                .btn-approve:hover:not(:disabled) {
                    background: #059669;
                }

                .btn-reject {
                    background: #ef4444;
                    color: white;
                }

                .btn-reject:hover:not(:disabled) {
                    background: #dc2626;
                }

                .btn-approve:disabled, .btn-reject:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
