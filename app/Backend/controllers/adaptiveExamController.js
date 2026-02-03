const { ExamMaster, ExamSession, ExamAttempt, AdaptiveDifficulty } = require('../config/examDatabase');
const Question = require('../models/Question');
const ExamQuestionResult = require('../models/ExamQuestionResult');
const SyncExamStats = require('../models/SyncExamStats');
const mongoose = require('mongoose');

// Helper function to get next difficulty based on admin routing
const getNextDifficulty = (currentDifficulty, isCorrect, adaptiveRouting) => {
    if (!adaptiveRouting || !adaptiveRouting[currentDifficulty]) {
        console.warn(`No routing config for difficulty: ${currentDifficulty}`);
        return currentDifficulty; // Fallback: stay at same difficulty
    }

    const routing = adaptiveRouting[currentDifficulty];
    const options = isCorrect ? routing.correct : routing.wrong;
    
    if (!options || options.length === 0) {
        console.warn(`No routing options for ${currentDifficulty} -> ${isCorrect ? 'correct' : 'wrong'}`);
        return currentDifficulty;
    }

    // For individual adaptive, randomly select from admin-approved options
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
};

// Get next question for individual adaptive exam
exports.getNextAdaptiveQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isAdaptive) {
            return res.status(400).json({
                success: false,
                message: 'Exam not found or not adaptive'
            });
        }

        // Get or create adaptive difficulty tracker
        let adaptiveDifficulty = await AdaptiveDifficulty.findOne({ userId, examId });
        if (!adaptiveDifficulty) {
            adaptiveDifficulty = new AdaptiveDifficulty({
                userId,
                examId,
                currentDifficulty: 3, // Start with easy (numeric)
                questionsAnswered: 0,
                correctAnswers: 0
            });
            await adaptiveDifficulty.save();
        }

        // Check if user is in wait period
        if (adaptiveDifficulty.waitUntil && new Date() < adaptiveDifficulty.waitUntil) {
            const waitTimeRemaining = Math.ceil((adaptiveDifficulty.waitUntil - new Date()) / 1000);
            return res.json({
                success: true,
                isWaiting: true,
                waitTimeRemaining,
                individualStats: {
                    questionsAnswered: adaptiveDifficulty.questionsAnswered,
                    correctAnswers: adaptiveDifficulty.correctAnswers,
                    accuracy: adaptiveDifficulty.questionsAnswered > 0 ? 
                        Math.round((adaptiveDifficulty.correctAnswers / adaptiveDifficulty.questionsAnswered) * 100) : 0,
                    currentDifficulty: adaptiveDifficulty.currentDifficulty <= 3 ? 'easy' :
                        adaptiveDifficulty.currentDifficulty <= 6 ? 'medium' : 'hard'
                }
            });
        }

        // Check if exam is complete
        if (adaptiveDifficulty.questionsAnswered >= exam.totalQuestions) {
            return res.json({
                success: true,
                isComplete: true
            });
        }

        // Get current difficulty level string
        const currentDifficultyLevel = adaptiveDifficulty.currentDifficulty <= 3 ? 'easy' :
            adaptiveDifficulty.currentDifficulty <= 6 ? 'medium' : 'hard';

        // Get questions user has already answered
        const answeredQuestions = await ExamQuestionResult.find({
            userId,
            examId
        }).select('questionId');
        const answeredQuestionIds = answeredQuestions.map(q => q.questionId);

        // Find a question at the current difficulty level that hasn't been answered
        const query = {
            difficultyLevel: currentDifficultyLevel,
            adminApproved: true,
            _id: { $nin: answeredQuestionIds }
        };

        // Add category filter if exam has dynamic config with tags
        if (exam.dynamicConfig && exam.dynamicConfig.tags && exam.dynamicConfig.tags.length > 0) {
            query.tags = { $in: exam.dynamicConfig.tags };
        }

        const availableQuestions = await Question.find(query).limit(10);

        if (availableQuestions.length === 0) {
            // No questions available at current difficulty, try any difficulty
            const fallbackQuery = {
                adminApproved: true,
                _id: { $nin: answeredQuestionIds }
            };
            if (exam.dynamicConfig && exam.dynamicConfig.tags && exam.dynamicConfig.tags.length > 0) {
                fallbackQuery.tags = { $in: exam.dynamicConfig.tags };
            }
            
            const fallbackQuestions = await Question.find(fallbackQuery).limit(5);
            if (fallbackQuestions.length === 0) {
                return res.json({
                    success: true,
                    isComplete: true,
                    message: 'No more questions available'
                });
            }
            availableQuestions.push(...fallbackQuestions);
        }

        // Select a random question
        const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        res.json({
            success: true,
            data: {
                question: {
                    _id: selectedQuestion._id,
                    content: selectedQuestion.content,
                    options: selectedQuestion.options.sort(() => Math.random() - 0.5), // Shuffle options
                    difficulty: selectedQuestion.difficultyLevel
                },
                questionNumber: adaptiveDifficulty.questionsAnswered + 1,
                totalQuestions: exam.totalQuestions,
                difficulty: currentDifficultyLevel,
                timePerQuestion: exam.timePerQuestion || 30
            }
        });

    } catch (error) {
        console.error('Error getting next adaptive question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get next question'
        });
    }
};

