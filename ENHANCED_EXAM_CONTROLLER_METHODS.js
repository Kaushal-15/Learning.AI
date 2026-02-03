// Enhanced Adaptive Exam Methods for examController.js
// Add these methods to fix the submit issues and camera proctoring

// Submit Answer for Adaptive Exam (Enhanced)
exports.submitAdaptiveAnswer = async (req, res) => {
    try {
        const { examId } = req.params;
        const { questionId, answer, timeSpent } = req.body;
        const userId = req.user.id || req.user._id;

        console.log('📝 Submitting adaptive answer:', { examId, questionId, answer, timeSpent });

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        // Get the question to check correct answer
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ success: false, message: 'Question not found' });
        }

        // Check if answer is correct
        const isCorrect = answer === question.correctAnswer;
        console.log(`✅ Answer check: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);

        // Save the answer
        const questionResult = new ExamQuestionResult({
            userId,
            examId,
            questionId,
            userAnswer: answer,
            correctAnswer: question.correctAnswer,
            isCorrect,
            timeSpent: timeSpent || 0,
            difficulty: question.difficulty
        });
        await questionResult.save();

        // Update adaptive difficulty
        let adaptiveDifficulty = await AdaptiveDifficulty.findOne({ userId, examId });
        if (!adaptiveDifficulty) {
            adaptiveDifficulty = new AdaptiveDifficulty({
                userId,
                examId,
                currentDifficulty: 3,
                questionsAnswered: 0,
                correctAnswers: 0
            });
        }

        adaptiveDifficulty.questionsAnswered += 1;
        if (isCorrect) {
            adaptiveDifficulty.correctAnswers += 1;
        }

        // Enhanced difficulty adjustment based on performance threshold
        const recentPerformance = await ExamQuestionResult.find({
            userId,
            examId
        }).sort({ createdAt: -1 }).limit(3);

        const recentCorrect = recentPerformance.filter(r => r.isCorrect).length;
        const recentTotal = recentPerformance.length;
        const accuracy = recentTotal > 0 ? (recentCorrect / recentTotal) * 100 : 0;

        console.log(`📊 Performance: ${recentCorrect}/${recentTotal} (${accuracy.toFixed(1)}%)`);

        // Adjust difficulty based on threshold
        if (recentTotal >= 2) {
            if (accuracy >= 70) {
                // Increase difficulty if 70%+ accuracy
                adaptiveDifficulty.currentDifficulty = Math.min(10, adaptiveDifficulty.currentDifficulty + 1);
                console.log('📈 Difficulty increased to:', adaptiveDifficulty.currentDifficulty);
            } else if (accuracy <= 30) {
                // Decrease difficulty if 30%- accuracy
                adaptiveDifficulty.currentDifficulty = Math.max(1, adaptiveDifficulty.currentDifficulty - 1);
                console.log('📉 Difficulty decreased to:', adaptiveDifficulty.currentDifficulty);
            }
        }

        // Set wait time based on adaptive settings
        const waitTimeMin = exam.adaptiveSettings?.waitTimeMin || 5;
        const waitTimeMax = exam.adaptiveSettings?.waitTimeMax || 10;
        const waitTime = Math.floor(Math.random() * (waitTimeMax - waitTimeMin + 1)) + waitTimeMin;
        
        adaptiveDifficulty.waitUntil = new Date(Date.now() + waitTime * 1000);
        await adaptiveDifficulty.save();

        // Calculate individual stats
        const totalAnswered = adaptiveDifficulty.questionsAnswered;
        const totalCorrect = adaptiveDifficulty.correctAnswers;
        const overallAccuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

        res.json({
            success: true,
            isCorrect,
            waitTime,
            individualStats: {
                questionsAnswered: totalAnswered,
                correctAnswers: totalCorrect,
                accuracy: Math.round(overallAccuracy),
                currentDifficulty: adaptiveDifficulty.currentDifficulty
            }
        });
    } catch (error) {
        console.error('Error submitting adaptive answer:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Wait Status for Adaptive Exam (Enhanced)
exports.getWaitStatus = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const adaptiveDifficulty = await AdaptiveDifficulty.findOne({ userId, examId });
        if (!adaptiveDifficulty) {
            return res.json({
                success: true,
                isWaiting: false
            });
        }

        const now = new Date();
        const isWaiting = adaptiveDifficulty.waitUntil && now < adaptiveDifficulty.waitUntil;

        if (isWaiting) {
            const timeRemaining = Math.ceil((adaptiveDifficulty.waitUntil - now) / 1000);
            
            // Calculate individual stats
            const totalAnswered = adaptiveDifficulty.questionsAnswered;
            const totalCorrect = adaptiveDifficulty.correctAnswers;
            const accuracy = totalAnswered > 0 ? (totalCorrect / totalAnswered * 100) : 0;

            res.json({
                success: true,
                isWaiting: true,
                timeRemaining,
                individualStats: {
                    questionsAnswered: totalAnswered,
                    correctAnswers: totalCorrect,
                    accuracy: Math.round(accuracy),
                    currentDifficulty: adaptiveDifficulty.currentDifficulty
                }
            });
        } else {
            res.json({
                success: true,
                isWaiting: false
            });
        }
    } catch (error) {
        console.error('Error getting wait status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Enhanced Start Session with Camera Proctoring
exports.startSessionWithProctoring = async (req, res) => {
    try {
        const { examId } = req.params;
        const { studentName, registerNumber } = req.body;
        
        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        const userId = req.user.id || req.user._id;

        // Check if session already exists
        let session = await ExamSession.findOne({ userId, examId });
        
        if (!session) {
            // Create new session with proctoring config
            const expiryTime = new Date(Date.now() + exam.duration * 60000);

            session = new ExamSession({
                userId,
                examId,
                studentName,
                registerNumber,
                startTime: new Date(),
                expiryTime,
                timeRemaining: exam.duration * 60,
                proctoringEnabled: true,
                cameraRequired: exam.requireCamera || true,
                violations: 0
            });

            await session.save();
        }

        // Return session with proctoring configuration
        res.json({
            success: true,
            data: {
                session: {
                    ...session.toObject(),
                    proctoringConfig: {
                        cameraRequired: true,
                        fullscreenRequired: true,
                        tabSwitchLimit: 3,
                        violationThreshold: 3
                    }
                },
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    requireCamera: true,
                    proctoringEnabled: true
                }
            }
        });
    } catch (error) {
        console.error('Error starting proctored session:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Camera Status Check
exports.checkCameraStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id || req.user._id;

        const session = await ExamSession.findOne({ _id: sessionId, userId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        res.json({
            success: true,
            data: {
                cameraRequired: session.cameraRequired || true,
                proctoringEnabled: session.proctoringEnabled || true,
                violations: session.violations || 0
            }
        });
    } catch (error) {
        console.error('Error checking camera status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Log Violation
exports.logViolation = async (req, res) => {
    try {
        const { examId } = req.params;
        const { violationType, details } = req.body;
        const userId = req.user.id || req.user._id;

        // Log the violation
        const log = new ExamLog({
            userId,
            examId,
            eventType: violationType,
            details: details || `Violation: ${violationType}`,
            timestamp: new Date()
        });
        await log.save();

        // Update session violations
        const session = await ExamSession.findOne({ userId, examId });
        if (session) {
            session.violations = (session.violations || 0) + 1;
            await session.save();

            // Check if violation threshold exceeded
            if (session.violations >= 3) {
                return res.json({
                    success: true,
                    violationCount: session.violations,
                    autoSubmit: true,
                    message: 'Exam terminated due to multiple violations'
                });
            }
        }

        res.json({
            success: true,
            violationCount: session?.violations || 0,
            autoSubmit: false
        });
    } catch (error) {
        console.error('Error logging violation:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitAdaptiveAnswer: exports.submitAdaptiveAnswer,
    getWaitStatus: exports.getWaitStatus,
    startSessionWithProctoring: exports.startSessionWithProctoring,
    checkCameraStatus: exports.checkCameraStatus,
    logViolation: exports.logViolation
};