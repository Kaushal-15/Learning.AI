import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Book,
  Video,
  Headphones,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  Code,
  Trophy,
  Sparkles,
  ListTodo,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Brain,
  Moon,
  Sun
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import AnimatedBackground from "./AnimatedBackground";
import api from '../services/api';
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function LearnPaths() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roadmapId, week, day, dayData: initialDayData, roadmapTitle } = location.state || {};
  const [dayData, setDayData] = useState(initialDayData || null);
  const { isDarkMode, toggleTheme } = useTheme();

  const [selectedMode, setSelectedMode] = useState('text');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(() => {
    if (initialDayData?.learningOptions) {
      // Map the database structure to the frontend state structure
      return {
        text: initialDayData.learningOptions.text,
        video: initialDayData.learningOptions.video,
        audio: initialDayData.learningOptions.audio,
        image: initialDayData.learningOptions.images // Note: DB uses 'images', frontend state uses 'image'
      };
    }
    return {};
  });
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Apply dashboard-dark class when theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dashboard-dark');
    } else {
      document.documentElement.classList.remove('dashboard-dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const fetchDayContent = async () => {
      if (!dayData && roadmapId && week && day) {
        setLoading(true);
        try {
          // Calculate the actual day number based on week and day
          // Assuming 7 days per week structure or fetching by specific week-day endpoint
          // Since the backend has /:roadmapId/day/:day, we might need to map week/day to total day index
          // OR use a new endpoint. For now, let's try to fetch by week and filter

          const res = await fetch(`${API_BASE}/daily-learning/${roadmapId}/week/${week}`, {
            credentials: 'include'
          });
          const data = await res.json();

          if (data.success && data.data) {
            const foundDay = data.data.find(d => d.day === parseInt(day) || d.day === day);
            if (foundDay) {
              setDayData(foundDay);
              // Update generated content state
              if (foundDay.learningOptions) {
                setGeneratedContent({
                  text: foundDay.learningOptions.text,
                  video: foundDay.learningOptions.video,
                  audio: foundDay.learningOptions.audio,
                  image: foundDay.learningOptions.images
                });
              }
            } else {
              console.error('Day content not found in week data');
              // Fallback: try fetching by absolute day if possible, or handle error
            }
          }
        } catch (err) {
          console.error('Error fetching day content:', err);
        } finally {
          setLoading(false);
        }
      } else if (!dayData && !roadmapId) {
        // Only redirect if we really don't have enough info to fetch
        navigate('/learn');
      }
    };

    fetchDayContent();

    // Check if this day is already completed
    if (roadmapId) {
      checkCompletionStatus();
    }
  }, [dayData, roadmapId, week, day, navigate]);


  const refreshCompletionStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/progress/${roadmapId}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success && data.data) {
        const dayId = `week${week}-day${day}`;
        const isCompleted = data.data.completedLessons.some(
          lesson => lesson.lessonId === dayId
        );
        setCompleted(isCompleted);
        console.log('Completion status refreshed:', isCompleted);
      }
    } catch (err) {
      console.error('Error refreshing completion status:', err);
    }
  };

  // Refresh completion status when returning from quiz
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && roadmapId) {
        // Page became visible again, refresh completion status
        setTimeout(refreshCompletionStatus, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roadmapId, week, day]);

  const checkCompletionStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/progress/${roadmapId}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success && data.data) {
        const dayId = `week${week}-day${day}`;
        const isCompleted = data.data.completedLessons.some(
          lesson => lesson.lessonId === dayId
        );
        setCompleted(isCompleted);
      }
    } catch (err) {
      console.error('Error checking completion:', err);
    }
  };

  const generateContent = async (contentType) => {
    if (!dayData || !roadmapId) return;

    setGenerating(true);
    setGenerationError(null);

    try {
      // Call the Gemini API to generate content
      const response = await api.generateContent({
        roadmap: roadmapTitle || roadmapId,
        day: day,
        topic: dayData.topic || dayData.title,
        subtopic: dayData.title,
        content_type: contentType
      });

      if (response.success) {
        // Handle full module response (Antigravity Engine)
        if (contentType === 'full_module') {
          const moduleData = response.data;
          setGeneratedContent(prev => ({
            ...prev,
            text: moduleData.fullLesson ? {
              conceptExplanation: moduleData.fullLesson.explanation,
              realWorldAnalogy: moduleData.fullLesson.analogies?.[0],
              codeExamples: moduleData.fullLesson.realLifeExamples, // Using examples as code examples for now
              keyPoints: moduleData.fullLesson.stepByStepBreakdown
            } : prev.text,
            video: moduleData.videoScript ? {
              links: moduleData.videoLinks || [],
              script: moduleData.videoScript
            } : prev.video,
            audio: moduleData.audioScript ? {
              script: moduleData.audioScript,
              estimatedDuration: "3-5 mins"
            } : prev.audio,
            image: moduleData.mindmap ? {
              mindmap: {
                mainConcept: moduleData.mindmap.nodes?.[0]?.label || moduleData.title,
                subConcepts: moduleData.mindmap.nodes?.slice(1, 5).map(n => n.label) || [],
                useCases: [],
                commonMistakes: []
              }
            } : prev.image,
            studyPlan: moduleData.studyPlan,
            flashcards: moduleData.flashcards
          }));

          // Default to text mode after generation
          setSelectedMode('text');
        } else {
          // Handle standard single-content response
          setGeneratedContent(prev => ({
            ...prev,
            [contentType]: response.data
          }));
        }
        setGenerationError(null);
      } else {
        setGenerationError(response.message || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setGenerationError(error.message || 'An error occurred while generating content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Helper function to check if content is fallback/placeholder
  const isFallbackContent = (contentType) => {
    const content = generatedContent[contentType];
    if (!content) return false;

    // Check for placeholder text in various content types
    if (contentType === 'text' && content.conceptExplanation) {
      return content.conceptExplanation.includes('placeholder') ||
        content.conceptExplanation.includes('AI content generation service is currently unavailable');
    }
    return false;
  };

  // Helper function to regenerate content
  const regenerateContent = (contentType) => {
    // Clear the existing content for this type
    setGeneratedContent(prev => {
      const updated = { ...prev };
      delete updated[contentType];
      return updated;
    });
    // Generate new content
    generateContent(contentType);
  };


  const handleTakeQuiz = async () => {
    try {
      setLoading(true);
      console.log('Creating quiz for:', { roadmapId, topic: dayData.topic || dayData.title });

      // Create a quiz for this topic using the api service
      const response = await fetch(`${API_BASE}/quiz/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          roadmapType: roadmapId,
          difficulty: 'medium', // Initial difficulty (must be lowercase: easy, medium, hard, advanced)
          questionCount: 10,
          timeLimit: 15,
          topic: dayData.topic || dayData.title, // Pass topic to ensure relevance
          adaptiveDifficulty: true // Enable dynamic adaptive difficulty
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Quiz creation response:', data);

      if (data.success && data.data) {
        console.log('Quiz created successfully with ID:', data.data._id);
        console.log('Quiz has', data.data.questions?.length || 0, 'questions');

        // Ensure quiz has questions before navigating
        if (!data.data.questions || data.data.questions.length === 0) {
          throw new Error('Created quiz has no questions');
        }

        // Navigate to the quiz with the MongoDB _id
        navigate(`/quiz/${data.data._id}`, {
          state: {
            topic: dayData.topic || dayData.title,
            roadmapId,
            week,
            day,
            lessonId: `week${week}-day${day}`, // Pass lesson ID for progress update
            returnPath: location.pathname // Path to return to
          }
        });
      } else {
        throw new Error(data.message || 'Failed to create quiz');
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
      alert('Error creating quiz: ' + err.message + '. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 'text', label: 'Read', icon: Book, color: 'blue' },
    { id: 'video', label: 'Watch', icon: Video, color: 'red' },
    { id: 'audio', label: 'Listen', icon: Headphones, color: 'green' },
    { id: 'images', label: 'Visualize', icon: ImageIcon, color: 'purple' },
    { id: 'study_plan', label: 'To Do', icon: ListTodo, color: 'orange' },
    { id: 'flashcards', label: 'Flashcards', icon: Brain, color: 'pink' }
  ];

  const getModeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300',
      orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300',
      pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-300',
      indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-300'
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#344F1F] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 bg-white dashboard-dark:bg-[#0a0a0a] border-2 border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        title={isDarkMode ? "Light Mode" : "Dark Mode"}
      >
        {isDarkMode ? <Sun className="w-5 h-5 text-[#ecd69f]" /> : <Moon className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Header */}
      <header className="bg-white dashboard-dark:bg-[#0a0a0a] shadow-sm border-b border-gray-200 dashboard-dark:border-[#1a1a1a] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/learn')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dashboard-dark:text-[#ecd69f]">{dayData?.title || dayData?.topic || 'Learning Content'}</h1>
                <p className="text-sm text-gray-500 dashboard-dark:text-[#b8a67d]">
                  {roadmapTitle} • Week {week} • Day {day}
                </p>
              </div>
            </div>

            <button
              onClick={handleTakeQuiz}
              disabled={completed || loading}
              className={`px-6 py-2 rounded-2xl font-medium transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg ${completed
                ? 'bg-green-100 dashboard-dark:bg-green-900/30 text-green-700 dashboard-dark:text-green-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                }`}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : completed ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Completed
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  Take Quiz
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Learning Goals */}
        {dayData?.learningGoals && dayData.learningGoals.length > 0 && (
          <div className="bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-sm border border-gray-200 dashboard-dark:border-[#1a1a1a] p-6 mb-6 transition-all duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Learning Goals
            </h2>
            <ul className="space-y-2">
              {dayData.learningGoals.map((goal, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700 dashboard-dark:text-[#ecd69f]">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-4 rounded-2xl border-2 transition-all duration-300 ${isActive
                  ? getModeColor(mode.color) + ' border-current shadow-lg transform -translate-y-1'
                  : 'bg-white dashboard-dark:bg-[#0a0a0a] border-gray-200 dashboard-dark:border-[#1a1a1a] text-gray-600 dashboard-dark:text-[#b8a67d] hover:border-gray-300 dashboard-dark:hover:border-[#2a2a2a]'
                  }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">{mode.label}</div>
              </button>
            );
          })}
        </div>

        {/* Content Display */}
        <div className="bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl shadow-sm border border-gray-200 dashboard-dark:border-[#1a1a1a] p-8 transition-all duration-300">
          {/* Generation Error */}
          {generationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{generationError}</p>
            </div>
          )}

          {/* Global Generate Button (if no content exists) */}
          {!generatedContent.text && !generatedContent.video && !generatedContent.audio && !generatedContent.image && !generatedContent.studyPlan && (
            <div className="text-center py-12 mb-8 border-b border-gray-100">
              <Sparkles className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Learning Journey</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">Generate a complete, personalized learning module for this topic instantly with our Antigravity Engine.</p>
              <button
                onClick={() => generateContent('full_module')}
                disabled={generating}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto transform hover:-translate-y-1"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Full Module...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Generate Full Lesson
                  </>
                )}
              </button>
              <p className="text-xs text-gray-400 mt-4">Includes: Lesson, Video Script, Audio, Mindmap, Study Plan, Flashcards & Quiz</p>
            </div>
          )}

          {/* Text Mode */}
          {selectedMode === 'text' && (
            <>
              {!generatedContent.text ? (
                <div className="text-center py-12">
                  <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Learning Content</h3>
                  <p className="text-gray-600 mb-6">Click the button below to generate AI-powered learning content for this topic.</p>
                  <button
                    onClick={() => generateContent('text')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Text Content'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Fallback Content Warning */}
                  {isFallbackContent('text') && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-yellow-900 mb-1">⚠️ Placeholder Content Detected</h4>
                          <p className="text-yellow-800 text-sm">This appears to be fallback content. Click "Regenerate" to generate real AI content.</p>
                        </div>
                        <button
                          onClick={() => regenerateContent('text')}
                          disabled={generating}
                          className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {generating ? 'Regenerating...' : 'Regenerate'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Regenerate Button (always visible) */}
                  {!isFallbackContent('text') && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => regenerateContent('text')}
                        disabled={generating}
                        className="px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {generating ? 'Regenerating...' : 'Regenerate Content'}
                      </button>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Concept Explanation</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {generatedContent.text.conceptExplanation || generatedContent.text.content}
                    </p>
                  </div>

                  {generatedContent.text.realWorldAnalogy && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Real-World Analogy
                      </h4>
                      <p className="text-blue-800">{generatedContent.text.realWorldAnalogy}</p>
                    </div>
                  )}

                  {generatedContent.text.codeExamples && generatedContent.text.codeExamples.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Code className="w-5 h-5 text-[#344F1F]" />
                        Code Examples
                      </h4>
                      {generatedContent.text.codeExamples.map((example, idx) => (
                        <pre key={idx} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-3">
                          <code>{typeof example === 'string' ? example : JSON.stringify(example)}</code>
                        </pre>
                      ))}
                    </div>
                  )}

                  {generatedContent.text.keyPoints && generatedContent.text.keyPoints.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Key Points</h4>
                      <ul className="space-y-2">
                        {generatedContent.text.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-[#344F1F] rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-700">{typeof point === 'string' ? point : point.title || JSON.stringify(point)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Video Mode */}
          {selectedMode === 'video' && (
            <>
              {!generatedContent.video ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Video Resources</h3>
                  <p className="text-gray-600 mb-6">Click the button below to generate curated video resources for this topic.</p>
                  <button
                    onClick={() => generateContent('video')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Video Content'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Video Resources</h3>
                    <button
                      onClick={() => regenerateContent('video')}
                      disabled={generating}
                      className="px-3 py-1.5 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>

                  {/* Display Video Script if available (Antigravity) */}
                  {generatedContent.video.script && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        Video Script
                      </h4>
                      <div className="space-y-4">
                        {generatedContent.video.script.sceneBreakdown && (
                          <div>
                            <h5 className="font-medium text-red-800 mb-2">Scene Breakdown</h5>
                            <ul className="list-disc pl-5 space-y-1 text-red-700">
                              {generatedContent.video.script.sceneBreakdown.map((scene, idx) => (
                                <li key={idx}>{typeof scene === 'string' ? scene : `${scene.scene}: ${scene.description} `}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {generatedContent.video.script.finalScript && (
                          <div>
                            <h5 className="font-medium text-red-800 mb-2">Script</h5>
                            <p className="text-red-700 whitespace-pre-line">{generatedContent.video.script.finalScript}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Helper function to convert YouTube URLs to embed format */}
                  {(() => {
                    const getYouTubeEmbedUrl = (url) => {
                      if (!url) return '';

                      // Already an embed URL
                      if (url.includes('/embed/')) return url;

                      // Extract video ID from watch URL
                      if (url.includes('watch?v=')) {
                        try {
                          const videoId = new URL(url).searchParams.get('v');
                          if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                        } catch (e) {
                          console.error('Error parsing YouTube URL:', e);
                        }
                      }

                      // Extract from short URL (youtu.be)
                      if (url.includes('youtu.be/')) {
                        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                      }

                      // If it's a search URL or playlist, create a search embed
                      if (url.includes('/results?search_query=') || url.includes('search_query=')) {
                        try {
                          const searchQuery = new URL(url).searchParams.get('search_query');
                          if (searchQuery) {
                            // Use a curated playlist or search result
                            return `https://www.youtube.com/embed/videoseries?list=PLWKjhJtqVAbnRT_hue-3zyiuIYj0OlpyG`;
                          }
                        } catch (e) {
                          console.error('Error parsing search URL:', e);
                        }
                      }

                      // Return original URL as fallback
                      return url;
                    };

                    return null; // This is just to define the function
                  })()}

                  {generatedContent.video.links && generatedContent.video.links.length > 0 ? (
                    generatedContent.video.links.map((video, idx) => {
                      const embedUrl = (() => {
                        const url = video.url;
                        if (!url) return '';
                        if (url.includes('/embed/')) return url;
                        if (url.includes('watch?v=')) {
                          try {
                            const videoId = new URL(url).searchParams.get('v');
                            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                          } catch (e) { }
                        }
                        if (url.includes('youtu.be/')) {
                          const videoId = url.split('youtu.be/')[1]?.split('?')[0];
                          if (videoId) return `https://www.youtube.com/embed/${videoId}`;
                        }
                        return url;
                      })();

                      return (
                        <div key={idx} className="border border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-lg p-4 hover:shadow-md transition-shadow bg-white dashboard-dark:bg-[#0a0a0a]">
                          <h4 className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] mb-3">{video.title}</h4>
                          <div className="relative w-full pb-[56.25%] mb-4 bg-gray-100 dashboard-dark:bg-[#1a1a1a] rounded-lg overflow-hidden">
                            <iframe
                              src={embedUrl}
                              title={video.title}
                              className="absolute top-0 left-0 w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-red-100 dashboard-dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <Video className="w-4 h-4 text-red-600 dashboard-dark:text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dashboard-dark:text-[#b8a67d] mb-1">{video.description}</p>
                              {video.duration && (
                                <span className="text-xs text-gray-500 dashboard-dark:text-[#b8a67d] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {video.duration}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    !generatedContent.video.script && <p className="text-gray-500 dashboard-dark:text-[#b8a67d]">No video links available yet.</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Audio Mode */}
          {selectedMode === 'audio' && (
            <>
              {!generatedContent.audio ? (
                <div className="text-center py-12">
                  <Headphones className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Audio Learning</h3>
                  <p className="text-gray-600 mb-6">Click the button below to generate an audio script for this topic.</p>
                  <button
                    onClick={() => generateContent('audio')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Audio Content'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Audio Learning</h3>
                    <button
                      onClick={() => regenerateContent('audio')}
                      disabled={generating}
                      className="px-3 py-1.5 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Headphones className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-2">Audio Script</h4>
                        {generatedContent.audio.estimatedDuration && (
                          <span className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                            <Clock className="w-4 h-4" />
                            {generatedContent.audio.estimatedDuration}
                          </span>
                        )}
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                          {generatedContent.audio.script || generatedContent.audio.content}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Images/Mindmap Mode */}
          {selectedMode === 'images' && (
            <>
              {!generatedContent.image ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Visual Mindmap</h3>
                  <p className="text-gray-600 mb-6">Click the button below to generate a visual mindmap for this topic.</p>
                  <button
                    onClick={() => generateContent('image')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Mindmap'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Visual Learning - Mindmap</h3>
                    <button
                      onClick={() => regenerateContent('image')}
                      disabled={generating}
                      className="px-3 py-1.5 bg-purple-100 text-purple-700 font-medium rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {generating ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                    {generatedContent.image.mindmap && (
                      <>
                        <div className="text-center mb-6">
                          <div className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg text-lg font-semibold">
                            {generatedContent.image.mindmap.mainConcept}
                          </div>
                        </div>

                        {generatedContent.image.mindmap.subConcepts && generatedContent.image.mindmap.subConcepts.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {generatedContent.image.mindmap.subConcepts.map((concept, idx) => (
                              <div key={idx} className="bg-white border border-purple-300 rounded-lg p-4 text-center">
                                <p className="text-gray-800 font-medium">{concept}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {generatedContent.image.mindmap.useCases && generatedContent.image.mindmap.useCases.length > 0 && (
                          <div className="mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Use Cases</h4>
                            <ul className="space-y-2">
                              {generatedContent.image.mindmap.useCases.map((useCase, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{useCase}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {generatedContent.image.mindmap.commonMistakes && generatedContent.image.mindmap.commonMistakes.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Common Mistakes to Avoid</h4>
                            <ul className="space-y-2">
                              {generatedContent.image.mindmap.commonMistakes.map((mistake, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-700">{mistake}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Study Plan Mode */}
          {selectedMode === 'study_plan' && (
            <>
              {!generatedContent.studyPlan ? (
                <div className="text-center py-12">
                  <ListTodo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Study Plan</h3>
                  <p className="text-gray-600 mb-6">Generate a detailed study plan to master this topic.</p>
                  <button
                    onClick={() => generateContent('full_module')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Full Module'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Study Plan</h3>
                  <div className="grid gap-4">
                    {generatedContent.studyPlan.map((dayPlan, idx) => (
                      <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                        <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          {dayPlan.day}
                        </h4>
                        <ul className="space-y-3">
                          {dayPlan.tasks.map((task, tIdx) => (
                            <li key={tIdx} className="flex items-start gap-3">
                              <div className="w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                                {tIdx + 1}
                              </div>
                              <span className="text-gray-800 pt-0.5">
                                {typeof task === 'string' ? task : (
                                  <span>
                                    <span className="font-medium block">{task.title}</span>
                                    <span className="text-sm text-gray-600 block">{task.description}</span>
                                  </span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Flashcards Mode */}
          {selectedMode === 'flashcards' && (
            <>
              {!generatedContent.flashcards ? (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Generate Flashcards</h3>
                  <p className="text-gray-600 mb-6">Generate flashcards to test your knowledge.</p>
                  <button
                    onClick={() => generateContent('full_module')}
                    disabled={generating}
                    className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    {generating ? 'Generating...' : 'Generate Full Module'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Flashcards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {generatedContent.flashcards.map((card, idx) => (
                      <div key={idx} className="group h-64 perspective-1000">
                        <div className="relative w-full h-full transition-all duration-500 transform style-preserve-3d group-hover:rotate-y-180 cursor-pointer">
                          {/* Front */}
                          <div className="absolute w-full h-full bg-white border-2 border-pink-200 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm backface-hidden">
                            <h4 className="text-sm font-semibold text-pink-500 mb-4 uppercase tracking-wider">Question {idx + 1}</h4>
                            <p className="text-lg font-medium text-gray-900">{card.front}</p>
                            <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              Hover to flip
                            </div>
                          </div>
                          {/* Back */}
                          <div className="absolute w-full h-full bg-pink-50 border-2 border-pink-300 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-sm backface-hidden rotate-y-180">
                            <h4 className="text-sm font-semibold text-pink-600 mb-4 uppercase tracking-wider">Answer</h4>
                            <p className="text-gray-800">{card.back}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}


        </div>

        {/* Mini Recap */}
        {dayData?.miniRecap && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Quick Recap
            </h3>
            <p className="text-gray-700">{dayData.miniRecap}</p>
          </div>
        )}

        {/* Practice Suggestions */}
        {dayData?.practiceSuggestions && dayData.practiceSuggestions.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-[#344F1F]" />
              Practice Suggestions
            </h3>
            <ul className="space-y-3">
              {dayData.practiceSuggestions.map((suggestion, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-[#344F1F] text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                    {idx + 1}
                  </div>
                  <span className="text-gray-700 pt-0.5">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optional Challenge */}
        {dayData?.optionalChallenge && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Optional Challenge 🚀
            </h3>
            <p className="text-gray-800 font-medium">{dayData.optionalChallenge}</p>
          </div>
        )}
      </div>
    </div>
  );
}