// Submit answer for individual adaptive exam
exports.submitAdaptiveAnswer = async (req, res) => {
    try {
        const { examId } = req.params;
        const { questionId, answer } = req.body;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isAdaptive) {
            return res.status(400).json({
                success: false,
                message: 'Exam not found or not adaptive'
            });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        // Check if user already answered this question
        const existingResult = await ExamQuestionResult.findOne({
            userId,
            examId,
            questionId
        });

        if (existingResult) {
            return res.status(400).json({
                success: false,
                message: 'Question already answered'
            });
        }

        // Evaluate answer
        const isCorrect = answer.trim() === question.correctAnswer.trim();

        // Save question result
        const questionResult = new ExamQuestionResult({
            userId,
            examId,
            questionId,
            userAnswer: answer,
            correctAnswer: question.correctAnswer,
            isCorrect,
            difficulty: question.difficulty,
            questionNumber: 0, // Will be updated below
            startedAt: new Date(),
            endedAt: new Date()
        });

        // Get adaptive difficulty tracker
        let adaptiveDifficulty = await AdaptiveDifficulty.findOne({ userId, examId });
        if (!adaptiveDifficulty) {
            return res.status(400).json({
                success: false,
                message: 'Adaptive session not found'
            });
        }

        // Update question number
        questionResult.questionNumber = adaptiveDifficulty.questionsAnswered + 1;
        await questionResult.save();

        // Update adaptive difficulty stats
        adaptiveDifficulty.questionsAnswered += 1;
        if (isCorrect) {
            adaptiveDifficulty.correctAnswers += 1;
        }

        // Get current difficulty level string
        const currentDifficultyLevel = adaptiveDifficulty.currentDifficulty <= 3 ? 'easy' :
            adaptiveDifficulty.currentDifficulty <= 6 ? 'medium' : 'hard';

        // Determine next difficulty using admin routing
        const nextDifficultyLevel = getNextDifficulty(currentDifficultyLevel, isCorrect, exam.adaptiveRouting);
        
        // Convert back to numeric difficulty
        const nextDifficultyNumeric = nextDifficultyLevel === 'easy' ? 3 :
            nextDifficultyLevel === 'medium' ? 5 : 8;

        adaptiveDifficulty.currentDifficulty = nextDifficultyNumeric;

        // Set wait period
        const waitTimeSeconds = Math.floor(Math.random() * 
            (exam.adaptiveSettings.waitTimeMax - exam.adaptiveSettings.waitTimeMin + 1)) + 
            exam.adaptiveSettings.waitTimeMin;
        
        adaptiveDifficulty.waitUntil = new Date(Date.now() + waitTimeSeconds * 1000);
        adaptiveDifficulty.lastQuestionAt = new Date();

        await adaptiveDifficulty.save();

        // Calculate individual stats
        const individualStats = {
            questionsAnswered: adaptiveDifficulty.questionsAnswered,
            correctAnswers: adaptiveDifficulty.correctAnswers,
            accuracy: Math.round((adaptiveDifficulty.correctAnswers / adaptiveDifficulty.questionsAnswered) * 100),
            currentDifficulty: nextDifficultyLevel,
            lastAnswer: isCorrect ? 'correct' : 'incorrect'
        };

        res.json({
            success: true,
            isCorrect,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            waitTime: waitTimeSeconds,
            individualStats,
            difficultyChange: currentDifficultyLevel !== nextDifficultyLevel ? {
                from: currentDifficultyLevel,
                to: nextDifficultyLevel,
                reason: isCorrect ? 'correct_answer' : 'incorrect_answer'
            } : null
        });

    } catch (error) {
        console.error('Error submitting adaptive answer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit answer'
        });
    }
};

