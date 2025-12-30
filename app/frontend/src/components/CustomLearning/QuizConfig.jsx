import React, { useState } from 'react';
import { Settings, Zap, BookOpen, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const QuizConfig = ({ documentId }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState('static'); // 'static' or 'dynamic'
    const [difficulty, setDifficulty] = useState('medium');
    const [questionCount, setQuestionCount] = useState(5);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);

        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch('http://localhost:3000/api/custom-learning/generate-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    documentId,
                    mode,
                    difficulty: mode === 'static' ? difficulty : undefined,
                    questionCount
                }),
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                // Navigate to quiz page
                navigate(`/quiz/${data.quizId}`);
            } else {
                setError(data.message || 'Failed to generate quiz');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to generate quiz. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 shadow-xl mt-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Configure Quiz
            </h3>

            <div className="space-y-6">
                {/* Mode Selection */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Quiz Mode</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setMode('static')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'static'
                                    ? 'bg-blue-500/20 border-blue-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <BookOpen className="w-6 h-6" />
                            <span className="text-sm font-medium">Static</span>
                        </button>
                        <button
                            onClick={() => setMode('dynamic')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'dynamic'
                                    ? 'bg-purple-500/20 border-purple-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <Zap className="w-6 h-6" />
                            <span className="text-sm font-medium">Dynamic AI</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {mode === 'static'
                            ? 'Standard quiz with fixed difficulty.'
                            : 'AI adapts difficulty based on content analysis.'}
                    </p>
                </div>

                {/* Difficulty (Static only) */}
                {mode === 'static' && (
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">Difficulty</label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="basic">Basic</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                )}

                {/* Question Count */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Number of Questions: {questionCount}
                    </label>
                    <input
                        type="range"
                        min="3"
                        max="15"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>3</span>
                        <span>15</span>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full py-3 px-4 rounded-lg font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                >
                    {generating ? (
                        <>
                            <Loader className="w-5 h-5 animate-spin" />
                            Generating Quiz...
                        </>
                    ) : (
                        'Start Quiz'
                    )}
                </button>
            </div>
        </div>
    );
};

export default QuizConfig;
