import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Save, Plus, Trash2, Search, Filter, BrainCircuit, Database,
    FileUp, Loader2, CheckCircle2, PenTool, X, Sun, Moon, AlertCircle,
    Clock, Users, BookOpen, Settings, Play, Eye, Sparkles, FileText, Camera
} from 'lucide-react';
import { useTheme } from "../contexts/ThemeContext";
import "../styles/DevvoraStyles.css";

// Error Message Component
const ErrorMessage = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="upload-message error">
            <AlertCircle size={20} />
            <span>{message}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="message-close-btn"
                    type="button"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

// Success Message Component
const SuccessMessage = ({ message, onClose }) => {
    if (!message) return null;

    return (
        <div className="upload-message success">
            <CheckCircle2 size={20} />
            <span>{message}</span>
            {onClose && (
                <button
                    onClick={onClose}
                    className="message-close-btn"
                    type="button"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

// Question Preview Card Component
const QuestionPreviewCard = ({ question, index, isSelected, onToggle, source = 'file' }) => {
    return (
        <div
            className={`question-preview-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onToggle(index)}
        >
            <div className="question-number">{index + 1}</div>
            <div className="question-preview-content">
                <div className="question-text">
                    {question.question || question.content}
                </div>
                <div className="options-preview">
                    {question.options?.map((option, idx) => (
                        <div
                            key={idx}
                            className={`option-preview ${option === question.correctAnswer ? 'correct' : ''}`}
                        >
                            <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                            <span className="option-text">{option}</span>
                        </div>
                    ))}
                </div>
                <div className="question-meta">
                    <span className={`difficulty-badge ${question.difficulty || 'medium'}`}>
                        {question.difficulty || 'Medium'}
                    </span>
                    <span className="source-badge">{source}</span>
                </div>
            </div>
            <div className="selection-indicator">
                {isSelected && <CheckCircle2 size={20} />}
            </div>
        </div>
    );
};


// Exam Summary Component
const ExamSummary = ({ formData, selectedQuestions, onCreateExam, onPreview }) => {
    const totalQuestions = selectedQuestions.length;
    const estimatedTime = formData.duration;

    return (
        <div className="exam-summary">
            <div className="summary-header">
                <h3>Exam Summary</h3>
                <div className="summary-stats">
                    <div className="stat">
                        <BookOpen size={16} />
                        <span>{totalQuestions} Questions</span>
                    </div>
                    <div className="stat">
                        <Clock size={16} />
                        <span>{estimatedTime} Minutes</span>
                    </div>
                    <div className="stat">
                        <Users size={16} />
                        <span>{formData.passingScore}% Pass Rate</span>
                    </div>
                </div>
            </div>

            <div className="summary-details">
                <div className="detail-row">
                    <span className="detail-label">Exam Title:</span>
                    <span className="detail-value">{formData.title || 'Untitled Exam'}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Access Code:</span>
                    <span className="detail-value code">{formData.examCode}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Start Time:</span>
                    <span className="detail-value">
                        {formData.startTime ? new Date(formData.startTime).toLocaleString() : 'Not set'}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">End Time:</span>
                    <span className="detail-value">
                        {formData.endTime ? new Date(formData.endTime).toLocaleString() : 'Not set'}
                    </span>
                </div>
            </div>

            <div className="summary-actions">
                <button
                    type="button"
                    className="preview-btn"
                    onClick={onPreview}
                    disabled={totalQuestions === 0}
                >
                    <Eye size={18} />
                    Preview Questions
                </button>
                <button
                    type="button"
                    className="create-exam-btn"
                    onClick={onCreateExam}
                    disabled={totalQuestions === 0 || !formData.title || !formData.startTime || !formData.endTime}
                >
                    <Play size={18} />
                    Create & Start Exam
                </button>
            </div>

            {totalQuestions === 0 && (
                <div className="summary-warning">
                    <AlertCircle size={16} />
                    <span>Please select at least one question to create the exam</span>
                </div>
            )}

            {(!formData.title || !formData.startTime || !formData.endTime) && totalQuestions > 0 && (
                <div className="summary-warning">
                    <AlertCircle size={16} />
                    <span>Please fill in all required fields (title, start time, end time)</span>
                </div>
            )}
        </div>
    );
};

export default function AdminExamCreate() {
    const navigate = useNavigate();
    const { isDarkMode, toggleTheme } = useTheme();
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [currentStep, setCurrentStep] = useState(1); // 1: Basic Info, 2: Students, 3: Questions, 4: Review

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        examCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
        startTime: '',
        endTime: '',
        duration: 30,
        passingScore: 70,
        source: 'manual', // 'manual', 'file' (AI), 'csv'
        questionSource: 'manual', // 'manual', 'ai', 'csv'
        targetQuestionCount: 10,
        questionIds: [],
        rawQuestions: [],
        examType: 'static', // 'static' or 'dynamic'
        dynamicConfig: {
            totalQuestions: 10,
            tags: []
        },
        documentId: null,
        students: [],
        requireStudentVerification: false,
        isAdaptive: false,
        timePerQuestion: 30,
        isSynchronized: false,
        questionTimer: 30,
        allowLateJoin: false,
        requireBiometric: false,
        requireCamera: false,
        allowRecording: false,
        autoRecord: false
    });

    const [availableQuestions, setAvailableQuestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [extractedQuestions, setExtractedQuestions] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [fileMode, setFileMode] = useState('static');
    const [showPreview, setShowPreview] = useState(false);

    // Manual Entry State
    const [manualQuestions, setManualQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        explanation: '',
        difficulty: 'medium',
        category: 'General'
    });

    // Student Management State
    const [newStudent, setNewStudent] = useState({ registerNumber: '', name: '' });
    const [studentError, setStudentError] = useState('');

    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const API_BASE = `${BASE_URL}/api`;

    useEffect(() => {
        if (formData.source === 'static') {
            fetchQuestions();
        }
    }, [formData.source]);

    // Debug useEffect
    useEffect(() => {
        console.log('AdminExamCreate component mounted');
        console.log('Current step:', currentStep);
        console.log('Selected questions:', selectedQuestions.length);
        console.log('Form data:', formData);
    }, [currentStep, selectedQuestions, formData]);

    const fetchQuestions = async () => {
        try {
            const res = await fetch(`${API_BASE}/exams/admin/questions`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setAvailableQuestions(data.data);
            } else {
                setAvailableQuestions([]);
            }
        } catch (error) {
            console.error("Failed to fetch questions:", error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadError('');
        setUploadSuccess('');

        const allowedTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/csv'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
            setUploadError('Invalid file type. Please upload a PDF, TXT, DOCX, or CSV file.');
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadError('File too large. Please upload a file smaller than 10MB.');
            return;
        }

        setUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        // Pass configuration for AI generation if applicable
        if (formData.questionSource === 'ai') {
            uploadData.append('questionCount', formData.targetQuestionCount);
        }

        try {
            const res = await fetch(`${API_BASE}/exams/admin/upload-questions`, {
                method: 'POST',
                body: uploadData,
                credentials: 'include'
            });

            const data = await res.json();

            if (data.success) {
                setExtractedQuestions(data.data);
                setSelectedQuestions(data.data.map((_, idx) => idx)); // Auto-select all
                setFormData(prev => ({
                    ...prev,
                    source: 'file',
                    rawQuestions: data.data,
                    documentId: data.documentId
                }));
                setUploadSuccess(`Successfully extracted ${data.data.length} questions from the document.`);
                setCurrentStep(3); // Move to question selection step (after students)
            } else {
                setUploadError(data.message || "Failed to extract questions from the document.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const toggleQuestionSelection = (index) => {
        setSelectedQuestions(prev => {
            if (prev.includes(index)) {
                return prev.filter(idx => idx !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const selectAllQuestions = () => {
        setSelectedQuestions(extractedQuestions.map((_, idx) => idx));
    };

    const deselectAllQuestions = () => {
        setSelectedQuestions([]);
    };

    const handleCreateExam = async () => {
        try {
            // Validation
            if (!formData.title || !formData.startTime || !formData.endTime) {
                setUploadError('Please fill in all required fields (title, start time, end time).');
                return;
            }

            if (formData.examType === 'static' && selectedQuestions.length === 0) {
                setUploadError('Please select at least one question for the exam.');
                return;
            }

            // Validate difficulty levels
            if (formData.examType === 'static') {
                const invalidQuestions = selectedQuestions
                    .map(idx => extractedQuestions[idx])
                    .filter(q => !q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty.toLowerCase()));

                if (invalidQuestions.length > 0) {
                    setUploadError(`Error: ${invalidQuestions.length} selected questions have invalid difficulty. Difficulty must be easy, medium, or hard.`);
                    return;
                }
            }

            if (formData.examType === 'dynamic') {
                const totalDynamic = formData.dynamicConfig.totalQuestions || formData.totalQuestions || 0;
                if (totalDynamic === 0) {
                    setUploadError('Please specify total questions for dynamic exam.');
                    return;
                }
            }

            let payload = {
                title: formData.title,
                description: formData.description,
                examCode: formData.examCode,
                startTime: formData.startTime,
                endTime: formData.endTime,
                duration: formData.duration,
                verificationDuration: formData.verificationDuration || 15,
                passingScore: formData.passingScore,
                examType: formData.examType,
                students: formData.students,
                requireStudentVerification: formData.requireStudentVerification,
                requireBiometric: formData.requireBiometric,
                requireCamera: formData.requireCamera,
                allowRecording: formData.allowRecording,
                autoRecord: formData.autoRecord
            };

            if (formData.examType === 'static') {
                const finalQuestions = selectedQuestions.map(idx => extractedQuestions[idx]);
                payload.totalQuestions = finalQuestions.length;
                payload.rawQuestions = finalQuestions;
            } else if (formData.examType === 'dynamic') {
                const totalDynamic = formData.dynamicConfig.totalQuestions || formData.totalQuestions || 10;
                payload.totalQuestions = totalDynamic;
                payload.dynamicSettings = formData.dynamicConfig; // Backend expects dynamicSettings
                payload.isAdaptive = true; // Enable adaptive mode
                payload.rawQuestions = extractedQuestions; // Include uploaded questions if any
            }

            const res = await fetch(`${API_BASE}/exams/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (res.ok) {
                const result = await res.json();
                setUploadSuccess('Exam created successfully! Redirecting...');
                setTimeout(() => {
                    navigate(`/admin/exams/${result.data._id}/manage`);
                }, 1500);
            } else {
                const errorData = await res.json();
                setUploadError(errorData.message || 'Failed to create exam');
            }
        } catch (error) {
            console.error("Failed to create exam:", error);
            setUploadError('Failed to create exam. Please try again.');
        }
    };

    const handlePreview = () => {
        setShowPreview(true);
    };

    // Student Management Functions
    const handleAddStudent = () => {
        setStudentError('');

        if (!newStudent.registerNumber || !newStudent.name) {
            setStudentError('Both register number and name are required');
            return;
        }

        // Check for duplicate register number
        if (formData.students.some(s => s.registerNumber === newStudent.registerNumber)) {
            setStudentError('A student with this register number already exists');
            return;
        }

        setFormData(prev => ({
            ...prev,
            students: [...prev.students, { ...newStudent, hasAttempted: false }]
        }));
        setNewStudent({ registerNumber: '', name: '' });
    };

    const handleRemoveStudent = (registerNumber) => {
        setFormData(prev => ({
            ...prev,
            students: prev.students.filter(s => s.registerNumber !== registerNumber)
        }));
    };

    const handleAddManualQuestion = () => {
        if (!currentQuestion.question || !currentQuestion.correctAnswer) {
            setUploadError('Question text and correct answer are required');
            return;
        }

        const newQuestion = { ...currentQuestion };
        setExtractedQuestions(prev => [...prev, newQuestion]);
        setSelectedQuestions(prev => [...prev, extractedQuestions.length]); // Auto-select

        // Reset form
        setCurrentQuestion({
            question: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            difficulty: 'medium',
            category: 'General'
        });
        setUploadError('');
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...currentQuestion.options];
        newOptions[index] = value;
        setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
    };

    const handleToggleVerification = () => {
        setFormData(prev => ({
            ...prev,
            requireStudentVerification: !prev.requireStudentVerification
        }));
    };


    return (
        <div className={`admin-exam-create-container ${isDarkMode ? 'dashboard-dark' : ''}`}>
            {/* Theme Toggle */}
            <button
                className="admin-theme-toggle"
                onClick={toggleTheme}
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                type="button"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Header */}
            <header className="exam-create-header">
                <button className="back-btn" onClick={() => navigate('/admin/exams')}>
                    <ChevronLeft size={20} />
                    Back to Exams
                </button>
                <div className="header-title">
                    <h1>Create New Exam</h1>
                    <p>Upload questions and configure your exam</p>
                </div>
                <div className="header-steps">
                    <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>1. Info</div>
                    <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>2. Students</div>
                    <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>3. Questions</div>
                    <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>4. Review</div>
                </div>
            </header>

            <div className="exam-create-content">
                {/* Step 1: Basic Info & Upload */}
                {currentStep === 1 && (
                    <div className="step-content">
                        <div className="step-header">
                            <h2>Step 1: Basic Information & Upload Questions</h2>
                            <p>Enter exam details and upload your question document</p>
                        </div>

                        <div className="form-grid">
                            <div className="form-section">
                                <h3>Exam Details</h3>
                                <div className="form-field">
                                    <label>Exam Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="e.g. Machine Learning Fundamentals"
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        placeholder="Brief description of the exam..."
                                        rows={3}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>Duration (Minutes) *</label>
                                        <input
                                            type="number"
                                            name="duration"
                                            value={formData.duration}
                                            onChange={handleInputChange}
                                            min="5"
                                            max="300"
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Verification Time (Minutes)</label>
                                        <input
                                            type="number"
                                            name="verificationDuration"
                                            value={formData.verificationDuration || 15}
                                            onChange={(e) => setFormData(prev => ({ ...prev, verificationDuration: parseInt(e.target.value) || 0 }))}
                                            min="0"
                                            max="60"
                                            placeholder="15"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Passing Score (%) *</label>
                                        <input
                                            type="number"
                                            name="passingScore"
                                            value={formData.passingScore}
                                            onChange={handleInputChange}
                                            min="1"
                                            max="100"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>Start Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="startTime"
                                            value={formData.startTime}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>End Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-field">
                                    <label>Access Code</label>
                                    <div className="code-display">
                                        <input
                                            type="text"
                                            value={formData.examCode}
                                            readOnly
                                        />
                                        <span className="code-label">Auto-generated</span>
                                    </div>
                                </div>
                            </div>

                            <div className="upload-section">
                                <h3>Questions Configuration</h3>
                                <ErrorMessage
                                    message={uploadError}
                                    onClose={() => setUploadError('')}
                                />
                                <SuccessMessage
                                    message={uploadSuccess}
                                    onClose={() => setUploadSuccess('')}
                                />

                                {/* Exam Type Selection */}
                                <div className="form-field">
                                    <label>Exam Type</label>
                                    <div className="exam-type-options">
                                        <label className={`type-option ${formData.examType === 'static' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="examType"
                                                value="static"
                                                checked={formData.examType === 'static'}
                                                onChange={handleInputChange}
                                            />
                                            <div className="type-info">
                                                <span className="type-title">Static Exam</span>
                                                <span className="type-desc">Fixed set of questions for all students</span>
                                            </div>
                                        </label>
                                        <label className={`type-option ${formData.examType === 'dynamic' ? 'active' : ''}`}>
                                            <input
                                                type="radio"
                                                name="examType"
                                                value="dynamic"
                                                checked={formData.examType === 'dynamic'}
                                                onChange={handleInputChange}
                                            />
                                            <div className="type-info">
                                                <span className="type-title">Dynamic Exam</span>
                                                <span className="type-desc">Random questions generated per student</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {formData.examType === 'static' && (
                                    <div className="source-selection">
                                        <div className="source-options">
                                            <button
                                                type="button"
                                                className={`source-option ${formData.questionSource === 'manual' ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, questionSource: 'manual' }))}
                                            >
                                                <div className="icon-box">
                                                    <PenTool size={24} />
                                                </div>
                                                <div className="option-info">
                                                    <h4>Manual Entry</h4>
                                                    <p>Type questions one by one</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                className={`source-option ${formData.questionSource === 'ai' ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, questionSource: 'ai' }))}
                                            >
                                                <div className="icon-box">
                                                    <Sparkles size={24} />
                                                </div>
                                                <div className="option-info">
                                                    <h4>AI Generation</h4>
                                                    <p>Upload content and let AI generate</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                className={`source-option ${formData.questionSource === 'csv' ? 'active' : ''}`}
                                                onClick={() => setFormData(prev => ({ ...prev, questionSource: 'csv' }))}
                                            >
                                                <div className="icon-box">
                                                    <FileText size={24} />
                                                </div>
                                                <div className="option-info">
                                                    <h4>CSV Upload</h4>
                                                    <p>Bulk upload via CSV file</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {formData.examType === 'dynamic' && (
                                    <div className="dynamic-config-section">
                                        <h4>Adaptive Exam Configuration</h4>
                                        <p className="section-desc">
                                            Configure how the adaptive exam will work for students.
                                        </p>

                                        <div className="form-field">
                                            <label>Total Questions per Student</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="50"
                                                value={formData.dynamicConfig.totalQuestions || formData.totalQuestions || 10}
                                                onChange={(e) => {
                                                    const value = parseInt(e.target.value) || 10;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        totalQuestions: value,
                                                        dynamicConfig: {
                                                            ...prev.dynamicConfig,
                                                            totalQuestions: value
                                                        }
                                                    }));
                                                }}
                                            />
                                            <p className="field-hint">How many questions each student will answer</p>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isSynchronized || false}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        isSynchronized: e.target.checked
                                                    }))}
                                                />
                                                <strong>Synchronized Mode</strong> - All students see same question at same time
                                            </label>
                                        </div>

                                        {formData.isSynchronized && (
                                            <>
                                                <div className="form-field">
                                                    <label>Time per Question (seconds)</label>
                                                    <input
                                                        type="number"
                                                        min="10"
                                                        max="300"
                                                        value={formData.questionTimer || 30}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            questionTimer: parseInt(e.target.value) || 30
                                                        }))}
                                                    />
                                                    <p className="field-hint">All students have this much time per question</p>
                                                </div>

                                                <div className="form-field">
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={!formData.allowLateJoin}
                                                            onChange={(e) => setFormData(prev => ({
                                                                ...prev,
                                                                allowLateJoin: !e.target.checked
                                                            }))}
                                                        />
                                                        Prevent late joins (students cannot join after exam starts)
                                                    </label>
                                                </div>
                                            </>
                                        )}

                                        <div className="adaptive-info-box">
                                            <h5>📊 Adaptive Difficulty System</h5>
                                            <ul>
                                                <li>✅ <strong>Increase difficulty:</strong> When {formData.isSynchronized ? 'collective' : 'individual'} accuracy ≥ 60%</li>
                                                <li>⬇️ <strong>Decrease difficulty:</strong> When {formData.isSynchronized ? 'collective' : 'individual'} accuracy ≤ 40%</li>
                                                <li>🎯 <strong>Starting level:</strong> Easy for all students</li>
                                                <li>📈 <strong>Progression:</strong> Easy → Medium → Hard</li>
                                            </ul>
                                            {formData.isSynchronized ? (
                                                <p className="info-note">
                                                    <strong>Synchronized Mode:</strong> All students answer the same question at the same time.
                                                    Difficulty adjusts based on collective performance (% of students who answered correctly).
                                                </p>
                                            ) : (
                                                <p className="info-note">
                                                    Each student's difficulty adjusts independently based on their own performance.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {formData.questionSource === 'ai' && (
                                    <div className="ai-config-section">
                                        <div className="form-field">
                                            <label>Target Question Count</label>
                                            <input
                                                type="number"
                                                name="targetQuestionCount"
                                                value={formData.targetQuestionCount}
                                                onChange={handleInputChange}
                                                min="1"
                                                max="50"
                                                placeholder="e.g. 10"
                                            />
                                            <p className="field-hint">How many questions should AI generate?</p>
                                        </div>

                                        <div className={`upload-zone ${uploading ? 'uploading' : ''}`}>
                                            <div className="upload-icon">
                                                {uploading ? <Loader2 className="spinner" size={48} /> : <FileUp size={48} />}
                                            </div>
                                            <h4>{uploading ? "Processing Document..." : "Upload Study Material"}</h4>
                                            <p>Upload a PDF, TXT, or DOCX file for AI analysis</p>
                                            <p className="upload-info">
                                                Supported formats: PDF, TXT, DOCX • Max size: 10MB
                                            </p>
                                            <input
                                                type="file"
                                                id="file-input-ai"
                                                accept=".pdf,.txt,.docx"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                                disabled={uploading}
                                            />
                                            <label htmlFor="file-input-ai" className="upload-button">
                                                {uploading ? "Processing..." : "Choose Document"}
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {formData.questionSource === 'csv' && (
                                    <div className="csv-config-section">
                                        <div className="info-box">
                                            <p><strong>CSV Format:</strong> Your CSV must have these columns:</p>
                                            <code>question, optionA, optionB, optionC, optionD, correctAnswer, difficulty</code>
                                            <p className="sub-text">Difficulty values: easy, medium, hard</p>
                                        </div>

                                        <div className={`upload-zone ${uploading ? 'uploading' : ''}`}>
                                            <div className="upload-icon">
                                                {uploading ? <Loader2 className="spinner" size={48} /> : <FileUp size={48} />}
                                            </div>
                                            <h4>{uploading ? "Parsing CSV..." : "Upload Question CSV"}</h4>
                                            <p>Upload a CSV file with your questions</p>
                                            <p className="upload-info">
                                                Supported format: CSV • Max size: 10MB
                                            </p>
                                            <input
                                                type="file"
                                                id="file-input-csv"
                                                accept=".csv"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                                disabled={uploading}
                                            />
                                            <label htmlFor="file-input-csv" className="upload-button">
                                                {uploading ? "Parsing..." : "Choose CSV File"}
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="step-actions">
                            <button
                                type="button"
                                className="next-step-btn"
                                onClick={() => setCurrentStep(2)}
                                disabled={!formData.title || !formData.startTime || !formData.endTime}
                            >
                                Next: Manage Students
                                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Student Management */}
                {currentStep === 2 && (
                    <div className="step-content">
                        <div className="step-header">
                            <h2>Step 2: Manage Students (Optional)</h2>
                            <p>Add students who can take this exam or skip to allow anyone with the access code</p>
                        </div>

                        {/* Verification Toggle */}
                        <div className="verification-toggle-card">
                            <div className="toggle-info">
                                <div className="toggle-icon">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h3>Student Verification</h3>
                                    <p>
                                        {formData.requireStudentVerification
                                            ? 'Only pre-registered students can take this exam'
                                            : 'Any student with the access code can take this exam'}
                                    </p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.requireStudentVerification}
                                    onChange={handleToggleVerification}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {/* Biometric Verification Toggle */}
                        <div className="verification-toggle-card">
                            <div className="toggle-info">
                                <div className="toggle-icon">
                                    <Camera size={24} />
                                </div>
                                <div>
                                    <h3>Biometric Verification</h3>
                                    <p>
                                        {formData.requireBiometric
                                            ? 'Students must submit and get photo approved before exam'
                                            : 'No biometric verification required'}
                                    </p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.requireBiometric}
                                    onChange={(e) => setFormData(prev => ({ ...prev, requireBiometric: e.target.checked }))}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {/* Camera Monitoring Toggle */}
                        <div className="verification-toggle-card">
                            <div className="toggle-info">
                                <div className="toggle-icon">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3>Camera Monitoring</h3>
                                    <p>
                                        {formData.requireCamera
                                            ? 'Students must enable camera during exam'
                                            : 'Camera monitoring disabled'}
                                    </p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={formData.requireCamera}
                                    onChange={(e) => setFormData(prev => ({ ...prev, requireCamera: e.target.checked }))}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {/* Recording Settings (only if camera is enabled) */}
                        {formData.requireCamera && (
                            <div className="verification-toggle-card">
                                <div className="toggle-info">
                                    <div className="toggle-icon">
                                        <Settings size={24} />
                                    </div>
                                    <div>
                                        <h3>Allow Video Recording</h3>
                                        <p>
                                            {formData.allowRecording
                                                ? 'Admin can trigger video recording during exam'
                                                : 'Video recording disabled'}
                                        </p>
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.allowRecording}
                                        onChange={(e) => setFormData(prev => ({ ...prev, allowRecording: e.target.checked }))}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        )}

                        {/* Add Student Form */}
                        <div className="add-student-card">
                            <h3>Add Student</h3>
                            {studentError && (
                                <div className="alert alert-error">
                                    <AlertCircle size={20} />
                                    <span>{studentError}</span>
                                </div>
                            )}
                            <div className="add-student-form">
                                <div className="form-row">
                                    <input
                                        type="text"
                                        placeholder="Register Number (e.g., REG001)"
                                        value={newStudent.registerNumber}
                                        onChange={(e) => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                                        className="form-input"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Student Name"
                                        value={newStudent.name}
                                        onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                        className="form-input"
                                    />
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={handleAddStudent}
                                    >
                                        <Plus size={20} />
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Students List */}
                        <div className="students-list-card">
                            <div className="card-header">
                                <h3>
                                    <Users size={20} />
                                    Registered Students ({formData.students.length})
                                </h3>
                            </div>

                            {formData.students.length === 0 ? (
                                <div className="empty-state-small">
                                    <Users size={32} />
                                    <p>No students added yet</p>
                                    <span>Add students using the form above or skip this step</span>
                                </div>
                            ) : (
                                <div className="students-table-container">
                                    <table className="students-table">
                                        <thead>
                                            <tr>
                                                <th>Register Number</th>
                                                <th>Name</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.students.map((student) => (
                                                <tr key={student.registerNumber}>
                                                    <td>
                                                        <code className="register-number">{student.registerNumber}</code>
                                                    </td>
                                                    <td>{student.name}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn-icon-danger"
                                                            onClick={() => handleRemoveStudent(student.registerNumber)}
                                                            title="Remove Student"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="step-actions">
                            <button
                                type="button"
                                className="back-step-btn"
                                onClick={() => setCurrentStep(1)}
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>
                            <button
                                type="button"
                                className="next-step-btn"
                                onClick={() => setCurrentStep(3)}
                            >
                                Next: Upload Questions
                                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Questions */}
                {currentStep === 3 && (
                    <div className="step-content">
                        <div className="step-header">
                            <h2>Step 3: {formData.examType === 'dynamic' ? 'Configuration Review' : 'Manage Questions'}</h2>
                            <p>
                                {formData.examType === 'dynamic'
                                    ? 'Review your dynamic exam settings'
                                    : formData.questionSource === 'manual'
                                        ? 'Add questions manually'
                                        : 'Review and select questions'}
                            </p>
                        </div>

                        {formData.examType === 'dynamic' ? (
                            <div className="dynamic-summary-card">
                                <h3>Adaptive Exam Summary</h3>
                                <div className="config-grid">
                                    <div className="config-item">
                                        <span className="label">Total Questions</span>
                                        <span className="value">{formData.dynamicConfig.totalQuestions || formData.totalQuestions || 0}</span>
                                    </div>
                                    <div className="config-item">
                                        <span className="label">Mode</span>
                                        <span className="value">{formData.isSynchronized ? 'Synchronized' : 'Individual'}</span>
                                    </div>
                                    {formData.isSynchronized && (
                                        <>
                                            <div className="config-item">
                                                <span className="label">Time per Question</span>
                                                <span className="value">{formData.questionTimer || 30}s</span>
                                            </div>
                                            <div className="config-item">
                                                <span className="label">Late Join</span>
                                                <span className="value">{formData.allowLateJoin ? 'Allowed' : 'Blocked'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="info-box">
                                    <BrainCircuit size={20} />
                                    <p>Questions will be randomly generated for each student based on this distribution from the Question Bank.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Manual Entry Form */}
                                {formData.questionSource === 'manual' && (
                                    <div className="manual-entry-card">
                                        <h3>Add New Question</h3>
                                        <div className="manual-form">
                                            <div className="form-field">
                                                <label>Question Text *</label>
                                                <textarea
                                                    value={currentQuestion.question}
                                                    onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                                                    placeholder="Enter question text..."
                                                    rows={2}
                                                />
                                            </div>
                                            <div className="options-grid">
                                                {currentQuestion.options.map((opt, idx) => (
                                                    <div key={idx} className="form-field">
                                                        <label>Option {String.fromCharCode(65 + idx)}</label>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="form-row">
                                                <div className="form-field">
                                                    <label>Correct Answer *</label>
                                                    <select
                                                        value={currentQuestion.correctAnswer}
                                                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                                    >
                                                        <option value="">Select Correct Option</option>
                                                        {currentQuestion.options.map((opt, idx) => (
                                                            opt && <option key={idx} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="form-field">
                                                    <label>Difficulty</label>
                                                    <select
                                                        value={currentQuestion.difficulty}
                                                        onChange={(e) => setCurrentQuestion(prev => ({ ...prev, difficulty: e.target.value }))}
                                                    >
                                                        <option value="easy">Easy</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="hard">Hard</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                onClick={handleAddManualQuestion}
                                            >
                                                <Plus size={18} />
                                                Add Question
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Questions List */}
                                {extractedQuestions.length > 0 && (
                                    <div className="questions-list-section">
                                        <div className="question-selection-header">
                                            <div className="selection-info">
                                                <span className="total-questions">
                                                    {extractedQuestions.length} questions available
                                                </span>
                                                <span className="selected-count">
                                                    {selectedQuestions.length} selected
                                                </span>
                                            </div>
                                            <div className="selection-actions">
                                                <button
                                                    type="button"
                                                    className="select-all-btn"
                                                    onClick={selectAllQuestions}
                                                >
                                                    Select All
                                                </button>
                                                <button
                                                    type="button"
                                                    className="deselect-all-btn"
                                                    onClick={deselectAllQuestions}
                                                >
                                                    Deselect All
                                                </button>
                                            </div>
                                        </div>

                                        <div className="questions-grid">
                                            {extractedQuestions.map((q, idx) => (
                                                <QuestionPreviewCard
                                                    key={idx}
                                                    question={q}
                                                    index={idx}
                                                    isSelected={selectedQuestions.includes(idx)}
                                                    onToggle={toggleQuestionSelection}
                                                    source={formData.questionSource}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="step-actions">
                            <button
                                type="button"
                                className="back-step-btn"
                                onClick={() => setCurrentStep(2)}
                            >
                                <ChevronLeft size={18} />
                                Back to Students
                            </button>
                            <button
                                type="button"
                                className="next-step-btn"
                                onClick={() => setCurrentStep(4)}
                                disabled={
                                    formData.examType === 'static' && selectedQuestions.length === 0 ||
                                    formData.examType === 'dynamic' && (
                                        (formData.dynamicConfig.totalQuestions || formData.totalQuestions || 0) === 0
                                    )
                                }
                            >
                                Review & Create
                                <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    </div>
                )}


                {/* Step 4: Review & Create */}
                {currentStep === 4 && (
                    <div className="step-content">
                        <div className="step-header">
                            <h2>Step 4: Review & Create Exam</h2>
                            <p>Review your exam details and create the exam</p>
                        </div>

                        <div className="review-grid">
                            <div className="review-section">
                                <h3>Selected Questions Preview</h3>
                                <div className="questions-preview">
                                    {selectedQuestions.slice(0, 3).map((questionIndex, idx) => {
                                        const question = extractedQuestions[questionIndex];
                                        return (
                                            <div key={idx} className="question-preview-mini">
                                                <div className="question-number">{questionIndex + 1}</div>
                                                <div className="question-text">
                                                    {question.question || question.content}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {selectedQuestions.length > 3 && (
                                        <div className="more-questions">
                                            +{selectedQuestions.length - 3} more questions
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ExamSummary
                                formData={formData}
                                selectedQuestions={selectedQuestions}
                                onCreateExam={handleCreateExam}
                                onPreview={handlePreview}
                            />
                        </div>

                        <div className="step-actions">
                            <button
                                type="button"
                                className="back-step-btn"
                                onClick={() => setCurrentStep(3)}
                            >
                                <ChevronLeft size={18} />
                                Back to Questions
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}