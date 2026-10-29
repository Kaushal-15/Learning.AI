import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Users, Clock, BookOpen, Play, Pause,
    Settings, Eye, Download, RefreshCw, AlertCircle, Target, Save,
    Video, CheckCircle2, X, List, Shield, HelpCircle, Camera, Check,
    ExternalLink, AlertTriangle
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import StudentListManager from "./StudentListManager";
import "../styles/DevvoraStyles.css";
import "../styles/dashboard-glass.css";

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
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Recording playback modal state
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [loadingRecording, setLoadingRecording] = useState(false);
    const [recordingError, setRecordingError] = useState(null);
    const [activeChunkUrl, setActiveChunkUrl] = useState(null);

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;

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
                fetchStudents()
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

    const handleViewRecording = async (candidate) => {
        const sessId = candidate.sessionId || candidate._id;
        setSelectedRecording({ candidate, chunks: [], presignedUrls: [] });
        setActiveChunkUrl(null);
        setLoadingRecording(true);
        setRecordingError(null);

        try {
            const res = await fetch(`${API_BASE}/camera/review/${sessId}?examId=${examId}&userId=${candidate.userId || ''}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const urls = data.presignedUrls || [];
                setSelectedRecording({
                    candidate,
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
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
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
                        { id: 'settings', label: 'Settings', icon: Settings },
                        { id: 'students', label: `Students (${examStudents.length})`, icon: Users },
                        { id: 'questions', label: `Questions (${questions.length})`, icon: HelpCircle },
                        { id: 'monitoring', label: `Live Monitoring (${candidates.length})`, icon: Video }
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
                    </div>
                )}

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
                    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                        <form onSubmit={handleSaveSettings} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '20px',
                            padding: '2.5rem'
                        }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 1.5rem 0', color: '#fff' }}>Exam Settings & Policies</h2>

                            {/* Numeric Config Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settingsForm.duration}
                                        onChange={e => setSettingsForm({ ...settingsForm, duration: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(0, 0, 0, 0.3)', color: '#fff', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Verification Duration (Minutes)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={settingsForm.verificationDuration}
                                        onChange={e => setSettingsForm({ ...settingsForm, verificationDuration: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(0, 0, 0, 0.3)', color: '#fff', fontSize: '0.95rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '0.5rem' }}>Passing Score (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settingsForm.passingScore}
                                        onChange={e => setSettingsForm({ ...settingsForm, passingScore: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(0, 0, 0, 0.3)', color: '#fff', fontSize: '0.95rem' }}
                                    />
                                </div>
                            </div>

                            {/* Styled Toggle Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                                {[
                                    { key: 'requireStudentVerification', label: 'Student Pre-Registration', desc: 'Only students added to the Students tab can take this exam' },
                                    { key: 'requireBiometric', label: 'Biometric Photo Verification', desc: 'Students must upload webcam photo and wait for admin approval' },
                                    { key: 'requireCamera', label: 'Webcam Monitoring', desc: 'Forces candidate webcam feed to stay active during exam' },
                                    { key: 'allowRecording', label: 'Direct S3 Video Recording', desc: 'Browser streams chunked video recordings straight to private S3 bucket' },
                                    { key: 'autoRecord', label: 'Auto-Start Recording', desc: 'Automatically triggers recording when candidate enters session' }
                                ].map(item => {
                                    const checked = Boolean(settingsForm[item.key]);
                                    return (
                                        <div
                                            key={item.key}
                                            onClick={() => setSettingsForm({ ...settingsForm, [item.key]: !checked })}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.25rem',
                                                borderRadius: '12px',
                                                background: checked ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                border: checked ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, color: checked ? '#fff' : '#d4d4d8', fontSize: '0.95rem' }}>{item.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '2px' }}>{item.desc}</div>
                                            </div>

                                            {/* Custom Toggle Switch */}
                                            <div style={{
                                                width: '44px',
                                                height: '24px',
                                                borderRadius: '9999px',
                                                backgroundColor: checked ? '#6366f1' : 'rgba(255, 255, 255, 0.15)',
                                                position: 'relative',
                                                transition: 'background-color 0.2s',
                                                flexShrink: 0
                                            }}>
                                                <div style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#fff',
                                                    position: 'absolute',
                                                    top: '3px',
                                                    left: checked ? '23px' : '3px',
                                                    transition: 'left 0.2s',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                type="submit"
                                disabled={savingSettings}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.85rem 2rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#6366f1',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    cursor: savingSettings ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Save size={18} />
                                {savingSettings ? 'Saving Settings...' : 'Save All Settings'}
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: STUDENTS */}
                {activeTab === 'students' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#fff' }}>Exam Student Roster</h2>
                                <p style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                                    Manage students permitted to enter this exam. Changes apply to this exam when you click "Save Students to Exam".
                                </p>
                            </div>
                            <button
                                onClick={handleSaveStudentsToExam}
                                disabled={savingStudents}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#22c55e',
                                    color: '#fff',
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

                {/* TAB: QUESTIONS */}
                {activeTab === 'questions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Pool Balance Banner */}
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
                                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Question Pool ({questions.length} questions)</h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    Exam Target: <strong>{exam.totalQuestions} questions</strong> • Type: <strong style={{ textTransform: 'capitalize' }}>{exam.examType || 'static'}</strong>
                                </p>
                            </div>

                            {/* Difficulty Badges */}
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {[
                                    { diff: 'easy', label: 'Easy', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                                    { diff: 'medium', label: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
                                    { diff: 'hard', label: 'Hard', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' }
                                ].map(d => {
                                    const count = questions.filter(q => (q.difficulty || q.difficultyLevel || 'medium').toLowerCase() === d.diff).length;
                                    return (
                                        <div key={d.diff} style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            background: d.bg,
                                            border: `1px solid ${d.color}40`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span style={{ fontSize: '0.85rem', color: '#d4d4d8' }}>{d.label}:</span>
                                            <strong style={{ fontSize: '1rem', color: d.color }}>{count}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Questions List */}
                        {questions.length === 0 ? (
                            <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                <HelpCircle size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.4 }} />
                                <h4 style={{ margin: 0, color: '#d4d4d8' }}>No questions found in this exam</h4>
                                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.5rem' }}>Questions can be uploaded via CSV/PDF/DOCX in the Exam Creator.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {questions.map((q, idx) => {
                                    const diff = (q.difficulty || q.difficultyLevel || 'medium').toLowerCase();
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
                                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f4f4f5', lineHeight: 1.5 }}>
                                                        {q.question || q.content}
                                                    </h4>
                                                </div>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    background: `${diffColor}20`,
                                                    color: diffColor,
                                                    border: `1px solid ${diffColor}40`,
                                                    flexShrink: 0
                                                }}>
                                                    {diff}
                                                </span>
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

                {/* TAB: MONITORING */}
                {activeTab === 'monitoring' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                        {/* Live Active Candidates */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></span>
                                        Live Active Candidates ({candidates.length})
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a1a1aa' }}>
                                        Candidates currently connected and taking this exam session.
                                    </p>
                                </div>
                            </div>

                            {candidates.length === 0 ? (
                                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                    <Users size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                                    <h4 style={{ margin: 0, color: '#d4d4d8' }}>No candidates taking exam right now</h4>
                                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>When students enter, their real-time progress and stream will appear here.</p>
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

                                                {/* Violation Badge */}
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
                                                    <span>{Math.floor((cand.timeRemaining || 0) / 60)}:{((cand.timeRemaining || 0) % 60).toString().padStart(2, '0')} remaining</span>
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

                                            {/* Recording View Button */}
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

                        {/* Completed Submissions Table */}
                        <div>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#fff' }}>
                                Completed Submissions ({results.length})
                            </h3>

                            {results.length === 0 ? (
                                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px' }}>
                                    <BookOpen size={40} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                                    <h4 style={{ margin: 0, color: '#d4d4d8' }}>No submissions completed yet</h4>
                                    <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>Completed results will appear here as candidates submit.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#a1a1aa' }}>
                                                <th style={{ padding: '1rem 1.25rem' }}>Candidate</th>
                                                <th style={{ padding: '1rem 1.25rem' }}>Register No.</th>
                                                <th style={{ padding: '1rem 1.25rem' }}>Score</th>
                                                <th style={{ padding: '1rem 1.25rem' }}>Time Taken</th>
                                                <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                                                <th style={{ padding: '1rem 1.25rem' }}>Submitted At</th>
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
                                                            {new Date(res.submittedAt).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
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