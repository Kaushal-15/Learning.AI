import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Clock, AlertCircle, User, Hash } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import GlobalThemeToggle from './GlobalThemeToggle';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const API_BASE = `${BASE_URL}/api`;

export default function ExamDashboard() {
    const [step, setStep] = useState(1); // 1: Access Code, 2: Student Info
    const [examCode, setExamCode] = useState('');
    const [studentInfo, setStudentInfo] = useState({ name: '', registerNumber: '' });
    const [examData, setExamData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleValidateCode = async (e) => {
        e.preventDefault();
        if (!examCode.trim()) return;

        setLoading(true);
        setError('');

        try {
            const validateResponse = await fetch(`${API_BASE}/exams/validate-entry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examCode }),
                credentials: 'include'
            });

            const validateData = await validateResponse.json();

            if (!validateData.success) {
                setError(validateData.message || 'Invalid exam code');
                setLoading(false);
                return;
            }

            setExamData(validateData.data);
            setStep(2); // Move to student info step
        } catch (err) {
            console.error('Error validating exam code:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitStudentInfo = async (e) => {
        e.preventDefault();
        if (!studentInfo.name.trim() || !studentInfo.registerNumber.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Validate student if verification is required
            if (examData.requireStudentVerification) {
                const validateResponse = await fetch(`${API_BASE}/exams/validate-entry`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        examCode,
                        registerNumber: studentInfo.registerNumber
                    }),
                    credentials: 'include'
                });

                const validateData = await validateResponse.json();

                if (!validateData.success) {
                    setError(validateData.message || 'Student verification failed');
                    setLoading(false);
                    return;
                }
            }

            // Navigate to verification page with student info
            navigate(`/exam/${examData._id}/verify`, {
                state: {
                    examData,
                    studentInfo
                }
            });
        } catch (err) {
            console.error('Error submitting student info:', err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center p-4">
            <GlobalThemeToggle />
            <AnimatedBackground />

            <div className="max-w-md w-full bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-dark-300 p-8 shadow-xl relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100 mb-2">
                        {step === 1 ? 'Secure Exam Portal' : 'Student Information'}
                    </h1>
                    <p className="text-gray-600 dark:text-cream-200">
                        {step === 1
                            ? 'Enter your exam code to begin'
                            : 'Please provide your details to continue'}
                    </p>
                </div>

                {/* Step 1: Access Code */}
                {step === 1 && (
                    <form onSubmit={handleValidateCode} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                Exam Code
                            </label>
                            <input
                                type="text"
                                value={examCode}
                                onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                                placeholder="EXAM-XXXX"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-500 text-gray-900 dark:text-cream-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase tracking-widest text-center font-mono text-lg"
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !examCode}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Continue
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                {/* Step 2: Student Information */}
                {step === 2 && (
                    <form onSubmit={handleSubmitStudentInfo} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                <User className="inline w-4 h-4 mr-1" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={studentInfo.name}
                                onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                                placeholder="Enter your full name"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-500 text-gray-900 dark:text-cream-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                                <Hash className="inline w-4 h-4 mr-1" />
                                Register Number
                            </label>
                            <input
                                type="text"
                                value={studentInfo.registerNumber}
                                onChange={(e) => setStudentInfo({ ...studentInfo, registerNumber: e.target.value })}
                                placeholder="Enter your register number"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-500 text-gray-900 dark:text-cream-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setError('');
                                }}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-dark-500 dark:hover:bg-dark-400 text-gray-900 dark:text-cream-100 rounded-xl font-semibold transition-all"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-dark-300">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col items-center text-center">
                            <Clock className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500 dark:text-cream-300">Timed Session</span>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <ShieldCheck className="w-5 h-5 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500 dark:text-cream-300">Proctored</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
