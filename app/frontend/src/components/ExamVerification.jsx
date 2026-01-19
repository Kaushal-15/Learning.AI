import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Clock, BookOpen, Target,
    Calendar, User, Hash, CheckCircle, AlertCircle, Camera, Shield
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import GlobalThemeToggle from './GlobalThemeToggle';
import BiometricCapture from './BiometricCapture';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function ExamVerification() {
    const location = useLocation();
    const navigate = useNavigate();
    const { examId } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBiometric, setShowBiometric] = useState(false);
    const [biometricStatus, setBiometricStatus] = useState(null);
    const [checkingBiometric, setCheckingBiometric] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);

    const { examData, studentInfo } = location.state || {};

    if (!examData || !studentInfo) {
        navigate('/exam');
        return null;
    }

    // CRITICAL SECURITY ENFORCEMENT - FORCE ENABLE ALL SECURITY FEATURES
    // Override exam settings to ALWAYS require biometric and camera
    const secureExamData = {
        ...examData,
        requireBiometric: true,  // FORCE ENABLE
        requireCamera: true       // FORCE ENABLE
    };

    // Check biometric status on mount
    useEffect(() => {
        if (secureExamData.requireBiometric) {
            checkBiometricStatus();
        }
    }, []);

    const checkBiometricStatus = async () => {
        setCheckingBiometric(true);
        try {
            const response = await fetch(
                `${API_BASE}/biometric/status/${examId}/${studentInfo.registerNumber}`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setBiometricStatus(data.data);

                // If not submitted or rejected, show biometric capture
                if (!data.data.exists || data.data.status === 'rejected') {
                    setShowBiometric(true);
                }
            }
        } catch (err) {
            console.error('Error checking biometric status:', err);
        } finally {
            setCheckingBiometric(false);
        }
    };

    const handleBiometricSuccess = (data) => {
        setShowBiometric(false);
        setBiometricStatus({ status: 'pending', exists: true });
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };


    const handleStartExam = () => {
        // Show warning modal instead of starting directly
        setShowWarningModal(true);
    };

    const handleProceedAfterWarning = async () => {
        if (!acknowledged) {
            setError('Please acknowledge that you understand all requirements');
            return;
        }

        setLoading(true);
        setError('');
        setShowWarningModal(false);

        // CHECK EXAM TIMING FIRST
        const now = new Date();
        const start = new Date(examData.startTime);
        const end = new Date(examData.endTime);

        if (now < start) {
            setError(`Exam starts at ${start.toLocaleString()}. Please wait until the scheduled time.`);
            setLoading(false);
            return;
        }

        if (now > end) {
            setError('Exam has ended. No new sessions allowed.');
            setLoading(false);
            return;
        }

        // CRITICAL: ALWAYS CHECK BIOMETRIC (FORCED FOR ALL EXAMS)
        if (secureExamData.requireBiometric) {
            if (!biometricStatus || !biometricStatus.exists) {
                setError('❌ BIOMETRIC REQUIRED: Please complete biometric verification first');
                setShowBiometric(true);
                setLoading(false);
                return;
            }

            if (biometricStatus.status === 'pending') {
                setError('⏳ BIOMETRIC PENDING: Your biometric verification is pending admin approval. Please contact the invigilator.');
                setLoading(false);
                return;
            }

            if (biometricStatus.status === 'rejected') {
                setError('❌ BIOMETRIC REJECTED: Your biometric verification was rejected. Please submit a new photo.');
                setShowBiometric(true);
                setLoading(false);
                return;
            }
        }

        try {
            // Start session with student info
            const sessionResponse = await fetch(`${API_BASE}/exams/${examId}/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: studentInfo.name,
                    registerNumber: studentInfo.registerNumber
                }),
                credentials: 'include'
            });

            const sessionData = await sessionResponse.json();

            if (!sessionData.success) {
                setError(sessionData.message || 'Failed to initialize exam session');
                setLoading(false);
                return;
            }

            // Navigate to appropriate exam type
            if (examData.isAdaptive) {
                navigate(`/exam/${examId}/adaptive`, {
                    state: {
                        studentInfo,
                        exam: sessionData.data.exam,
                        session: sessionData.data.session
                    }
                });
            } else {
                navigate(`/exam/${examId}`, {
                    state: {
                        studentInfo,
                        sessionData: sessionData.data
                    }
                });
            }
        } catch (err) {
            console.error('Error starting exam:', err);
            setError('Connection error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center p-4">
            <GlobalThemeToggle />
            <AnimatedBackground />

            <div className="max-w-2xl w-full bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-300 p-8 shadow-xl relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100 mb-2">
                        Verify Exam Details
                    </h1>
                    <p className="text-gray-600 dark:text-cream-200">
                        Please review the information below before starting
                    </p>
                </div>

                {/* Exam Details */}
                <div className="space-y-4 mb-6">
                    <div className="verification-card">
                        <h3 className="verification-card-title">Exam Information</h3>
                        <div className="verification-grid">
                            <div className="verification-item">
                                <BookOpen className="w-5 h-5 text-blue-500" />
                                <div>
                                    <span className="verification-label">Title</span>
                                    <span className="verification-value">{examData.title}</span>
                                </div>
                            </div>
                            {examData.description && (
                                <div className="verification-item full-width">
                                    <div>
                                        <span className="verification-label">Description</span>
                                        <span className="verification-value">{examData.description}</span>
                                    </div>
                                </div>
                            )}
                            <div className="verification-item">
                                <Clock className="w-5 h-5 text-orange-500" />
                                <div>
                                    <span className="verification-label">Duration</span>
                                    <span className="verification-value">{examData.duration} minutes</span>
                                </div>
                            </div>
                            <div className="verification-item">
                                <Target className="w-5 h-5 text-purple-500" />
                                <div>
                                    <span className="verification-label">Total Questions</span>
                                    <span className="verification-value">{examData.totalQuestions}</span>
                                </div>
                            </div>
                            <div className="verification-item">
                                <Calendar className="w-5 h-5 text-green-500" />
                                <div>
                                    <span className="verification-label">Exam Start</span>
                                    <span className="verification-value">{formatDate(examData.startTime)}</span>
                                </div>
                            </div>
                            <div className="verification-item">
                                <Clock className="w-5 h-5 text-blue-500" />
                                <div>
                                    <span className="verification-label">Verification Starts</span>
                                    <span className="verification-value">
                                        {formatDate(new Date(new Date(examData.startTime).getTime() - (examData.verificationDuration || 15) * 60000))}
                                    </span>
                                </div>
                            </div>
                            <div className="verification-item">
                                <Calendar className="w-5 h-5 text-red-500" />
                                <div>
                                    <span className="verification-label">End Time</span>
                                    <span className="verification-value">{formatDate(examData.endTime)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Biometric Verification Status */}
                    {examData.requireBiometric && (
                        <div className="verification-card">
                            <h3 className="verification-card-title">Biometric Verification</h3>
                            {checkingBiometric ? (
                                <div className="flex items-center justify-center py-4">
                                    <div className="spinner"></div>
                                    <span className="ml-2">Checking status...</span>
                                </div>
                            ) : biometricStatus?.status === 'approved' ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Biometric verification approved</span>
                                </div>
                            ) : biometricStatus?.status === 'pending' ? (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                                    <AlertCircle className="w-5 h-5" />
                                    <span>Awaiting admin approval</span>
                                    <button
                                        onClick={checkBiometricStatus}
                                        className="ml-auto px-3 py-1 text-sm bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-lg transition-colors"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowBiometric(true)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                                >
                                    <Camera className="w-5 h-5" />
                                    {biometricStatus?.status === 'rejected' ? 'Resubmit Photo' : 'Submit Photo'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Student Details */}
                    <div className="verification-card">
                        <h3 className="verification-card-title">Your Information</h3>
                        <div className="verification-grid">
                            <div className="verification-item">
                                <User className="w-5 h-5 text-blue-500" />
                                <div>
                                    <span className="verification-label">Name</span>
                                    <span className="verification-value">{studentInfo.name}</span>
                                </div>
                            </div>
                            <div className="verification-item">
                                <Hash className="w-5 h-5 text-purple-500" />
                                <div>
                                    <span className="verification-label">Register Number</span>
                                    <span className="verification-value">{studentInfo.registerNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Important Notice */}
                <div className="notice-card">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                        <h4 className="notice-title">Important Notice</h4>
                        <ul className="notice-list">
                            <li>The exam will start immediately after you click "Start Exam"</li>
                            <li>You cannot pause or restart once you begin</li>
                            <li>Ensure you have a stable internet connection</li>
                            <li>Do not close the browser or switch tabs during the exam</li>
                        </ul>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm mt-4">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => navigate('/exam')}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-dark-500 dark:hover:bg-dark-400 text-gray-900 dark:text-cream-100 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <button
                        onClick={handleStartExam}
                        disabled={loading}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Start Exam
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Pre-Exam Warning Modal */}
            {showWarningModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                    <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl border-2 border-yellow-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-cream-100">Important: Read Before Starting</h2>
                        </div>

                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
                                <h3 className="font-bold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Time Restrictions
                                </h3>
                                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                                    <li>• <strong>Duration:</strong> {secureExamData.duration} minutes</li>
                                    <li>• <strong>Auto-Submit:</strong> Exam will automatically submit when time expires</li>
                                    <li>• <strong>No Extensions:</strong> Time cannot be paused or extended</li>
                                    <li>• <strong>Late Join Blocked:</strong> You cannot join after the exam end time</li>
                                </ul>
                            </div>

                            {secureExamData.requireBiometric && (
                                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
                                    <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <Camera className="w-5 h-5" />
                                        Biometric Verification Required
                                    </h3>
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Your biometric photo must be approved by an admin before you can start the exam
                                    </p>
                                </div>
                            )}

                            <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg p-4">
                                <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Proctoring & Monitoring
                                </h3>
                                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                                    <li>• <strong>Fullscreen Required:</strong> Exam must be taken in fullscreen mode</li>
                                    <li>• <strong>No Tab Switching:</strong> Switching tabs will be logged as a violation</li>
                                    <li>• <strong>Camera Monitoring:</strong> Your camera will be active throughout the exam</li>
                                    <li>• <strong>Violation Limit:</strong> 3 violations will result in automatic submission</li>
                                </ul>
                            </div>

                            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-4">
                                <h3 className="font-bold text-orange-900 dark:text-orange-300 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Exam Rules
                                </h3>
                                <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                                    <li>• No external resources or materials allowed</li>
                                    <li>• No communication with others during the exam</li>
                                    <li>• Ensure stable internet connection</li>
                                    <li>• Do not refresh or close the browser</li>
                                    <li>• Once started, the exam cannot be paused</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-gray-100 dark:bg-dark-500 rounded-lg p-4 mb-6">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(e) => setAcknowledged(e.target.checked)}
                                    className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-900 dark:text-cream-100 font-medium">
                                    I understand and acknowledge all the requirements and rules stated above. I am ready to start the exam under these conditions.
                                </span>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowWarningModal(false);
                                    setAcknowledged(false);
                                }}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-dark-500 dark:hover:bg-dark-400 text-gray-900 dark:text-cream-100 rounded-xl font-semibold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleProceedAfterWarning}
                                disabled={!acknowledged || loading}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Starting...' : 'I Understand, Start Exam'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Biometric Capture Modal */}
            {showBiometric && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
                    <BiometricCapture
                        examId={examId}
                        studentName={studentInfo.name}
                        registerNumber={studentInfo.registerNumber}
                        onSuccess={handleBiometricSuccess}
                        onCancel={() => setShowBiometric(false)}
                    />
                </div>
            )}
        </div>
    );
}
