import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Clock, Send, Target, TrendingUp } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import AdaptiveWaitScreen from "./AdaptiveWaitScreen";
import CameraMonitor from "./CameraMonitor";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

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
    const [individualStats, setIndividualStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [examComplete, setExamComplete] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [cameraRequired, setCameraRequired] = useState(false);

    // Global exam timer for total exam duration
    const [totalExamTime, setTotalExamTime] = useState(0);
    const [examExpiryTime, setExamExpiryTime] = useState(null);
    const [showTimeWarning, setShowTimeWarning] = useState(false);

    // Waiting Room State
    const [isWaitingRoom, setIsWaitingRoom] = useState(false);
    const [timeToStart, setTimeToStart] = useState(0);

    // Initialize session if needed
    const initializeSession = useCallback(async () => {
        try {
            // Check if we have session data from navigation state
            if (location.state?.exam && location.state?.session) {
                setExam(location.state.exam);
                setSessionId(location.state.session._id);
                setCameraRequired(location.state.exam.requireCamera || false);
                setTotalQuestions(location.state.exam.totalQuestions);

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

            // If no state, try to start a new session
            const sessionResponse = await fetch(`${API_BASE}/exams/${examId}/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    studentName: "Student",
                    registerNumber: ""
                })
            });

            const sessionData = await sessionResponse.json();

            if (!sessionData.success) {
                throw new Error(sessionData.message);
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
            setCameraRequired(exam.requireCamera || false);
            setTotalQuestions(exam.totalQuestions);

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
                setIndividualStats(data.individualStats);
            } else {
                // Wait is over, fetch next question
                initializeSession();
            }
        } catch (error) {
            console.error('Error checking wait status:', error);
        }
    }, [examId, exam, initializeSession]);

    // Fetch next question
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
                    setTimeout(fetchNextQuestion, 1000);
                } else {
                    checkWaitStatus();
                }
                return;
            }

            if (data.isComplete) {
                // Exam finished
                setExamComplete(true);
                setTimeout(() => {
                    navigate(`/exam/${examId}/result`);
                }, 2000);
                return;
            }

            // Set new question
            if (exam?.isSynchronized) {
                if (data.data.hasAnswered) {
                    setIsWaiting(true);
                    setTimeout(fetchNextQuestion, 1000);
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
    }, [examId, navigate, exam, checkWaitStatus]);

    // Submit answer
    const handleSubmitAnswer = async () => {
        if (!selectedAnswer || isSubmitting) return;

        setIsSubmitting(true);
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
                    answer: selectedAnswer
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
                // Start wait period (Adaptive)
                setIsWaiting(true);
                setWaitTime(data.waitTime);
                setIndividualStats(data.individualStats);
            }

        } catch (error) {
            console.error('Error submitting answer:', error);
            alert('Failed to submit answer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Timer countdown
    useEffect(() => {
        if (loading || isWaiting || examComplete) return;

        // Ensure timeLeft is valid
        if (timeLeft === null || timeLeft === undefined) {
            setTimeLeft(timePerQuestion || 30);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up - auto submit
                    clearInterval(timer);
                    handleSubmitAnswer();
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
                setTimeout(() => {
                    navigate(`/exam/${examId}/result`);
                }, 1000);
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
                collectiveStats={individualStats}
                onWaitComplete={fetchNextQuestion}
            />
        );
    }

    return (
        <div className={`exam-session-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
            {/* Header */}
            <div className="exam-session-header">
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
            </div>

            {/* Adaptive Question Container */}
            <div className="adaptive-question-container">
                {/* Question Header */}
                <div className="adaptive-question-header">
                    <div className="question-progress">
                        <Target size={20} />
                        <span>Question {questionNumber} of {totalQuestions}</span>
                    </div>
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
                        {currentQuestion ? currentQuestion.content : "Loading question..."}
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

                {/* Submit Button */}
                <button
                    className="adaptive-submit-btn"
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer || isSubmitting || timeLeft > 3}
                >
                    <Send size={20} />
                    {isSubmitting ? 'Submitting...' : timeLeft > 3 ? `Wait ${timeLeft}s` : 'Submit Answer'}
                </button>
            </div>

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

            {/* Camera Monitor */}
            {sessionId && cameraRequired && (
                <CameraMonitor
                    sessionId={sessionId}
                    examId={examId}
                    isRequired={cameraRequired}
                    onCameraStatus={(status) => console.log('Camera status:', status)}
                />
            )}
        </div>
    );
}
