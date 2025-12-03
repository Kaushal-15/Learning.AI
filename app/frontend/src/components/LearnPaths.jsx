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
  Sparkles
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import api from '../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function LearnPaths() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roadmapId, week, day, dayData, roadmapTitle } = location.state || {};

  const [selectedMode, setSelectedMode] = useState('text');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(() => {
    if (dayData?.learningOptions) {
      // Map the database structure to the frontend state structure
      return {
        text: dayData.learningOptions.text,
        video: dayData.learningOptions.video,
        audio: dayData.learningOptions.audio,
        image: dayData.learningOptions.images // Note: DB uses 'images', frontend state uses 'image'
      };
    }
    return {};
  });
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  useEffect(() => {
    if (!dayData) {
      navigate('/learn');
      return;
    }

    // Check if this day is already completed
    checkCompletionStatus();
  }, [dayData, navigate]);

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
        // Store the generated content in state
        setGeneratedContent(prev => ({
          ...prev,
          [contentType]: response.data
        }));
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

  const markAsCompleted = async () => {
    try {
      const dayId = `week${week}-day${day}`;
      const res = await fetch(`${API_BASE}/progress/complete-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roadmapId,
          lessonId: dayId,
          timeSpent: 60, // default 60 minutes
          quizScore: 100
        })
      });

      const data = await res.json();
      if (data.success) {
        setCompleted(true);
      }
    } catch (err) {
      console.error('Error marking as completed:', err);
    }
  };

  const modes = [
    { id: 'text', label: 'Read', icon: Book, color: 'blue' },
    { id: 'video', label: 'Watch', icon: Video, color: 'red' },
    { id: 'audio', label: 'Listen', icon: Headphones, color: 'green' },
    { id: 'images', label: 'Visualize', icon: ImageIcon, color: 'purple' }
  ];

  const getModeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300',
      red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-300',
      green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300',
      purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300'
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
      <AnimatedBackground />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
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
                <h1 className="text-xl font-semibold text-gray-900">{dayData?.title || dayData?.topic || 'Learning Content'}</h1>
                <p className="text-sm text-gray-500">
                  {roadmapTitle} • Week {week} • Day {day}
                </p>
              </div>
            </div>

            <button
              onClick={markAsCompleted}
              disabled={completed}
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${completed
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-[#344F1F] text-white hover:bg-[#2a3f1a]'
                }`}
            >
              <CheckCircle className="w-5 h-5" />
              {completed ? 'Completed' : 'Mark as Complete'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Learning Goals */}
        {dayData?.learningGoals && dayData.learningGoals.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#344F1F]" />
              Learning Goals
            </h2>
            <ul className="space-y-2">
              {dayData.learningGoals.map((goal, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
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
                className={`p-4 rounded-lg border-2 transition-all ${isActive
                  ? getModeColor(mode.color) + ' border-current shadow-md'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">{mode.label}</div>
              </button>
            );
          })}
        </div>

        {/* Content Display */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Generation Error */}
          {generationError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{generationError}</p>
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
                          <code>{example}</code>
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
                            <span className="text-gray-700">{point}</span>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Video Resources</h3>
                  {generatedContent.video.links && generatedContent.video.links.length > 0 ? (
                    generatedContent.video.links.map((video, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Video className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{video.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{video.description}</p>
                            {video.duration && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {video.duration}
                              </span>
                            )}
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Watch Video →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No video content available yet.</p>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Audio Learning</h3>
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Visual Learning - Mindmap</h3>

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