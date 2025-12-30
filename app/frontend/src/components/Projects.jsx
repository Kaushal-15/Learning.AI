import { useState, useEffect } from 'react';
import {
    Github,
    ExternalLink,
    CheckCircle,
    Trophy,
    Code,
    Terminal,
    Layout,
    Server,
    AlertCircle,
    Loader,
    Clock,
    Lightbulb,
    Target,
    ChevronDown,
    ChevronUp,
    Zap,
    BookOpen
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import "../styles/DevvoraStyles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function Projects({ roadmapId }) {
    const { isDarkMode } = useTheme();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(null);
    const [submissionUrls, setSubmissionUrls] = useState({});
    const [error, setError] = useState(null);
    const [expandedProjects, setExpandedProjects] = useState({});

    useEffect(() => {
        fetchProjects();
    }, [roadmapId]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/projects/${roadmapId}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setProjects(data.data);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (projectId) => {
        const url = submissionUrls[projectId];
        if (!url) return;

        try {
            setSubmitting(projectId);
            const res = await fetch(`${API_BASE}/projects/${roadmapId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    projectId,
                    submissionUrl: url
                })
            });

            const data = await res.json();

            if (data.success) {
                setProjects(prev => prev.map(p => {
                    if (p.id === projectId) {
                        return {
                            ...p,
                            isCompleted: true,
                            submissionUrl: url,
                            submittedAt: new Date().toISOString()
                        };
                    }
                    return p;
                }));

                if (data.data.isNewSubmission) {
                    alert(`Project submitted! You earned ${data.data.xpEarned} XP!`);
                }
            } else {
                alert(data.message || 'Submission failed');
            }
        } catch (err) {
            console.error('Error submitting project:', err);
            alert('Error submitting project');
        } finally {
            setSubmitting(null);
        }
    };

    const toggleExpanded = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'easy': return 'text-green-500 bg-green-50 border-green-200 dashboard-dark:bg-green-900/20 dashboard-dark:border-green-900';
            case 'medium': return 'text-orange-500 bg-orange-50 border-orange-200 dashboard-dark:bg-orange-900/20 dashboard-dark:border-orange-900';
            case 'hard': return 'text-red-500 bg-red-50 border-red-200 dashboard-dark:bg-red-900/20 dashboard-dark:border-red-900';
            default: return 'text-gray-500 bg-gray-50 border-gray-200';
        }
    };

    const getIcon = (difficulty) => {
        switch (difficulty) {
            case 'easy': return <Layout className="w-5 h-5" />;
            case 'medium': return <Server className="w-5 h-5" />;
            case 'hard': return <Terminal className="w-5 h-5" />;
            default: return <Code className="w-5 h-5" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
                    <Code className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dashboard-dark:text-[#ecd69f]">Capstone Projects</h2>
                    <p className="text-gray-600 dashboard-dark:text-[#b8a67d]">Build real-world applications to master your skills</p>
                </div>
            </div>

            <div className="grid gap-6">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className={`bg-white dashboard-dark:bg-[#0a0a0a] rounded-3xl p-6 border-2 transition-all duration-300 ${project.isCompleted
                                ? 'border-green-500/50 shadow-green-500/10'
                                : 'border-gray-200 dashboard-dark:border-[#1a1a1a] hover:shadow-lg'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${getDifficultyColor(project.difficulty)}`}>
                                    {getIcon(project.difficulty)}
                                    {project.difficulty}
                                </span>
                                {project.difficultyLevel && (
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dashboard-dark:bg-[#1a1a1a] text-gray-700 dashboard-dark:text-[#b8a67d]">
                                        Level {project.difficultyLevel}/10
                                    </span>
                                )}
                                {project.estimatedTime && (
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dashboard-dark:bg-blue-900/20 text-blue-700 dashboard-dark:text-blue-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {project.estimatedTime}
                                    </span>
                                )}
                                {project.isCompleted && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Completed
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Title and Description */}
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-gray-900 dashboard-dark:text-[#ecd69f] mb-2">{project.title}</h3>
                            <p className="text-gray-600 dashboard-dark:text-[#b8a67d] leading-relaxed">{project.description}</p>
                        </div>

                        {/* Tech Stack */}
                        {project.techStack && project.techStack.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-gray-700 dashboard-dark:text-[#ecd69f] mb-2 flex items-center gap-2">
                                    <Code className="w-4 h-4 text-purple-500" />
                                    Tech Stack
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {project.techStack.map((tech, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-50 dashboard-dark:bg-purple-900/20 text-purple-700 dashboard-dark:text-purple-400 rounded-lg text-sm font-medium">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Requirements */}
                        <div className="bg-gray-50 dashboard-dark:bg-[#1a1a1a] rounded-xl p-4 mb-4">
                            <h4 className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-orange-500" />
                                Core Requirements
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {project.requirements.map((req, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                        {req}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Expandable Sections */}
                        <div className="space-y-3">
                            {/* Features */}
                            {project.features && project.features.length > 0 && (
                                <div className="border border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleExpanded(`${project.id}-features`)}
                                        className="w-full px-4 py-3 bg-gray-50 dashboard-dark:bg-[#1a1a1a] flex items-center justify-between hover:bg-gray-100 dashboard-dark:hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <span className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-500" />
                                            Features ({project.features.length})
                                        </span>
                                        {expandedProjects[`${project.id}-features`] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                    {expandedProjects[`${project.id}-features`] && (
                                        <div className="p-4 bg-white dashboard-dark:bg-[#0a0a0a]">
                                            <ul className="space-y-2">
                                                {project.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Learning Outcomes */}
                            {project.learningOutcomes && project.learningOutcomes.length > 0 && (
                                <div className="border border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleExpanded(`${project.id}-learning`)}
                                        className="w-full px-4 py-3 bg-gray-50 dashboard-dark:bg-[#1a1a1a] flex items-center justify-between hover:bg-gray-100 dashboard-dark:hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <span className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] flex items-center gap-2">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            Learning Outcomes
                                        </span>
                                        {expandedProjects[`${project.id}-learning`] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                    {expandedProjects[`${project.id}-learning`] && (
                                        <div className="p-4 bg-white dashboard-dark:bg-[#0a0a0a]">
                                            <ul className="space-y-2">
                                                {project.learningOutcomes.map((outcome, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                                                        {outcome}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Implementation Guide */}
                            {project.implementationGuide && (
                                <div className="border border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleExpanded(`${project.id}-guide`)}
                                        className="w-full px-4 py-3 bg-gray-50 dashboard-dark:bg-[#1a1a1a] flex items-center justify-between hover:bg-gray-100 dashboard-dark:hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <span className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-green-500" />
                                            Implementation Guide
                                        </span>
                                        {expandedProjects[`${project.id}-guide`] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                    {expandedProjects[`${project.id}-guide`] && (
                                        <div className="p-4 bg-white dashboard-dark:bg-[#0a0a0a]">
                                            <p className="text-sm text-gray-600 dashboard-dark:text-[#b8a67d] whitespace-pre-line leading-relaxed">
                                                {project.implementationGuide}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Bonus Challenges */}
                            {project.bonusChallenges && project.bonusChallenges.length > 0 && (
                                <div className="border border-gray-200 dashboard-dark:border-[#1a1a1a] rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleExpanded(`${project.id}-bonus`)}
                                        className="w-full px-4 py-3 bg-gray-50 dashboard-dark:bg-[#1a1a1a] flex items-center justify-between hover:bg-gray-100 dashboard-dark:hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <span className="font-semibold text-gray-900 dashboard-dark:text-[#ecd69f] flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4 text-amber-500" />
                                            Bonus Challenges
                                        </span>
                                        {expandedProjects[`${project.id}-bonus`] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                    {expandedProjects[`${project.id}-bonus`] && (
                                        <div className="p-4 bg-white dashboard-dark:bg-[#0a0a0a]">
                                            <ul className="space-y-2">
                                                {project.bonusChallenges.map((challenge, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dashboard-dark:text-[#b8a67d]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                                        {challenge}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 flex flex-col md:flex-row gap-4">
                            <a
                                href={project.exampleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                            >
                                <Github className="w-5 h-5" />
                                View Example Code
                            </a>

                            <div className="flex-1 flex flex-col gap-3">
                                {project.isCompleted ? (
                                    <div className="bg-green-50 dashboard-dark:bg-green-900/20 border border-green-200 dashboard-dark:border-green-900 rounded-xl p-3">
                                        <div className="flex items-center gap-2 text-green-700 dashboard-dark:text-green-400 font-medium text-sm mb-1">
                                            <CheckCircle className="w-4 h-4" />
                                            Submitted successfully
                                        </div>
                                        <a
                                            href={project.submissionUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-green-600 dashboard-dark:text-green-500 hover:underline truncate block"
                                        >
                                            {project.submissionUrl}
                                        </a>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="url"
                                            placeholder="https://github.com/username/repo"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dashboard-dark:border-[#2a2a2a] bg-white dashboard-dark:bg-[#0a0a0a] text-gray-900 dashboard-dark:text-[#ecd69f] focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm"
                                            value={submissionUrls[project.id] || ''}
                                            onChange={(e) => setSubmissionUrls(prev => ({ ...prev, [project.id]: e.target.value }))}
                                        />
                                        <button
                                            onClick={() => handleSubmit(project.id)}
                                            disabled={submitting === project.id || !submissionUrls[project.id]}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {submitting === project.id ? (
                                                <Loader className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Trophy className="w-5 h-5" />
                                                    Submit Project
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}