import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  BookOpen,
  Award,
  ChevronRight
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ThemeToggle from "./ThemeToggle";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = `${BASE_URL}/api`;

export default function LessonDetail() {
  const navigate = useNavigate();
  const { roadmapId, lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const res = await fetch(`${API_BASE}/roadmaps/${roadmapId}/lessons/${lessonId}`, {
          credentials: "include"
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setLesson(data.data);
        } else {
          console.error("Failed to fetch lesson");
          navigate("/learn");
        }
      } catch (err) {
        console.error("Error fetching lesson:", err);
        navigate("/learn");
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [roadmapId, lessonId, navigate]);

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const submitQuiz = () => {
    if (!lesson?.lesson?.quiz) return;

    let correct = 0;
    lesson.lesson.quiz.forEach((question, index) => {
      if (answers[index] === question.options.indexOf(question.answer)) {
        correct++;
      }
    });

    const percentage = Math.round((correct / lesson.lesson.quiz.length) * 100);
    setScore(percentage);
    setQuizCompleted(true);

    // Mark lesson as completed
    markLessonComplete(percentage);
  };

  const markLessonComplete = async (quizScore = 0) => {
    try {
      await fetch(`${API_BASE}/progress/complete-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roadmapId,
          lessonId,
          quizScore
        })
      });
    } catch (err) {
      console.error("Error marking lesson complete:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-cream-300 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-cream-100">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <p className="text-gray-700 dark:text-cream-100">Lesson not found</p>
          <button
            onClick={() => navigate("/learn")}
            className="mt-4 px-6 py-2 bg-blue-600 dark:bg-cream-500 text-white dark:text-dark-500 rounded-lg hover:bg-blue-700 dark:hover:bg-cream-400 transition-colors"
          >
            Back to Learning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative">
      <AnimatedBackground />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-dark-400/80 backdrop-blur-sm shadow-sm border-b border-gray-200 dark:border-dark-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/learn")}
              className="p-2 text-gray-400 dark:text-cream-200 hover:text-gray-600 dark:hover:text-cream-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-cream-300 mb-1">
                <span>{lesson.roadmapTitle}</span>
                <ChevronRight className="w-4 h-4" />
                <span>{lesson.levelName}</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-cream-100">{lesson.lesson.title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!showQuiz ? (
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-8">
            {/* Lesson Content */}
            <div className="prose max-w-none mb-8">
              <div className="text-gray-700 dark:text-cream-200 leading-relaxed whitespace-pre-line">
                {lesson.lesson.content}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-amber-50 dark:bg-amber-400/20 border border-amber-200 dark:border-amber-400/30 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Key Takeaways
              </h3>
              <ul className="space-y-2">
                {lesson.lesson.summary.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-cream-200">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => markLessonComplete()}
                className="px-6 py-3 bg-blue-600 dark:bg-cream-500 text-white dark:text-dark-500 rounded-lg hover:bg-blue-700 dark:hover:bg-cream-400 transition-colors font-medium"
              >
                Mark as Complete
              </button>
              {lesson.lesson.quiz && lesson.lesson.quiz.length > 0 && (
                <button
                  onClick={() => setShowQuiz(true)}
                  className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium"
                >
                  Take Quiz
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-8">
            {!quizCompleted ? (
              <>
                {/* Quiz Header */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-cream-100 mb-2">Knowledge Check</h2>
                  <p className="text-gray-600 dark:text-cream-200">
                    Question {currentQuestion + 1} of {lesson.lesson.quiz.length}
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-dark-300 rounded-full h-2 mt-4">
                    <div
                      className="bg-blue-600 dark:bg-cream-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestion + 1) / lesson.lesson.quiz.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Question */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100 mb-6">
                    {lesson.lesson.quiz[currentQuestion].question}
                  </h3>

                  <div className="space-y-3">
                    {lesson.lesson.quiz[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuizAnswer(currentQuestion, index)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${answers[currentQuestion] === index
                            ? 'border-[#344F1F] bg-[#FFECC0] text-[#344F1F]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>

                  {currentQuestion === lesson.lesson.quiz.length - 1 ? (
                    <button
                      onClick={submitQuiz}
                      disabled={answers[currentQuestion] === undefined}
                      className="px-6 py-3 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium disabled:opacity-50"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestion(prev => prev + 1)}
                      disabled={answers[currentQuestion] === undefined}
                      className="px-6 py-3 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium disabled:opacity-50"
                    >
                      Next
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* Quiz Results */
              <div className="text-center">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                  <Award className={`w-10 h-10 ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
                <p className="text-gray-600 mb-6">You scored {score}% on this quiz</p>

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => navigate("/learn")}
                    className="px-6 py-3 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium"
                  >
                    Continue Learning
                  </button>
                  <button
                    onClick={() => {
                      setShowQuiz(false);
                      setQuizCompleted(false);
                      setCurrentQuestion(0);
                      setAnswers({});
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Review Lesson
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}