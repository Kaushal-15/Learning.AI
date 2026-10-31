import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Send, Target, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import AdaptiveWaitScreen from "./AdaptiveWaitScreen";
import CameraMonitor from "./CameraMonitor";
import ProctoringService from "../services/ProctoringService";
import "../styles/DevvoraStyles.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function AdaptiveExamSession() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();
    const location = useLocation();

    // State
    const [exam, setExam] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionNumber, setQuestionNumber] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [difficulty, setDifficulty] = useState('easy');
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [timeLeft, setTimeLeft] = useState(30);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const [waitTime, setWaitTime] = useState(0);
    const [collectiveStats, setCollectiveStats] = useState(null);
    const [individualStats, setIndividualStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [examComplete, setExamComplete] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [cameraRequired, setCameraRequired] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);

    // Global exam timer for total exam duration
    const [totalExamTime, setTotalExamTime] = useState(0);
    const [examExpiryTime, setExamExpiryTime] = useState(null);
    const [showTimeWarning, setShowTimeWarning] = useState(false);

    // Waiting Room State
    const [isWaitingRoom, setIsWaitingRoom] = useState(false);
    const [timeToStart, setTimeToStart] = useState(0);

    // Proctoring State
    const [proctoring, setProctoring] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
    const [violations, setViolations] = useState(0);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (['input', 'textarea'].includes(e.target.tagName?.toLowerCase())) return;
            if (!currentQuestion?.options) return;
            const key = e.key.toUpperCase();
            let optionIndex = -1;
            if (['1', '2', '3', '4'].includes(e.key)) optionIndex = parseInt(e.key, 10) - 1;
            else if (['A', 'B', 'C', 'D'].includes(key)) optionIndex = key.charCodeAt(0) - 65;
            if (optionIndex >= 0 && optionIndex < currentQuestion.options.length) {
                setSelectedAnswer(currentQuestion.options[optionIndex]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQuestion]);

    // Initialize session if needed
    const initializeSession = useCallback(async () => {
        try {
            // Check if we have session data from navigation state
            if (location.state?.exam && location.state?.session) {
                setExam(location.state.exam);
                setSessionId(location.state.session._id);
                // CRITICAL: FORCE ENABLE CAMERA MONITORING FOR ALL ADAPTIVE EXAMS
                setCameraRequired(true);  // FORCE ON - matches ExamSession.jsx behavior
                console.log('✅ Adaptive Exam - Camera FORCED ON');
                setTotalQuestions(location.state.exam.totalQuestions);

                // Get student info from location state (passed from verification)
                const sInfo = location.state?.studentInfo || {
                    name: location.state.session.studentName || 'Student',
                    registerNumber: location.state.session.registerNumber || ''
                };
                setStudentInfo(sInfo);

                // Persist to sessionStorage for refresh resilience
                try {
                    sessionStorage.setItem(`exam_session_${examId}`, JSON.stringify({
                        sessionId: location.state.session._id,
                        studentInfo: sInfo
                    }));
                } catch (e) {}

                // Set global exam timer from session
                if (location.state.session.expiryTime) {
                    setExamExpiryTime(new Date(location.state.session.expiryTime));
                    const now = new Date();
                    const expiry = new Date(location.state.session.expiryTime);
                    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
                    setTotalExamTime(remaining);
                }

                setLoading(false);
                return;
            }

            // On refresh or direct resume: refetch existing session from server
            let sessionResponse = await fetch(`${API_BASE}/exams/${examId}/session`, {
                method: "GET",
                credentials: "include"
            });
            let sessionData = await sessionResponse.json();

            // If GET fails to find existing session, fallback to stored session info or POST
            if (!sessionData.success || !sessionData.data) {
                let savedInfo = null;
                try {
                    const raw = sessionStorage.getItem(`exam_session_${examId}`);
                    if (raw) savedInfo = JSON.parse(raw);
                } catch (e) {}

                sessionResponse = await fetch(`${API_BASE}/exams/${examId}/session`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        studentName: savedInfo?.studentInfo?.name || "Student",
                        registerNumber: savedInfo?.studentInfo?.registerNumber || ""
                    })
                });
                sessionData = await sessionResponse.json();
            }

            if (!sessionData.success || !sessionData.data) {
                throw new Error(sessionData.message || "Invalid session data");
            }

            // Check if this is actually an adaptive exam
            const { exam, session } = sessionData.data;
            if (!exam.isAdaptive) {
                // Not an adaptive exam, redirect back to regular session
                navigate(`/exam/${examId}`, { replace: true });
                return;
            }

            setExam(exam);
            setSessionId(session._id);
            setCameraRequired(true);
            setTotalQuestions(exam.totalQuestions);

            const recoveredStudentInfo = {
                name: session.studentName || "Student",
                registerNumber: session.registerNumber || ""
            };
            setStudentInfo(recoveredStudentInfo);

            try {
                sessionStorage.setItem(`exam_session_${examId}`, JSON.stringify({
                    sessionId: session._id,
                    studentInfo: recoveredStudentInfo
                }));
            } catch (e) {}

            // Set global exam timer from session
            if (session.expiryTime) {
                setExamExpiryTime(new Date(session.expiryTime));
                const now = new Date();
                const expiry = new Date(session.expiryTime);
                const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
                setTotalExamTime(remaining);
            }

            // Check for Waiting Room
            const now = new Date();
            const start = new Date(exam.startTime);
            if (now < start) {
                setIsWaitingRoom(true);
                setTimeToStart(Math.floor((start - now) / 1000));
            }

            setLoading(false);
        } catch (error) {
            console.error("Error initializing session:", error);
            if (error.message.includes("Biometric verification required") || error.message.includes("not registered")) {
                alert(error.message);
                navigate(`/exam/${examId}/verify`, { state: { fromSession: true } });
            } else {
                alert("Failed to initialize exam session. Please try again.");
                navigate("/dashboard");
            }
        }
    }, [examId, navigate, location.state]);

    // Forward refs to prevent circular callback dependencies and Temporal Dead Zone (TDZ) ReferenceError
    const checkWaitStatusRef = useRef(null);
    const fetchNextQuestionRef = useRef(null);

    // Fetch next question (defined first)
    const fetchNextQuestion = useCallback(async () => {
        try {
            const endpoint = exam?.isSynchronized
                ? `${API_BASE}/exams/${examId}/synchronized/current-question`
                : `${API_BASE}/exams/${examId}/adaptive/next-question`;

            const res = await fetch(endpoint, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message);
            }

            if (data.isWaiting) {
                // Still in wait period
                setIsWaiting(true);
                if (exam?.isSynchronized) {
                    setWaitTime(data.waitTimeRemaining || 10);
                    // Poll again after 1 second for synchronized
                    setTimeout(() => fetchNextQuestionRef.current?.(), 1000);
                } else {
                    checkWaitStatusRef.current?.();
                }
                return;
            }

            if (data.isComplete) {
                // Exam finished - finalize in DB
                setExamComplete(true);
                (async () => {
                    try {
                        await fetch(`${API_BASE}/exams/${examId}/submit`, {
                            method: 'POST',
                            credentials: 'include'
                        });
                    } catch (err) {
                        console.error('Error submitting completed adaptive exam:', err);
                    }
                    setTimeout(() => {
                        navigate(`/exam/${examId}/result`, {
                            state: {
                                examTitle: exam?.title || 'Adaptive Exam',
                                examStartTime: exam?.startTime,
                                examEndTime: exam?.endTime,
                                studentInfo: studentInfo || {
                                    name: 'Student',
                                    registerNumber: 'N/A'
                                },
                                submittedAt: new Date().toISOString()
                            }
                        });
                    }, 1000);
                })();
                return;
            }

            // Set new question
            if (exam?.isSynchronized) {
                if (data.data.hasAnswered) {
                    setIsWaiting(true);
                    setTimeout(() => fetchNextQuestionRef.current?.(), 1000);
                    return;
                }
                setCurrentQuestion(data.data.question);
                setQuestionNumber(data.data.questionNumber);
                setTotalQuestions(data.data.totalQuestions);
                setDifficulty(data.data.difficulty);
                setTimeLeft(data.data.timeRemaining);
                // Synchronized doesn't send timePerQuestion in data.data, use exam setting or default
                setTimePerQuestion(exam.questionTimer || 30);
            } else {
                setCurrentQuestion(data.data.question);
                setQuestionNumber(data.data.questionNumber);
                setTotalQuestions(data.data.totalQuestions);
                setDifficulty(data.data.difficulty);
                setTimePerQuestion(data.data.timePerQuestion || 30);
                setTimeLeft(data.data.timePerQuestion || 30);
            }

            setSelectedAnswer(null);
            setIsWaiting(false);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching next question:', error);
            // Don't alert for synchronized polling errors to avoid spam
            if (!exam?.isSynchronized) {
                alert('Failed to load question. Please try again.');
            }
        }
    }, [examId, navigate, exam]);

    // Check wait status (Adaptive only)
    const checkWaitStatus = useCallback(async () => {
        if (exam?.isSynchronized) return; // Synchronized handled in fetchNextQuestion

        try {
            const res = await fetch(`${API_BASE}/exams/${examId}/adaptive/wait-status`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!data.success) return;

            if (data.isWaiting) {
                setWaitTime(data.timeRemaining);
                if (data.collectiveStats) setCollectiveStats(data.collectiveStats);
                if (data.individualStats) setIndividualStats(data.individualStats);
            } else {
                // Wait is over, fetch next question via ref
                fetchNextQuestionRef.current?.();
            }
        } catch (error) {
            console.error('Error checking wait status:', error);
        }
    }, [examId, exam]);

    // Keep forward refs synchronized without triggering re-renders
    useEffect(() => {
        fetchNextQuestionRef.current = fetchNextQuestion;
        checkWaitStatusRef.current = checkWaitStatus;
    });

    // Submit answer (supports auto-submit on timeout as __UNANSWERED__)
    const handleSubmitAnswer = async (forcedAnswer = null) => {
        const answerToSubmit = forcedAnswer || selectedAnswer;
        if (!answerToSubmit || isSubmitting) return;

        setIsSubmitting(true);
        // Persist answers incrementally to sessionStorage
        try {
            const stored = JSON.parse(sessionStorage.getItem(`exam_answers_${examId}`) || '{}');
            if (currentQuestion?._id) {
                stored[currentQuestion._id] = answerToSubmit;
                sessionStorage.setItem(`exam_answers_${examId}`, JSON.stringify(stored));
            }
        } catch (e) {}
        try {
            const endpoint = exam?.isSynchronized
                ? `${API_BASE}/exams/${examId}/synchronized/submit-answer`
                : `${API_BASE}/exams/${examId}/adaptive/submit-answer`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    questionId: currentQuestion._id,
                    answer: answerToSubmit
                })
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.message);
            }

            if (exam?.isSynchronized) {
                // For synchronized, just go to waiting state and poll
                setIsWaiting(true);
                fetchNextQuestion();
            } else {
                // Start 10-second wait period (Adaptive)
                setIsWaiting(true);
                setWaitTime(data.waitTime || 10);
                if (data.collectiveStats) setCollectiveStats(data.collectiveStats);
                if (data.individualStats) setIndividualStats(data.individualStats);
            }

        } catch (error) {
            console.error('Error submitting answer:', error);
            if (!forcedAnswer) {
                alert(error.message || 'Failed to submit answer. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Violation handler for proctoring
    const handleViolation = useCallback(async (type) => {
        setViolations(prev => prev + 1);
        console.warn(`⚠️ Violation detected: ${type}`);

        try {
            // Log violation to backend
            await fetch(`${API_BASE}/exams/${examId}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: type,
                    details: `Adaptive exam violation: ${type}`
                }),
                credentials: 'include'
            });
        } catch (error) {
            console.error('Error logging violation:', error);
        }
    }, [examId]);

    const selectedAnswerRef = useRef(null);
    useEffect(() => {
        selectedAnswerRef.current = selectedAnswer;
    }, [selectedAnswer]);

    // Timer countdown (auto-submits if unanswered when time runs out)
    useEffect(() => {
        if (loading || isWaiting || examComplete) return;

        // Ensure timeLeft is valid
        if (timeLeft === null || timeLeft === undefined) {
            setTimeLeft(timePerQuestion || 30);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up - auto submit selected answer or __UNANSWERED__
                    clearInterval(timer);
                    handleSubmitAnswer(selectedAnswerRef.current || '__UNANSWERED__');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [loading, isWaiting, examComplete, timePerQuestion]);

    // Global exam timer - tracks total exam duration
    useEffect(() => {
        if (!examExpiryTime || examComplete || loading) return;

        const updateGlobalTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((examExpiryTime - now) / 1000));
            setTotalExamTime(remaining);

            // Show warning at 10 seconds
            if (remaining === 10 && !showTimeWarning) {
                setShowTimeWarning(true);
            }

            // Auto-submit entire exam when global timer expires
            if (remaining <= 0) {
                setExamComplete(true);
                (async () => {
                    try {
                        await fetch(`${API_BASE}/exams/${examId}/submit`, {
                            method: 'POST',
                            credentials: 'include'
                        });
                    } catch (err) {
                        console.error('Error auto-submitting exam:', err);
                    }
                    navigate(`/exam/${examId}/result`, {
                        state: {
                            examTitle: exam?.title || 'Adaptive Exam',
                            examStartTime: exam?.startTime,
                            examEndTime: exam?.endTime,
                            studentInfo: studentInfo || {
                                name: 'Student',
                                registerNumber: 'N/A'
                            },
                            submittedAt: new Date().toISOString()
                        }
                    });
                })();
            }
        };

        updateGlobalTimer();
        const timer = setInterval(updateGlobalTimer, 1000);
        return () => clearInterval(timer);
    }, [examExpiryTime, examComplete, loading, showTimeWarning, navigate, examId]);

    // Prevent back navigation
    useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
            alert("Navigation is disabled during the exam.");
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Fullscreen enforcement for proctored exams
    useEffect(() => {
        if (!loading && exam && !isWaitingRoom && !examComplete) {
            // Request fullscreen mode
            const requestFullscreen = async () => {
                try {
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                        setIsFullscreen(true);
                        console.log('✅ Fullscreen entered');
                    }
                } catch (err) {
                    console.warn('Fullscreen request failed:', err);
                    setShowFullscreenWarning(true);
                }
            };

            requestFullscreen();

            // Monitor fullscreen changes
            const handleFullscreenChange = () => {
                const isCurrentlyFullscreen = !!document.fullscreenElement;
                setIsFullscreen(isCurrentlyFullscreen);

                if (!isCurrentlyFullscreen && !examComplete && !loading) {
                    setShowFullscreenWarning(true);
                    handleViolation('fullscreen_exit');
                }
            };

            document.addEventListener('fullscreenchange', handleFullscreenChange);
            return () => {
                document.removeEventListener('fullscreenchange', handleFullscreenChange);
            };
        }
    }, [loading, exam, isWaitingRoom, examComplete, handleViolation]);

    // Initialize ProctoringService for violation detection
    useEffect(() => {
        if (!loading && exam && !isWaitingRoom && !examComplete) {
            console.log('🔒 Initializing proctoring service');
            const p = new ProctoringService(examId, handleViolation);
            p.start();
            setProctoring(p);
            return () => {
                console.log('🔓 Stopping proctoring service');
                p.stop();
            };
        }
    }, [loading, exam, isWaitingRoom, examComplete, examId, handleViolation]);

    // Initial load
    useEffect(() => {
        initializeSession();
    }, [initializeSession]);

    // Waiting Room Timer
    useEffect(() => {
        if (!isWaitingRoom) return;

        const timer = setInterval(() => {
            setTimeToStart(prev => {
                if (prev <= 0) {
                    setIsWaitingRoom(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isWaitingRoom]);

    // Start fetching questions once exam is loaded and NOT waiting room
    useEffect(() => {
        if (exam && !loading && !isWaiting && !examComplete && !isWaitingRoom) {
            fetchNextQuestion();
        }
    }, [exam, loading, isWaiting, examComplete, fetchNextQuestion, isWaitingRoom]);

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get timer class
    const getTimerClass = () => {
        if (timeLeft <= 5) return 'danger';
        if (timeLeft <= 10) return 'warning';
        return '';
    };

    if (loading) {
        return (
            <div className={`exam-session-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
                <div className="loading-state">
                    <Clock size={48} className="spinner" />
                    <p>Loading exam...</p>
                </div>
            </div>
        );
    }

    if (isWaitingRoom) {
        return (
            <div className={`exam-session-container ${isDarkMode ? 'dashboard-dark' : ''} flex items-center justify-center min-h-screen`}>
                <div className="max-w-xl w-full bg-white dark:bg-dark-400 rounded-2xl p-8 shadow-xl text-center border border-gray-200 dark:border-dark-300">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 dark:text-cream-100 mb-2">
                        Exam Starts In
                    </h1>

                    <div className="text-5xl font-mono font-bold text-blue-600 dark:text-blue-400 mb-8 tracking-wider">
                        {formatTime(timeToStart)}
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 text-left">
                        <h3 className="font-bold text-yellow-800 dark:text-yellow-300 mb-2 flex items-center gap-2">
                            <Target size={20} />
                            Adaptive Exam Mode
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-200 mb-2">
                            This exam adapts to your performance. Difficulty will adjust based on your answers.
                        </p>
                        <div className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mt-4">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            PROCTORING ACTIVE
                        </div>
                    </div>

                    <div className="mt-8 text-sm text-gray-500 dark:text-cream-300">
                        Exam: {exam?.title}
                    </div>
                </div>

                {/* Camera Monitor Active During Waiting */}
                {sessionId && (
                    <CameraMonitor
                        sessionId={sessionId}
                        examId={examId}
                        isRequired={true}
                        onCameraStatus={(status) => console.log('📹 Waiting Room Camera:', status)}
                    />
                )}
            </div>
        );
    }

    if (examComplete) {
        return (
            <div className={`exam-session-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
                <div className="completion-state">
                    <Target size={64} />
                    <h2>Exam Complete!</h2>
                    <p>Redirecting to results...</p>
                </div>
            </div>
        );
    }

    if (isWaiting) {
        return (
            <AdaptiveWaitScreen
                waitTime={waitTime}
                collectiveStats={collectiveStats}
                onWaitComplete={() => fetchNextQuestionRef.current?.()}
            />
        );
    }

    return (
        <div
            className={`exam-session-container ${isDarkMode ? 'dashboard-dark' : ''}`}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
            {!isOnline && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={16} />
                    <span>You are currently offline. Please do not close this window. Reconnecting...</span>
                </div>
            )}

            {/* Header */}
            <div className="exam-session-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="back-btn"
                        onClick={() => {
                            if (window.confirm('Are you sure you want to leave? Your progress will be lost.')) {
                                navigate('/dashboard');
                            }
                        }}
                    >
                        <ArrowLeft size={20} />
                        Exit Exam
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{exam?.title || 'Adaptive Exam'}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                        Autosave Active
                    </span>
                </div>
            </div>

            {/* Adaptive Question Container */}
            <div className="adaptive-question-container">
                {/* Question Header */}
                <div className="adaptive-question-header">
                    <div className="question-progress">
                        <Target size={20} />
                        <span>Question {questionNumber} of {totalQuestions}</span>
                    </div>

                    {/* Proctoring Status */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${isFullscreen
                        ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400'
                        : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 animate-pulse'
                        }`}>
                        <Shield size={14} />
                        <span>{isFullscreen ? 'Proctored' : 'Fullscreen Required'}</span>
                    </div>

                    {/* Violation Counter */}
                    {violations > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 rounded-lg text-xs font-medium">
                            <AlertTriangle size={14} />
                            <span>Violations: {violations}/3</span>
                        </div>
                    )}

                    <div className={`difficulty-badge ${difficulty}`}>
                        <TrendingUp size={16} />
                        {difficulty}
                    </div>
                    <div className={`question-timer ${getTimerClass()}`}>
                        <Clock size={20} />
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Question Card */}
                <div className="adaptive-question-card">
                    <h2 className="adaptive-question-text">
                        {currentQuestion ? (currentQuestion.content || currentQuestion.question) : "Loading question..."}
                    </h2>

                    <div className="adaptive-options-grid">
                        {currentQuestion?.options?.map((option, index) => (
                            <div
                                key={index}
                                className={`adaptive-option ${selectedAnswer === option ? 'selected' : ''}`}
                                onClick={() => setSelectedAnswer(option)}
                            >
                                <div className="option-letter">
                                    {String.fromCharCode(65 + index)}
                                </div>
                                <span>{option}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Submit Button (minimum 3 seconds spent on question) */}
                {(() => {
                    const timeSpentOnQuestion = (timePerQuestion || 30) - timeLeft;
                    const isMinTimeMet = timeSpentOnQuestion >= 3;
                    return (
                        <button
                            className="adaptive-submit-btn"
                            onClick={handleSubmitAnswer}
                            disabled={!selectedAnswer || isSubmitting || !isMinTimeMet}
                        >
                            <Send size={20} />
                            {isSubmitting
                                ? 'Submitting...'
                                : !isMinTimeMet
                                    ? `Wait ${3 - timeSpentOnQuestion}s`
                                    : 'Submit Answer'}
                        </button>
                    );
                })()}
            </div>

            {/* Fullscreen Warning Modal */}
            {showFullscreenWarning && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-md mx-4 border-2 border-red-500 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100">Fullscreen Required</h2>
                        </div>
                        <p className="text-gray-600 dark:text-cream-200 mb-6">
                            This exam requires fullscreen mode for proctoring. Exiting fullscreen is considered a violation.
                        </p>
                        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-3 mb-6">
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                <strong>Warning:</strong> You have {violations} violation(s). After 3 violations, your exam will be automatically submitted.
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    await document.documentElement.requestFullscreen();
                                    setShowFullscreenWarning(false);
                                } catch (err) {
                                    console.error('Failed to enter fullscreen:', err);
                                }
                            }}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
                        >
                            Return to Fullscreen
                        </button>
                    </div>
                </div>
            )}

            {/* Global Exam Time Expiry Warning - Shows at 10 seconds */}
            {showTimeWarning && totalExamTime > 0 && totalExamTime <= 10 && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-md mx-4 border-2 border-red-500 shadow-2xl animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                                <Clock size={32} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold">Exam Ending Soon!</h2>
                        </div>
                        <p className="text-gray-600 dark:text-cream-200 mb-4">
                            Total exam time expires in <span className="text-red-600 dark:text-red-400 font-bold text-2xl">{totalExamTime}</span> seconds!
                        </p>
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
                            <p className="text-sm text-red-800 dark:text-red-300">
                                Your exam will automatically submit when time expires. All answered questions will be saved.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Monitor - FORCE ENABLED FOR ALL ADAPTIVE EXAMS */}
            {sessionId && (
                <CameraMonitor
                    sessionId={sessionId}
                    examId={examId}
                    isRequired={true}
                    onCameraStatus={(status) => console.log('📹 Adaptive Exam Camera status:', status)}
                />
            )}
            {!sessionId && console.log('⚠️ Camera not rendering - session is null')}
            {sessionId && console.log('✅ Camera Monitor rendering with sessionId:', sessionId)}
        </div>
    );
}
