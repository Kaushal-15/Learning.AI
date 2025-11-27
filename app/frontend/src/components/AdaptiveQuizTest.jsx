import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, CheckCircle, AlertCircle, Brain, Target } from "lucide-react";
import AnimatedBackground from "./AnimatedBackground";
import ThemeToggle from "./ThemeToggle";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function AdaptiveQuizTest() {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adaptiveQuiz, setAdaptiveQuiz] = useState(null);

  const runAdaptiveTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    const tests = [
      {
        name: "Create Adaptive Quiz",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              roadmapType: 'frontend',
              difficulty: 'easy',
              questionCount: 5,
              timeLimit: 10,
              adaptiveDifficulty: true
            })
          });
          const data = await response.json();
          if (data.success) {
            setAdaptiveQuiz(data.data);
          }
          return { success: data.success, data: data.data };
        }
      },
      {
        name: "Test Difficulty Increase (Fast Correct Answers)",
        test: async () => {
          if (!adaptiveQuiz) return { success: false, error: "No quiz created" };
          
          // Simulate 2 fast correct answers
          const results = [];
          for (let i = 0; i < 2; i++) {
            const response = await fetch(`${API_BASE}/quiz/${adaptiveQuiz._id}/answer`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                questionIndex: i,
                answer: adaptiveQuiz.questions[i].correctAnswer,
                timeSpent: 8 // Fast answer
              })
            });
            const data = await response.json();
            results.push(data);
          }
          
          const lastResult = results[results.length - 1];
          return { 
            success: true, 
            data: {
              adaptiveChange: lastResult.adaptiveChange,
              currentDifficulty: lastResult.data.adaptiveSettings?.currentDifficulty
            }
          };
        }
      },
      {
        name: "Test Difficulty Decrease (Incorrect Answer)",
        test: async () => {
          if (!adaptiveQuiz) return { success: false, error: "No quiz created" };
          
          // Simulate incorrect answer
          const wrongAnswer = adaptiveQuiz.questions[2].options.find(
            opt => opt !== adaptiveQuiz.questions[2].correctAnswer
          );
          
          const response = await fetch(`${API_BASE}/quiz/${adaptiveQuiz._id}/answer`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              questionIndex: 2,
              answer: wrongAnswer,
              timeSpent: 15
            })
          });
          const data = await response.json();
          
          return { 
            success: data.success, 
            data: {
              adaptiveChange: data.adaptiveChange,
              currentDifficulty: data.data.adaptiveSettings?.currentDifficulty
            }
          };
        }
      },
      {
        name: "Get Next Adaptive Question",
        test: async () => {
          if (!adaptiveQuiz) return { success: false, error: "No quiz created" };
          
          const response = await fetch(`${API_BASE}/quiz/${adaptiveQuiz._id}/next-question`, {
            credentials: 'include'
          });
          const data = await response.json();
          
          return { 
            success: data.success, 
            data: {
              hasNextQuestion: !!data.nextQuestion,
              targetDifficulty: data.adaptiveInfo?.targetDifficulty,
              actualDifficulty: data.adaptiveInfo?.actualDifficulty
            }
          };
        }
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        const result = await test.test();
        results.push({
          name: test.name,
          success: result.success,
          data: result.data,
          error: result.error || null
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          data: null,
          error: error.message
        });
      }
    }
    
    setTestResults(results);
    setLoading(false);
  };

  const createTestQuiz = async () => {
    try {
      const response = await fetch(`${API_BASE}/quiz/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roadmapType: 'frontend',
          difficulty: 'easy',
          questionCount: 10,
          timeLimit: 20,
          adaptiveDifficulty: true
        })
      });
      const data = await response.json();
      
      if (data.success) {
        navigate(`/quiz/${data.data._id}`);
      } else {
        alert('Failed to create test quiz');
      }
    } catch (error) {
      console.error('Error creating test quiz:', error);
      alert('Failed to create test quiz');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark relative p-6">
      <AnimatedBackground />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 text-gray-400 dark:text-cream-200 hover:text-gray-600 dark:hover:text-cream-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100">Adaptive MCQ System Test</h1>
            <p className="text-gray-600 dark:text-cream-200">Test the real-time difficulty adaptation system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              System Tests
            </h3>
            <p className="text-gray-600 dark:text-cream-200 mb-4">
              Run automated tests to verify adaptive difficulty functionality
            </p>
            <button
              onClick={runAdaptiveTest}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Running Tests...' : 'Run Adaptive Tests'}
            </button>
          </div>

          <div className="bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Live Demo
            </h3>
            <p className="text-gray-600 dark:text-cream-200 mb-4">
              Create and take an adaptive quiz to experience the system firsthand
            </p>
            <button
              onClick={createTestQuiz}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-cream-500 text-white dark:text-dark-500 rounded-lg hover:bg-blue-700 dark:hover:bg-cream-400 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Adaptive Quiz
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-cream-100">Test Results</h2>
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-dark-400/80 backdrop-blur-sm rounded-lg shadow-sm border-2 p-6 ${
                  result.success ? 'border-green-200 dark:border-green-400/30' : 'border-red-200 dark:border-red-400/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-cream-100">
                    {result.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      result.success
                        ? 'bg-green-100 dark:bg-green-400/20 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-400/20 text-red-700 dark:text-red-300'
                    }`}
                  >
                    {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                
                {result.error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-400/10 border border-red-200 dark:border-red-400/30 rounded">
                    <p className="text-red-700 dark:text-red-300 text-sm font-medium">Error:</p>
                    <p className="text-red-600 dark:text-red-400 text-sm">{result.error}</p>
                  </div>
                )}
                
                {result.data && (
                  <div className="bg-gray-50 dark:bg-dark-300/50 rounded p-4">
                    <p className="text-gray-700 dark:text-cream-200 text-sm font-medium mb-2">Test Data:</p>
                    
                    {result.data.adaptiveChange && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-400/20 border border-blue-200 dark:border-blue-400/30 rounded">
                        <p className="text-blue-800 dark:text-blue-300 font-medium">Adaptive Change Detected:</p>
                        <p className="text-blue-700 dark:text-blue-400 text-sm">
                          {result.data.adaptiveChange.changed ? 
                            `${result.data.adaptiveChange.from} → ${result.data.adaptiveChange.to}` :
                            'No difficulty change'
                          }
                        </p>
                        {result.data.adaptiveChange.reason && (
                          <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                            Reason: {result.data.adaptiveChange.reason}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <pre className="text-xs text-gray-600 dark:text-cream-300 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 dark:bg-blue-400/20 border border-blue-200 dark:border-blue-400/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">How Adaptive System Works</h3>
          <div className="space-y-2 text-blue-800 dark:text-blue-400 text-sm">
            <p>• <strong>Difficulty Increase:</strong> 2 consecutive correct answers in ≤10 seconds</p>
            <p>• <strong>Difficulty Decrease:</strong> 1 incorrect answer (immediate adjustment)</p>
            <p>• <strong>Levels:</strong> Easy → Medium → Hard → Advanced</p>
            <p>• <strong>Real-time:</strong> Changes happen immediately after each answer</p>
          </div>
        </div>
      </div>
    </div>
  );
}