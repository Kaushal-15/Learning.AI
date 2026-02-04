import React, { useState, useEffect } from 'react';
import { Trash2, Upload as UploadIcon, FileText, Zap, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FileUpload from './CustomLearning/FileUpload';
import QuizConfig from './CustomLearning/QuizConfig';
import Sidebar from './Sidebar';
import '../styles/DevvoraStyles.css';

const CustomLearning = () => {
    const navigate = useNavigate();
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE = `${BASE_URL}/api`;
    const [uploadedDocId, setUploadedDocId] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [quizResults, setQuizResults] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocuments();
        fetchQuizResults();
    }, []);

    const fetchDocuments = async () => {
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch(`${API_BASE}/custom-learning/documents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizResults = async () => {
        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch(`${API_BASE}/quiz?source=custom&limit=50`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            const data = await response.json();
            console.log('Quiz results response:', data);

            // Handle both 'quizzes' and 'data' response formats
            const quizzes = data.quizzes || data.data || [];
            console.log('Quizzes found:', quizzes.length);

            if (data.success && quizzes.length > 0) {
                // Group quizzes by document title
                const grouped = {};
                quizzes.forEach(quiz => {
                    const docName = quiz.title?.replace('Custom Quiz: ', '') || 'Unknown';
                    if (!grouped[docName]) {
                        grouped[docName] = [];
                    }
                    grouped[docName].push(quiz);
                });
                console.log('Grouped results:', grouped);
                setQuizResults(grouped);
            }
        } catch (error) {
            console.error('Error fetching quiz results:', error);
        }
    };

    const handleDelete = async (documentId) => {
        if (!confirm('Are you sure you want to delete this document? This will also delete all associated quizzes.')) {
            return;
        }

        try {
            const token = document.cookie.split('; ').find(row => row.startsWith('accessToken='))?.split('=')[1];
            const response = await fetch(`${API_BASE}/custom-learning/documents/${documentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                fetchDocuments();
                fetchQuizResults();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const getDocumentResults = (docName) => {
        const results = quizResults[docName] || [];
        console.log(`Results for ${docName}:`, results.length);
        return results;
    };

    return (
        <div className="dashboard-container">
            <Sidebar />

            <main className="dashboard-main">
                {/* Welcome Card - Matching Dashboard Style */}
                <div className="dashboard-welcome-card animate-fade-in bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    <div className="welcome-card-content relative z-10">
                        <h3 className="welcome-back-text">Custom Learning</h3>
                        <h2 className="welcome-name">Upload & Master Any Topic 🚀</h2>
                        <p className="welcome-description">
                            Upload your study materials and let our AI generate personalized quizzes to help you master any topic.
                        </p>
                    </div>
                    <div className="welcome-card-character relative z-10">
                        <div className="character-3d-dashboard animate-float">📚</div>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="dashboard-cta-grid">
                    <div className="dashboard-cta-card cta-test animate-scale-in hover:scale-105 hover:shadow-xl-cyan transition-all duration-300 bg-gradient-to-br from-cyan-500 to-blue-600">
                        <div className="cta-icon-wrapper">
                            <UploadIcon className="w-8 h-8" />
                        </div>
                        <div className="cta-content">
                            <h3 className="cta-title">Upload Materials</h3>
                            <p className="cta-description">PDF, DOCX, or TXT files (max 5MB)</p>
                        </div>
                    </div>

                    <div className="dashboard-cta-card cta-quiz animate-scale-in hover:scale-105 hover:shadow-xl-violet transition-all duration-300 bg-gradient-to-br from-violet-500 to-purple-600">
                        <div className="cta-icon-wrapper">
                            <Zap className="w-8 h-8" />
                        </div>
                        <div className="cta-content">
                            <h3 className="cta-title">AI-Powered Quizzes</h3>
                            <p className="cta-description">Static or Dynamic difficulty modes</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <FileUpload onUploadSuccess={(docId) => {
                            setUploadedDocId(docId);
                            fetchDocuments();
                        }} />

                        {/* Instructions Card */}
                        <div className="mt-6 course-progress-card">
                            <h4 className="font-semibold text-gray-900 dark:text-[#f5e6d3] mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                How it works
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-[#b8a67d]">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5">•</span>
                                    <span>Upload PDF, DOCX, or TXT files (max 5MB)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-purple-500 mt-0.5">•</span>
                                    <span>System extracts text and analyzes content</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-pink-500 mt-0.5">•</span>
                                    <span>Choose "Static" for standard difficulty levels</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-0.5">•</span>
                                    <span>Choose "Dynamic" for AI-adaptive difficulty</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-cyan-500 mt-0.5">•</span>
                                    <span>Take the quiz and track your progress</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div>
                        {uploadedDocId ? (
                            <QuizConfig documentId={uploadedDocId} onQuizGenerated={fetchQuizResults} />
                        ) : (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1a1a1a] rounded-xl border-2 border-dashed border-gray-300 dark:border-[#2a2a2a] text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-3xl">⏳</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f5e6d3] mb-2">Upload a file first</h3>
                                <p className="text-gray-500 dark:text-[#b8a67d] text-sm">
                                    Once you upload a document, the quiz configuration options will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Uploaded Documents Section */}
                {documents.length > 0 && (
                    <div className="dashboard-section">
                        <div className="section-header-dashboard">
                            <h3 className="section-title-dashboard">Your Uploaded Documents</h3>
                            <span className="text-sm text-gray-500 dark:text-[#b8a67d]">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.map((doc) => {
                                const results = getDocumentResults(doc.originalName);
                                const avgScore = results.length > 0
                                    ? Math.round(results.reduce((acc, r) => acc + (r.accuracy || 0), 0) / results.length)
                                    : 0;

                                return (
                                    <div key={doc._id} className="stat-card hover:scale-105 transition-all duration-300">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-white" />
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-[#f5e6d3] truncate flex-1">{doc.originalName}</h3>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-[#b8a67d]">
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {doc.chunkCount} chunks
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                                        {(doc.size / 1024).toFixed(1)} KB
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 dark:text-[#8a7a5d] mt-2">
                                                    📅 {new Date(doc.uploadedAt).toLocaleDateString()}
                                                </p>

                                                {/* Quiz Stats */}
                                                {results.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#2a2a2a]">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-gray-500 dark:text-[#b8a67d]">Quizzes taken:</span>
                                                            <span className="font-semibold text-gray-900 dark:text-[#f5e6d3]">{results.length}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs mt-1">
                                                            <span className="text-gray-500 dark:text-[#b8a67d]">Avg Score:</span>
                                                            <span className={`font-semibold ${avgScore >= 80 ? 'text-green-600 dark:text-green-400' : avgScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {avgScore}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDelete(doc._id)}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                                                title="Delete document"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <button
                                                onClick={() => setUploadedDocId(doc._id)}
                                                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:scale-105"
                                            >
                                                Generate Quiz
                                            </button>

                                            {results.length > 0 && (
                                                <button
                                                    onClick={() => navigate('/custom-quiz-history')}
                                                    className="w-full py-2.5 px-4 bg-white dark:bg-[#2a2a2a] border-2 border-gray-300 dark:border-[#3a3a3a] hover:border-purple-500 dark:hover:border-purple-500 text-gray-700 dark:text-[#f5e6d3] rounded-lg text-sm font-semibold transition-all hover:shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    <BarChart3 className="w-4 h-4" />
                                                    View Results ({results.length})
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomLearning;
