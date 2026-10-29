import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Clock,
    Check,
    CheckCircle,
    AlertTriangle,
    Shield,
    Send,
    Flag,
    LayoutGrid,
    X,
    Wifi,
    WifiOff,
    RefreshCw,
    Bookmark
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import GlobalThemeToggle from "./GlobalThemeToggle";
import CameraMonitor from "./CameraMonitor";
import "../styles/DevvoraStyles.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function ExamSession() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Core exam state
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [flagged, setFlagged] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [expiryTime, setExpiryTime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [violations, setViolations] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);
    const [session, setSession] = useState(null);

    // UI state
    const [showNavigator, setShowNavigator] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'offline'
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isWaitingRoom, setIsWaitingRoom] = useState(false);
    const [timeToStart, setTimeToStart] = useState(0);

    const pendingSyncRef = useRef(false);

    // Network connectivity listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setSaveStatus('saving');
            // Sync current answers
            syncSessionWithBackend(answers);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setSaveStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [answers]);

    // Sync session helper
    const syncSessionWithBackend = useCallback(async (currentAnswers) => {
        if (!navigator.onLine) {
            setSaveStatus('offline');
            return;
        }

        try {
            setSaveStatus('saving');
            const res = await fetch(`${API_BASE}/exams/${examId}/session`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentQuestionIndex,
                    answers: currentAnswers,
                    timeRemaining: timeLeft
                }),
                credentials: 'include'
            });

            if (res.ok) {
                setSaveStatus('saved');
            } else {
                setSaveStatus('offline');
            }
        } catch (err) {
            console.warn('Auto-save notice:', err.message);
            setSaveStatus('offline');
        }
    }, [examId, currentQuestionIndex, timeLeft]);

    // Fetch initial exam session
    const fetchSession = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/exams/${examId}/session`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                const { exam, session, questions } = data.data;

                if (exam.isAdaptive === true) {
                    navigate(`/exam/${examId}/adaptive`, { replace: true, state: { exam, session } });
                    return;
                }

                if (!questions || questions.length === 0) {
                    alert('No questions available for this exam. Please contact the administrator.');
                    navigate('/dashboard');
                    return;
                }

                const secureExam = {
                    ...exam,
                    requireCamera: true
                };

                setExam(secureExam);
                setSession(session);
                setQuestions(questions || []);

                // Waiting room check
                const now = new Date();
                const start = new Date(exam.startTime);
                if (now < start) {
                    setIsWaitingRoom(true);
                    setTimeToStart(Math.max(0, Math.floor((start - now) / 1000)));
                }

                setCurrentQuestionIndex(session.currentQuestionIndex || 0);
                setAnswers(session.answers || {});

                if (session.expiryTime) {
                    setExpiryTime(new Date(session.expiryTime));
                    const expiry = new Date(session.expiryTime);
                    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
                    setTimeLeft(remaining);
                } else {
                    setTimeLeft(session.timeRemaining || 0);
                }

                setViolations(session.violations || 0);
            } else {
                alert(data.message || 'Failed to load session');
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Error fetching session:', error);
            alert('Failed to connect to exam server. Please check your connection and try again.');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    }, [examId, navigate]);

    useEffect(() => {
        if (location.state?.studentInfo) {
            setStudentInfo(location.state.studentInfo);
        }
    }, [location.state]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Waiting Room Timer
    useEffect(() => {
        if (!isWaitingRoom) return;
        const timer = setInterval(() => {
            setTimeToStart(prev => {
                if (prev <= 1) {
                    setIsWaitingRoom(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isWaitingRoom]);

    // Submit handler
    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setShowSubmitModal(false);

        try {
            const response = await fetch(`${API_BASE}/exams/${examId}/submit`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                navigate(`/exam/${examId}/result`, {
                    state: {
                        examTitle: exam?.title || 'Exam',
                        examStartTime: exam?.startTime,
                        examEndTime: exam?.endTime,
                        studentInfo: studentInfo || {
                            name: data.data?.studentName || 'Student',
                            registerNumber: data.data?.registerNumber || 'N/A'
                        },
                        submittedAt: new Date().toISOString()
                    }
                });
            } else {
                alert('Submission failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error submitting exam:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [examId, navigate, isSubmitting, exam, studentInfo]);

    // Fullscreen enforcement
    useEffect(() => {
        if (!loading && exam && questions.length > 0) {
            const requestFullscreen = async () => {
                try {
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                        setIsFullscreen(true);
                    }
                } catch (err) {
                    console.warn('Fullscreen request notice:', err);
                    setShowFullscreenWarning(true);
                }
            };

            requestFullscreen();

            const handleFullscreenChange = () => {
                const isCurrentlyFullscreen = !!document.fullscreenElement;
                setIsFullscreen(isCurrentlyFullscreen);

                if (!isCurrentlyFullscreen && !isSubmitting) {
                    setShowFullscreenWarning(true);
                    handleViolation('fullscreen_exit');
                }
            };

            document.addEventListener('fullscreenchange', handleFullscreenChange);
            return () => {
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            };
        }
    }, [loading, exam, questions.length, isSubmitting]);

    const handleViolation = useCallback(async (type) => {
        setViolations(prev => prev + 1);
        try {
            await fetch(`${API_BASE}/exams/${examId}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventType: type, details: `Violation detected: ${type}` }),
                credentials: 'include'
            });

            const response = await fetch(`${API_BASE}/exams/${examId}/session`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ violation: true }),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success && data.data?.violations >= 3) {
                alert('Exam terminated due to multiple security violations.');
                handleSubmit();
            }
        } catch (error) {
            console.error('Error logging violation:', error);
        }
    }, [examId, handleSubmit]);

    // Countdown timer
    useEffect(() => {
        if (!expiryTime || isSubmitting) return;

        const updateTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
            setTimeLeft(remaining);

            if (remaining <= 0) {
                handleSubmit();
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [expiryTime, handleSubmit, isSubmitting]);

    // Periodic background sync (every 15s)
    useEffect(() => {
        if (loading || isSubmitting) return;
        const syncInterval = setInterval(() => {
            syncSessionWithBackend(answers);
        }, 15000);
        return () => clearInterval(syncInterval);
    }, [answers, loading, isSubmitting, syncSessionWithBackend]);

    // Answer selection
    const handleAnswerSelect = (optionText) => {
        const qId = questions[currentQuestionIndex]?._id;
        if (!qId) return;

        const newAnswers = { ...answers, [qId]: optionText };
        setAnswers(newAnswers);

        // Immediate sync
        syncSessionWithBackend(newAnswers);
    };

    // Toggle flag
    const toggleFlag = (index) => {
        setFlagged(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    // Keyboard navigation (1-4 / A-D for options, Left/Right for questions, F for flag)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showSubmitModal || showFullscreenWarning) return;

            const key = e.key.toUpperCase();
            if (['1', '2', '3', '4', 'A', 'B', 'C', 'D'].includes(key)) {
                let optIndex = -1;
                if (key === '1' || key === 'A') optIndex = 0;
                if (key === '2' || key === 'B') optIndex = 1;
                if (key === '3' || key === 'C') optIndex = 2;
                if (key === '4' || key === 'D') optIndex = 3;

                const currentQ = questions[currentQuestionIndex];
                if (currentQ?.options && currentQ.options[optIndex]) {
                    handleAnswerSelect(currentQ.options[optIndex]);
                }
            } else if (e.key === 'ArrowRight' || key === 'N') {
                if (currentQuestionIndex < questions.length - 1) {
                    setCurrentQuestionIndex(prev => prev + 1);
                }
            } else if (e.key === 'ArrowLeft' || key === 'P') {
                if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(prev => prev - 1);
                }
            } else if (key === 'F') {
                toggleFlag(currentQuestionIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestionIndex, questions, showSubmitModal, showFullscreenWarning]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Stats calculations
    const answeredCount = Object.keys(answers).length;
    const flaggedCount = Object.values(flagged).filter(Boolean).length;
    const unansweredCount = questions.length - answeredCount;
    const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
                <AnimatedBackground />
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-700 dark:text-gray-200 text-lg font-semibold">Initializing Secure Exam Session...</p>
                    <p className="text-gray-500 text-sm mt-1">Verifying identity and loading questions</p>
                </div>
            </div>
        );
    }

    // Waiting Room State
    if (isWaitingRoom) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-4 relative">
                <GlobalThemeToggle />
                <AnimatedBackground />

                <div className="max-w-md w-full bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-2xl text-center relative z-10">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 animate-pulse" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Exam Starts In
                    </h1>
                    <div className="text-5xl font-mono font-bold text-blue-600 dark:text-blue-400 my-6 tracking-wider">
                        {formatTime(timeToStart)}
                    </div>

                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                        You have entered the exam room. Please stay on this screen — the exam will begin automatically when the timer reaches zero.
                    </p>

                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span>Camera proctoring is active. Switching tabs or leaving the screen is recorded.</span>
                    </div>

                    {session && (
                        <CameraMonitor
                            sessionId={session._id}
                            examId={examId}
                            isRequired={true}
                            onCameraStatus={() => {}}
                        />
                    )}
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">Question unavailable</p>
                    <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white rounded-xl">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120] text-gray-900 dark:text-gray-100 flex flex-col select-none">
            {/* Offline notification banner */}
            {!isOnline && (
                <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Connection lost. Your answers are saved locally in your browser and will sync when internet restores.</span>
                </div>
            )}

            {/* FIXED TOP BAR */}
            <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#131d33]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
                {/* Thin progress bar */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1">
                    <div
                        className="bg-blue-600 h-1 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    {/* Left: Title & Question Count */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-bold truncate">
                                {exam?.title || "Exam Session"}
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Question <span className="font-semibold text-blue-600 dark:text-blue-400">{currentQuestionIndex + 1}</span> of {questions.length}
                                {studentInfo?.registerNumber && ` • ${studentInfo.registerNumber}`}
                            </p>
                        </div>
                    </div>

                    {/* Center: Autosave Status */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {saveStatus === 'saving' && (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                <span>Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <Check className="w-3.5 h-3.5 text-green-500" />
                                <span>Saved</span>
                            </>
                        )}
                        {saveStatus === 'offline' && (
                            <>
                                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                                <span>Saved locally</span>
                            </>
                        )}
                    </div>

                    {/* Right: Timer, Navigator toggle, Submit */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Prominent Timer */}
                        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono font-bold text-sm sm:text-base ${
                            timeLeft < 300
                                ? 'bg-red-500/10 text-red-600 border-red-500/30 animate-pulse'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                        }`}>
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>

                        {/* Navigator drawer toggle */}
                        <button
                            type="button"
                            onClick={() => setShowNavigator(prev => !prev)}
                            className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                                showNavigator
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                            }`}
                            title="Question Navigator"
                        >
                            <LayoutGrid className="w-4 h-4" />
                            <span className="hidden sm:inline">Navigator</span>
                        </button>

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={() => setShowSubmitModal(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-green-600/20"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Submit</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex gap-6">
                {/* QUESTION CARD */}
                <main className="flex-1 flex flex-col justify-between">
                    <div className="bg-white dark:bg-[#131d33] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sm:p-8 shadow-sm">
                        {/* Question Header & Flag Toggle */}
                        <div className="flex items-start justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <span className="inline-block px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold mb-2">
                                    Question {currentQuestionIndex + 1}
                                </span>
                                {currentQuestion.category && (
                                    <span className="ml-2 inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium">
                                        {Array.isArray(currentQuestion.category) ? currentQuestion.category.join(', ') : currentQuestion.category}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => toggleFlag(currentQuestionIndex)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                    flagged[currentQuestionIndex]
                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                }`}
                                title="Flag for review (press F)"
                            >
                                <Flag className={`w-3.5 h-3.5 ${flagged[currentQuestionIndex] ? 'fill-current' : ''}`} />
                                <span>{flagged[currentQuestionIndex] ? 'Flagged' : 'Flag'}</span>
                            </button>
                        </div>

                        {/* Question Text */}
                        <div className="py-6">
                            <h2 className="text-lg sm:text-xl font-medium leading-relaxed text-gray-900 dark:text-white">
                                {currentQuestion.content}
                            </h2>
                        </div>

                        {/* Options List */}
                        <div className="space-y-3 pt-2">
                            {currentQuestion.options.map((option, idx) => {
                                const isSelected = answers[currentQuestion._id] === option;
                                const optionLetter = String.fromCharCode(65 + idx);

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleAnswerSelect(option)}
                                        className={`w-full p-4 sm:p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-500/10 dark:border-blue-500 shadow-sm'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-500/40 hover:bg-gray-50 dark:hover:bg-[#1a2744]'
                                        }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors flex-shrink-0 ${
                                            isSelected
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'
                                        }`}>
                                            {optionLetter}
                                        </div>
                                        <span className={`text-sm sm:text-base font-normal flex-1 leading-snug ${
                                            isSelected ? 'text-blue-900 dark:text-blue-200 font-medium' : 'text-gray-800 dark:text-gray-200'
                                        }`}>
                                            {option}
                                        </span>
                                        {isSelected && (
                                            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Navigation Controls */}
                    <div className="mt-6 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="text-xs text-gray-500 hidden sm:block">
                            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">1-4</kbd> to select, <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">→</kbd> next
                        </div>

                        {currentQuestionIndex < questions.length - 1 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2"
                            >
                                Next
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowSubmitModal(true)}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
                            >
                                Review & Submit
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </main>

                {/* QUESTION NAVIGATOR SIDEBAR / DRAWER */}
                {showNavigator && (
                    <aside className="w-72 bg-white dark:bg-[#131d33] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex flex-col h-fit">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                            <h3 className="font-bold text-sm flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-blue-500" />
                                Question Palette
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowNavigator(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-3 gap-2 text-[11px] mb-4 text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-green-500" />
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-amber-500" />
                                <span>Flagged</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded bg-gray-200 dark:bg-gray-700" />
                                <span>Pending</span>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
                            {questions.map((q, idx) => {
                                const isAnswered = Boolean(answers[q._id]);
                                const isFlagged = Boolean(flagged[idx]);
                                const isCurrent = idx === currentQuestionIndex;

                                let btnClass = "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700";
                                if (isAnswered) {
                                    btnClass = "bg-green-500 text-white border-green-600";
                                }
                                if (isFlagged) {
                                    btnClass = "bg-amber-500 text-white border-amber-600";
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`h-9 rounded-lg font-bold text-xs border relative flex items-center justify-center transition-all ${btnClass} ${
                                            isCurrent ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#131d33]' : ''
                                        }`}
                                    >
                                        {idx + 1}
                                        {isFlagged && (
                                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Summary Pill */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between">
                                <span>Answered:</span>
                                <span className="font-semibold text-green-500">{answeredCount}/{questions.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Flagged:</span>
                                <span className="font-semibold text-amber-500">{flaggedCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Remaining:</span>
                                <span className="font-semibold">{unansweredCount}</span>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* CONFIRM SUBMISSION MODAL */}
            {showSubmitModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6 shadow-2xl text-center">
                        <div className="w-14 h-14 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Send className="w-7 h-7" />
                        </div>

                        <h3 className="text-xl font-bold mb-2">Ready to Submit?</h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Once submitted, you will not be able to change any of your answers.
                        </p>

                        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-6 text-xs">
                            <div>
                                <span className="block text-gray-400">Answered</span>
                                <span className="text-base font-bold text-green-500">{answeredCount}</span>
                            </div>
                            <div>
                                <span className="block text-gray-400">Unanswered</span>
                                <span className={`text-base font-bold ${unansweredCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {unansweredCount}
                                </span>
                            </div>
                            <div>
                                <span className="block text-gray-400">Flagged</span>
                                <span className="text-base font-bold text-amber-500">{flaggedCount}</span>
                            </div>
                        </div>

                        {unansweredCount > 0 && (
                            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>You still have {unansweredCount} unanswered question(s). You can return to answer them.</span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowSubmitModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-semibold transition-all"
                            >
                                Return to Exam
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-green-600/20 disabled:opacity-50"
                            >
                                {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN VIOLATION MODAL */}
            {showFullscreenWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1e293b] rounded-2xl p-6 max-w-md w-full border-2 border-red-500 shadow-2xl text-center">
                        <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-red-600 mb-2">Fullscreen Mode Required</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                            Exiting fullscreen is a security violation. Warning count: <span className="font-bold text-red-500">{violations}/3</span>. The exam automatically terminates after 3 violations.
                        </p>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    if (document.documentElement.requestFullscreen) {
                                        await document.documentElement.requestFullscreen();
                                    }
                                    setShowFullscreenWarning(false);
                                } catch (err) {
                                    console.warn('Re-enter fullscreen notice:', err);
                                }
                            }}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all"
                        >
                            Return to Fullscreen
                        </button>
                    </div>
                </div>
            )}

            {/* Camera Monitor Component */}
            {session && (
                <CameraMonitor
                    sessionId={session._id}
                    examId={examId}
                    isRequired={true}
                    onCameraStatus={() => {}}
                />
            )}
        </div>
    );
}
