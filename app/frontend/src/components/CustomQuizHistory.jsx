import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Calendar, Clock, Award, TrendingUp, BarChart3 } from 'lucide-react';
import Sidebar from './Sidebar';
import '../styles/DevvoraStyles.css';

const CustomQuizHistory = () => {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);

    useEffect(() => {
        fetchQuizHistory();
    }, []);

    const fetchQuizHistory = async () => {
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch('http://localhost:3000/api/quiz?source=custom&limit=100', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            const data = await response.json();
            const quizList = data.quizzes || data.data || [];
            setQuizzes(quizList);
        } catch (error) {
            console.error('Error fetching quiz history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 dashboard-dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dashboard-dark:text-yellow-400';
        return 'text-red-600 dashboard-dark:text-red-400';
    };

    const getScoreBgColor = (score) => {
        if (score >= 80) return 'bg-green-100 dashboard-dark:bg-green-900/30';
        if (score >= 60) return 'bg-yellow-100 dashboard-dark:bg-yellow-900/30';
        return 'bg-red-100 dashboard-dark:bg-red-900/30';
    };

    // Group quizzes by document
    const groupedQuizzes = quizzes.reduce((acc, quiz) => {
        const docName = quiz.title?.replace('Custom Quiz: ', '') || 'Unknown Document';
        if (!acc[docName]) {
            acc[docName] = [];
        }
        acc[docName].push(quiz);
        return acc;
    }, {});

    // Calculate stats
    const totalQuizzes = quizzes.length;
    const avgScore = quizzes.length > 0
        ? Math.round(quizzes.reduce((acc, q) => acc + (q.accuracy || 0), 0) / quizzes.length)
        : 0;
    const completedQuizzes = quizzes.filter(q => q.status === 'completed').length;

    if (loading) {
        return (
            <div className="dashboard-container">
                <Sidebar />
                <main className="dashboard-main flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 dashboard-dark:text-[#b8a67d]">Loading quiz history...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/custom-learning')}
                        className="flex items-center gap-2 text-gray-600 dashboard-dark:text-[#b8a67d] hover:text-purple-600 dashboard-dark:hover:text-purple-400 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Custom Learning
                    </button>

                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                        Custom Quiz History
                    </h1>
                    <p className="text-gray-600 dashboard-dark:text-[#b8a67d]">
                        View all your custom quiz results and track your progress
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="stat-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d] mb-1">Total Quizzes</p>
                                <p className="text-3xl font-bold text-gray-900 dashboard-dark:text-[#f5e6d3]">{totalQuizzes}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d] mb-1">Average Score</p>
                                <p className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d] mb-1">Completed</p>
                                <p className="text-3xl font-bold text-gray-900 dashboard-dark:text-[#f5e6d3]">{completedQuizzes}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quiz History by Document */}
                {Object.keys(groupedQuizzes).length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dashboard-dark:from-blue-900/30 dashboard-dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-10 h-10 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dashboard-dark:text-[#f5e6d3] mb-2">No quiz history yet</h3>
                        <p className="text-gray-500 dashboard-dark:text-[#b8a67d] mb-6">
                            Upload a document and take a quiz to see your results here
                        </p>
                        <button
                            onClick={() => navigate('/custom-learning')}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                        >
                            Go to Custom Learning
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedQuizzes).map(([docName, docQuizzes]) => {
                            const docAvgScore = Math.round(
                                docQuizzes.reduce((acc, q) => acc + (q.accuracy || 0), 0) / docQuizzes.length
                            );

                            return (
                                <div key={docName} className="dashboard-section">
                                    <div className="section-header-dashboard mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="section-title-dashboard">{docName}</h3>
                                                <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d]">
                                                    {docQuizzes.length} quiz{docQuizzes.length !== 1 ? 'zes' : ''} • Avg: {docAvgScore}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {docQuizzes.map((quiz) => (
                                            <div
                                                key={quiz._id}
                                                className="stat-card hover:scale-105 transition-all duration-300 cursor-pointer"
                                                onClick={() => setSelectedQuiz(quiz)}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getScoreBgColor(quiz.accuracy || 0)}`}>
                                                            <span className={getScoreColor(quiz.accuracy || 0)}>
                                                                {quiz.accuracy || 0}% Score
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dashboard-dark:text-[#b8a67d] mb-1">
                                                            {quiz.difficulty || 'medium'} • {quiz.isAdaptive ? 'Dynamic' : 'Static'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2 text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{new Date(quiz.completedAt || quiz.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{quiz.totalQuestions || 0} questions</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <Award className="w-4 h-4" />
                                                        <span>{quiz.correctAnswers || 0} / {quiz.totalQuestions || 0} correct</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/quiz/${quiz._id}`);
                                                    }}
                                                    className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold transition-all"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomQuizHistory;
