import React, { useState, useEffect } from 'react';

const AIQuestionTester = () => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    topic: 'Binary Search Trees',
    category: ['Programming', 'Data Structures'],
    difficulty: 5,
    questionType: 'multiple-choice'
  });

  const API_BASE = 'http://localhost:3000/api';

  // Fetch service status and categories on component mount
  useEffect(() => {
    fetchServiceStatus();
    fetchCategories();
  }, []);

  const fetchServiceStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/questions/health`);
      const data = await response.json();
      setServiceStatus(data);
    } catch (err) {
      console.error('Failed to fetch service status:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/questions/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const generateQuestion = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/questions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        setQuestion(data.data);
      } else {
        setError(data.message || 'Failed to generate question');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (index, value) => {
    const newCategory = [...formData.category];
    newCategory[index] = value;
    setFormData(prev => ({
      ...prev,
      category: newCategory
    }));
  };

  const addCategoryLevel = () => {
    setFormData(prev => ({
      ...prev,
      category: [...prev.category, '']
    }));
  };

  const removeCategoryLevel = (index) => {
    const newCategory = formData.category.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      category: newCategory
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
          AI Question Generation Tester
        </h2>
        <div className="flex items-center">
          {serviceStatus && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${
              serviceStatus.healthy 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                serviceStatus.healthy ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              AI Service: {serviceStatus.healthy ? 'Healthy' : 'Unhealthy'}
              {serviceStatus.status && (
                <span className="text-xs opacity-80 ml-2">
                  (Client: {serviceStatus.status.hasClient ? 'Yes' : 'No'}, 
                   Fallback: {serviceStatus.status.fallbackQuestionsAvailable || 0})
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 pb-3 border-b-2 border-primary-500">
            Question Parameters
          </h3>
          
          {/* Topic Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic:
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              placeholder="Enter question topic"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Category Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category:
            </label>
            {formData.category.map((cat, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={cat}
                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                  placeholder={`Category level ${index + 1}`}
                  className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
                />
                {formData.category.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeCategoryLevel(index)}
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={addCategoryLevel} 
              className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + Add Category Level
            </button>
          </div>

          {/* Difficulty Slider */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty (1-10):
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-lg font-semibold text-primary-600 min-w-[2rem] text-center">
                {formData.difficulty}
              </span>
            </div>
          </div>

          {/* Question Type Select */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type:
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => handleInputChange('questionType', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none transition-colors"
            >
              <option value="multiple-choice">Multiple Choice</option>
              <option value="true-false">True/False</option>
              <option value="fill-in-the-blank">Fill in the Blank</option>
            </select>
          </div>

          {/* Generate Button */}
          <button 
            onClick={generateQuestion} 
            disabled={loading || !formData.topic.trim()}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </div>
            ) : (
              'Generate Question'
            )}
          </button>
        </div>

        {/* Result Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
              <h4 className="font-semibold mb-2">Error:</h4>
              <p>{error}</p>
            </div>
          )}

          {question && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 pb-3 border-b-2 border-green-500">
                Generated Question
              </h3>
              
              <div className="space-y-6">
                {/* Question Text */}
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary-500">
                  <h4 className="font-semibold text-gray-800 mb-3">Question:</h4>
                  <p className="text-lg leading-relaxed text-gray-700 font-medium">
                    {question.question}
                  </p>
                </div>

                {/* Options */}
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary-500">
                  <h4 className="font-semibold text-gray-800 mb-3">Options:</h4>
                  <ul className="space-y-2">
                    {question.options.map((option, index) => (
                      <li 
                        key={index}
                        className={`p-3 rounded-lg border transition-colors ${
                          option === question.correctAnswer 
                            ? 'bg-green-100 border-green-300 text-green-800 font-semibold' 
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                        {option === question.correctAnswer && ' ✓'}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Explanation */}
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary-500">
                  <h4 className="font-semibold text-gray-800 mb-3">Explanation:</h4>
                  <p className="leading-relaxed text-gray-700">{question.explanation}</p>
                </div>

                {/* Hints */}
                {question.hints && question.hints.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary-500">
                    <h4 className="font-semibold text-gray-800 mb-3">Hints:</h4>
                    <ul className="space-y-2">
                      {question.hints.map((hint, index) => (
                        <li key={index} className="p-2 bg-white rounded-lg border-l-3 border-yellow-400 text-gray-700">
                          {hint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Metadata */}
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-primary-500">
                  <h4 className="font-semibold text-gray-800 mb-3">Metadata:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <strong className="block text-gray-800 mb-1">Category:</strong>
                      <span className="text-gray-600">{question.category.join(' > ')}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <strong className="block text-gray-800 mb-1">Difficulty:</strong>
                      <span className="text-gray-600">{question.difficulty}/10</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <strong className="block text-gray-800 mb-1">Type:</strong>
                      <span className="text-gray-600">{question.questionType}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <strong className="block text-gray-800 mb-1">Validation Score:</strong>
                      <span className="text-gray-600">{(question.validationScore * 100).toFixed(1)}%</span>
                    </div>
                    {question.metadata && (
                      <>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <strong className="block text-gray-800 mb-1">AI Generated:</strong>
                          <span className={`text-sm px-2 py-1 rounded ${
                            question.metadata.aiGenerated 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {question.metadata.aiGenerated ? 'Yes' : 'No (Fallback)'}
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <strong className="block text-gray-800 mb-1">Generation Time:</strong>
                          <span className="text-gray-600">{question.metadata.generationTime}ms</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!question && !error && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-lg">Generate a question to see results here</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories Info */}
      {categories && Object.keys(categories).length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 pb-3 border-b-2 border-gray-400">
            Available Categories & Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Question Types:</h4>
              <ul className="space-y-2">
                {categories.questionTypes?.map((type, index) => (
                  <li key={index} className="p-3 bg-gray-50 rounded-lg border-l-3 border-primary-500 text-gray-700 font-medium">
                    {type}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-4">Categories:</h4>
              <ul className="space-y-2">
                {categories.categories?.map((category, index) => (
                  <li key={index} className="p-3 bg-gray-50 rounded-lg border-l-3 border-primary-500 text-gray-700 font-medium">
                    {category}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQuestionTester;