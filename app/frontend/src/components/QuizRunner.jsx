import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function QuizRunner() {
    const navigate = useNavigate();
    const location = useLocation();
    const quizConfig = location.state;

    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [quizId, setQuizId] = useState(null);
    const [error, setError] = useState(null);
    const [startTime] = useState(Date.now());

    useEffect(() => {
        if (!quizConfig) {
            setError('No quiz configuration found. Please start from quiz selection.');
            return;
        }

        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            console.log('Fetching questions with config:', quizConfig);

            const response = await fetch(`${API_BASE}/quiz/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    category: quizConfig.category,
                    difficulty: quizConfig.difficulty,
                    limit: quizConfig.limit || 10
                })
            });

            const data = await response.json();
            console.log('Quiz start response:', data);

            if (response.ok && data.success) {
                setQuestions(data.questions);
                setQuizId(data.quizId);
                setError(null);
            } else {
                throw new Error(data.message || 'Failed to fetch questions');
            }
        } catch (err) {
            console.error('Error fetching questions:', err);
            setError(err.message || 'Failed to load quiz questions');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (optionIndex) => {
        setAnswers({
            ...answers,
            [currentIndex]: optionIndex
        });
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const timeSpent = Math.round((Date.now() - startTime) / 1000);

            const answersArray = questions.map((q, index) => ({
                questionId: q._id,
                selectedOption: answers[index] !== undefined ? q.options[answers[index]] : null,
                timeSpent: Math.round(timeSpent / questions.length)
            }));

            const response = await fetch(`${API_BASE}/quiz/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    quizId,
                    answers: answersArray
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                navigate('/quiz-result', {
                    state: {
                        result: data,
                        quizConfig
                    }
                });
            } else {
                throw new Error(data.message || 'Failed to submit quiz');
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            setError(err.message || 'Failed to submit quiz');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-gray-800">Loading Quiz...</h2>
                    <p className="text-gray-600 mt-2">Fetching questions from database</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/quiz-start')}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Back to Quiz Selection
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-yellow-500 text-5xl mb-4">📭</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">No Questions Available</h2>
                    <p className="text-gray-600 mb-6">
                        No questions found for {quizConfig?.category} at {quizConfig?.difficulty} difficulty.
                    </p>
                    <button
                        onClick={() => navigate('/quiz-start')}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Try Different Settings
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{quizConfig?.category} Quiz</h1>
                            <p className="text-sm text-gray-600">Difficulty: {quizConfig?.difficulty}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-indigo-600">
                                {currentIndex + 1} / {questions.length}
                            </div>
                            <div className="text-sm text-gray-600">
                                {answeredCount} answered
                            </div>
                        </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
                            Question {currentIndex + 1}
                        </span>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {currentQuestion.content}
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleAnswerSelect(index)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentIndex] === index
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentIndex] === index
                                            ? 'border-indigo-600 bg-indigo-600'
                                            : 'border-gray-300'
                                        }`}>
                                        {answers[currentIndex] === index && (
                                            <div className="w-3 h-3 bg-white rounded-full"></div>
                                        )}
                                    </div>
                                    <span className="font-medium text-gray-800">{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {currentQuestion.hints && currentQuestion.hints.length > 0 && (
                        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                            <p className="text-sm text-yellow-800">
                                <strong>💡 Hint:</strong> {currentQuestion.hints[0]}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center gap-4">
                    <button
                        onClick={handlePrevious}
                        disabled={currentIndex === 0}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        ← Previous
                    </button>

                    {currentIndex === questions.length - 1 ? (
                        <button
                            onClick={handleSubmit}
                            className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg transition"
                        >
                            Submit Quiz ✓
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            Next →
                        </button>
                    )}
                </div>

                <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-600 mb-3">Question Navigator</h3>
                    <div className="grid grid-cols-10 gap-2">
                        {questions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-10 h-10 rounded-lg font-semibold text-sm transition ${index === currentIndex
                                        ? 'bg-indigo-600 text-white'
                                        : answers[index] !== undefined
                                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
