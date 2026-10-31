import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft, Users, Clock, BookOpen, Play, Pause,
    Settings, Eye, Download, RefreshCw, AlertCircle, Target, Save,
    Video, CheckCircle2, X, List, Shield, HelpCircle, Camera, Check,
    ExternalLink, AlertTriangle, CheckCircle, XCircle, Search, Filter, Sparkles
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import StudentListManager from "./StudentListManager";
import "../styles/DevvoraStyles.css";
import "../styles/dashboard-glass.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function AdminExamManage({ initialTab }) {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isDarkMode } = useTheme();

    const [exam, setExam] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [results, setResults] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [examStudents, setExamStudents] = useState([]);
    const [verifications, setVerifications] = useState([]);
    const [recordingsList, setRecordingsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab || searchParams.get('tab') || 'overview');
    const [routingConfig, setRoutingConfig] = useState(null);
    const [statusMessage, setStatusMessage] = useState(null);
    const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState('all');
    const [biometricSearch, setBiometricSearch] = useState('');
    const [processingBiometricId, setProcessingBiometricId] = useState(null);

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
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Recording playback modal state
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [loadingRecording, setLoadingRecording] = useState(false);
    const [recordingError, setRecordingError] = useState(null);
    const [activeChunkUrl, setActiveChunkUrl] = useState(null);

    // Helper function to ensure image src format
    const getImageSrc = (base64OrUrl) => {
        if (!base64OrUrl) return '';
        if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://') || base64OrUrl.startsWith('data:')) {
            return base64OrUrl;
        }
        return `data:image/jpeg;base64,${base64OrUrl}`;
    };

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        } else if (searchParams.get('tab')) {
            setActiveTab(searchParams.get('tab'));
        }
    }, [initialTab, searchParams]);

    useEffect(() => {
        if (examId) {
            fetchAllData();
        }
    }, [examId]);

    const fetchAllData = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchExamDetails(),
                fetchCandidates(),
                fetchResults(),
                fetchStudents(),
                fetchBiometricVerifications(),
                fetchExamRecordings()
            ]);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
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

    const fetchBiometricVerifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/biometric/pending/${examId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setVerifications(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch biometric verifications:', error);
        }
    };

    const fetchExamRecordings = async () => {
        try {
            const res = await fetch(`${API_BASE}/camera/exam/${examId}/recordings`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRecordingsList(data.data || []);
            }
        } catch (error) {
            console.warn('Failed to fetch exam recordings list:', error.message);
        }
    };

    const handleApproveBiometric = async (id) => {
        setProcessingBiometricId(id);
        try {
            const res = await fetch(`${API_BASE}/biometric/${id}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setVerifications(prev => prev.filter(v => v._id !== id));
                setStatusMessage({ type: 'success', text: 'Student biometric verification approved!' });
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to approve verification' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error approving biometric' });
        } finally {
            setProcessingBiometricId(null);
            setTimeout(() => setStatusMessage(null), 4000);
        }
    };

    const handleRejectBiometric = async (id) => {
        const reason = prompt('Please enter reason for rejection (e.g., face mismatch, blurry image):') || 'Image mismatch';
        setProcessingBiometricId(id);
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
                setStatusMessage({ type: 'success', text: 'Biometric verification rejected.' });
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to reject verification' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error rejecting biometric' });
        } finally {
            setProcessingBiometricId(null);
            setTimeout(() => setStatusMessage(null), 4000);
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
            const data = await res.json();
            if (res.ok && data.success) {
                fetchExamDetails();
                setStatusMessage({ type: 'success', text: `Exam status successfully updated to ${newStatus.toUpperCase()}` });
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to update exam status' });
            }
        } catch (error) {
            console.error('Failed to update exam status:', error);
            setStatusMessage({ type: 'error', text: error.message || 'Error updating status' });
        } finally {
            setTimeout(() => setStatusMessage(null), 4500);
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
                setStatusMessage({ type: 'success', text: 'Exam configuration saved successfully!' });
                fetchExamDetails();
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to save settings' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error saving settings' });
        } finally {
            setSavingSettings(false);
            setTimeout(() => setStatusMessage(null), 4500);
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
                setStatusMessage({ type: 'success', text: `Saved ${data.data?.length || 0} students to this exam!` });
            } else {
                setStatusMessage({ type: 'error', text: data.message || 'Failed to save students' });
            }
        } catch (err) {
            setStatusMessage({ type: 'error', text: err.message || 'Error saving students' });
        } finally {
            setSavingStudents(false);
            setTimeout(() => setStatusMessage(null), 4500);
        }
    };

    const handleViewRecording = async (target) => {
        const sessId = target.sessionId || target._id;
        setSelectedRecording({ candidate: target, chunks: [], presignedUrls: [] });
        setActiveChunkUrl(null);
        setLoadingRecording(true);
        setRecordingError(null);

        try {
            const res = await fetch(`${API_BASE}/camera/review/${sessId}?examId=${examId}&userId=${target.userId || ''}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const urls = data.presignedUrls || [];
                setSelectedRecording({
                    candidate: target,
                    totalChunks: data.totalChunks || 0,
                    chunks: data.chunks || [],
                    presignedUrls: urls
                });
                if (urls.length > 0) {
                    setActiveChunkUrl(urls[0].url);
                }
            } else {
                setRecordingError(data.message || 'No video recordings found for this session');
            }
        } catch (err) {
            setRecordingError(err.message || 'Failed to retrieve recording');
        } finally {
            setLoadingRecording(false);
        }
    };

    // Export completed submissions as CSV with roll number, score, accuracy, timestamp
    const handleExportCSV = () => {
        if (!results || results.length === 0) {
            alert('No completed submissions available to export');
            return;
        }

        const headers = ['Roll Number', 'Student Name', 'Score (%)', 'Accuracy (%)', 'Total Questions', 'Correct Answers', 'Time Taken (seconds)', 'Status', 'Submitted At'];
        const rows = results.map(r => [
            `"${r.registerNumber || 'N/A'}"`,
            `"${(r.studentName || 'Student').replace(/"/g, '""')}"`,
            Number(r.score || 0).toFixed(1),
            Number(r.accuracy || r.score || 0).toFixed(1),
            r.totalQuestions || 0,
            r.correctAnswers || 0,
            r.timeTaken || 0,
            `"${r.status || 'completed'}"`,
            `"${r.submittedAt ? new Date(r.submittedAt).toISOString() : new Date().toISOString()}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${(exam?.examCode || 'exam')}_results_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getStatusChip = (state) => {
        const st = (state || exam?.examState || exam?.status || 'scheduled').toLowerCase();
        const styles = {
            'live': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', label: 'Live' },
            'active': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', label: 'Active' },
            'verification-open': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308', label: 'Verification Open' },
            'scheduled': { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6', label: 'Scheduled' },
            'ended': { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: '#6b7280', label: 'Ended' },
            'paused': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444', label: 'Paused' }
        };
        const activeStyle = styles[st] || { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: '#6366f1', label: st };
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backgroundColor: activeStyle.bg,
                color: activeStyle.text,
                border: `1px solid ${activeStyle.border}`
            }}>
                <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: activeStyle.text,
                    boxShadow: `0 0 8px ${activeStyle.text}`
                }}></span>
                {activeStyle.label}
            </span>
        );
    };

    const getQuestionDifficulty = (q) => {
        if (!q) return 'medium';
        if (typeof q.difficultyLevel === 'string') return q.difficultyLevel.toLowerCase();
        if (typeof q.difficultyTag === 'string') return q.difficultyTag.toLowerCase();
        if (typeof q.difficulty === 'string') return q.difficulty.toLowerCase();
        if (typeof q.difficulty === 'number') {
            return q.difficulty <= 3 ? 'easy' : q.difficulty <= 6 ? 'medium' : 'hard';
        }
        return 'medium';
    };

    const filteredQuestions = questions.filter(q => {
        if (questionDifficultyFilter === 'all') return true;
        return getQuestionDifficulty(q) === questionDifficultyFilter;
    });

    const filteredVerifications = verifications.filter(v => {
        if (!biometricSearch.trim()) return true;
        const s = biometricSearch.toLowerCase();
        return (
            v.studentName?.toLowerCase().includes(s) ||
            v.registerNumber?.toLowerCase().includes(s)
        );
    });

    if (loading || !exam) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#09090b', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: '#6366f1' }} />
                    <p style={{ opacity: 0.8, fontSize: '1rem' }}>Loading exam details...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'inherit' }}>
            {/* Top Navigation Bar */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 40,
                backgroundColor: 'rgba(9, 9, 11, 0.85)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1rem 2rem'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/admin/exams')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: '#d4d4d8',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <ChevronLeft size={16} />
                            All Exams
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#fff' }}>{exam.title}</h1>
                                {getStatusChip(exam.examState)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                <span>Code: <code style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 700 }}>{exam.examCode}</code></span>
                                <span>•</span>
                                <span>Type: <strong style={{ color: '#e4e4e7', textTransform: 'capitalize' }}>{exam.examType || 'static'}</strong></span>
                                <span>•</span>
                                <span>Duration: <strong style={{ color: '#e4e4e7' }}>{exam.duration} mins</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {exam.status === 'active' ? (
                            <button
                                onClick={() => handleStatusChange('paused')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1.1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#f87171',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Pause size={16} />
                                Pause Exam
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange('active')}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1.1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#4ade80',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <Play size={16} />
                                Activate Exam
                            </button>
                        )}

                        <button
                            onClick={fetchAllData}
                            disabled={isRefreshing}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.6rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#e4e4e7',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={15} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            {/* Notification Banner */}
            {statusMessage && (
                <div style={{ maxWidth: '1400px', margin: '1rem auto 0 auto', padding: '0 2rem' }}>
                    <div style={{
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        backgroundColor: statusMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `1px solid ${statusMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
                        color: statusMessage.type === 'success' ? '#4ade80' : '#f87171'
                    }}>
                        {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{statusMessage.text}</span>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 2rem 3rem 2rem' }}>
                {/* Modern Pill Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '4px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '2rem',
                    overflowX: 'auto'
                }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: BookOpen },
                        { id: 'questions', label: `Questions Pool (${questions.length})`, icon: HelpCircle },
                        { id: 'monitoring', label: `Live Monitoring (${candidates.length})`, icon: Video },
                        { id: 'results', label: `Results & CSV (${results.length})`, icon: CheckCircle2 },
                        { id: 'biometric', label: `Biometrics (${verifications.length})`, icon: Camera },
                        { id: 'students', label: `Students (${examStudents.length})`, icon: Users },
                        { id: 'settings', label: 'Settings', icon: Settings }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: active ? '#6366f1' : 'transparent',
                                    color: active ? '#ffffff' : '#a1a1aa',
                                    fontWeight: active ? 600 : 500,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* TAB: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* 4 Stat Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                            {[
                                { label: 'Active Live Candidates', value: candidates.length, icon: Users, color: '#10b981', sub: 'Currently testing' },
                                { label: 'Completed Submissions', value: results.length, icon: CheckCircle2, color: '#3b82f6', sub: 'Finished attempts' },
                                { label: 'Total Questions in Pool', value: questions.length, icon: BookOpen, color: '#f59e0b', sub: `Target: ${exam.totalQuestions}` },
                                { label: 'Eligible Students', value: examStudents.length, icon: Shield, color: '#8b5cf6', sub: exam.requireStudentVerification ? 'Strict list only' : 'Open access' }
                            ].map((card, idx) => {
                                const Icon = card.icon;
                                return (
                                    <div key={idx} style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.35rem' }}>{card.label}</div>
                                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{card.value}</div>
                                                <div style={{ fontSize: '0.75rem', color: card.color, marginTop: '0.35rem', fontWeight: 500 }}>{card.sub}</div>
                                            </div>
                                            <div style={{
                                                padding: '10px',
                                                borderRadius: '12px',
                                                background: `${card.color}20`,
                                                color: card.color
                                            }}>
                                                <Icon size={24} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                            {/* Schedule Card */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                padding: '1.75rem'
                            }}>
                                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                                    <Clock size={18} style={{ color: '#6366f1' }} />
                                    Timing & Schedule
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {[
                                        { label: 'Start Time (Local)', val: exam.startTime ? new Date(exam.startTime).toLocaleString() : 'Not Set' },
                                        { label: 'End Time (Local)', val: exam.endTime ? new Date(exam.endTime).toLocaleString() : 'Not Set' },
                                        { label: 'Verification Window', val: `${exam.verificationDuration || 15} minutes prior to start` },
                                        { label: 'Exam Duration', val: `${exam.duration} minutes total` }
                                    ].map((row, rIdx) => (
                                        <div key={rIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>{row.label}</span>
                                            <span style={{ fontWeight: 600, color: '#f4f4f5', fontSize: '0.9rem' }}>{row.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rules & Security Card */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '16px',
                                padding: '1.75rem'
                            }}>
                                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                                    <Shield size={18} style={{ color: '#10b981' }} />
                                    Security & Proctoring Policy
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {[
                                        { label: 'Passing Score', status: `${exam.passingScore}% required`, active: true },
                                        { label: 'Student Pre-Registration', status: exam.requireStudentVerification ? 'Enforced' : 'Open Entry', active: exam.requireStudentVerification },
                                        { label: 'Biometric Verification', status: exam.requireBiometric ? 'Admin Approval Required' : 'Disabled', active: exam.requireBiometric },
                                        { label: 'Camera Proctoring', status: exam.requireCamera ? 'Webcam Required' : 'Disabled', active: exam.requireCamera },
                                        { label: 'S3 Video Recording', status: exam.allowRecording ? 'Direct PUT Uploads Enabled' : 'Disabled', active: exam.allowRecording }
                                    ].map((item, iIdx) => (
                                        <div key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                            <span style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>{item.label}</span>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: item.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                color: item.active ? '#4ade80' : '#a1a1aa'
                                            }}>
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Direct Biometric Verification Section in Overview */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                                        <Camera size={18} style={{ color: '#f59e0b' }} />
                                        Biometric Verification Approvals
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: verifications.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                            color: verifications.length > 0 ? '#fbbf24' : '#4ade80'
                                        }}>
                                            {verifications.length > 0 ? `${verifications.length} Pending Approval` : 'All Approved'}
                                        </span>
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                        Verify candidate registration photo vs live webcam snapshot before granting entry.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('biometric')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        border: '1px solid rgba(99, 102, 241, 0.3)',
                                        color: '#818cf8',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Open Full Biometric Tab →
                                </button>
                            </div>

                            {verifications.length === 0 ? (
                                <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                                    <p style={{ margin: 0, color: '#4ade80', fontSize: '0.9rem', fontWeight: 500 }}>
                                        ✅ All candidate biometric verification requests have been processed. No pending approvals.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                                    {verifications.slice(0, 3).map((v) => (
                                        <div key={v._id} style={{
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{v.studentName}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 700 }}>Roll: {v.registerNumber}</div>
                                                </div>
                                                {v.similarityScore !== undefined && v.similarityScore !== null && (
                                                    <span style={{
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        background: v.similarityScore >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        color: v.similarityScore >= 70 ? '#4ade80' : '#f87171'
                                                    }}>
                                                        Match: {v.similarityScore}%
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '2px' }}>Reference Photo</div>
                                                    <img
                                                        src={getImageSrc(v.referencePhoto)}
                                                        alt="Reference"
                                                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', background: '#000' }}
                                                    />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '2px' }}>Live Snapshot</div>
                                                    <img
                                                        src={getImageSrc(v.livePhoto || v.referencePhoto)}
                                                        alt="Live"
                                                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', background: '#000' }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleRejectBiometric(v._id)}
                                                    disabled={processingBiometricId === v._id}
                                                    style={{
                                                        padding: '0.45rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        color: '#f87171',
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveBiometric(v._id)}
                                                    disabled={processingBiometricId === v._id}
                                                    style={{
                                                        padding: '0.45rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(34, 197, 94, 0.5)',
                                                        background: 'rgba(34, 197, 94, 0.2)',
                                                        color: '#4ade80',
                                                        fontWeight: 700,
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: QUESTIONS (Dynamic MCQ Pool & Level Tags) */}
                {activeTab === 'questions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Pool Balance & Level Tag Filter Banner */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderRadius: '16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Sparkles size={18} style={{ color: '#6366f1' }} />
                                    Question Pool ({questions.length} total)
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    Exam Target: <strong>{exam.totalQuestions} questions</strong> • Type: <strong style={{ textTransform: 'capitalize' }}>{exam.examType || 'static'}</strong>
                                </p>
                            </div>

                            {/* Level Tag Counts & Filters */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'all', label: 'All', count: questions.length, color: '#a1a1aa', bg: 'rgba(255, 255, 255, 0.05)' },
                                    { id: 'easy', label: 'Easy Level', count: questions.filter(q => getQuestionDifficulty(q) === 'easy').length, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                                    { id: 'medium', label: 'Medium Level', count: questions.filter(q => getQuestionDifficulty(q) === 'medium').length, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                                    { id: 'hard', label: 'Hard Level', count: questions.filter(q => getQuestionDifficulty(q) === 'hard').length, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setQuestionDifficultyFilter(tab.id)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: questionDifficultyFilter === tab.id ? tab.color : tab.bg,
                                            border: `1px solid ${tab.color}40`,
                                            color: questionDifficultyFilter === tab.id ? '#ffffff' : '#d4d4d8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        <span>{tab.label}:</span>
                                        <strong>{tab.count}</strong>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Questions List */}
                        {filteredQuestions.length === 0 ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                <HelpCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
                                <h4 style={{ margin: 0, color: '#d4d4d8' }}>No questions found for this filter</h4>
                                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Dynamic MCQ questions are automatically loaded from the question bank.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {filteredQuestions.map((q, idx) => {
                                    const diff = getQuestionDifficulty(q);
                                    const diffColor = diff === 'easy' ? '#10b981' : diff === 'hard' ? '#f43f5e' : '#f59e0b';
                                    return (
                                        <div key={idx} style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '14px',
                                            padding: '1.5rem',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.85rem' }}>
                                                    <span style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '8px',
                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                        color: '#818cf8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        flexShrink: 0
                                                    }}>
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f4f4f5', lineHeight: 1.5 }}>
                                                            {q.question || q.content}
                                                        </h4>
                                                        {Array.isArray(q.tags) && q.tags.length > 0 && (
                                                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                                                {q.tags.map((t, tIdx) => (
                                                                    <span key={tIdx} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#a1a1aa' }}>
                                                                        #{t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Difficulty Level Tag for Admin */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        letterSpacing: '0.05em',
                                                        textTransform: 'uppercase',
                                                        background: `${diffColor}20`,
                                                        color: diffColor,
                                                        border: `1px solid ${diffColor}50`,
                                                        flexShrink: 0
                                                    }}>
                                                        LEVEL: {diff}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Options Cards */}
                                            {Array.isArray(q.options) && (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                                                    {q.options.map((opt, oIdx) => {
                                                        const isCorrect = opt === q.correctAnswer;
                                                        return (
                                                            <div key={oIdx} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.65rem',
                                                                padding: '0.65rem 0.85rem',
                                                                borderRadius: '8px',
                                                                background: isCorrect ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                                                border: isCorrect ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                                                                color: isCorrect ? '#4ade80' : '#d4d4d8',
                                                                fontSize: '0.85rem'
                                                            }}>
                                                                <span style={{
                                                                    width: '22px',
                                                                    height: '22px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    background: isCorrect ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                                                                    color: isCorrect ? '#fff' : '#a1a1aa',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    flexShrink: 0
                                                                }}>
                                                                    {String.fromCharCode(65 + oIdx)}
                                                                </span>
                                                                <span style={{ flex: 1 }}>{opt}</span>
                                                                {isCorrect && <Check size={16} style={{ color: '#22c55e', flexShrink: 0 }} />}
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

                {/* TAB: LIVE MONITORING */}
                {activeTab === 'monitoring' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* 24-Hour Recording Retention Banner */}
                        <div style={{
                            padding: '1.1rem 1.5rem',
                            borderRadius: '14px',
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Clock size={20} style={{ color: '#818cf8', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: '#f4f4f5', fontSize: '0.95rem' }}>
                                        S3 Screen Recorded Video Chunks: Available for 24 Hours
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                                        Video chunks uploaded to S3/R2 object storage remain active with 24-hour presigned URLs (86,400s) for proctoring audit and compliance.
                                    </div>
                                </div>
                            </div>
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                letterSpacing: '0.05em'
                            }}>
                                24H RETENTION ACTIVE
                            </span>
                        </div>

                        <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                                Live Active Candidates ({candidates.length})
                            </h3>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                Real-time candidate telemetry, violation counts, and direct S3 cloud recording playback (24-hour presigned URLs).
                            </p>

                            {candidates.length === 0 ? (
                                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                    <Users size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                                    <h4 style={{ margin: 0, color: '#d4d4d8' }}>No candidates actively taking the exam right now</h4>
                                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>When students enter, their real-time telemetry and recording stream will show here.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                                    {candidates.map((cand, cIdx) => (
                                        <div key={cand._id || cIdx} style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            position: 'relative'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 600 }}>
                                                        {cand.studentName || `Student ${cand.userId}`}
                                                    </h4>
                                                    <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '2px' }}>
                                                        Reg: <code style={{ color: '#818cf8', fontWeight: 700 }}>{cand.registerNumber || 'N/A'}</code>
                                                    </div>
                                                </div>

                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    background: (cand.violations || 0) > 2 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                                                    color: (cand.violations || 0) > 2 ? '#f87171' : '#4ade80',
                                                    border: `1px solid ${(cand.violations || 0) > 2 ? '#ef4444' : '#22c55e'}40`
                                                }}>
                                                    {cand.violations || 0} Violations
                                                </span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>
                                                    <span>Question {(cand.currentQuestionIndex || 0) + 1} of {exam.totalQuestions}</span>
                                                    <span>{Math.floor((cand.timeRemaining || 0) / 60)}:{((cand.timeRemaining || 0) % 60).toString().padStart(2, '0')} left</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width: `${Math.min(100, (((cand.currentQuestionIndex || 0) + 1) / exam.totalQuestions) * 100)}%`,
                                                        height: '100%',
                                                        backgroundColor: '#6366f1',
                                                        borderRadius: '9999px'
                                                    }} />
                                                </div>
                                            </div>

                                            {/* S3 Recording View Button */}
                                            <button
                                                onClick={() => handleViewRecording(cand)}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.65rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                                    background: 'rgba(99, 102, 241, 0.12)',
                                                    color: '#818cf8',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <Video size={16} />
                                                View S3 Recordings
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: SUBMISSIONS & RESULTS (United with CSV Export & S3 Playback) */}
                {activeTab === 'results' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                                    Completed Submissions ({results.length})
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    All completed student attempts, scores, and proctoring video playback.
                                </p>
                            </div>

                            <button
                                onClick={handleExportCSV}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1.25rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                    background: 'rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.25)'
                                }}
                            >
                                <Download size={18} />
                                Export Results as CSV
                            </button>
                        </div>

                        {results.length === 0 ? (
                            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                <CheckCircle2 size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                                <h4 style={{ margin: 0, color: '#d4d4d8' }}>No submissions completed yet</h4>
                                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>Completed results will appear here in real-time as students submit.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#a1a1aa' }}>
                                            <th style={{ padding: '1rem 1.25rem' }}>Candidate</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Roll / Reg No.</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Score</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Time Taken</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Submitted At</th>
                                            <th style={{ padding: '1rem 1.25rem' }}>Recording</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((res, rIdx) => {
                                            const passed = res.score >= exam.passingScore;
                                            return (
                                                <tr key={res._id || rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#f4f4f5' }}>
                                                        {res.studentName || `Student ${res.userId}`}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <code style={{ color: '#818cf8', fontWeight: 700 }}>{res.registerNumber || 'N/A'}</code>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <span style={{
                                                            padding: '3px 10px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            fontSize: '0.85rem',
                                                            background: passed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                            color: passed ? '#4ade80' : '#f87171'
                                                        }}>
                                                            {Number(res.score || 0).toFixed(1)}% {passed ? '(Passed)' : '(Failed)'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', color: '#d4d4d8' }}>
                                                        {Math.floor((res.timeTaken || 0) / 60)}:{((res.timeTaken || 0) % 60).toString().padStart(2, '0')}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', textTransform: 'capitalize', color: '#a1a1aa' }}>
                                                        {res.status}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
                                                        {new Date(res.submittedAt || res.createdAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '1rem 1.25rem' }}>
                                                        <button
                                                            onClick={() => handleViewRecording(res)}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.4rem',
                                                                padding: '0.4rem 0.85rem',
                                                                borderRadius: '6px',
                                                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                                                background: 'rgba(99, 102, 241, 0.12)',
                                                                color: '#818cf8',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Video size={14} />
                                                            View S3 Video
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: BIOMETRIC VERIFICATION (United inside Manage Page) */}
                {activeTab === 'biometric' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Camera size={20} style={{ color: '#f59e0b' }} />
                                    Biometric Verification Requests ({verifications.length})
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    Review student reference photos vs live webcam captures before granting exam entry.
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="Search student or roll no..."
                                    value={biometricSearch}
                                    onChange={e => setBiometricSearch(e.target.value)}
                                    style={{
                                        padding: '0.55rem 1rem',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={fetchBiometricVerifications}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.55rem 0.85rem',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#d4d4d8',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RefreshCw size={14} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {filteredVerifications.length === 0 ? (
                            <div style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                <CheckCircle size={44} style={{ margin: '0 auto 0.75rem auto', color: '#10b981', opacity: 0.8 }} />
                                <h4 style={{ margin: 0, color: '#d4d4d8' }}>No pending biometric verifications</h4>
                                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    All candidates have either been approved or haven't submitted verification yet.
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                                {filteredVerifications.map((v) => (
                                    <div key={v._id} style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '16px',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{v.studentName}</h4>
                                                <div style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: 700, marginTop: '2px' }}>
                                                    Roll No: {v.registerNumber}
                                                </div>
                                            </div>
                                            {v.similarityScore !== undefined && v.similarityScore !== null && (
                                                <span style={{
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    background: v.similarityScore >= 70 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                    color: v.similarityScore >= 70 ? '#4ade80' : '#f87171',
                                                    border: `1px solid ${v.similarityScore >= 70 ? '#22c55e' : '#ef4444'}40`
                                                }}>
                                                    Match: {v.similarityScore}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Photo Comparison */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Reference Photo</div>
                                                <img
                                                    src={getImageSrc(v.referencePhoto)}
                                                    alt="Reference"
                                                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}
                                                    onError={(e) => {
                                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23222" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%23888" text-anchor="middle" dominant-baseline="middle"%3ENo Photo%3C/text%3E%3C/svg%3E';
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Live Snapshot</div>
                                                <img
                                                    src={getImageSrc(v.livePhoto || v.referencePhoto)}
                                                    alt="Live Capture"
                                                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}
                                                    onError={(e) => {
                                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23222" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%23888" text-anchor="middle" dominant-baseline="middle"%3ENo Snapshot%3C/text%3E%3C/svg%3E';
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                                            Submitted: {new Date(v.createdAt).toLocaleTimeString()}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                                            <button
                                                onClick={() => handleRejectBiometric(v._id)}
                                                disabled={processingBiometricId === v._id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.4rem',
                                                    padding: '0.65rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    color: '#f87171',
                                                    fontWeight: 600,
                                                    fontSize: '0.85rem',
                                                    cursor: processingBiometricId === v._id ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleApproveBiometric(v._id)}
                                                disabled={processingBiometricId === v._id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.4rem',
                                                    padding: '0.65rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(34, 197, 94, 0.5)',
                                                    background: 'rgba(34, 197, 94, 0.2)',
                                                    color: '#4ade80',
                                                    fontWeight: 700,
                                                    fontSize: '0.85rem',
                                                    cursor: processingBiometricId === v._id ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <CheckCircle size={16} />
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: STUDENTS */}
                {activeTab === 'students' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                                    Eligible Student Roster ({examStudents.length})
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    Only pre-registered students can access this exam when Student Verification is enabled.
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
                                    background: '#22c55e',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: savingStudents ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
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

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                        <form onSubmit={handleSaveSettings} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.75rem'
                        }}>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', color: '#fff' }}>Exam Configuration & Rules</h3>
                                <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.85rem' }}>Update timing, security checks, and proctoring parameters.</p>
                            </div>

                            {/* Numbers row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="600"
                                        value={settingsForm.duration}
                                        onChange={e => setSettingsForm({ ...settingsForm, duration: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>Verification Window (minutes)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={settingsForm.verificationDuration}
                                        onChange={e => setSettingsForm({ ...settingsForm, verificationDuration: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#d4d4d8', marginBottom: '0.5rem' }}>Passing Score (%)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={settingsForm.passingScore}
                                        onChange={e => setSettingsForm({ ...settingsForm, passingScore: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
                                {[
                                    { key: 'requireStudentVerification', label: 'Strict Student Verification', desc: 'Enforce pre-registered roll number check' },
                                    { key: 'requireBiometric', label: 'Biometric Face Verification', desc: 'Require live photo approval by admin' },
                                    { key: 'requireCamera', label: 'Webcam Proctoring', desc: 'Require webcam enabled for duration of exam' },
                                    { key: 'allowRecording', label: 'S3 Video Recording', desc: 'Stream 10-second webm chunks directly to S3' }
                                ].map(toggle => (
                                    <label key={toggle.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', cursor: 'pointer' }}>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{toggle.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{toggle.desc}</div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={settingsForm[toggle.key]}
                                            onChange={e => setSettingsForm({ ...settingsForm, [toggle.key]: e.target.checked })}
                                            style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                                        />
                                    </label>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={savingSettings}
                                style={{
                                    alignSelf: 'flex-end',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: '#6366f1',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: savingSettings ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <Save size={18} />
                                {savingSettings ? 'Saving Settings...' : 'Save Configuration'}
                            </button>
                        </form>
                    </div>
                )}
            </main>

            {/* S3 Recording Review Modal */}
            {selectedRecording && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '750px',
                        background: '#121215',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '1.75rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>S3 Candidate Video Review</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    {selectedRecording.candidate?.studentName || `Student ${selectedRecording.candidate?.userId}`} • Short-lived Presigned URLs
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecording(null)}
                                style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '6px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {loadingRecording ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#a1a1aa' }}>
                                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto', color: '#6366f1' }} />
                                <p>Generating short-lived presigned playback URLs from S3...</p>
                            </div>
                        ) : recordingError ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                                <AlertTriangle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                                <p style={{ margin: 0 }}>{recordingError}</p>
                            </div>
                        ) : (
                            <div>
                                {activeChunkUrl ? (
                                    <div>
                                        <video
                                            controls
                                            src={activeChunkUrl}
                                            style={{ width: '100%', maxHeight: '420px', borderRadius: '12px', background: '#000', marginBottom: '1rem' }}
                                        />
                                        <div style={{ fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>
                                            Select recording chunk to view ({selectedRecording.presignedUrls.length} available):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                                            {selectedRecording.presignedUrls.map((chunk, cIdx) => (
                                                <button
                                                    key={cIdx}
                                                    onClick={() => setActiveChunkUrl(chunk.url)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '8px',
                                                        background: activeChunkUrl === chunk.url ? '#6366f1' : 'rgba(255, 255, 255, 0.06)',
                                                        color: activeChunkUrl === chunk.url ? '#fff' : '#d4d4d8',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Chunk #{chunk.chunkIndex ?? cIdx}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2.5rem', color: '#a1a1aa' }}>
                                        No recording chunks have been uploaded yet for this session.
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
