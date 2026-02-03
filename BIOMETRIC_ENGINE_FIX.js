// Complete Biometric and Engine Fix for Dynamic MCQ System

// 1. Enhanced Exam Entry Component with Biometric Check
// Create: app/frontend/src/components/ExamEntryWithBiometric.jsx

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Shield, User, Hash, AlertCircle, CheckCircle } from 'lucide-react';
import BiometricEntry from './BiometricEntry';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function ExamEntryWithBiometric() {
    const { examId } = useParams();
    const navigate = useNavigate();
    
    const [step, setStep] = useState('entry'); // entry, biometric, exam
    const [examCode, setExamCode] = useState('');
    const [studentName, setStudentName] = useState('');
    const [registerNumber, setRegisterNumber] = useState('');
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Validate exam entry
    const handleExamEntry = async (e) => {
        e.preventDefault();
        
        if (!examCode || !studentName) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/exams/validate-entry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    examCode,
                    registerNumber: registerNumber || undefined
                })
            });

            const data = await response.json();

            if (data.success) {
                setExam(data.data);
                
                // Check if biometric verification is required
                if (data.data.requireBiometric) {
                    setStep('biometric');
                } else {
                    // Proceed directly to exam
                    startExamSession(data.data);
                }
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to validate exam entry. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Start exam session after biometric verification
    const startExamSession = async (examData) => {
        try {
            const response = await fetch(`${API_BASE}/exams/${examData._id}/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    studentName,
                    registerNumber
                })
            });

            const sessionData = await response.json();

            if (sessionData.success) {
                // Navigate to appropriate exam session
                if (examData.isAdaptive || examData.examType === 'dynamic') {
                    navigate(`/exam/${examData._id}/adaptive`, {
                        state: {
                            exam: examData,
                            session: sessionData.data.session,
                            studentInfo: { name: studentName, registerNumber }
                        }
                    });
                } else {
                    navigate(`/exam/${examData._id}`, {
                        state: {
                            studentInfo: { name: studentName, registerNumber }
                        }
                    });
                }
            } else {
                setError(sessionData.message);
            }
        } catch (err) {
            setError('Failed to start exam session. Please try again.');
        }
    };

    // Handle biometric verification completion
    const handleBiometricComplete = (studentInfo) => {
        console.log('✅ Biometric verification completed:', studentInfo);
        startExamSession(exam);
    };

    if (step === 'biometric') {
        return (
            <BiometricEntry
                examId={exam._id}
                onVerificationComplete={handleBiometricComplete}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gradient-dark flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-400 rounded-2xl p-8 max-w-md w-full shadow-xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-cream-100">Secure Exam Entry</h1>
                    <p className="text-gray-600 dark:text-cream-200 mt-2">
                        Enter your details to access the examination
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 mb-6">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
                        </div>
                    </div>
                )}

                <form onSubmit={handleExamEntry} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                            <Hash className="w-4 h-4 inline mr-2" />
                            Exam Code
                        </label>
                        <input
                            type="text"
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                            placeholder="Enter exam code"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                            <User className="w-4 h-4 inline mr-2" />
                            Student Name
                        </label>
                        <input
                            type="text"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                            placeholder="Enter your full name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-cream-200 mb-2">
                            Register Number (Optional)
                        </label>
                        <input
                            type="text"
                            value={registerNumber}
                            onChange={(e) => setRegisterNumber(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-dark-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-500 dark:text-cream-100"
                            placeholder="Enter register number if required"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Validating...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Enter Exam
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <Camera className="w-4 h-4" />
                        <span className="text-sm font-medium">Proctored Examination</span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        This exam requires camera access for security monitoring
                    </p>
                </div>
            </div>
        </div>
    );
}

// 2. Enhanced ExamMaster Model with Biometric Requirements
// Update: app/Backend/models/ExamMaster.js

const examMasterSchema = new mongoose.Schema({
    // ... existing fields ...
    
    // Enhanced biometric and proctoring settings
    requireBiometric: {
        type: Boolean,
        default: false
    },
    requireCamera: {
        type: Boolean,
        default: true // Enable camera by default for all exams
    },
    proctoringConfig: {
        cameraRequired: { type: Boolean, default: true },
        fullscreenRequired: { type: Boolean, default: true },
        tabSwitchLimit: { type: Number, default: 3 },
        violationThreshold: { type: Number, default: 3 },
        autoSubmitOnViolation: { type: Boolean, default: true }
    },
    
    // Enhanced adaptive settings
    adaptiveSettings: {
        increaseThreshold: { type: Number, default: 70 }, // 70% accuracy to increase difficulty
        decreaseThreshold: { type: Number, default: 30 }, // 30% accuracy to decrease difficulty
        waitTimeMin: { type: Number, default: 5 },
        waitTimeMax: { type: Number, default: 10 },
        questionTimeLimit: { type: Number, default: 30 },
        minSubmitTime: { type: Number, default: 3 } // Minimum 3 seconds before allowing submit
    }
});

// 3. Enhanced Biometric Check in startSession
// Update examController.js startSession method

// Add this after line 400 in startSession method:

// ENHANCED BIOMETRIC VERIFICATION CHECK
if (exam.requireBiometric) {
    console.log('🔐 Checking biometric verification requirement...');
    
    if (!registerNumber) {
        return res.status(403).json({
            success: false,
            message: 'Register number is required for biometric verification',
            requireBiometric: true,
            redirectTo: '/biometric-entry'
        });
    }

    const BiometricVerification = require('../models/BiometricVerification');
    const biometric = await BiometricVerification.findOne({
        examId: exam._id,
        registerNumber: registerNumber,
        status: 'approved'
    });

    if (!biometric) {
        console.log('❌ Biometric verification not found or not approved');
        return res.status(403).json({
            success: false,
            message: 'Biometric verification required. Please complete biometric verification and wait for admin approval.',
            requireBiometric: true,
            redirectTo: '/biometric-entry',
            examId: exam._id
        });
    }

    console.log('✅ Biometric verification approved');
}

// 4. Enhanced Question Generation Engine Fix
// Update the generateQuiz function in quizGenerationService.js

const generateQuiz = async (documentId, mode, config) => {
    console.log('🚀 Starting enhanced quiz generation...');
    console.log('📋 Config:', { documentId, mode, config });

    // 1. Select Chunks with better distribution
    let chunks;
    if (mode === 'static') {
        chunks = await Chunk.find({
            documentId,
            difficulty: config.difficulty
        }).limit(15); // Increase chunk limit

        if (chunks.length === 0) {
            chunks = await Chunk.find({ documentId }).limit(15);
        }
    } else {
        // Dynamic mode: Get a comprehensive mix of difficulties
        const basicChunks = await Chunk.find({ documentId, difficulty: 'basic' }).limit(5);
        const intermediateChunks = await Chunk.find({ documentId, difficulty: 'intermediate' }).limit(6);
        const advancedChunks = await Chunk.find({ documentId, difficulty: 'advanced' }).limit(4);
        chunks = [...basicChunks, ...intermediateChunks, ...advancedChunks];

        if (chunks.length < 8) {
            chunks = await Chunk.find({ documentId }).limit(15);
        }
    }

    if (chunks.length === 0) {
        throw new Error('No content found to generate quiz. Please ensure the document was processed correctly.');
    }

    console.log(`📚 Using ${chunks.length} chunks for generation`);
    console.log(`🎯 Mode: ${mode}, Target Questions: ${config.questionCount}`);
    console.log(`🤖 AI Provider: ${aiProvider}`);

    // 2. Enhanced Question Generation with better distribution
    const targetCount = Math.max(config.questionCount || 20, 20); // Minimum 20 questions
    const questionsData = await generateQuestionsFromChunks(chunks, targetCount, config.difficulty || 'mixed');

    if (!questionsData || questionsData.length === 0) {
        throw new Error('Failed to generate questions. Please try with a different document or check AI configuration.');
    }

    // 3. Enhanced formatting with proper difficulty distribution
    const formattedQuestions = questionsData.map((q, i) => ({
        questionId: `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'AI Generated explanation',
        topic: q.topic || 'Custom Learning',
        difficulty: q.difficulty || 'medium',
        tags: q.tags || [q.topic || 'General'],
        difficultyScore: q.difficulty === 'easy' ? 3 : q.difficulty === 'medium' ? 5 : 8,
        status: 'unanswered',
        generatedAt: new Date(),
        source: 'AI'
    }));

    // 4. Validate distribution
    const easyCount = formattedQuestions.filter(q => q.difficulty === 'easy').length;
    const mediumCount = formattedQuestions.filter(q => q.difficulty === 'medium').length;
    const hardCount = formattedQuestions.filter(q => q.difficulty === 'hard').length;

    console.log(`✅ Generated ${formattedQuestions.length} questions`);
    console.log(`📊 Distribution: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard`);
    console.log(`🏷️ Topics: ${[...new Set(formattedQuestions.map(q => q.topic))].join(', ')}`);

    return formattedQuestions;
};