// Get current question for synchronized adaptive exam
exports.getCurrentSynchronizedQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isAdaptive || !exam.isSynchronized) {
            return res.status(400).json({
                success: false,
                message: 'Exam not found or not synchronized adaptive'
            });
        }

        // Check if exam has started
        const now = new Date();
        if (now < new Date(exam.startTime)) {
            return res.json({
                success: true,
                isWaiting: true,
                message: 'Exam has not started yet'
            });
        }

        // Check if exam has ended
        if (now > new Date(exam.endTime)) {
            return res.json({
                success: true,
                isComplete: true,
                message: 'Exam has ended'
            });
        }

        // Check if exam is in wait period
        if (exam.isInWaitPeriod && exam.waitPeriodEndTime && now < exam.waitPeriodEndTime) {
            const waitTimeRemaining = Math.ceil((exam.waitPeriodEndTime - now) / 1000);
            return res.json({
                success: true,
                isWaiting: true,
                waitTimeRemaining,
                message: 'Analyzing responses...'
            });
        }

        // Check if current question is active
        if (!exam.isQuestionActive || !exam.currentQuestionId) {
            return res.json({
                success: true,
                isWaiting: true,
                message: 'Waiting for next question...'
            });
        }

        // Check if user has already answered current question
        const existingResult = await ExamQuestionResult.findOne({
            userId,
            examId,
            questionId: exam.currentQuestionId,
            questionNumber: exam.currentQuestionNumber
        });

        if (existingResult) {
            return res.json({
                success: true,
                isWaiting: true,
                hasAnswered: true,
                message: 'Waiting for other students...'
            });
        }

        // Get current question
        const question = await Question.findById(exam.currentQuestionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Current question not found'
            });
        }

        // Calculate time remaining for current question
        const questionStartTime = new Date(exam.currentQuestionStartTime);
        const questionEndTime = new Date(questionStartTime.getTime() + exam.questionTimer * 1000);
        const timeRemaining = Math.max(0, Math.ceil((questionEndTime - now) / 1000));

        res.json({
            success: true,
            data: {
                question: {
                    _id: question._id,
                    content: question.content,
                    options: question.options.sort(() => Math.random() - 0.5), // Shuffle options
                    difficulty: question.difficultyLevel
                },
                questionNumber: exam.currentQuestionNumber,
                totalQuestions: exam.totalQuestions,
                difficulty: exam.currentDifficulty,
                timeRemaining
            }
        });

    } catch (error) {
        console.error('Error getting synchronized question:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get current question'
        });
    }
};

// Submit answer for synchronized adaptive exam
exports.submitSynchronizedAnswer = async (req, res) => {
    try {
        const { examId } = req.params;
        const { questionId, answer } = req.body;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isAdaptive || !exam.isSynchronized) {
            return res.status(400).json({
                success: false,
                message: 'Exam not found or not synchronized adaptive'
            });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        // Check if user already answered this question
        const existingResult = await ExamQuestionResult.findOne({
            userId,
            examId,
            questionId,
            questionNumber: exam.currentQuestionNumber
        });

        if (existingResult) {
            return res.status(400).json({
                success: false,
                message: 'Question already answered'
            });
        }

        // Evaluate answer
        const isCorrect = answer.trim() === question.correctAnswer.trim();

        // Save question result
        const questionResult = new ExamQuestionResult({
            userId,
            examId,
            questionId,
            userAnswer: answer,
            correctAnswer: question.correctAnswer,
            isCorrect,
            difficulty: question.difficulty,
            questionNumber: exam.currentQuestionNumber,
            startedAt: new Date(),
            endedAt: new Date()
        });
        await questionResult.save();

        // Update synchronized exam statistics
        let syncStats = await SyncExamStats.findOne({
            examId,
            questionNumber: exam.currentQuestionNumber
        });

        if (!syncStats) {
            syncStats = new SyncExamStats({
                examId,
                questionId,
                questionNumber: exam.currentQuestionNumber,
                currentDifficulty: exam.currentDifficulty
            });
        }

        // Add response to statistics
        const responseAdded = syncStats.addResponse(userId, answer, isCorrect);
        if (!responseAdded) {
            return res.status(400).json({
                success: false,
                message: 'Response already recorded'
            });
        }

        await syncStats.save();

        // Check if 60% threshold is met and determine next difficulty
        const nextDifficulty = syncStats.determineNextDifficulty(exam.adaptiveRouting);
        syncStats.nextDifficulty = nextDifficulty;
        await syncStats.save();

        res.json({
            success: true,
            isCorrect,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
            syncStats: {
                totalResponses: syncStats.totalResponses,
                correctPercentage: syncStats.correctPercentage,
                thresholdMet: syncStats.thresholdMet,
                nextDifficulty
            }
        });

    } catch (error) {
        console.error('Error submitting synchronized answer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit answer'
        });
    }
};

