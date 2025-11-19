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
    Star,
    AlertCircle
} from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Test categories based on difficulty levels for each roadmap
const testCategories = {
    'frontend-development': [
        {
            id: 'easy',
            name: 'Frontend Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'HTML, CSS, and basic JavaScript concepts'
        },
        {
            id: 'medium',
            name: 'Frontend Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'Advanced CSS, DOM manipulation, and frameworks'
        },
        {
            id: 'hard',
            name: 'Frontend Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Complex JavaScript patterns and optimization'
        },
        {
            id: 'advanced',
            name: 'Frontend Expert',
            difficulty: 'Advanced',
            difficultyLevel: 'advanced',
            questions: 8,
            time: 15,
            description: 'Performance, accessibility, and modern practices'
        },
        {
            id: 'mixed',
            name: 'Complete Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard,advanced',
            questions: 20,
            time: 30,
            description: 'Comprehensive test covering all difficulty levels'
        }
    ],
    'backend-development': [
        {
            id: 'easy',
            name: 'Backend Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'Server fundamentals and basic concepts'
        },
        {
            id: 'medium',
            name: 'Backend Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'APIs, databases, and middleware'
        },
        {
            id: 'hard',
            name: 'Backend Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Architecture patterns and optimization'
        },
        {
            id: 'mixed',
            name: 'Complete Backend Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive backend development test'
        }
    ],
    'full-stack-development': [
        {
            id: 'easy',
            name: 'Full-Stack Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 12,
            time: 18,
            description: 'Frontend and backend fundamentals'
        },
        {
            id: 'medium',
            name: 'Full-Stack Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 18,
            time: 30,
            description: 'Integration and full-stack patterns'
        },
        {
            id: 'hard',
            name: 'Full-Stack Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 15,
            time: 25,
            description: 'Complex full-stack architecture'
        },
        {
            id: 'mixed',
            name: 'Complete Full-Stack Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 25,
            time: 40,
            description: 'Comprehensive full-stack development test'
        }
    ],
    'mobile-development': [
        {
            id: 'easy',
            name: 'Mobile Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'Mobile development fundamentals'
        },
        {
            id: 'medium',
            name: 'Mobile Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'Native and cross-platform development'
        },
        {
            id: 'hard',
            name: 'Mobile Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Performance and platform-specific features'
        },
        {
            id: 'mixed',
            name: 'Complete Mobile Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive mobile development test'
        }
    ],
    'ai-machine-learning': [
        {
            id: 'easy',
            name: 'AI/ML Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'Machine learning fundamentals'
        },
        {
            id: 'medium',
            name: 'AI/ML Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'Algorithms and model training'
        },
        {
            id: 'hard',
            name: 'AI/ML Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Deep learning and advanced techniques'
        },
        {
            id: 'mixed',
            name: 'Complete AI/ML Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive AI/ML test'
        }
    ],
    'devops-cloud': [
        {
            id: 'easy',
            name: 'DevOps Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'DevOps and cloud fundamentals'
        },
        {
            id: 'medium',
            name: 'DevOps Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'CI/CD and infrastructure as code'
        },
        {
            id: 'hard',
            name: 'DevOps Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Advanced cloud architecture and automation'
        },
        {
            id: 'mixed',
            name: 'Complete DevOps Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive DevOps and cloud test'
        }
    ],
    'cybersecurity': [
        {
            id: 'easy',
            name: 'Security Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'Cybersecurity fundamentals'
        },
        {
            id: 'medium',
            name: 'Security Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'Network security and threat analysis'
        },
        {
            id: 'hard',
            name: 'Security Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Advanced security practices and forensics'
        },
        {
            id: 'mixed',
            name: 'Complete Security Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive cybersecurity test'
        }
    ],
    'database-data-science': [
        {
            id: 'easy',
            name: 'Database Basics',
            difficulty: 'Easy',
            difficultyLevel: 'easy',
            questions: 10,
            time: 15,
            description: 'Database and data science fundamentals'
        },
        {
            id: 'medium',
            name: 'Data Science Intermediate',
            difficulty: 'Medium',
            difficultyLevel: 'medium',
            questions: 15,
            time: 25,
            description: 'Data analysis and visualization'
        },
        {
            id: 'hard',
            name: 'Data Science Advanced',
            difficulty: 'Hard',
            difficultyLevel: 'hard',
            questions: 12,
            time: 20,
            description: 'Advanced analytics and big data'
        },
        {
            id: 'mixed',
            name: 'Complete Data Science Assessment',
            difficulty: 'Mixed',
            difficultyLevel: 'easy,medium,hard',
            questions: 20,
            time: 30,
            description: 'Comprehensive data science test'
        }
    ]
};

