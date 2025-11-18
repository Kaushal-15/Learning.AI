import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  Target, 
  Trophy, 
  Zap,
  BookOpen,
  Brain,
  Star
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Sample test categories based on roadmaps
const testCategories = {
  'full-stack': [
    { id: 'html-css', name: 'HTML & CSS', difficulty: 'Beginner', questions: 15, time: 20 },
    { id: 'javascript', name: 'JavaScript', difficulty: 'Intermediate', questions: 20, time: 30 },
    { id: 'react', name: 'React.js', difficulty: 'Intermediate', questions: 18, time: 25 },
    { id: 'nodejs', name: 'Node.js & APIs', difficulty: 'Advanced', questions: 22, time: 35 },
    { id: 'database', name: 'Databases', difficulty: 'Intermediate', questions: 16, time: 25 }
  ],
  'frontend': [
    { id: 'html-css', name: 'HTML & CSS', difficulty: 'Beginner', questions: 20, time: 25 },
    { id: 'javascript', name: 'JavaScript', difficulty: 'Intermediate', questions: 25, time: 35 },
    { id: 'react', name: 'React.js', difficulty: 'Advanced', questions: 20, time: 30 },
    { id: 'ui-ux', name: 'UI/UX Design', difficulty: 'Intermediate', questions: 15, time: 20 }
  ],
  'backend': [
    { id: 'nodejs', name: 'Node.js', difficulty: 'Intermediate', questions: 20, time: 30 },
    { id: 'database', name: 'Databases', difficulty: 'Intermediate', questions: 18, time: 25 },
    { id: 'apis', name: 'REST APIs', difficulty: 'Advanced', questions: 22, time: 35 },
    { id: 'security', name: 'Security', difficulty: 'Advanced', questions: 16, time: 25 }
  ]
};

const getDifficultyColor = (difficulty) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner': return 'bg-green-100 text-green-700 border-green-200';
    case 'intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getDifficultyIcon = (difficulty) => {
  switch (difficulty.toLowerCase()) {
    case 'beginner': return <Star className="w-4 h-4" />;
    case 'intermediate': return <Target className="w-4 h-4" />;
    case 'advanced': return <Zap className="w-4 h-4" />;
    default: return <BookOpen className="w-4 h-4" />;
  }
};

export default function Test() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Sample questions - in real app, these would come from backend
  const sampleQuestions = [
    {
      id: 1,
      question: "What does HTML stand for?",
      options: [
        "Hyper Text Markup Language",
        "High Tech Modern Language", 
        "Home Tool Markup Language",
        "Hyperlink and Text Markup Language"
      ],
      correct: 0
    },
    {
      id: 2,
      question: "Which CSS property is used to change the text color?",
      options: ["color", "text-color", "font-color", "text-style"],
      correct: 0
    },
    {
      id: 3,
      question: "What is the correct way to declare a JavaScript variable?",
      options: ["var myVar;", "variable myVar;", "v myVar;", "declare myVar;"],
      correct: 0
    }
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_BASE}/profile/me`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();
        
        if (res.ok && data.success && data.user) {
          setUser(data.user);
          
          if (!data.user.hasCompletedOnboarding) {
            navigate("/roadmap");
            return;
          }
        } else {
          navigate("/login");
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    let timer;
    if (testStarted && timeLeft > 0 && !testCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTestComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [testStarted, timeLeft, testCompleted]);

  const startTest = (category) => {
    setSelectedCategory(category);
    setTestStarted(true);
    setTimeLeft(category.time * 60); // Convert minutes to seconds
    setCurrentQuestion(0);
    setAnswers({});
    setTestCompleted(false);
    setTestResults(null);
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < sampleQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleTestComplete();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleTestComplete = () => {
    setTestCompleted(true);
    
    // Calculate results
    let correct = 0;
    sampleQuestions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correct++;
      }
    });
    
    const percentage = Math.round((correct / sampleQuestions.length) * 100);
    setTestResults({
      correct,
      total: sampleQuestions.length,
      percentage,
      timeSpent: selectedCategory.time * 60 - timeLeft
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  if (testCompleted && testResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
              testResults.percentage >= 80 ? 'bg-green-100' : 
              testResults.percentage >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {testResults.percentage >= 80 ? 
                <Trophy className="w-10 h-10 text-green-600" /> :
                testResults.percentage >= 60 ?
                <Target className="w-10 h-10 text-yellow-600" /> :
                <Brain className="w-10 h-10 text-red-600" />
              }
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Test Complete!</h2>
            <p className="text-gray-600">{selectedCategory.name} Assessment</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center p-6 bg-[#FFECC0] rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-[#344F1F] mb-1">{testResults.percentage}%</div>
              <div className="text-sm text-gray-600">Score</div>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg border border-gray-200">
              <div className="text-3xl font-bold text-green-600 mb-1">{testResults.correct}/{testResults.total}</div>
              <div className="text-sm text-gray-600">Correct Answers</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Performance</span>
              <span>{testResults.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  testResults.percentage >= 80 ? 'bg-green-500' :
                  testResults.percentage >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${testResults.percentage}%` }}
              ></div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => {
                setTestStarted(false);
                setTestCompleted(false);
                setSelectedCategory(null);
              }}
              className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Take Another Test
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-3 px-6 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (testStarted && selectedCategory) {
    const question = sampleQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / sampleQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Test Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-gray-800">{selectedCategory.name} Test</h1>
                <span className="text-sm text-gray-600">
                  Question {currentQuestion + 1} of {sampleQuestions.length}
                </span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-red-600">
                  <Clock className="w-5 h-5" />
                  <span className="font-mono text-lg font-bold">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#344F1F] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{question.question}</h2>
              
              <div className="space-y-4">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion, index)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                      answers[currentQuestion] === index
                        ? 'border-[#344F1F] bg-[#FFECC0] text-[#344F1F]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion] === index
                          ? 'border-[#344F1F] bg-[#344F1F]'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion] === index && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <button
                onClick={nextQuestion}
                disabled={answers[currentQuestion] === undefined}
                className="px-6 py-3 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestion === sampleQuestions.length - 1 ? 'Finish Test' : 'Next Question'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test Selection Screen
  const availableTests = testCategories[user?.selectedRoadmap] || testCategories['full-stack'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Knowledge Assessment</h1>
              <p className="text-gray-600">Test your skills and track your progress</p>
            </div>
          </div>
        </div>
      </header>

      {/* Test Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(test.difficulty)}`}>
                  <div className="flex items-center gap-1">
                    {getDifficultyIcon(test.difficulty)}
                    {test.difficulty}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    Questions
                  </span>
                  <span className="font-semibold">{test.questions}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Duration
                  </span>
                  <span className="font-semibold">{test.time} minutes</span>
                </div>
              </div>
              
              <button
                onClick={() => startTest(test)}
                className="w-full py-3 px-4 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium"
              >
                Start Test
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}