// Admin endpoint to advance synchronized exam to next question
exports.advanceSynchronizedExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const { forceNextDifficulty } = req.body; // Admin can override difficulty

        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isAdaptive || !exam.isSynchronized) {
            return res.status(400).json({
                success: false,
                message: 'Exam not found or not synchronized adaptive'
            });
        }

        // Get current question stats
        const syncStats = await SyncExamStats.findOne({
            examId,
            questionNumber: exam.currentQuestionNumber
        });

        let nextDifficulty = exam.currentDifficulty;
        if (forceNextDifficulty) {
            // Admin override
            nextDifficulty = forceNextDifficulty;
            if (syncStats) {
                syncStats.adminOverride = forceNextDifficulty;
                await syncStats.save();
            }
        } else if (syncStats) {
            // Use calculated next difficulty
            nextDifficulty = syncStats.determineNextDifficulty(exam.adaptiveRouting);
        }

        // Find next question at the determined difficulty
        const answeredQuestionIds = await ExamQuestionResult.find({ examId })
            .distinct('questionId');

        const query = {
            difficultyLevel: nextDifficulty,
            adminApproved: true,
            _id: { $nin: answeredQuestionIds }
        };

        if (exam.dynamicConfig && exam.dynamicConfig.tags && exam.dynamicConfig.tags.length > 0) {
            query.tags = { $in: exam.dynamicConfig.tags };
        }

        const availableQuestions = await Question.find(query).limit(5);
        
        if (availableQuestions.length === 0) {
            // No more questions available, end exam
            exam.isQuestionActive = false;
            exam.currentQuestionId = null;
            exam.status = 'completed';
            await exam.save();

            return res.json({
                success: true,
                examComplete: true,
                message: 'No more questions available. Exam completed.'
            });
        }

        // Select next question
        const nextQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        // Update exam state
        exam.currentQuestionNumber += 1;
        exam.currentQuestionId = nextQuestion._id;
        exam.currentDifficulty = nextDifficulty;
        exam.currentQuestionStartTime = new Date();
        exam.isQuestionActive = true;
        exam.isInWaitPeriod = false;
        exam.waitPeriodEndTime = null;

        await exam.save();

        res.json({
            success: true,
            data: {
                questionNumber: exam.currentQuestionNumber,
                difficulty: nextDifficulty,
                question: {
                    _id: nextQuestion._id,
                    content: nextQuestion.content,
                    options: nextQuestion.options
                },
                previousStats: syncStats ? {
                    totalResponses: syncStats.totalResponses,
                    correctPercentage: syncStats.correctPercentage,
                    thresholdMet: syncStats.thresholdMet
                } : null
            }
        });

    } catch (error) {
        console.error('Error advancing synchronized exam:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to advance exam'
        });
    }
};

module.exports = {
    getNextAdaptiveQuestion: exports.getNextAdaptiveQuestion,
    submitAdaptiveAnswer: exports.submitAdaptiveAnswer,
    getCurrentSynchronizedQuestion: exports.getCurrentSynchronizedQuestion,
    submitSynchronizedAnswer: exports.submitSynchronizedAnswer,
    advanceSynchronizedExam: exports.advanceSynchronizedExam
};