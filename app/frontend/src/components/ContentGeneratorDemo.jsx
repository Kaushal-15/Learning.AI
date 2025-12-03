import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import ContentViewer from './ContentViewer';
import api from '../services/api';
import AnimatedBackground from './AnimatedBackground';

/**
 * ContentGeneratorDemo
 * Demo page to test AI content generation functionality
 */
export default function ContentGeneratorDemo() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        roadmap: 'Frontend Development',
        day: 4,
        topic: 'JavaScript Basics',
        subtopic: 'Functions',
        content_type: 'text'
    });
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'day' ? parseInt(value) : value
        }));
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setContent(null);

        try {
            const response = await api.generateContent(formData);

            if (response.success) {
                setContent(response.data);
            } else {
                setError(response.message || 'Failed to generate content');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while generating content');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 relative">
            <AnimatedBackground />

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">AI Content Generator</h1>
                                <p className="text-sm text-gray-500">Test dynamic content generation</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Input Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Content Parameters
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Roadmap
                            </label>
                            <input
                                type="text"
                                name="roadmap"
                                value={formData.roadmap}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g., Frontend Development"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Day
                            </label>
                            <input
                                type="number"
                                name="day"
                                value={formData.day}
                                onChange={handleInputChange}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Topic
                            </label>
                            <input
                                type="text"
                                name="topic"
                                value={formData.topic}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g., JavaScript Basics"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Subtopic
                            </label>
                            <input
                                type="text"
                                name="subtopic"
                                value={formData.subtopic}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="e.g., Functions"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Content Type
                            </label>
                            <select
                                name="content_type"
                                value={formData.content_type}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="text">Text</option>
                                <option value="video">Video Script</option>
                                <option value="audio">Audio Script</option>
                                <option value="image">Mindmap</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                {loading ? 'Generating...' : 'Generate Content'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Display */}
                <ContentViewer content={content} loading={loading} error={error} />
            </div>
        </div>
    );
}
