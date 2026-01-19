import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, User, Hash, BookOpen, Home, Clock, Calendar } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import GlobalThemeToggle from './GlobalThemeToggle';

export default function ExamResult() {
    const location = useLocation();
    const navigate = useNavigate();

    const { examTitle, studentInfo, examStartTime, examEndTime, submittedAt } = location.state || {};

    if (!examTitle || !studentInfo) {
        navigate('/exam');
        return null;
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center p-4">
            <GlobalThemeToggle />
            <AnimatedBackground />

            <div className="max-w-2xl w-full bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-300 p-8 shadow-xl relative z-10">
                {/* Success Icon */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-cream-100 mb-2">
                        Test Completed Successfully!
                    </h1>
                    <p className="text-gray-600 dark:text-cream-200">
                        Your responses have been submitted
                    </p>
                </div>

                {/* Completion Certificate Style */}
                <div className="result-certificate">
                    <div className="certificate-border">
                        <div className="certificate-content">
                            <div className="certificate-header">
                                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                <h2 className="certificate-title">{examTitle}</h2>
                            </div>

                            <div className="certificate-divider"></div>

                            <div className="certificate-details">
                                {/* Student Name */}
                                <div className="detail-row">
                                    <div className="detail-label">
                                        <User className="w-4 h-4" />
                                        <span>Candidate Name</span>
                                    </div>
                                    <div className="detail-value">{studentInfo.name}</div>
                                </div>

                                {/* Register Number */}
                                <div className="detail-row">
                                    <div className="detail-label">
                                        <Hash className="w-4 h-4" />
                                        <span>Register Number</span>
                                    </div>
                                    <div className="detail-value">{studentInfo.registerNumber}</div>
                                </div>

                                {/* Exam Start Time */}
                                {examStartTime && (
                                    <div className="detail-row">
                                        <div className="detail-label">
                                            <Calendar className="w-4 h-4" />
                                            <span>Exam Start Time</span>
                                        </div>
                                        <div className="detail-value">{formatDateTime(examStartTime)}</div>
                                    </div>
                                )}

                                {/* Exam End Time */}
                                {examEndTime && (
                                    <div className="detail-row">
                                        <div className="detail-label">
                                            <Calendar className="w-4 h-4" />
                                            <span>Exam End Time</span>
                                        </div>
                                        <div className="detail-value">{formatDateTime(examEndTime)}</div>
                                    </div>
                                )}

                                {/* Submission Time */}
                                <div className="detail-row">
                                    <div className="detail-label">
                                        <Clock className="w-4 h-4" />
                                        <span>Submission Time</span>
                                    </div>
                                    <div className="detail-value">
                                        {formatDateTime(submittedAt || new Date().toISOString())}
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="detail-row">
                                    <div className="detail-label">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Status</span>
                                    </div>
                                    <div className="detail-value">
                                        <span className="status-badge completed">Completed</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Information Notice */}
                <div className="result-notice">
                    <p>Your exam has been successfully submitted and is being processed.</p>
                    <p>Results will be shared by the exam administrator.</p>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all group mt-6"
                >
                    <Home className="w-5 h-5" />
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
}