const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
        case 'easy': return 'bg-green-100 text-green-700 border-green-200';
        case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'hard': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
        case 'mixed': return 'bg-purple-100 text-purple-700 border-purple-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

const getDifficultyIcon = (difficulty) => {
    switch (difficulty.toLowerCase()) {
        case 'easy': return <Star className="w-4 h-4" />;
        case 'medium': return <Target className="w-4 h-4" />;
        case 'hard': return <Zap className="w-4 h-4" />;
        case 'advanced': return <Brain className="w-4 h-4" />;
        case 'mixed': return <Trophy className="w-4 h-4" />;
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
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionError, setQuestionError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [tabSwitchCount, setTabSwitchCount] = useState(0);
    const [warningShown, setWarningShown] = useState(false);
    const [showProctoringModal, setShowProctoringModal] = useState(false);
    const [pendingCategory, setPendingCategory] = useState(null);
    const [testCompletions, setTestCompletions] = useState([]);

    // Helper function to map roadmap names
    const getRoadmapKey = (roadmap) => {
        const mapping = {
            'frontend': 'frontend-development',
            'backend': 'backend-development',
            'full-stack': 'full-stack-development',
            'mobile': 'mobile-development',
            'ai-ml': 'ai-machine-learning',
            'devops': 'devops-cloud',
            'database': 'database-data-science'
        };
        return mapping[roadmap] || roadmap;
    };

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
                    // Fetch test completions
                    try {
                        const roadmapKey = getRoadmapKey(data.user.selectedRoadmap);
                        const completionsRes = await fetch(`${API_BASE}/test-results/completions?roadmapType=${roadmapKey}`, {
                            method: "GET",
                            credentials: "include",
                        });
                        const completionsData = await completionsRes.json();

                        if (completionsRes.ok && completionsData.success) {
                            setTestCompletions(completionsData.data);
                        }
                    } catch (err) {
                        console.error("Error fetching test completions:", err);
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

    // Proctoring event listeners
    useEffect(() => {
        if (!testStarted || testCompleted) return;

        const handleVisibilityChange = () => {
            if (document.hidden && testStarted && !testCompleted) {
                setTabSwitchCount(prev => {
                    const newCount = prev + 1;
                    console.log('Tab switch detected, count:', newCount);
                    return newCount;
                });
                if (!warningShown) {
                    setWarningShown(true);
                    setTimeout(() => {
                        alert('Warning: Tab switching detected! This test is being monitored.');
                    }, 100);
                }
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement && testStarted && !testCompleted) {
                alert('Warning: You must stay in fullscreen mode during the test!');
                enterFullscreen();
            }
        };

        const handleKeyDown = (e) => {
            // Disable common shortcuts
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 'r') ||
                e.key === 'F5'
            ) {
                e.preventDefault();
                alert('This action is not allowed during the test!');
            }
        };

        const handleContextMenu = (e) => {
            e.preventDefault();
            alert('Right-click is disabled during the test!');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [testStarted, testCompleted, warningShown]);

    const fetchQuestions = async (category) => {
        setLoadingQuestions(true);
        setQuestionError(null);

        try {
            const roadmapType = user?.selectedRoadmap || 'frontend-development';
            const response = await fetch(
                `${API_BASE}/questions/${roadmapType}?difficulty=${category.difficultyLevel}&limit=${category.questions}`,
                {
                    method: 'GET',
                    credentials: 'include',
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                setQuestions(data.data);
                return data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch questions');
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            setQuestionError(error.message);
            return null;
        } finally {
            setLoadingQuestions(false);
        }
    };

    const enterFullscreen = () => {
        const element = document.documentElement;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        setIsFullscreen(true);
    };

    const showProctoringWarning = (category) => {
        setPendingCategory(category);
        setShowProctoringModal(true);
    };

    const startTest = async (category) => {
        const fetchedQuestions = await fetchQuestions(category);

        if (!fetchedQuestions || fetchedQuestions.length === 0) {
            setQuestionError('No questions available for this test. Please try another category.');
            return;
        }

        // Enter fullscreen mode
        enterFullscreen();

        setSelectedCategory(category);
        setTestStarted(true);
        setTimeLeft(category.time * 60); // Convert minutes to seconds
        setCurrentQuestion(0);
        setAnswers({});
        setTestCompleted(false);
        setTestResults(null);
        setTabSwitchCount(0);
        setWarningShown(false);
        setShowProctoringModal(false);
        setPendingCategory(null);
    };

    const handleAnswerSelect = (questionIndex, answerIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: answerIndex
        }));
    };

    const nextQuestion = () => {
        if (currentQuestion < questions.length - 1) {
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

    const saveTestResult = async (results) => {
        try {
            const roadmapType = getRoadmapKey(user?.selectedRoadmap) || 'frontend-development';
            console.log('Test - User roadmap:', user?.selectedRoadmap, '-> Mapped to:', roadmapType);

            const testData = {
                roadmapType,
                testCategory: selectedCategory.name,
                difficulty: selectedCategory.difficulty,
                score: results.percentage,
                correctAnswers: results.correct,
                totalQuestions: results.total,
                timeSpent: results.timeSpent,
                timeTaken: selectedCategory.time * 60,
                detailedResults: results.detailedResults.map(result => ({
                    questionId: `${result.topic}-${result.difficulty}`,
                    question: result.question,
                    userAnswer: result.userAnswer,
                    correctAnswer: result.correctAnswer,
                    isCorrect: result.isCorrect,
                    topic: result.topic,
                    difficulty: result.difficulty,
                    explanation: result.explanation
                }))
            };

            console.log('Saving test result:', testData);

            const response = await fetch(`${API_BASE}/test-results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(testData)
            });

            const responseData = await response.json();
            console.log('Test result save response:', responseData);

            if (!response.ok) {
                console.error('Failed to save test result:', responseData);
            } else {
                console.log('Test result saved successfully');
            }
        } catch (error) {
            console.error('Error saving test result:', error);
        }
    };

    const handleTestComplete = async () => {
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }

        setTestCompleted(true);

        // Calculate results
        let correct = 0;
        let detailedResults = [];

        questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const correctAnswerIndex = question.options.findIndex(option => option === question.answer);
            const isCorrect = userAnswer === correctAnswerIndex;

            if (isCorrect) {
                correct++;
            }

            detailedResults.push({
                question: question.question,
                userAnswer: userAnswer !== undefined ? question.options[userAnswer] : 'Not answered',
                correctAnswer: question.answer,
                isCorrect,
                explanation: question.explanation,
                topic: question.topic,
                difficulty: question.difficulty
            });
        });

        const percentage = Math.round((correct / questions.length) * 100);
        const results = {
            correct,
            total: questions.length,
            percentage,
            timeSpent: selectedCategory.time * 60 - timeLeft,
            detailedResults,
            tabSwitchCount
        };

        setTestResults(results);

        // Save results to backend
        await saveTestResult(results);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 relative flex items-center justify-center">
                <AnimatedBackground />
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading assessments...</p>
                </div>
            </div>
        );
    }

    if (testCompleted && testResults) {
        return (
            <div className="min-h-screen bg-gray-50 relative">
                <AnimatedBackground />
                <div className="max-w-4xl mx-auto px-6 py-8">
                    {/* Results Header */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
                        <div className="text-center mb-8">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${testResults.percentage >= 80 ? 'bg-green-100' :
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

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="text-center p-6 bg-[#FFECC0] rounded-lg border border-gray-200">
                                <div className="text-3xl font-bold text-[#344F1F] mb-1">{testResults.percentage}%</div>
                                <div className="text-sm text-gray-600">Score</div>
                            </div>
                            <div className="text-center p-6 bg-green-50 rounded-lg border border-gray-200">
                                <div className="text-3xl font-bold text-green-600 mb-1">{testResults.correct}/{testResults.total}</div>
                                <div className="text-sm text-gray-600">Correct Answers</div>
                            </div>
                            <div className={`text-center p-6 rounded-lg border ${testResults.tabSwitchCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                                }`}>
                                <div className={`text-3xl font-bold mb-1 ${testResults.tabSwitchCount > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                    {testResults.tabSwitchCount || 0}
                                </div>
                                <div className="text-sm text-gray-600">Tab Switches</div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Performance</span>
                                <span>{testResults.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-1000 ${testResults.percentage >= 80 ? 'bg-green-500' :
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
                                    setQuestions([]);
                                }}
                                className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Take Another Test
                            </button>
                            <button
                                onClick={() => {
                                    // Force refresh dashboard data by adding timestamp
                                    navigate("/dashboard", { state: { refresh: Date.now() } });
                                }}
                                className="flex-1 py-3 px-6 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors font-medium"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Results</h3>

                        <div className="space-y-6">
                            {testResults.detailedResults.map((result, index) => (
                                <div
                                    key={index}
                                    className={`p-6 rounded-lg border-2 ${result.isCorrect
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-red-200 bg-red-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result.isCorrect
                                                ? 'bg-green-500 text-white'
                                                : 'bg-red-500 text-white'
                                                }`}>
                                                {result.isCorrect ?
                                                    <CheckCircle className="w-5 h-5" /> :
                                                    <AlertCircle className="w-5 h-5" />
                                                }
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-600">Question {index + 1}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(result.difficulty)}`}>
                                                        {result.difficulty}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        {result.topic}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="font-semibold text-gray-800 mb-3">{result.question}</h4>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Your answer:</span>
                                            <span className={`font-medium ${result.isCorrect ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                {result.userAnswer}
                                            </span>
                                        </div>
                                        {!result.isCorrect && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600">Correct answer:</span>
                                                <span className="font-medium text-green-700">{result.correctAnswer}</span>
                                            </div>
                                        )}
                                    </div>

                                    {result.explanation && (
                                        <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                                            <span className="text-sm font-medium text-gray-700">Explanation:</span>
                                            <p className="text-sm text-gray-600 mt-1">{result.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loadingQuestions) {
        return (
            <div className="min-h-screen bg-gray-50 relative flex items-center justify-center">
                <AnimatedBackground />
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading questions...</p>
                </div>
            </div>
        );
    }

    if (questionError) {
        return (
            <div className="min-h-screen bg-gray-50 relative flex items-center justify-center p-6">
                <AnimatedBackground />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Error Loading Test</h2>
                    <p className="text-gray-600 mb-6">{questionError}</p>
                    <button
                        onClick={() => {
                            setQuestionError(null);
                            setTestStarted(false);
                            setSelectedCategory(null);
                        }}
                        className="px-6 py-2 bg-[#344F1F] text-white rounded-lg hover:bg-[#2a3f1a] transition-colors"
                    >
                        Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    if (testStarted && selectedCategory && questions.length > 0) {
        const question = questions[currentQuestion];
        const progress = ((currentQuestion + 1) / questions.length) * 100;
        const correctAnswerIndex = question.options.findIndex(option => option === question.answer);

        return (
            <div className="min-h-screen relative" style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #16213e 75%, #1a1a2e 100%)',
                backgroundSize: '400% 400%',
                animation: 'gradientShift 15s ease infinite'
            }}>
                {/* Add CSS animation */}
                <style jsx>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

                {/* Proctoring Overlay */}
                <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-red-600 via-red-700 to-red-600 text-white text-center py-3 z-50 shadow-lg">
                    <div className="flex items-center justify-center gap-2 text-sm font-bold">
                        <AlertCircle className="w-5 h-5 animate-pulse" />
                        <span className="tracking-wide">🔒 SECURE PROCTORED EXAMINATION IN PROGRESS 🔒</span>
                        {tabSwitchCount > 0 && (
                            <span className="ml-4 bg-red-900 px-3 py-1 rounded-full text-xs animate-bounce">
                                ⚠️ {tabSwitchCount} VIOLATIONS DETECTED
                            </span>
                        )}
                    </div>
                    <div className="text-xs mt-1 opacity-90">
                        Monitored Environment • Tab Switching Detected • All Activity Recorded
                    </div>
                </div>

                {/* Security Pattern Overlay */}
                <div className="fixed inset-0 pointer-events-none z-5" style={{
                    backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255,0,0,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255,0,0,0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(255,0,0,0.05) 0%, transparent 50%)
          `
                }}></div>

                {/* Test Header */}
                <div className="bg-white shadow-xl border-b-2 border-red-200 mt-16 relative z-10">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h1 className="text-xl font-bold text-gray-800">{selectedCategory.name} Test</h1>
                                <span className="text-sm text-gray-600">
                                    Question {currentQuestion + 1} of {questions.length}
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
                <div className="max-w-4xl mx-auto px-6 py-8 relative">
                    {/* Enhanced Security Watermarks */}
                    <div className="fixed inset-0 pointer-events-none z-10 opacity-10">
                        <div className="absolute top-1/6 left-1/6 transform -rotate-45 text-8xl font-black text-red-600">
                            SECURE
                        </div>
                        <div className="absolute top-1/2 right-1/6 transform rotate-45 text-8xl font-black text-red-600">
                            MONITORED
                        </div>
                        <div className="absolute bottom-1/6 left-1/2 transform -rotate-12 text-6xl font-black text-red-600">
                            PROCTORED
                        </div>
                        <div className="absolute top-1/3 left-1/2 transform rotate-12 text-4xl font-bold text-red-500">
                            🔒 EXAM MODE 🔒
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-2xl border-2 border-red-100 p-8 relative z-20 backdrop-blur-sm">
                        {/* Question Header with Topic and Difficulty */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                    <div className="flex items-center gap-1">
                                        {getDifficultyIcon(question.difficulty)}
                                        {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                                    </div>
                                </span>
                                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                    {question.topic}
                                </span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">{question.question}</h2>

                            <div className="space-y-4">
                                {question.options.map((option, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(currentQuestion, index)}
                                        className={`w-full p-4 text-left rounded-lg border-2 transition-all duration-200 ${answers[currentQuestion] === index
                                            ? 'border-[#344F1F] bg-[#FFECC0] text-[#344F1F]'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion] === index
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
                                {currentQuestion === questions.length - 1 ? 'Finish Test' : 'Next Question'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Test Selection Screen - Map roadmap names to test categories
    const roadmapKey = getRoadmapKey(user?.selectedRoadmap);
    const availableTests = testCategories[roadmapKey] || testCategories['frontend-development'];

    // Proctoring Modal
    if (showProctoringModal && pendingCategory) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8">
                    <div className="text-center mb-6">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Proctored Test Environment</h2>
                        <p className="text-gray-600">Please read and accept the following terms before starting your test</p>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                        <h3 className="font-bold text-red-800 mb-4">Test Rules & Monitoring:</h3>
                        <ul className="space-y-2 text-sm text-red-700">
                            <li>• This test will run in fullscreen mode - you cannot exit during the test</li>
                            <li>• Tab switching and window changes are monitored and recorded</li>
                            <li>• Right-click and developer tools are disabled</li>
                            <li>• Browser refresh and navigation shortcuts are blocked</li>
                            <li>• Any suspicious activity will be flagged in your results</li>
                            <li>• The test must be completed in one session - no pausing allowed</li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h3 className="font-bold text-blue-800 mb-2">Test Details:</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                            <div>
                                <span className="font-medium">Category:</span> {pendingCategory.name}
                            </div>
                            <div>
                                <span className="font-medium">Difficulty:</span> {pendingCategory.difficulty}
                            </div>
                            <div>
                                <span className="font-medium">Questions:</span> {pendingCategory.questions}
                            </div>
                            <div>
                                <span className="font-medium">Time Limit:</span> {pendingCategory.time} minutes
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setShowProctoringModal(false);
                                setPendingCategory(null);
                            }}
                            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => startTest(pendingCategory)}
                            className="flex-1 py-3 px-6 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            I Accept - Start Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 relative">
            <AnimatedBackground />
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
                    {availableTests.map((test) => {
                        const completion = testCompletions.find(c =>
                            c.testCategory === test.name && c.difficulty === test.difficulty
                        );
                        const isCompleted = !!completion;

                        return (
                            <div
                                key={test.id}
                                className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-all duration-200 ${isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
                                        {isCompleted && (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        )}
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(test.difficulty)}`}>
                                        <div className="flex items-center gap-1">
                                            {getDifficultyIcon(test.difficulty)}
                                            {test.difficulty}
                                        </div>
                                    </div>
                                </div>

                                {isCompleted && (
                                    <div className="mb-4 p-3 bg-green-100 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-green-800 font-medium">Completed</span>
                                            <span className="text-green-700">Best: {completion.bestScore}%</span>
                                        </div>
                                        <div className="text-xs text-green-600 mt-1">
                                            Attempts: {completion.attemptCount} • Last: {new Date(completion.lastAttemptDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}

                                <p className="text-sm text-gray-600 mb-4">{test.description}</p>

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
                                    onClick={() => showProctoringWarning(test)}
                                    className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${isCompleted
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-[#344F1F] text-white hover:bg-[#2a3f1a]'
                                        }`}
                                >
                                    {isCompleted ? 'Retake Test' : 'Start Test'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}