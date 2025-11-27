import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Play, CheckCircle, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function QuizTest() {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const tests = [
      {
        name: "Create Quiz",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              roadmapType: 'frontend',
              difficulty: 'easy',
              questionCount: 5,
              timeLimit: 10
            })
          });
          const data = await response.json();
          return { success: data.success, data: data.data?._id };
        }
      },
      {
        name: "Get Quiz Stats",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/stats`, {
            credentials: 'include'
          });
          const data = await response.json();
          return { success: data.success, data: data.stats };
        }
      },
      {
        name: "Get Recommendations",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/recommendations?roadmapType=frontend`, {
            credentials: 'include'
          });
          const data = await response.json();
          return { success: data.success, data: data.data };
        }
      },
      {
        name: "Get Question Preview",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/preview?roadmapType=frontend&questionCount=10`, {
            credentials: 'include'
          });
          const data = await response.json();
          return { success: data.success, data: data.data };
        }
      },
      {
        name: "Get Learning Insights",
        test: async () => {
          const response = await fetch(`${API_BASE}/quiz/insights/frontend`, {
            credentials: 'include'
          });
          const data = await response.json();
          return { success: data.success, data: data.data };
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
          error: null
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz System Test</h1>
            <p className="text-gray-600">Test all quiz API endpoints</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <button
            onClick={runTests}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {loading ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                  result.success ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {result.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      result.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.success ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                
                {result.error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-700 text-sm font-medium">Error:</p>
                    <p className="text-red-600 text-sm">{result.error}</p>
                  </div>
                )}
                
                {result.data && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-gray-700 text-sm font-medium mb-2">Response Data:</p>
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}