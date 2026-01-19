import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    Clock,
    CheckCircle,
    AlertTriangle,
    Shield,
    Send
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import GlobalThemeToggle from "./GlobalThemeToggle";
import ProctoringService from "../services/ProctoringService";
import CameraMonitor from "./CameraMonitor";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function ExamSession() {
    const { examId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [expiryTime, setExpiryTime] = useState(null); // Server-side expiry time
    const [loading, setLoading] = useState(true);
    const [violations, setViolations] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proctoring, setProctoring] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
    const [studentInfo, setStudentInfo] = useState(null);
    const [session, setSession] = useState(null);
    const [showTimeWarning, setShowTimeWarning] = useState(false);
    const [isWaitingRoom, setIsWaitingRoom] = useState(false);
    const [timeToStart, setTimeToStart] = useState(0);

    const fetchSession = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE}/exams/${examId}/session`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                const { exam, session, questions } = data.data;

                // Check if this is an adaptive exam (one question at a time with wait periods)
                // Note: Dynamic exams (examType === 'dynamic') use regular flow with pre-generated questions
                if (exam.isAdaptive === true) {
                    // Redirect to adaptive exam session
                    navigate(`/exam/${examId}/adaptive`, { replace: true, state: { exam, session } });
                    return;
                }

                if (!questions || questions.length === 0) {
                    alert('No questions available for this exam. Please contact the administrator.');
                    navigate('/dashboard');
                    return;
                }

                // CRITICAL: FORCE ENABLE CAMERA MONITORING FOR ALL EXAMS
                const secureExam = {
                    ...exam,
                    requireCamera: true  // FORCE ON
                };

                setExam(secureExam);  // Use secure version
                setSession(session);  // Store session for camera monitoring

                // Check for Waiting Room
                const now = new Date();
                const start = new Date(exam.startTime);
                if (now < start) {
                    setIsWaitingRoom(true);
                    setTimeToStart(Math.floor((start - now) / 1000));
                }

                console.log('✅ Exam loaded - requireCamera:', secureExam.requireCamera);
                console.log('✅ Session set:', session._id);
                setQuestions(questions);
                setCurrentQuestionIndex(session.currentQuestionIndex || 0);
                setAnswers(session.answers || {});

                // Use server-side expiryTime for robust timer
                if (session.expiryTime) {
                    setExpiryTime(new Date(session.expiryTime));
                    // Calculate remaining time based on server expiry
                    const now = new Date();
                    const expiry = new Date(session.expiryTime);
                    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
                    setTimeLeft(remaining);
                } else {
                    // Fallback to session.timeRemaining if expiryTime not available
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

    // Get student info from navigation state
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
                if (prev <= 0) {
                    setIsWaitingRoom(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isWaitingRoom]);

    // Fullscreen enforcement for proctored exams
    useEffect(() => {
        if (!loading && exam && questions.length > 0) {
            // Request fullscreen mode
            const requestFullscreen = async () => {
                try {
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                        setIsFullscreen(true);
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

    const handleSubmit = useCallback(async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/exams/${examId}/submit`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                // Navigate to result page with exam and student info
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
            if (data.success && data.data.violations >= 3) { // Hardcoded limit for now, should come from exam config
                alert('Exam terminated due to multiple violations.');
                handleSubmit();
            }
        } catch (error) {
            console.error('Error logging violation:', error);
        }
    }, [examId, handleSubmit]);

    // TEMPORARILY DISABLED FOR DEBUGGING
    // useEffect(() => {
    //     if (!loading && questions.length > 0) {
    //         const p = new ProctoringService(examId, handleViolation);
    //         p.start();
    //         setProctoring(p);
    //         return () => p.stop();
    //     }
    // }, [loading, questions.length, examId, handleViolation]);

    // Server-synced timer using expiryTime
    useEffect(() => {
        if (!expiryTime || isSubmitting) return;

        const updateTimer = () => {
            const now = new Date();
            const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));
            setTimeLeft(remaining);

            // Show warning at 10 seconds
            if (remaining === 10 && !showTimeWarning) {
                setShowTimeWarning(true);
            }

            // Auto-submit when time expires
            if (remaining <= 0) {
                handleSubmit();
            }
        };

        // Update immediately
        updateTimer();

        // Update every second
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [expiryTime, handleSubmit, isSubmitting, showTimeWarning]);

    // Heartbeat and state sync
    useEffect(() => {
        const syncInterval = setInterval(async () => {
            if (loading || isSubmitting) return;
            try {
                await fetch(`${API_BASE}/exams/${examId}/session`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentQuestionIndex,
                        answers,
                        timeRemaining: timeLeft
                    }),
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Error syncing session:', error);
            }
        }, 10000); // Sync every 10 seconds
        return () => clearInterval(syncInterval);
    }, [examId, currentQuestionIndex, answers, timeLeft, loading, isSubmitting]);

    const handleAnswerSelect = (answer) => {
        const newAnswers = { ...answers, [questions[currentQuestionIndex]._id]: answer };
        setAnswers(newAnswers);
        // Immediate sync for answers
        fetch(`${API_BASE}/exams/${examId}/session`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: { [questions[currentQuestionIndex]._id]: answer } }),
            credentials: 'include'
        });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark flex items-center justify-center">
                <AnimatedBackground />
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-cream-100 text-lg">Initializing Secure Session...</p>
                </div>
            </div>
        );
    }

    if (isWaitingRoom) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center p-4">
                <GlobalThemeToggle />
                <AnimatedBackground />

                <div className="max-w-xl w-full bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-300 p-8 shadow-xl relative z-10 text-center">
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
                            <Shield className="w-5 h-5" />
                            Proctoring Active
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                            Please remain on this screen. Your camera is being monitored. Do not switch tabs or leave the browser.
                        </p>
                    </div>

                    <div className="mt-8 text-sm text-gray-500 dark:text-cream-300">
                        Exam: {exam?.title}
                    </div>
                </div>

                {/* Camera Monitor Active During Waiting */}
                {session && (
                    <CameraMonitor
                        sessionId={session._id}
                        examId={examId}
                        isRequired={true}
                        onCameraStatus={(status) => console.log('📹 Waiting Room Camera:', status)}
                    />
                )}
            </div>
        );
    }

    // Add validation before accessing questions
    if (!questions || questions.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark flex items-center justify-center">
                <AnimatedBackground />
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-cream-100 mb-2">No Questions Available</h2>
                    <p className="text-gray-600 dark:text-cream-200 mb-6">
                        This exam has no questions loaded. Please contact the administrator.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
            <GlobalThemeToggle />
            <AnimatedBackground />

            {/* Exam Header */}
            <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-300 p-4 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-cream-100">Examination Session</h1>
                            <p className="text-xs text-gray-500 dark:text-cream-300">
                                {studentInfo ? `${studentInfo.name} (${studentInfo.registerNumber})` : `Question ${currentQuestionIndex + 1} of ${questions.length}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Proctoring Status Indicator */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${isFullscreen
                            ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400'
                            : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 animate-pulse'
                            }`}>
                            <Shield className="w-3 h-3" />
                            <span>{isFullscreen ? 'Proctored' : 'Fullscreen Required'}</span>
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-gray-50 border-gray-200 dark:bg-dark-500 dark:border-dark-300 text-gray-700 dark:text-cream-100'}`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                        </div>

                        {violations > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 rounded-lg text-sm">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Violations: {violations}/3</span>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to submit the exam?')) {
                                    handleSubmit();
                                }
                            }}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-green-600/20"
                        >
                            <Send className="w-4 h-4" />
                            Submit Exam
                        </button>
                    </div>
                </div>
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

            <div className="max-w-4xl mx-auto p-6 mt-8">
                <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-300 p-8 shadow-xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-cream-100 leading-relaxed">
                            {currentQuestion.content}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(option)}
                                className={`w-full p-5 rounded-xl border-2 text-left transition-all flex items-center gap-4 group ${answers[currentQuestion._id] === option
                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500'
                                    : 'border-gray-100 dark:border-dark-300 hover:border-blue-200 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-dark-500/50'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors ${answers[currentQuestion._id] === option
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-dark-300 text-gray-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'
                                    }`}>
                                    {String.fromCharCode(65 + index)}
                                </div>
                                <span className={`font-medium ${answers[currentQuestion._id] === option
                                    ? 'text-blue-900 dark:text-blue-100'
                                    : 'text-gray-700 dark:text-cream-200'
                                    }`}>
                                    {option}
                                </span>
                                {answers[currentQuestion._id] === option && (
                                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-100 dark:border-dark-300">
                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQuestionIndex === 0}
                            className="px-6 py-2 text-gray-600 dark:text-cream-300 hover:text-gray-900 dark:hover:text-cream-100 disabled:opacity-30 flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="flex gap-2">
                            {questions.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentQuestionIndex ? 'w-6 bg-blue-600' : answers[questions[idx]._id] ? 'bg-green-500' : 'bg-gray-200 dark:bg-dark-300'
                                        }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                            disabled={currentQuestionIndex === questions.length - 1}
                            className="px-8 py-2 bg-gray-900 dark:bg-cream-500 text-white dark:text-dark-500 rounded-xl font-semibold hover:opacity-90 disabled:opacity-30"
                        >
                            Next Question
                        </button>
                    </div>
                </div>
            </div>

            {/* Time Expiry Warning Modal - Shows at 10 seconds */}
            {showTimeWarning && timeLeft > 0 && timeLeft <= 10 && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-md mx-4 border-2 border-red-500 shadow-2xl animate-pulse">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                                <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100">Time Running Out!</h2>
                        </div>
                        <p className="text-gray-600 dark:text-cream-200 mb-4">
                            Your exam will automatically submit in <span className="text-red-600 dark:text-red-400 font-bold text-2xl">{timeLeft}</span> seconds!
                        </p>
                        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3">
                            <p className="text-sm text-red-800 dark:text-red-300">
                                Make sure you've answered all questions. Your current answers will be submitted automatically when time expires.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Monitor - FORCE ENABLED FOR ALL EXAMS */}
            {session && (
                <CameraMonitor
                    sessionId={session._id}
                    examId={examId}
                    isRequired={true}
                    onCameraStatus={(status) => console.log('📹 Camera status:', status)}
                />
            )}
            {!session && console.log('⚠️ Camera not rendering - session is null')}
            {session && !exam?.requireCamera && console.log('⚠️ Camera check - requireCamera:', exam?.requireCamera)}
        </div>
    );
}
