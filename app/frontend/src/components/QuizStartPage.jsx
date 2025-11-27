import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import QuizSelector from './QuizSelector';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function QuizStartPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const data = await api.getQuizStats();
            setStats(data.stats);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
                        Quiz Platform 🎯
                    </h1>
                    <p className="text-xl text-gray-600">
                        Test your knowledge and track your progress
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Stats Cards */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-blue-500">
                        <div className="text-blue-600 text-4xl mb-2">📊</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {stats?.totalTests || 0}
                        </div>
                        <div className="text-gray-600 text-sm">Quizzes Completed</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
                        <div className="text-green-600 text-4xl mb-2">✅</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {stats?.totalCorrect || 0}
                        </div>
                        <div className="text-gray-600 text-sm">Correct Answers</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-purple-500">
                        <div className="text-purple-600 text-4xl mb-2">🎯</div>
                        <div className="text-3xl font-bold text-gray-800">
                            {stats?.averageScore || 0}%
                        </div>
                        <div className="text-gray-600 text-sm">Average Score</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Quiz Selector */}
                    <div>
                        <QuizSelector />
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Quick Links</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/quiz-history')}
                                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                                            <span className="text-2xl">📜</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-800">Quiz History</div>
                                            <div className="text-sm text-gray-600">Review past attempts</div>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-gray-600 transition">→</span>
                                </button>

                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                                            <span className="text-2xl">🏠</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-800">Dashboard</div>
                                            <div className="text-sm text-gray-600">View overall progress</div>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-gray-600 transition">→</span>
                                </button>

                                <button
                                    onClick={() => navigate('/test')}
                                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                                            <span className="text-2xl">🎓</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-gray-800">Practice Tests</div>
                                            <div className="text-sm text-gray-600">Comprehensive assessments</div>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 group-hover:text-gray-600 transition">→</span>
                                </button>
                            </div>
                        </div>

                        {/* Recent Performance (if stats available) */}
                        {stats && stats.categoryStats && Object.keys(stats.categoryStats).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xl p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Performance by Topic</h3>
                                <div className="space-y-3">
                                    {Object.entries(stats.categoryStats).slice(0, 3).map(([category, data]) => (
                                        <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="capitalize font-medium text-gray-700">{category}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm text-gray-600">{data.count} tests</div>
                                                <div className={`font-bold ${data.avgScore >= 75 ? 'text-green-600' : data.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {data.avgScore}%
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
