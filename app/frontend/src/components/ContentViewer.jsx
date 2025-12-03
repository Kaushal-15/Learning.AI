import { useState } from 'react';
import {
    Book,
    Video,
    Headphones,
    Image as ImageIcon,
    CheckCircle,
    Lightbulb,
    Code,
    Clock,
    AlertCircle
} from 'lucide-react';

/**
 * ContentViewer Component
 * Universal component for displaying AI-generated learning content
 * Supports: text, video, audio, and image (mindmap) content types
 */
export default function ContentViewer({ content, loading, error }) {
    const [expandedScene, setExpandedScene] = useState(null);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#344F1F]"></div>
                    <p className="text-gray-600 font-medium">Generating content with AI...</p>
                    <p className="text-sm text-gray-500">This may take a few seconds</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-red-900 font-semibold mb-1">Content Generation Failed</h3>
                        <p className="text-red-700 text-sm">{error}</p>
                        <p className="text-red-600 text-xs mt-2">Please try again or contact support if the issue persists.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-500">No content available</p>
            </div>
        );
    }

    // TEXT CONTENT
    if (content.type === 'text') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
                    <div className="prose max-w-none">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{content.explanation}</p>
                    </div>
                </div>

                {content.steps && content.steps.length > 0 && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r">
                        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            Step-by-Step
                        </h3>
                        <ol className="space-y-2 list-decimal list-inside">
                            {content.steps.map((step, idx) => (
                                <li key={idx} className="text-blue-800">{step}</li>
                            ))}
                        </ol>
                    </div>
                )}

                {content.real_world_examples && content.real_world_examples.length > 0 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-r">
                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5" />
                            Real-World Examples
                        </h3>
                        <ul className="space-y-2">
                            {content.real_world_examples.map((example, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-green-800">{example}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {content.quiz && content.quiz.length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
                        <h3 className="font-semibold text-purple-900 mb-4">Quick Quiz</h3>
                        <div className="space-y-4">
                            {content.quiz.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded border border-purple-200">
                                    <p className="font-medium text-gray-900 mb-2">{item.q}</p>
                                    <p className="text-sm text-gray-700">
                                        <span className="font-semibold text-purple-700">Answer:</span> {item.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // VIDEO CONTENT
    if (content.type === 'video') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{content.duration_seconds} seconds</span>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <Video className="w-6 h-6 text-red-600" />
                    </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <h3 className="font-semibold text-gray-900 mb-2">Full Script</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">{content.script}</p>
                </div>

                {content.scenes && content.scenes.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Scene Breakdown</h3>
                        <div className="space-y-3">
                            {content.scenes.map((scene, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                >
                                    <button
                                        onClick={() => setExpandedScene(expandedScene === idx ? null : idx)}
                                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                                    >
                                        <span className="font-semibold text-gray-900">Scene {scene.scene}</span>
                                        <span className="text-sm text-gray-600">
                                            {expandedScene === idx ? '▲' : '▼'}
                                        </span>
                                    </button>
                                    {expandedScene === idx && (
                                        <div className="p-4 bg-white space-y-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Visuals
                                                </h4>
                                                <p className="text-gray-600 text-sm">{scene.visuals}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                                    <Headphones className="w-4 h-4" />
                                                    Narration
                                                </h4>
                                                <p className="text-gray-600 text-sm italic">"{scene.narration}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // AUDIO CONTENT
    if (content.type === 'audio') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Headphones className="w-6 h-6 text-green-600" />
                    </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r">
                    <h3 className="font-semibold text-green-900 mb-3">Audio Script</h3>
                    <p className="text-green-800 leading-relaxed whitespace-pre-line italic">
                        {content.voiceover_text}
                    </p>
                </div>

                {content.key_points && content.key_points.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Key Points</h3>
                        <div className="space-y-2">
                            {content.key_points.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                                        {idx + 1}
                                    </div>
                                    <span className="text-gray-700 pt-0.5">{point}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // IMAGE/MINDMAP CONTENT
    if (content.type === 'image' && content.mindmap_nodes) {
        const { central_topic, branches } = content.mindmap_nodes;

        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-purple-600" />
                    </div>
                </div>

                {/* Central Topic */}
                <div className="flex justify-center mb-8">
                    <div className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-lg">
                        {central_topic}
                    </div>
                </div>

                {/* Branches */}
                {branches && branches.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {branches.map((branch, idx) => (
                            <div
                                key={idx}
                                className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                            >
                                <h3 className="font-bold text-purple-900 mb-3 text-lg">{branch.title}</h3>
                                {branch.subpoints && branch.subpoints.length > 0 && (
                                    <ul className="space-y-2">
                                        {branch.subpoints.map((point, pointIdx) => (
                                            <li key={pointIdx} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                                <span className="text-gray-700 text-sm">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Fallback for unknown content type
    return (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8">
            <p className="text-gray-500">Unknown content type: {content.type}</p>
        </div>
    );
}
