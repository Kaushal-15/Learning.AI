import { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import {
    Book,
    Video,
    Headphones,
    Image as ImageIcon,
    CheckCircle,
    Lightbulb,
    Code,
    Clock,
    AlertCircle,
    Play,
    Pause,
    RotateCcw
} from 'lucide-react';

/**
 * Mermaid Diagram Component
 */
const MermaidDiagram = ({ chart }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (chart && containerRef.current) {
            mermaid.initialize({
                startOnLoad: true,
                theme: 'default',
                securityLevel: 'loose',
            });

            const renderDiagram = async () => {
                try {
                    containerRef.current.innerHTML = '';
                    const { svg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
                    containerRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid rendering failed:', error);
                    containerRef.current.innerHTML = '<p class="text-red-500 text-sm">Failed to render diagram</p>';
                }
            };

            renderDiagram();
        }
    }, [chart]);

    return <div ref={containerRef} className="w-full overflow-x-auto flex justify-center p-4" />;
};

/**
 * Podcast Player Component
 */
const PodcastPlayer = ({ title, dialogue, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLine, setCurrentLine] = useState(-1);
    const synth = window.speechSynthesis;
    const [voices, setVoices] = useState([]);

    useEffect(() => {
        const loadVoices = () => {
            setVoices(synth.getVoices());
        };
        loadVoices();
        synth.onvoiceschanged = loadVoices;

        return () => {
            synth.cancel();
        };
    }, []);

    const playDialogue = () => {
        if (isPlaying) {
            synth.pause();
            setIsPlaying(false);
            return;
        }

        if (synth.paused) {
            synth.resume();
            setIsPlaying(true);
            return;
        }

        setIsPlaying(true);
        synth.cancel();

        let startIndex = currentLine === -1 ? 0 : currentLine;

        const speakLine = (index) => {
            if (index >= dialogue.length) {
                setIsPlaying(false);
                setCurrentLine(-1);
                return;
            }

            setCurrentLine(index);
            const line = dialogue[index];
            const utterance = new SpeechSynthesisUtterance(line.text);

            // Try to assign different voices
            // Host: Default/First voice
            // Expert: Second voice or different gender if available
            if (voices.length > 0) {
                if (line.speaker === 'Host') {
                    utterance.voice = voices[0];
                } else {
                    utterance.voice = voices.find(v => v.name !== voices[0].name) || voices[1] || voices[0];
                }
            }

            utterance.rate = 1.0;
            utterance.pitch = line.speaker === 'Host' ? 1.0 : 0.9;

            utterance.onend = () => {
                speakLine(index + 1);
            };

            synth.speak(utterance);
        };

        speakLine(startIndex);
    };

    const reset = () => {
        synth.cancel();
        setIsPlaying(false);
        setCurrentLine(-1);
    };

    return (
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                        <Headphones className="w-4 h-4" />
                        <span>AI Podcast • {duration}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={reset}
                        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                        title="Reset"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={playDialogue}
                        className="p-3 rounded-full bg-green-500 hover:bg-green-400 text-white transition-colors shadow-lg hover:shadow-green-500/30"
                    >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
                    </button>
                </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {dialogue.map((line, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-4 transition-opacity duration-300 ${currentLine === idx ? 'opacity-100 scale-[1.02]' :
                                currentLine !== -1 ? 'opacity-40' : 'opacity-100'
                            }`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${line.speaker === 'Host' ? 'bg-blue-500' : 'bg-purple-500'
                            }`}>
                            {line.speaker[0]}
                        </div>
                        <div className="flex-1 bg-gray-700/50 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wider">
                                {line.speaker}
                            </p>
                            <p className="text-gray-100 leading-relaxed">
                                {line.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Curated Video Resources</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Video className="w-4 h-4" />
                            <span>Hand-picked tutorials</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {content.links && content.links.map((video, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="aspect-video w-full bg-gray-200 relative">
                                <iframe
                                    src={video.url}
                                    title={video.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.description}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{video.duration}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // AUDIO CONTENT
    if (content.type === 'audio') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                {content.dialogue ? (
                    <PodcastPlayer
                        title={content.title || "Audio Lesson"}
                        dialogue={content.dialogue}
                        duration={content.estimatedDuration}
                    />
                ) : (
                    // Fallback for old format
                    <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r">
                        <h3 className="font-semibold text-green-900 mb-3">Audio Script</h3>
                        <p className="text-green-800 leading-relaxed whitespace-pre-line italic">
                            {content.voiceover_text || content.script}
                        </p>
                    </div>
                )}

                {content.key_points && content.key_points.length > 0 && (
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Key Takeaways</h3>
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
    if (content.type === 'image') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
                <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">{content.title || "Visual Mindmap"}</h2>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-purple-600" />
                    </div>
                </div>

                {/* Mermaid Diagram */}
                {content.mermaid && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                        <MermaidDiagram chart={content.mermaid} />
                    </div>
                )}

                {/* Fallback/Additional Text View */}
                {content.mindmap_nodes && (
                    <div className="mt-8">
                        <h3 className="font-semibold text-gray-900 mb-4">Detailed Breakdown</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {content.mindmap_nodes.branches && content.mindmap_nodes.branches.map((branch, idx) => (
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
