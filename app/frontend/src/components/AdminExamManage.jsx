import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Users, Clock, BookOpen, Play, Pause,
    Settings, Eye, Download, RefreshCw, AlertCircle, Target, Save,
    Video, CheckCircle2, X, List, Shield, HelpCircle
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import StudentListManager from "./StudentListManager";
import "../styles/DevvoraStyles.css";

export default function AdminExamManage() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    const [exam, setExam] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [examStudents, setExamStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [routingConfig, setRoutingConfig] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);

    // Settings form state
    const [settingsForm, setSettingsForm] = useState({
        duration: 60,
        verificationDuration: 15,
        passingScore: 60,
        requireStudentVerification: false,
        requireBiometric: false,
        requireCamera: false,
        allowRecording: false,
        autoRecord: false
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [savingStudents, setSavingStudents] = useState(false);

    // Recording playback modal state
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [loadingRecording, setLoadingRecording] = useState(false);
    const [recordingError, setRecordingError] = useState(null);

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;

    useEffect(() => {
        if (examId) {
            fetchAllData();
        }
    }, [examId]);

    const fetchAllData = async () => {
        try {
            await Promise.all([
                fetchExamDetails(),
                fetchCandidates(),
                fetchResults(),
                fetchStudents()
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchExamDetails = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                const ex = data.data;
                setExam(ex);
                setQuestions(ex.questions || ex.rawQuestions || []);
                setSettingsForm({
                    duration: ex.duration || 60,
                    verificationDuration: ex.verificationDuration || 15,
                    passingScore: ex.passingScore || 60,
                    requireStudentVerification: Boolean(ex.requireStudentVerification),
                    requireBiometric: Boolean(ex.requireBiometric),
                    requireCamera: Boolean(ex.requireCamera),
                    allowRecording: Boolean(ex.allowRecording),
                    autoRecord: Boolean(ex.autoRecord)
                });
                setRoutingConfig(ex.adaptiveRouting || {
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
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/candidates`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setCandidates(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch candidates:', error);
        }
    };

    const fetchResults = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/results`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setResults(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch results:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/students`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setExamStudents(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch students:', error);
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
                setStatusMessage({ type: 'success', text: `Exam status changed to ${newStatus}` });
                setTimeout(() => setStatusMessage(null), 3500);
            }
        } catch (error) {
            console.error('Failed to update exam status:', error);
        }
    };

    const handleSaveSettings = async (e) => {
        e?.preventDefault();
        setSavingSettings(true);
        setStatusMessage(null);
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration: Number(settingsForm.duration),
                    verificationDuration: Number(settingsForm.verificationDuration),
                    passingScore: Number(settingsForm.passingScore),
                    requireStudentVerification: Boolean(settingsForm.requireStudentVerification),
                    requireBiometric: Boolean(settingsForm.requireBiometric),
                    requireCamera: Boolean(settingsForm.requireCamera),
                    allowRecording: Boolean(settingsForm.allowRecording),
                    autoRecord: Boolean(settingsForm.autoRecord),
                    adaptiveRouting: routingConfig
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setStatusMessage({ type: 'success', text: 'Exam settings saved successfully' });
                fetchExamDetails();
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to save settings' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
        } finally {
            setSavingSettings(false);
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    const handleSaveStudentsToExam = async () => {
        setSavingStudents(true);
        setStatusMessage(null);
        try {
            const res = await fetch(`${API_BASE}/exams/admin/${examId}/students`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students: examStudents }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setExamStudents(data.data || []);
                setStatusMessage({ type: 'success', text: `Saved ${data.data?.length || 0} students to this exam` });
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to save students' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error saving students' });
        } finally {
            setSavingStudents(false);
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    // Short-lived presigned GET URLs for admin video review
    const handleViewRecording = async (candidate) => {
        const sessId = candidate.sessionId || candidate._id;
        setSelectedRecording({ candidate, chunks: [], presignedUrls: [] });
        setLoadingRecording(true);
        setRecordingError(null);

        try {
            const res = await fetch(`${API_BASE}/camera/review/${sessId}?examId=${examId}&userId=${candidate.userId || ''}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSelectedRecording({
                    candidate,
                    totalChunks: data.totalChunks || 0,
                    chunks: data.chunks || [],
                    presignedUrls: data.presignedUrls || []
                });
            } else {
                setRecordingError(data.message || 'No recording chunks found for this session');
            }
        } catch (err) {
            setRecordingError(err.message || 'Failed to retrieve recording');
        } finally {
            setLoadingRecording(false);
        }
    };

    const getStatusChip = (examState) => {
        const state = examState || exam?.examState || exam?.status;
        const styles = {
            'live': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', label: 'Live' },
            'verification-open': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308', label: 'Verification Open' },
            'scheduled': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6', label: 'Scheduled' },
            'ended': { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: '#6b7280', label: 'Ended' }
        };
        const st = styles[state] || { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1', border: '#6366f1', label: state };
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                backgroundColor: st.bg,
                color: st.text,
                border: `1px solid ${st.border}`
            }}>
                {st.label}
            </span>
        );
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
            {/* Header */}
            <header className="exam-manage-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="back-btn" onClick={() => navigate('/admin/exams')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                        <ChevronLeft size={20} />
                        Back to Exams
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{exam.title}</h1>
                            {getStatusChip(exam.examState)}
                        </div>
                        <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            Access Code: <code style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', fontWeight: 'bold' }}>{exam.examCode}</code>
                        </p>
                    </div>
                </div>

                <div className="exam-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {exam.status === 'active' ? (
                        <button className="control-btn pause-btn" onClick={() => handleStatusChange('paused')}>
                            <Pause size={18} />
                            Pause Exam
                        </button>
                    ) : (
                        <button className="control-btn start-btn" onClick={() => handleStatusChange('active')}>
                            <Play size={18} />
                            Start Exam
                        </button>
                    )}
                    <button className="control-btn refresh-btn" onClick={fetchAllData}>
                        <RefreshCw size={18} />
                        Refresh
                    </button>
                </div>
            </header>

            {statusMessage && (
                <div style={{
                    margin: '1rem 2rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: statusMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${statusMessage.type === 'success' ? '#22c55e' : '#ef4444'}`
                }}>
                    {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{statusMessage.text}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="exam-manage-content" style={{ padding: '1.5rem 2rem' }}>
                <div className="exam-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: BookOpen },
                        { id: 'settings', label: 'Settings', icon: Settings },
                        { id: 'students', label: `Students (${examStudents.length})`, icon: Users },
                        { id: 'questions', label: `Questions (${questions.length})`, icon: HelpCircle },
                        { id: 'monitoring', label: `Monitoring (${candidates.length})`, icon: Video }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`tab ${active ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    background: 'transparent',
                                    border: 'none',
                                    borderBottom: active ? '3px solid #6366f1' : '3px solid transparent',
                                    color: active ? '#6366f1' : 'inherit',
                                    fontWeight: active ? 600 : 400,
                                    cursor: 'pointer'
                                }}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                    <div className="overview-content">
                        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="stat-card">
                                <Users size={24} />
                                <div>
                                    <span className="stat-number">{results.length}</span>
                                    <span className="stat-label">Total Submissions</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Clock size={24} />
                                <div>
                                    <span className="stat-number">{candidates.length}</span>
                                    <span className="stat-label">Live Active Candidates</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <BookOpen size={24} />
                                <div>
                                    <span className="stat-number">{questions.length}</span>
                                    <span className="stat-label">Total Questions</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <Users size={24} />
                                <div>
                                    <span className="stat-number">{examStudents.length}</span>
                                    <span className="stat-label">Eligible Students</span>
                                </div>
                            </div>
                        </div>

                        <div className="exam-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            <div className="detail-section" style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: '12px' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Schedule & Timings</h3>
                                <div className="detail-list">
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>Start Time (Local):</span>
                                        <span style={{ fontWeight: 600 }}>{exam.startTime ? new Date(exam.startTime).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>End Time (Local):</span>
                                        <span style={{ fontWeight: 600 }}>{exam.endTime ? new Date(exam.endTime).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>Verification Opens:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.verificationDuration || 15} minutes before start</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                        <span style={{ opacity: 0.7 }}>Exam Duration:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.duration} minutes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section" style={{ background: 'rgba(255,255,255,0.04)', padding: '1.5rem', borderRadius: '12px' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Rules & Security</h3>
                                <div className="detail-list">
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>Passing Score:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.passingScore}%</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>Student Verification:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.requireStudentVerification ? 'Enforced (Pre-registered list only)' : 'Open (Any with code)'}</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        <span style={{ opacity: 0.7 }}>Camera Monitoring:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.requireCamera ? 'Required' : 'Disabled'}</span>
                                    </div>
                                    <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                        <span style={{ opacity: 0.7 }}>S3 Video Recording:</span>
                                        <span style={{ fontWeight: 600 }}>{exam.allowRecording ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Settings */}
                {activeTab === 'settings' && (
                    <div className="settings-content" style={{ maxWidth: '800px' }}>
                        <form onSubmit={handleSaveSettings} style={{ background: 'rgba(255,255,255,0.04)', padding: '2rem', borderRadius: '12px' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem' }}>Exam Configuration & Security</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', opacity: 0.8 }}>Exam Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settingsForm.duration}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, duration: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', opacity: 0.8 }}>Verification Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settingsForm.verificationDuration}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, verificationDuration: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', opacity: 0.8 }}>Passing Score (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settingsForm.passingScore}
                                        onChange={(e) => setSettingsForm({ ...settingsForm, passingScore: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'inherit' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                                {[
                                    { key: 'requireStudentVerification', label: 'Require Student Pre-Registration', desc: 'Only students added in the Students tab can enter' },
                                    { key: 'requireBiometric', label: 'Require Biometric Photo Approval', desc: 'Students must capture photo and wait for verification' },
                                    { key: 'requireCamera', label: 'Require Camera Proctoring', desc: 'Enforces webcam feed during the session' },
                                    { key: 'allowRecording', label: 'Allow Video Recording', desc: 'Direct browser uploads to S3 bucket' },
                                    { key: 'autoRecord', label: 'Auto-Record Sessions', desc: 'Start video recording automatically on exam entry' }
                                ].map(toggle => (
                                    <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', cursor: 'pointer' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{toggle.label}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{toggle.desc}</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(settingsForm[toggle.key])}
                                            onChange={(e) => setSettingsForm({ ...settingsForm, [toggle.key]: e.target.checked })}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </label>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={savingSettings}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#6366f1',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: savingSettings ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Save size={18} />
                                {savingSettings ? 'Saving...' : 'Save Settings'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Tab: Students */}
                {activeTab === 'students' && (
                    <div className="students-tab-content">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Registered Students</h3>
                                <p style={{ margin: '4px 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                                    Manage students pre-registered for this exam. You can save, load, paste CSV, or edit students.
                                </p>
                            </div>
                            <button
                                onClick={handleSaveStudentsToExam}
                                disabled={savingStudents}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#22c55e',
                                    color: '#fff',
                                    fontWeight: 600,
                                    cursor: savingStudents ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Save size={18} />
                                {savingStudents ? 'Saving to Exam...' : 'Save Students to Exam'}
                            </button>
                        </div>

                        <StudentListManager
                            students={examStudents}
                            onStudentsChange={setExamStudents}
                            isDarkMode={isDarkMode}
                        />
                    </div>
                )}

                {/* Tab: Questions */}
                {activeTab === 'questions' && (
                    <div className="questions-tab-content">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Exam Questions ({questions.length})</h3>
                                <p style={{ margin: '4px 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                                    Exam Type: <strong>{exam.examType || 'static'}</strong> | Adaptive: <strong>{exam.isAdaptive ? 'Yes' : 'No'}</strong>
                                </p>
                            </div>

                            {/* Difficulty counts summary */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['easy', 'medium', 'hard'].map(diff => {
                                    const count = questions.filter(q => (q.difficulty || q.difficultyLevel || 'medium').toLowerCase() === diff).length;
                                    const colors = {
                                        easy: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
                                        medium: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' },
                                        hard: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
                                    };
                                    return (
                                        <span key={diff} style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            backgroundColor: colors[diff].bg,
                                            color: colors[diff].text
                                        }}>
                                            {diff.toUpperCase()}: {count}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        {questions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
                                <HelpCircle size={48} style={{ margin: '0 auto 1rem auto' }} />
                                <p>No questions found on this exam</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {questions.map((q, idx) => {
                                    const diff = (q.difficulty || q.difficultyLevel || 'medium').toLowerCase();
                                    return (
                                        <div key={idx} style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: '10px',
                                            padding: '1.25rem',
                                            border: '1px solid rgba(255,255,255,0.06)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <span style={{ fontWeight: 700, opacity: 0.5 }}>#{idx + 1}</span>
                                                    <span style={{ fontWeight: 600 }}>{q.question || q.content}</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    textTransform: 'uppercase',
                                                    background: diff === 'easy' ? 'rgba(34, 197, 94, 0.2)' : diff === 'hard' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                                    color: diff === 'easy' ? '#22c55e' : diff === 'hard' ? '#ef4444' : '#eab308'
                                                }}>
                                                    {diff}
                                                </span>
                                            </div>

                                            {/* Options */}
                                            {Array.isArray(q.options) && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    {q.options.map((opt, optIdx) => {
                                                        const isCorrect = opt === q.correctAnswer;
                                                        return (
                                                            <div key={optIdx} style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.85rem',
                                                                background: isCorrect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.02)',
                                                                border: isCorrect ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.04)',
                                                                color: isCorrect ? '#22c55e' : 'inherit'
                                                            }}>
                                                                <span style={{ fontWeight: 'bold', marginRight: '6px' }}>{String.fromCharCode(65 + optIdx)}.</span>
                                                                {opt}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Monitoring */}
                {activeTab === 'monitoring' && (
                    <div className="monitoring-tab-content">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Live Proctoring & Candidate Monitoring</h3>
                                <p style={{ margin: '4px 0 0 0', opacity: 0.7, fontSize: '0.9rem' }}>
                                    Track active exam sessions, violations, and review uploaded camera recording chunks.
                                </p>
                            </div>
                            <button className="control-btn refresh-btn" onClick={() => { fetchCandidates(); fetchResults(); }}>
                                <RefreshCw size={16} />
                                Refresh Live Data
                            </button>
                        </div>

                        {/* Live Candidates Table */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', opacity: 0.8 }}>Active Candidates ({candidates.length})</h4>
                            {candidates.length === 0 ? (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', textAlign: 'center', borderRadius: '10px' }}>
                                    <Users size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                                    <p style={{ margin: 0, opacity: 0.6 }}>No active sessions right now</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.7 }}>
                                                <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Reg No.</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Progress</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Time Left</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Violations</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {candidates.map((cand, idx) => (
                                                <tr key={cand._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{cand.studentName || `Student ${cand.userId}`}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}><code>{cand.registerNumber || 'N/A'}</code></td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>Question {(cand.currentQuestionIndex || 0) + 1} of {exam.totalQuestions}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        {Math.floor((cand.timeRemaining || 0) / 60)}:{((cand.timeRemaining || 0) % 60).toString().padStart(2, '0')}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 'bold',
                                                            background: (cand.violations || 0) > 2 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                            color: (cand.violations || 0) > 2 ? '#ef4444' : '#22c55e'
                                                        }}>
                                                            {cand.violations || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <button
                                                            onClick={() => handleViewRecording(cand)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem',
                                                                padding: '4px 10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid rgba(99, 102, 241, 0.5)',
                                                                background: 'rgba(99, 102, 241, 0.1)',
                                                                color: '#818cf8',
                                                                fontSize: '0.8rem',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Video size={14} />
                                                            View Recording
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Completed Results Table */}
                        <div>
                            <h4 style={{ margin: '0 0 0.75rem 0', opacity: 0.8 }}>Completed Submissions ({results.length})</h4>
                            {results.length === 0 ? (
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', textAlign: 'center', borderRadius: '10px' }}>
                                    <BookOpen size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                                    <p style={{ margin: 0, opacity: 0.6 }}>No submitted results yet</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', opacity: 0.7 }}>
                                                <th style={{ padding: '0.75rem 1rem' }}>Candidate</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Reg No.</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Time Taken</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                                                <th style={{ padding: '0.75rem 1rem' }}>Submitted At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((res, idx) => (
                                                <tr key={res._id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{res.studentName || `Student ${res.userId}`}</td>
                                                    <td style={{ padding: '0.75rem 1rem' }}><code>{res.registerNumber || 'N/A'}</code></td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <span style={{
                                                            fontWeight: 'bold',
                                                            color: res.score >= exam.passingScore ? '#22c55e' : '#ef4444'
                                                        }}>
                                                            {Number(res.score || 0).toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        {Math.floor((res.timeTaken || 0) / 60)}:{((res.timeTaken || 0) % 60).toString().padStart(2, '0')}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>{res.status}</td>
                                                    <td style={{ padding: '0.75rem 1rem', opacity: 0.7 }}>{new Date(res.submittedAt).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Video Recording Playback Modal (Admin Short-Lived Presigned GET) */}
            {selectedRecording && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1000,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '750px',
                        background: '#18181b',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '1.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Candidate Recording Review</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    {selectedRecording.candidate?.studentName || `Student ${selectedRecording.candidate?.userId}`} • Short-lived Presigned URLs
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecording(null)}
                                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {loadingRecording ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#a1a1aa' }}>
                                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
                                <p>Generating secure playback URLs from S3...</p>
                            </div>
                        ) : recordingError ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                                <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                                <p>{recordingError}</p>
                            </div>
                        ) : (
                            <div>
                                {selectedRecording.presignedUrls && selectedRecording.presignedUrls.length > 0 ? (
                                    <div>
                                        <video
                                            controls
                                            src={selectedRecording.presignedUrls[0]?.url}
                                            style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', background: '#000', marginBottom: '1rem' }}
                                        />
                                        <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>
                                            Available recording chunks ({selectedRecording.presignedUrls.length}):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                                            {selectedRecording.presignedUrls.map((chunk, cIdx) => (
                                                <a
                                                    key={cIdx}
                                                    href={chunk.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        color: '#818cf8',
                                                        textDecoration: 'none',
                                                        fontSize: '0.8rem',
                                                        border: '1px solid rgba(255,255,255,0.1)'
                                                    }}
                                                >
                                                    Chunk #{chunk.chunkIndex ?? cIdx}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                                        No recorded video chunks were found for this session.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}