// 5. Enhanced Adaptive Engine Fix
// Add these methods to examController.js

// Enhanced Get Next Question for Adaptive Exam
exports.getNextQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        console.log('🎯 Getting next adaptive question for exam:', examId);

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (!exam.isAdaptive && exam.examType !== 'dynamic') {
            return res.status(400).json({ success: false, message: 'This is not an adaptive exam' });
        }

        // Check if exam is active
        const now = new Date();
        if (now < exam.startTime || now > exam.endTime) {
            return res.status(403).json({ success: false, message: 'Exam is not currently active' });
        }

        // Get or create adaptive difficulty record
        let adaptiveDifficulty = await AdaptiveDifficulty.findOne({ userId, examId });
        if (!adaptiveDifficulty) {
            adaptiveDifficulty = new AdaptiveDifficulty({
                userId,
                examId,
                currentDifficulty: 5, // Start with medium difficulty
                questionsAnswered: 0,
                correctAnswers: 0,
                waitUntil: null
            });
            await adaptiveDifficulty.save();
            console.log('📝 Created new adaptive difficulty record');
        }

        // Check if student is in wait period
        if (adaptiveDifficulty.waitUntil && new Date() < adaptiveDifficulty.waitUntil) {
            const waitTime = Math.ceil((adaptiveDifficulty.waitUntil - new Date()) / 1000);
            console.log(`⏳ Student in wait period: ${waitTime}s remaining`);
            
            return res.json({
                success: true,
                isWaiting: true,
                waitTime,
                message: 'Please wait for other students to complete their questions'
            });
        }

        // Check if exam is complete
        if (adaptiveDifficulty.questionsAnswered >= exam.totalQuestions) {
            console.log('🏁 Exam completed');
            return res.json({
                success: true,
                isComplete: true,
                message: 'Exam completed'
            });
        }

        // Get next question based on current difficulty with enhanced selection
        const difficultyRange = {
            min: Math.max(1, adaptiveDifficulty.currentDifficulty - 2),
            max: Math.min(10, adaptiveDifficulty.currentDifficulty + 2)
        };

        // Get answered question IDs to avoid repetition
        const answeredQuestions = await ExamQuestionResult.find({ 
            userId, 
            examId 
        }).select('questionId');
        const answeredIds = answeredQuestions.map(q => q.questionId);

        console.log(`🎲 Selecting question with difficulty ${difficultyRange.min}-${difficultyRange.max}`);
        console.log(`📝 Already answered: ${answeredIds.length} questions`);

        // Try to get question from Question Bank with better selection
        let question = await Question.aggregate([
            {
                $match: {
                    difficulty: { $gte: difficultyRange.min, $lte: difficultyRange.max },
                    _id: { $nin: answeredIds }
                }
            },
            { $sample: { size: 1 } }
        ]);

        if (!question || question.length === 0) {
            // Fallback: get any unanswered question
            console.log('🔄 Fallback: selecting any unanswered question');
            question = await Question.aggregate([
                {
                    $match: {
                        _id: { $nin: answeredIds }
                    }
                },
                { $sample: { size: 1 } }
            ]);
        }

        if (!question || question.length === 0) {
            console.log('❌ No more questions available');
            return res.json({
                success: true,
                isComplete: true,
                message: 'No more questions available'
            });
        }

        const selectedQuestion = question[0];
        console.log(`✅ Selected question: difficulty ${selectedQuestion.difficulty}`);

        res.json({
            success: true,
            data: {
                question: {
                    _id: selectedQuestion._id,
                    content: selectedQuestion.content,
                    options: selectedQuestion.options,
                    difficulty: selectedQuestion.difficulty
                },
                questionNumber: adaptiveDifficulty.questionsAnswered + 1,
                totalQuestions: exam.totalQuestions,
                difficulty: adaptiveDifficulty.currentDifficulty <= 3 ? 'easy' : 
                           adaptiveDifficulty.currentDifficulty <= 6 ? 'medium' : 'hard',
                timePerQuestion: exam.adaptiveSettings?.questionTimeLimit || 30,
                minSubmitTime: exam.adaptiveSettings?.minSubmitTime || 3
            }
        });
    } catch (error) {
        console.error('❌ Error getting next question:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Frontend Route Update
// Update app/frontend/src/App.jsx to include biometric entry route

import ExamEntryWithBiometric from './components/ExamEntryWithBiometric';

// Add this route:
<Route path="/exam-entry/:examId" element={<ExamEntryWithBiometric />} />
<Route path="/biometric-entry" element={<BiometricEntry />} />

// 7. Enhanced Error Handling and Logging
// Add to examController.js

const logExamEvent = async (userId, examId, eventType, details) => {
    try {
        const log = new ExamLog({
            userId,
            examId,
            eventType,
            details,
            timestamp: new Date()
        });
        await log.save();
        console.log(`📝 Logged event: ${eventType}`);
    } catch (error) {
        console.error('❌ Failed to log event:', error);
    }
};

// Usage in methods:
await logExamEvent(userId, examId, 'biometric_check', 'Biometric verification required');
await logExamEvent(userId, examId, 'session_start', 'Exam session started');
await logExamEvent(userId, examId, 'question_generated', `Generated ${questions.length} questions`);

module.exports = {
    ExamEntryWithBiometric,
    enhancedStartSession,
    enhancedGetNextQuestion,
    enhancedGenerateQuiz
};