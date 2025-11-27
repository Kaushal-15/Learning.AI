import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Clock,
  CheckCircle,
  X,
  Flag,
  SkipForward,
  Trophy,
  Target,
  Brain,
  Award
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ThemeToggle from "./ThemeToggle";


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";



export default function Quiz() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [adaptiveNotification, setAdaptiveNotification] = useState(null);
  const [isLoadingNextQuestion, setIsLoadingNextQuestion] = useState(false);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`${API_BASE}/quiz/${id}`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
          setQuiz(data.data);
          setCurrentQuestionIndex(data.data.currentQuestionIndex || 0);

          // Calculate time left
          const elapsed = Math.floor((Date.now() - new Date(data.data.startedAt)) / 1000);
          const totalTime = data.data.timeLimit * 60;
          setTimeLeft(Math.max(0, totalTime - elapsed));

          if (data.data.status === 'completed') {
            setShowResults(true);
          }
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchQuiz();
    }
  }, [id, navigate]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleCompleteQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, showResults]);

  // Reset question timer when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
    setSelectedAnswer('');
  }, [currentQuestionIndex]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (answer) => {
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      const response = await fetch(`${API_BASE}/quiz/${id}/answer`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answer: selectedAnswer,
          timeSpent
        })
      });

      const data = await response.json();
      if (data.success) {
        setQuiz(data.data);

        // Handle adaptive difficulty notification
        if (data.adaptiveChange && data.adaptiveChange.changed) {
          const isCorrect = selectedAnswer === quiz.questions[currentQuestionIndex].correctAnswer;
          setAdaptiveNotification({
            type: data.adaptiveChange.to > data.adaptiveChange.from ? 'increase' : 'decrease',
            from: data.adaptiveChange.from,
            to: data.adaptiveChange.to,
            reason: data.adaptiveChange.reason,
            isCorrect,
            timeSpent
          });

          // Auto-hide notification after 4 seconds
          setTimeout(() => setAdaptiveNotification(null), 4000);
        }

        // Handle next question for adaptive quizzes
        if (data.data.isAdaptive && currentQuestionIndex < data.data.questions.length - 1) {
          // Check if difficulty changed and we need to replace the next question
          if (data.adaptiveChange && data.adaptiveChange.changed) {
            await handleReplaceNextQuestion(data.data, currentQuestionIndex + 1);
          } else {
            setCurrentQuestionIndex(prev => prev + 1);
          }
        } else if (currentQuestionIndex < data.data.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          // This is the last question, complete the quiz
          await handleCompleteQuiz();
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleReplaceNextQuestion = async (updatedQuiz, nextQuestionIndex) => {
    setIsLoadingNextQuestion(true);

    try {
      const response = await fetch(`${API_BASE}/quiz/${id}/replace-question`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          questionIndex: nextQuestionIndex
        })
      });

      const data = await response.json();

      if (data.success && data.replaced) {
        // Use the updated quiz with the replaced question
        setQuiz(data.data);
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // No replacement available, move to next regular question
        setCurrentQuestionIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error replacing next question:', error);
      // Fallback to regular next question
      setCurrentQuestionIndex(prev => prev + 1);
    } finally {
      setIsLoadingNextQuestion(false);
    }
  };

  const handleSkipQuestion = async () => {
    try {
      const response = await fetch(`${API_BASE}/quiz/${id}/skip`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          questionIndex: currentQuestionIndex
        })
      });

      const data = await response.json();
      if (data.success) {
        setQuiz(data.data);

        if (currentQuestionIndex < quiz.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          handleCompleteQuiz();
        }
      }
    } catch (error) {
      console.error('Error skipping question:', error);
    }
  };

  const handleCompleteQuiz = async () => {
    try {
      const response = await fetch(`${API_BASE}/quiz/${id}/complete`, {
        method: 'PUT',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        // Ensure final stats are calculated
        const completedQuiz = data.data;
        completedQuiz.updateStats?.();

        setQuiz(completedQuiz);
        setShowResults(true);
        setTimeLeft(0); // Stop the timer
      }
    } catch (error) {
      console.error('Error completing quiz:', error);
      // Force show results even if completion fails
      setShowResults(true);
      setTimeLeft(0);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const getQuestionStatusColor = (question, index) => {
    if (index === currentQuestionIndex && !showResults) {
      return 'bg-blue-500 text-white border-blue-500';
    }

    switch (question.status) {
      case 'answered':
        return question.isCorrect
          ? 'bg-green-500 text-white border-green-500'
          : 'bg-red-500 text-white border-red-500';
      case 'skipped':
        return 'bg-yellow-500 text-white border-yellow-500';
      case 'flagged':
        return 'bg-orange-500 text-white border-orange-500';
      default:
        return 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300';
    }
  };

  const getQuestionStatusIcon = (question) => {
    switch (question.status) {
      case 'answered':
        return question.isCorrect ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />;
      case 'skipped':
        return <SkipForward className="w-3 h-3" />;
      case 'flagged':
        return <Flag className="w-3 h-3" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-cream-300 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-cream-100">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <p className="text-gray-600 dark:text-cream-100">Quiz not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 dark:bg-cream-500 text-white dark:text-dark-500 rounded-lg hover:bg-blue-700 dark:hover:bg-cream-400"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
        <AnimatedBackground />
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        {/* Professional Results Header */}
        <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-300 p-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-2 text-gray-400 dark:text-cream-200 hover:text-gray-600 dark:hover:text-cream-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300/50"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100">{quiz.title}</h1>
                  <p className="text-gray-600 dark:text-cream-200">Quiz Results</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center bg-amber-50 dark:bg-amber-400/20 border border-amber-200 dark:border-amber-400/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{quiz.accuracy}%</div>
                  <div className="text-sm text-gray-600 dark:text-cream-200">Accuracy</div>
                </div>
                <div className="text-center bg-blue-50 dark:bg-blue-400/20 border border-blue-200 dark:border-blue-400/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{quiz.points}</div>
                  <div className="text-sm text-gray-600 dark:text-cream-200">Points</div>
                </div>
                <div className="text-center bg-purple-50 dark:bg-purple-400/20 border border-purple-200 dark:border-purple-400/30 rounded-lg p-4">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{quiz.correctAnswers}/{quiz.totalQuestions}</div>
                  <div className="text-sm text-gray-600 dark:text-cream-200">Answered</div>
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 mb-6">
              {quiz.questions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all duration-200 flex items-center justify-center ${getQuestionStatusColor(question, index)}`}
                >
                  {getQuestionStatusIcon(question) || (index + 1)}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-300/50 rounded-lg p-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700 dark:text-cream-200">Correct: {quiz.questions.filter(q => q.isCorrect).length}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-300/50 rounded-lg p-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700 dark:text-cream-200">Incorrect: {quiz.questions.filter(q => q.status === 'answered' && !q.isCorrect).length}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-300/50 rounded-lg p-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gray-700 dark:text-cream-200">Skipped: {quiz.questions.filter(q => q.status === 'skipped').length}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-300/50 rounded-lg p-3">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-gray-700 dark:text-cream-200">Unanswered: {quiz.questions.filter(q => q.status === 'unanswered').length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Review */}
        <div className="max-w-6xl mx-auto p-6 relative z-10">
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-dark-300 p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Question {currentQuestionIndex + 1}</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${quiz.questions[currentQuestionIndex].difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    quiz.questions[currentQuestionIndex].difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      quiz.questions[currentQuestionIndex].difficulty === 'hard' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                    {quiz.questions[currentQuestionIndex].difficulty}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {quiz.questions[currentQuestionIndex].topic}
                  </span>
                </div>
              </div>
              <p className="text-gray-900 dark:text-cream-100 mb-4">{quiz.questions[currentQuestionIndex].question}</p>
            </div>

            <div className="space-y-3 mb-6">
              {quiz.questions[currentQuestionIndex].options.map((option, index) => {
                const isCorrect = option === quiz.questions[currentQuestionIndex].correctAnswer;
                const isUserAnswer = option === quiz.questions[currentQuestionIndex].userAnswer;

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${isCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : isUserAnswer && !isCorrect
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-600 bg-gray-700/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isCorrect
                        ? 'bg-green-500 text-white'
                        : isUserAnswer && !isCorrect
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300'
                        }`}>
                        {isCorrect ? <CheckCircle className="w-4 h-4" /> :
                          isUserAnswer && !isCorrect ? <X className="w-4 h-4" /> :
                            String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-cream-100">{option}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {quiz.questions[currentQuestionIndex].explanation && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-blue-400 mb-2">Explanation:</h4>
                <p className="text-blue-300 text-sm">{quiz.questions[currentQuestionIndex].explanation}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-cream-200 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className="px-4 py-2 bg-amber-500 dark:bg-amber-600 text-white rounded-lg hover:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
      <AnimatedBackground />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      {/* Professional Quiz Header */}
      <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-300 p-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-400 dark:text-cream-200 hover:text-gray-600 dark:hover:text-cream-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-dark-300/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-cream-100">{quiz.title}</h1>
                  {quiz.isAdaptive && (
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full flex items-center gap-1 border border-purple-500/30">
                      <Brain className="w-3 h-3" />
                      Adaptive
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-gray-600 dark:text-cream-200">Question {currentQuestionIndex + 1} of {quiz.totalQuestions}</p>
                  {quiz.isAdaptive && (
                    <div className="flex items-center gap-4">
                      <p className="text-sm text-purple-400">
                        Current Level: <span className="font-semibold capitalize text-purple-300">{quiz.adaptiveSettings?.currentDifficulty || 'Easy'}</span>
                      </p>
                      {currentQuestion?.wasAdaptivelySelected && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                          ✨ Adapted
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center bg-amber-50 dark:bg-amber-400/20 border border-amber-200 dark:border-amber-400/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{quiz.accuracy}%</div>
                <div className="text-xs text-gray-600 dark:text-cream-200">Accuracy</div>
              </div>
              <div className="text-center bg-blue-50 dark:bg-blue-400/20 border border-blue-200 dark:border-blue-400/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quiz.points}</div>
                <div className="text-xs text-gray-600 dark:text-cream-200">Points</div>
              </div>
              <div className="text-center bg-purple-50 dark:bg-purple-400/20 border border-purple-200 dark:border-purple-400/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{quiz.correctAnswers}/{quiz.totalQuestions}</div>
                <div className="text-xs text-gray-600 dark:text-cream-200">Answered</div>
              </div>
              <div className="text-center bg-red-50 dark:bg-red-400/20 border border-red-200 dark:border-red-400/30 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatTime(timeLeft)}</div>
                <div className="text-xs text-gray-600 dark:text-cream-200">Time Left</div>
              </div>
            </div>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {quiz.questions.map((question, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all duration-200 flex items-center justify-center ${getQuestionStatusColor(question, index)}`}
              >
                {getQuestionStatusIcon(question) || (index + 1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Adaptive Difficulty Notification */}
      {adaptiveNotification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`p-4 rounded-lg shadow-lg border-l-4 ${adaptiveNotification.type === 'increase'
            ? 'bg-blue-50 dark:bg-blue-400/20 border-blue-400 dark:border-blue-500'
            : 'bg-orange-50 dark:bg-orange-400/20 border-orange-400 dark:border-orange-500'
            } max-w-sm`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${adaptiveNotification.type === 'increase'
                ? 'bg-blue-100 dark:bg-blue-400/30 text-blue-600 dark:text-blue-400'
                : 'bg-orange-100 dark:bg-orange-400/30 text-orange-600 dark:text-orange-400'
                }`}>
                {adaptiveNotification.type === 'increase' ? '⬆️' : '⬇️'}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-cream-100">
                  Difficulty {adaptiveNotification.type === 'increase' ? 'Increased!' : 'Adjusted'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-cream-200">
                  {adaptiveNotification.from} → {adaptiveNotification.to}
                </p>
                {adaptiveNotification.type === 'increase' && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Great job! {adaptiveNotification.timeSpent}s response time
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setAdaptiveNotification(null)}
              className="absolute top-2 right-2 text-gray-400 dark:text-cream-300 hover:text-gray-600 dark:hover:text-cream-100"
            >
              ×
            </button>
          </div>
        </div>
      )}





      {/* Question Content */}
      <div className="max-w-4xl mx-auto p-6 relative z-10">
        <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-dark-300 p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    currentQuestion.difficulty === 'hard' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                  }`}>
                  {currentQuestion.difficulty}
                </span>
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {currentQuestion.topic}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Question {currentQuestionIndex + 1} of {quiz.totalQuestions}</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100 mb-6">{currentQuestion.question}</h2>

            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={`w-full p-4 text-left rounded-lg border transition-all duration-200 ${selectedAnswer === option
                    ? 'border-amber-500 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300'
                    : 'border-gray-300 dark:border-dark-300 hover:border-gray-400 dark:hover:border-dark-200 hover:bg-gray-50 dark:hover:bg-dark-300/50 text-gray-900 dark:text-cream-100'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${selectedAnswer === option
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-500 dark:bg-amber-400 text-white'
                      : 'border-gray-400 dark:border-dark-200 text-gray-600 dark:text-cream-200'
                      }`}>
                      {selectedAnswer === option ? <CheckCircle className="w-4 h-4" /> : String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleSkipQuestion}
              className="px-6 py-3 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-cream-200 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors font-medium flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip Question
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 border border-gray-300 dark:border-dark-300 text-gray-700 dark:text-cream-200 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || isLoadingNextQuestion}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 dark:hover:from-amber-700 dark:hover:to-orange-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoadingNextQuestion ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adapting...
                  </>
                ) : currentQuestionIndex === quiz.questions.length - 1 ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    Finish Quiz
                  </>
                ) : (
                  <>
                    Submit & Next
                    {quiz.isAdaptive && <Brain className="w-4 h-4 text-blue-200" />}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}