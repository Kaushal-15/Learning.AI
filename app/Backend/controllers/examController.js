const { ExamMaster, ExamQuestion, ExamSession, ExamAttempt, ExamLog, AdaptiveDifficulty, ExamQuestionResult } = require('../config/examDatabase');
const Question = require('../models/Question');
const Document = require('../models/Document');
const fileProcessingService = require('../services/fileProcessingService');
const quizGenerationService = require('../services/quizGenerationService');
const mongoose = require('mongoose');
const { computeExamState } = require('../services/examStateHelper');
const { validateQuestionPool, getRequiredPerDifficulty } = require('../services/poolRules');
const storageService = require('../services/storageService');

// Helper function to convert difficulty string to number
const convertDifficulty = (difficulty) => {
    if (typeof difficulty === 'number') return difficulty;
    if (!difficulty) return 5; // default to medium

    const diffMap = {
        'easy': 3,
        'medium': 5,
        'hard': 8,
        'beginner': 2,
        'intermediate': 5,
        'advanced': 8
    };

    return diffMap[difficulty.toLowerCase()] || 5;
};

// Helper function to get difficulty level string
const getDifficultyLevel = (diff) => {
    if (typeof diff === 'string' && ['easy', 'medium', 'hard'].includes(diff.toLowerCase())) {
        return diff.toLowerCase();
    }
    // Map number to string
    const num = typeof diff === 'number' ? diff : convertDifficulty(diff);
    if (num <= 3) return 'easy';
    if (num <= 6) return 'medium';
    return 'hard';
};

// Create Exam

// Create Exam with enhanced support for mixed questions and dynamic settings
exports.createExam = async (req, res) => {
    try {
        const {
            title, description, examCode, startTime, endTime, duration,
            verificationDuration,
            totalQuestions, passingScore, questionIds, rawQuestions,
            examType, documentId, dynamicSettings, mixedQuestions,
            students, requireStudentVerification,
            isAdaptive, timePerQuestion, adaptiveSettings, adaptiveRouting
        } = req.body;

        console.log('Creating exam with:', {
            examType,
            hasQuestionIds: !!questionIds,
            hasRawQuestions: !!rawQuestions,
            hasDocumentId: !!documentId,
            hasMixedQuestions: !!mixedQuestions,
            hasDynamicSettings: !!dynamicSettings,
            hasStudents: !!students,
            requireStudentVerification
        });

        // Validation
        if (!title || !examCode || !startTime || !endTime || !duration) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Validate question count
        if (totalQuestions === 0) {
            return res.status(400).json({ success: false, message: 'At least one question is required' });
        }

        const userId = req.user.id || req.user._id;

        // Validate adaptive settings if enabled
        if (isAdaptive && timePerQuestion) {
            if (timePerQuestion < 10 || timePerQuestion > 300) {
                return res.status(400).json({
                    success: false,
                    message: 'Time per question must be between 10 and 300 seconds'
                });
            }
        }

        // Enforce adaptive question pool rule: at least ceil(0.6 * N) per difficulty
        if (isAdaptive || examType === 'dynamic') {
            const poolCandidates = (mixedQuestions && mixedQuestions.length)
                ? mixedQuestions
                : (rawQuestions && rawQuestions.length)
                    ? rawQuestions
                    : (questionIds && questionIds.length)
                        ? await Question.find({ _id: { $in: questionIds } })
                        : [];

            if (poolCandidates.length > 0) {
                const poolValidation = validateQuestionPool(poolCandidates, Number(totalQuestions));
                if (!poolValidation.valid) {
                    return res.status(400).json({
                        success: false,
                        message: `Adaptive exam creation blocked: ${poolValidation.message}`,
                        data: poolValidation
                    });
                }
            }
        }

        const exam = new ExamMaster({
            title,
            description,
            examCode,
            startTime,
            endTime,
            duration,
            verificationDuration: verificationDuration || 15,
            totalQuestions,
            passingScore,
            createdBy: userId,
            status: 'active',
            examType: examType || 'static',
            documentId: documentId || null,
            dynamicConfig: dynamicSettings || null, // Map dynamicSettings to dynamicConfig
            students: students || [],
            requireStudentVerification: requireStudentVerification || false,
            isAdaptive: isAdaptive || false,
            timePerQuestion: timePerQuestion || 30,
            adaptiveSettings: adaptiveSettings || {
                increaseThreshold: 60,
                decreaseThreshold: 40,
                minQuestionsBeforeAdjust: 1,
                waitTimeMin: 5,
                waitTimeMax: 10
            },
            adaptiveRouting: adaptiveRouting || {
                easy: {
                    correct: ['easy', 'medium'],
                    wrong: ['easy']
                },
                medium: {
                    correct: ['medium', 'hard'],
                    wrong: ['easy', 'medium']
                },
                hard: {
                    correct: ['hard'],
                    wrong: ['medium']
                }
            }
        });

        await exam.save();
        console.log('Exam created:', exam._id);

        let examQuestions = [];

        if (examType === 'mixed' && mixedQuestions) {
            // Handle mixed questions from multiple sources
            examQuestions = mixedQuestions.map((q, index) => ({
                examId: exam._id,
                questionId: q._id || new mongoose.Types.ObjectId(),
                content: q.question || q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || '',
                difficulty: convertDifficulty(q.difficulty),
                difficultyLevel: getDifficultyLevel(q.difficulty),
                category: Array.isArray(q.category) ? q.category : [q.category || 'General'],
                order: index,
                source: q.source || 'mixed'
            }));
        } else if (questionIds && questionIds.length > 0) {
            // Freeze questions for this exam from existing questions
            const questions = await Question.find({ _id: { $in: questionIds } });
            examQuestions = questions.map((q, index) => ({
                examId: exam._id,
                questionId: q._id,
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                difficulty: q.difficulty,
                difficultyLevel: q.difficultyLevel || getDifficultyLevel(q.difficulty),
                category: q.category,
                order: index,
                source: 'static'
            }));
        } else if (rawQuestions && rawQuestions.length > 0) {
            // Use raw questions (e.g. from file upload or manual entry)
            examQuestions = rawQuestions.map((q, index) => ({
                examId: exam._id,
                questionId: new mongoose.Types.ObjectId(),
                content: q.question || q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation || '',
                difficulty: convertDifficulty(q.difficulty),
                difficultyLevel: getDifficultyLevel(q.difficulty),
                category: Array.isArray(q.category) ? q.category : [q.category || 'General'],
                order: index,
                source: q.source || 'file'
            }));
        }

        // Handle question insertion based on exam type
        if (examType === 'dynamic') {
            // For dynamic exams, save questions to Question Bank and configure dynamic settings
            if (examQuestions.length > 0) {
                console.log(`Saving ${examQuestions.length} questions to Question Bank for dynamic exam...`);

                // Convert exam questions to Question Bank format
                const questionBankDocs = examQuestions.map(q => ({
                    content: q.content,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || '',
                    category: q.category || ['General'],
                    difficulty: q.difficulty || 5,
                    difficultyLevel: q.difficultyLevel || getDifficultyLevel(q.difficulty),
                    adminApproved: true, // Auto-approve questions uploaded by admin
                    tags: q.category || ['General'],
                    generatedBy: 'AI' // AI generates questions from uploaded files
                }));

                // Save to Question Bank
                const savedQuestions = await Question.insertMany(questionBankDocs);
                console.log(`Saved ${savedQuestions.length} questions to Question Bank`);

                // Update exam with dynamic config (tags only, no manual difficulty distribution)
                exam.dynamicConfig = {
                    tags: [...new Set(savedQuestions.flatMap(q => q.tags))], // Unique tags
                    totalQuestions: exam.totalQuestions
                };
                exam.isAdaptive = true; // Enable adaptive difficulty for dynamic exams
                await exam.save();
                console.log(`Dynamic exam configured with ${savedQuestions.length} questions in Question Bank`);
            } else {
                console.log(`Dynamic exam created, questions will be generated on session start`);
            }
        } else if (examQuestions.length > 0) {
            // For static/mixed exams, save to ExamQuestion collection
            await ExamQuestion.insertMany(examQuestions);
            console.log(`Inserted ${examQuestions.length} questions for exam ${exam._id}`);
        }

        res.status(201).json({ success: true, data: exam });
    } catch (error) {
        console.error('Error creating exam:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const validateFileContent = (buffer, mimetype, originalname) => {
    if (!buffer || buffer.length === 0) {
        return { valid: false, message: 'The uploaded file is empty.' };
    }

    const name = (originalname || '').toLowerCase();
    const isPdf = mimetype === 'application/pdf' || name.endsWith('.pdf');
    const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
    const isCsv = mimetype === 'text/csv' ||
                  mimetype === 'application/csv' ||
                  mimetype === 'text/x-csv' ||
                  mimetype === 'application/x-csv' ||
                  mimetype === 'application/vnd.ms-excel' ||
                  name.endsWith('.csv');
    const isTxt = mimetype === 'text/plain' || name.endsWith('.txt');

    if (!isPdf && !isDocx && !isTxt && !isCsv) {
        return { valid: false, message: 'Invalid file type. Only PDF, DOCX, TXT, and CSV are allowed.' };
    }

    if (isPdf) {
        if (buffer.length < 4 || buffer.slice(0, 4).toString('ascii') !== '%PDF') {
            return { valid: false, message: 'Invalid file type or corrupted PDF file.' };
        }
    } else if (isDocx) {
        if (
            buffer.length < 4 ||
            buffer[0] !== 0x50 ||
            buffer[1] !== 0x4B ||
            (buffer[2] !== 0x03 && buffer[2] !== 0x05 && buffer[2] !== 0x07)
        ) {
            return { valid: false, message: 'Invalid file type or corrupted DOCX file.' };
        }
    } else if (isTxt || isCsv) {
        const sample = buffer.slice(0, Math.min(buffer.length, 1024));
        if (sample.includes(0x00)) {
            return { valid: false, message: 'Invalid file content: binary files are not allowed as text or CSV.' };
        }
    }

    return { valid: true };
};

// Upload Questions from File
exports.uploadQuestions = async (req, res) => {
    try {
        // Validate questionCount if provided
        let questionCount = 10;
        if (req.body.questionCount !== undefined && req.body.questionCount !== null && String(req.body.questionCount).trim() !== '') {
            const parsed = Number(req.body.questionCount);
            if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Question count must be an integer between 1 and 100.'
                });
            }
            questionCount = parsed;
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please select a file and try again.'
            });
        }

        const { originalname, mimetype, size, buffer } = req.file;
        const userId = req.user.id || req.user._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication failed. Please log in again.'
            });
        }

        // Validate file size (4 MB)
        const maxSize = 4 * 1024 * 1024;
        if (size > maxSize) {
            return res.status(413).json({
                success: false,
                message: 'File is larger than 4 MB'
            });
        }

        // Validate file content and magic bytes
        const validation = validateFileContent(buffer, mimetype, originalname);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Handle CSV files directly — parse from in-memory buffer
        const name = (originalname || '').toLowerCase();
        const isCsv = mimetype === 'text/csv' ||
                      mimetype === 'application/csv' ||
                      mimetype === 'text/x-csv' ||
                      mimetype === 'application/x-csv' ||
                      mimetype === 'application/vnd.ms-excel' ||
                      name.endsWith('.csv');

        if (isCsv) {
            try {
                const questions = quizGenerationService.parseCSVFromBuffer(buffer);
                if (!questions || questions.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No valid questions found in CSV file.'
                    });
                }
                return res.status(200).json({
                    success: true,
                    data: questions,
                    documentId: null,
                    message: `Successfully extracted ${questions.length} questions from the CSV.`
                });
            } catch (csvError) {
                return res.status(400).json({
                    success: false,
                    message: csvError.message || 'Failed to parse CSV file'
                });
            }
        }

        // Create Document record (in-memory processing, no disk file, path optional, no buffer in MongoDB)
        const sanitized = (originalname || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
        const document = new Document({
            userId,
            filename: `${Date.now()}-${sanitized}`,
            originalName: originalname,
            mimeType: mimetype,
            size,
            path: null,
            status: 'processing',
            processed: false,
            chunkCount: 0
        });

        await document.save();

        // Stream original to S3
        const s3Key = `documents/${userId}/${document._id}/${sanitized}`;
        try {
            const s3Result = await storageService.uploadObject({
                key: s3Key,
                body: buffer,
                contentType: mimetype
            });
            if (s3Result && s3Result.success) {
                document.storageKey = s3Key;
                await document.save();
            }
        } catch (s3Error) {
            console.warn('S3 upload skipped or failed:', s3Error.message);
        }

        // Process document in memory directly from req.file.buffer
        let processResult;
        try {
            processResult = await fileProcessingService.processDocument(document._id, buffer);
        } catch (processError) {
            return res.status(422).json({
                success: false,
                message: 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            });
        }

        if (!processResult.success || processResult.chunkCount === 0) {
            return res.status(422).json({
                success: false,
                message: processResult.message || 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            });
        }

        // Apply adaptive pool rule: at least ceil(0.6 * N) per easy/medium/hard
        const minPerDiff = Math.ceil(0.6 * questionCount);
        let easyCount = minPerDiff;
        let mediumCount = minPerDiff;
        let hardCount = minPerDiff;

        // If client provided custom difficulty distribution, validate it against the adaptive rule
        if (req.body.difficultyDistribution) {
            let dist = req.body.difficultyDistribution;
            if (typeof dist === 'string') {
                try {
                    dist = JSON.parse(dist);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid difficultyDistribution JSON format.'
                    });
                }
            }
            if (typeof dist === 'object' && dist !== null) {
                const reqEasy = Number(dist.easy || 0);
                const reqMedium = Number(dist.medium || 0);
                const reqHard = Number(dist.hard || 0);
                if (reqEasy < minPerDiff || reqMedium < minPerDiff || reqHard < minPerDiff) {
                    return res.status(400).json({
                        success: false,
                        message: `Adaptive exam requires at least ${minPerDiff} questions for each difficulty (Easy: ${reqEasy}/${minPerDiff}, Medium: ${reqMedium}/${minPerDiff}, Hard: ${reqHard}/${minPerDiff}).`
                    });
                }
                easyCount = reqEasy;
                mediumCount = reqMedium;
                hardCount = reqHard;
            }
        }

        const totalRequiredPool = easyCount + mediumCount + hardCount;

        const config = {
            questionCount: totalRequiredPool,
            targetCount: questionCount,
            easyCount,
            mediumCount,
            hardCount,
            difficulty: 'mixed'
        };

        let questions;
        try {
            questions = await quizGenerationService.generateQuiz(document._id, 'dynamic', config);
        } catch (generateError) {
            console.error('Question generation error:', generateError.message);
            const msg = (generateError.message || '').toLowerCase();
            if (msg.includes('timed out') || msg.includes('timeout') || generateError.code === 'ETIMEDOUT') {
                return res.status(504).json({
                    success: false,
                    message: 'AI question generation timed out. Please try with a smaller document or fewer questions.'
                });
            }
            return res.status(502).json({
                success: false,
                message: 'AI question generation service is currently unavailable. Please try again later.'
            });
        }

        if (!questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No questions could be generated from this document. Please try a different file with more educational content.'
            });
        }

        return res.status(200).json({
            success: true,
            data: questions,
            documentId: document._id,
            message: `Successfully extracted ${questions.length} questions from the document.`
        });
    } catch (error) {
        console.error('=== Upload Error ===', error.message);
        const isProd = process.env.NODE_ENV === 'production';
        return res.status(500).json({
            success: false,
            message: isProd ? 'File upload failed. Please try again.' : (error.message || 'File upload failed. Please try again.')
        });
    }
};

// Validate Exam Entry
exports.validateEntry = async (req, res) => {
    try {
        const rawExamCode = req.body.examCode || '';
        const rawRegisterNumber = req.body.registerNumber || '';
        const examCode = rawExamCode.trim().toUpperCase();
        const registerNumber = rawRegisterNumber.trim().toUpperCase();

        if (!examCode) {
            return res.status(400).json({ success: false, message: 'Exam code is required' });
        }

        const exam = await ExamMaster.findOne({ examCode });

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Invalid Exam Code' });
        }

        // Compute authoritative state lazily from timestamps
        const state = computeExamState(exam, new Date());

        if (state.hasEnded) {
            return res.status(403).json({
                success: false,
                examState: 'ended',
                message: 'Exam has ended. No new sessions allowed.',
                serverNow: state.serverNow,
                startTime: state.startTime,
                endTime: state.endTime
            });
        }

        // Check student verification if enabled and registerNumber is supplied
        if (exam.requireStudentVerification && registerNumber) {
            const student = (exam.students || []).find(s =>
                (s.registerNumber || '').trim().toUpperCase() === registerNumber
            );
            if (!student) {
                return res.status(403).json({
                    success: false,
                    message: 'Register number not found in the exam student list'
                });
            }
        }

        const userId = req.user.id || req.user._id;
        const existingAttempt = await ExamAttempt.findOne({ userId, examId: exam._id });
        if (existingAttempt) {
            return res.status(403).json({ success: false, message: 'You have already completed this exam' });
        }

        // If exam is scheduled (before verification window), allow student to enter and view countdown
        const responseData = {
            _id: exam._id,
            title: exam.title,
            description: exam.description,
            examCode: exam.examCode,
            duration: exam.duration,
            totalQuestions: exam.totalQuestions,
            passingScore: exam.passingScore,
            requireStudentVerification: exam.requireStudentVerification,
            requireBiometric: exam.requireBiometric,
            requireCamera: exam.requireCamera,
            examType: exam.examType,
            isAdaptive: exam.isAdaptive,
            startTime: state.startTime,
            endTime: state.endTime,
            verificationStart: state.verificationStart,
            verificationDuration: state.verificationDuration,
            examState: state.status,
            serverNow: state.serverNow
        };

        res.status(200).json({
            success: true,
            examState: state.status,
            serverNow: state.serverNow,
            ...state,
            data: responseData
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Start/Resume Session
exports.startSession = async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await ExamMaster.findById(examId);

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        // STRICT TIMING ENFORCEMENT (Authoritative state computation)
        const state = computeExamState(exam, new Date());

        if (state.hasEnded) {
            return res.status(403).json({
                success: false,
                examState: 'ended',
                message: 'Exam has ended. No new sessions allowed.',
                serverNow: state.serverNow
            });
        }

        if (state.status === 'scheduled') {
            return res.status(403).json({
                success: false,
                examState: 'scheduled',
                message: `Exam verification has not opened yet. Verification opens at ${state.verificationStart} (UTC).`,
                serverNow: state.serverNow,
                startTime: state.startTime,
                verificationStart: state.verificationStart
            });
        }

        const userId = req.user.id || req.user._id;

        // Check if user already completed this exam
        const existingAttempt = await ExamAttempt.findOne({ userId, examId: exam._id });
        if (existingAttempt) {
            return res.status(403).json({ success: false, message: 'You have already completed this exam' });
        }

        let session = await ExamSession.findOne({ userId, examId });

        if (!session) {
            const studentName = (req.body.studentName || '').trim();
            const registerNumber = (req.body.registerNumber || '').trim().toUpperCase();

            // Enforce student verification if enabled
            if (exam.requireStudentVerification) {
                if (!registerNumber) {
                    return res.status(400).json({
                        success: false,
                        message: 'Register number is required for this exam'
                    });
                }

                const student = (exam.students || []).find(s =>
                    (s.registerNumber || '').trim().toUpperCase() === registerNumber
                );
                if (!student) {
                    return res.status(403).json({
                        success: false,
                        message: 'You are not registered for this exam. Only registered students can access this exam.'
                    });
                }
            }

            // BIOMETRIC VERIFICATION CHECK
            if (exam.requireBiometric && registerNumber) {
                const BiometricVerification = require('../models/BiometricVerification');
                const biometric = await BiometricVerification.findOne({
                    examId: exam._id,
                    registerNumber: registerNumber,
                    status: 'approved'
                });

                if (!biometric) {
                    return res.status(403).json({
                        success: false,
                        message: 'Biometric verification required. Please complete biometric verification and wait for admin approval.',
                        requireBiometric: true
                    });
                }
            }

            // Create new session
            const expiryTime = new Date(Date.now() + exam.duration * 60000);

            session = new ExamSession({
                userId,
                examId,
                studentName,
                registerNumber,
                startTime: new Date(),
                expiryTime,
                timeRemaining: exam.duration * 60
            });

            // Handle Dynamic Question Generation
            if (exam.examType === 'dynamic') {
                console.log('Generating dynamic questions for session...');
                let questions = [];

                if (exam.dynamicConfig) {
                    // Generate from Question Bank based on config
                    const { levels, tags } = exam.dynamicConfig;
                    const totalQuestions = exam.totalQuestions || 10;

                    // Enhanced distribution across all difficulty levels - FORCE EQUAL SPLIT
                    // This ensures we have enough questions for the adaptive engine to work effectively
                    const easyCount = Math.ceil(totalQuestions * 0.34);    // ~33% easy
                    const mediumCount = Math.ceil(totalQuestions * 0.33);  // ~33% medium
                    const hardCount = totalQuestions - easyCount - mediumCount; // ~33% hard

                    const query = {};
                    if (tags && tags.length > 0) {
                        query.tags = { $in: tags };
                    }

                    console.log(`🎯 Generating ${totalQuestions} questions: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard`);

                    const [easyQ, mediumQ, hardQ] = await Promise.all([
                        Question.aggregate([{ $match: { ...query, difficulty: { $lte: 3 } } }, { $sample: { size: easyCount } }]),
                        Question.aggregate([{ $match: { ...query, difficulty: { $gt: 3, $lte: 6 } } }, { $sample: { size: mediumCount } }]),
                        Question.aggregate([{ $match: { ...query, difficulty: { $gt: 6 } } }, { $sample: { size: hardCount } }])
                    ]);

                    questions = [...easyQ, ...mediumQ, ...hardQ];
                    console.log(`📊 Retrieved: ${easyQ.length} easy, ${mediumQ.length} medium, ${hardQ.length} hard questions`);
                } else if (exam.documentId) {
                    // Enhanced document-based generation with comprehensive difficulty coverage
                    console.log('Generating comprehensive questions from document:', exam.documentId);
                    const totalQuestions = exam.totalQuestions || 20; // Increase default for better coverage

                    const config = {
                        questionCount: totalQuestions,
                        difficulty: 'mixed' // Generate mixed difficulty levels
                    };
                    const generated = await quizGenerationService.generateQuiz(exam.documentId, 'dynamic', config);

                    if (generated && generated.length > 0) {
                        // Save generated questions to Question Bank with proper tagging
                        const questionDocs = generated.map(q => ({
                            content: q.question,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                            explanation: q.explanation || 'AI Generated',
                            category: q.tags || [q.topic || 'General'],
                            difficulty: q.difficultyScore || convertDifficulty(q.difficulty),
                            tags: q.tags || [q.topic || 'General'],
                            generatedBy: 'AI'
                        }));

                        // Insert questions into database
                        const savedQuestions = await Question.insertMany(questionDocs);
                        questions = savedQuestions;

                        // Update exam config with generated tags
                        const allTags = [...new Set(savedQuestions.flatMap(q => q.tags))];
                        exam.dynamicConfig = {
                            tags: allTags,
                            totalQuestions: savedQuestions.length
                        };
                        await exam.save();

                        console.log(`✅ Generated and saved ${savedQuestions.length} questions with tags: ${allTags.join(', ')}`);
                    }
                }

                // Store Question IDs in session (ONLY for dynamic exams)
                if (questions.length > 0) {
                    // Filter out any invalid ObjectIds
                    const validIds = questions
                        .map(q => q._id)
                        .filter(id => mongoose.Types.ObjectId.isValid(id));

                    if (validIds.length > 0) {
                        console.log('Setting valid questionIds for dynamic exam:', validIds.length);
                        session.questionIds = validIds;
                    } else {
                        console.warn('No valid ObjectIds found for dynamic exam questions!');
                    }
                } else {
                    console.warn('⚠️ No questions generated for dynamic exam!');
                }
            }

            // Validate session before saving
            console.log('Session before save:', {
                examType: exam.examType,
                hasQuestionIds: !!session.questionIds,
                questionIdsLength: session.questionIds?.length || 0
            });

            await session.save();

            // Mark student as attempted if verification is enabled
            if (exam.requireStudentVerification && registerNumber) {
                const studentIndex = exam.students.findIndex(s => s.registerNumber === registerNumber);
                if (studentIndex !== -1) {
                    exam.students[studentIndex].hasAttempted = true;
                    await exam.save();
                }
            }
        }

        // Fetch Questions for the Session
        let questions = [];
        if (exam.examType === 'dynamic') {
            if (session.questionIds && session.questionIds.length > 0) {
                questions = await Question.find({ _id: { $in: session.questionIds } });
                // Shuffle if needed, or keep order
            }
        } else {
            // Static
            questions = await ExamQuestion.find({ examId }).sort('order');
        }

        // Ensure questions exist
        if (!questions || questions.length === 0) {
            // Fallback for old dynamic exams or empty generation (Self-Healing)
            if (exam.examType === 'dynamic' && (!session.questionIds || session.questionIds.length === 0)) {
                console.log('Attempting self-healing for dynamic exam...', {
                    examId: exam._id,
                    documentId: exam.documentId,
                    dynamicConfig: exam.dynamicConfig
                });

                try {
                    let newQuestions = [];
                    if (exam.documentId) {
                        // Regenerate from document
                        console.log('Regenerating from document:', exam.documentId);
                        const config = {
                            questionCount: exam.totalQuestions || 10,
                            difficulty: 'medium'
                        };
                        const generated = await quizGenerationService.generateQuiz(exam.documentId, 'dynamic', config);

                        if (generated && generated.length > 0) {
                            const questionDocs = generated.map(q => ({
                                content: q.question,
                                options: q.options,
                                correctAnswer: q.correctAnswer,
                                explanation: q.explanation || 'AI Generated',
                                category: [q.topic || 'General'],
                                difficulty: convertDifficulty(q.difficulty),
                                tags: [q.topic || 'General'],
                                generatedBy: 'AI'
                            }));
                            newQuestions = await Question.insertMany(questionDocs);
                        }
                    } else if (exam.dynamicConfig) {
                        // Regenerate from Question Bank
                        console.log('Regenerating from dynamic config:', exam.dynamicConfig);
                        const { tags, totalQuestions } = exam.dynamicConfig;
                        const questionCount = totalQuestions || exam.totalQuestions || 10;

                        const query = {};
                        // Only filter by tags if tags exist
                        if (tags && tags.length > 0) {
                            query.tags = { $in: tags };
                        }

                        // Fetch random questions based on total count
                        // Distribute across difficulties: 33% easy, 33% medium, 33% hard
                        const easyCount = Math.ceil(questionCount * 0.34);
                        const mediumCount = Math.ceil(questionCount * 0.33);
                        const hardCount = questionCount - easyCount - mediumCount;

                        const [easyQ, mediumQ, hardQ] = await Promise.all([
                            Question.aggregate([{ $match: { ...query, difficulty: { $lte: 3 } } }, { $sample: { size: easyCount } }]),
                            Question.aggregate([{ $match: { ...query, difficulty: { $gt: 3, $lte: 6 } } }, { $sample: { size: mediumCount } }]),
                            Question.aggregate([{ $match: { ...query, difficulty: { $gt: 6 } } }, { $sample: { size: hardCount } }])
                        ]);

                        newQuestions = [...easyQ, ...mediumQ, ...hardQ];
                        console.log(`Self-healing fetched ${newQuestions.length} questions (${easyQ.length} easy, ${mediumQ.length} medium, ${hardQ.length} hard)`);
                    }

                    if (newQuestions.length > 0) {
                        session.questionIds = newQuestions.map(q => q._id);
                        await session.save();
                        questions = newQuestions;
                        console.log('Self-healing successful: Generated', newQuestions.length, 'questions');
                    } else {
                        console.error('Self-healing failed: No questions generated');
                        return res.status(500).json({ success: false, message: 'Failed to regenerate questions. Please recreate the exam.' });
                    }
                } catch (err) {
                    console.error('Self-healing failed with error:', err);
                    return res.status(500).json({ success: false, message: 'Failed to generate questions. Please recreate the exam.' });
                }
            }
        }

        // Calculate remaining time based on expiry
        const nowTime = new Date();
        const remainingSeconds = Math.max(0, Math.floor((new Date(session.expiryTime) - nowTime) / 1000));

        res.status(200).json({
            success: true,
            data: {
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    description: exam.description,
                    duration: exam.duration,
                    totalQuestions: questions.length,
                    passingScore: exam.passingScore,
                    proctoringConfig: exam.proctoringConfig,
                    controls: exam.controls,
                    timePerQuestion: exam.timePerQuestion
                },
                session: {
                    ...session.toObject(),
                    timeRemaining: remainingSeconds // Send calculated remaining time
                },
                questions: questions.map(q => ({
                    _id: q._id, // Use actual Question ID
                    content: q.content || q.question, // Handle both models
                    options: q.options,
                    // Hide correct answer
                    difficulty: q.difficulty,
                    category: q.category
                }))
            }
        });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// [Old Adaptive Functions Removed]

// Update Session (Save Answer)
exports.updateSession = async (req, res) => {
    try {
        const { examId } = req.params;
        const { currentQuestionIndex, answers, timeRemaining, violation } = req.body;

        const userId = req.user.id || req.user._id;
        const session = await ExamSession.findOne({ userId, examId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (currentQuestionIndex !== undefined) session.currentQuestionIndex = currentQuestionIndex;
        if (answers) {
            for (const [key, value] of Object.entries(answers)) {
                session.answers.set(key, value);
            }
        }
        if (timeRemaining !== undefined) session.timeRemaining = timeRemaining;
        if (violation) session.violations += 1;

        session.lastHeartbeat = Date.now();
        await session.save();

        // Check violation threshold
        const exam = await ExamMaster.findById(examId);
        if (session.violations >= exam.proctoringConfig.tabSwitchLimit && exam.proctoringConfig.autoSubmitOnViolation) {
            return await this.submitExam(req, res);
        }

        res.status(200).json({ success: true, data: session });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Log Proctoring Event
exports.logEvent = async (req, res) => {
    try {
        const { examId } = req.params;
        const { eventType, details } = req.body;

        const userId = req.user.id || req.user._id;
        const log = new ExamLog({
            userId,
            examId,
            eventType,
            details
        });
        await log.save();

        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Submit Exam
exports.submitExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;
        const session = await ExamSession.findOne({ userId, examId });

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        const exam = await ExamMaster.findById(examId);

        let questions = [];
        if (exam.examType === 'dynamic' && session.questionIds?.length > 0) {
            questions = await Question.find({ _id: { $in: session.questionIds } });
        } else {
            questions = await ExamQuestion.find({ examId });
        }

        let correctAnswers = 0;
        const userAnswers = session.answers;

        questions.forEach(q => {
            // Handle both Question model and ExamQuestion model structures
            const qId = q._id.toString();
            const correct = q.correctAnswer;

            if (userAnswers.get(qId) === correct) {
                correctAnswers++;
            }
        });

        const totalQuestions = questions.length;
        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const accuracy = score;

        // Calculate time taken based on start time
        const startTime = session.startTime || session.createdAt;
        const timeTaken = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);

        const attempt = new ExamAttempt({
            userId,
            examId,
            studentName: session.studentName,
            registerNumber: session.registerNumber,
            answers: userAnswers,
            score,
            accuracy,
            totalQuestions,
            correctAnswers,
            timeTaken,
            status: session.violations >= exam.proctoringConfig.tabSwitchLimit ? 'terminated' : 'completed'
        });

        await attempt.save();

        // Mark student as completed if verification is enabled
        if (exam.requireStudentVerification && session.registerNumber) {
            const studentIndex = exam.students.findIndex(s => s.registerNumber === session.registerNumber);
            if (studentIndex !== -1) {
                exam.students[studentIndex].hasCompleted = true;
                await exam.save();
            }
        }

        await ExamSession.deleteOne({ _id: session._id });

        res.status(200).json({ success: true, data: attempt });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all exams with summary stats
exports.getAdminExams = async (req, res) => {
    try {
        const exams = await ExamMaster.find().sort('-createdAt');
        const now = new Date();
        const examStats = await Promise.all(exams.map(async (exam) => {
            const totalAttempts = await ExamAttempt.countDocuments({ examId: exam._id });
            const activeSessions = await ExamSession.countDocuments({ examId: exam._id });
            const state = computeExamState(exam, now);
            return {
                ...exam.toObject(),
                totalAttempts,
                activeSessions,
                computedStatus: state.status,
                serverNow: state.serverNow,
                verificationStart: state.verificationStart,
                isVerificationOpen: state.isVerificationOpen,
                isLive: state.isLive,
                hasEnded: state.hasEnded
            };
        }));
        res.status(200).json({ success: true, data: examStats, serverNow: now.toISOString() });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get active candidates for an exam
exports.getExamCandidates = async (req, res) => {
    try {
        const { examId } = req.params;
        const sessions = await ExamSession.find({ examId }).sort('-lastHeartbeat');
        res.status(200).json({ success: true, data: sessions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Regenerate exam code
exports.regenerateExamCode = async (req, res) => {
    try {
        const { examId } = req.params;
        const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const exam = await ExamMaster.findByIdAndUpdate(examId, { examCode: newCode }, { new: true });
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update exam status (Pause/Resume/End/Publish)
exports.updateExamStatus = async (req, res) => {
    try {
        const { examId } = req.params;
        const { status } = req.body;

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        // Enforce 60% pool rule when publishing or activating adaptive exam
        if (status === 'active' && (exam.isAdaptive || exam.examType === 'dynamic')) {
            const questions = await ExamQuestion.find({ examId });
            const pool = (questions && questions.length > 0) ? questions : (exam.rawQuestions || []);
            const validation = validateQuestionPool(pool, exam.totalQuestions);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot activate adaptive exam: ${validation.message}`,
                    data: validation
                });
            }
        }

        exam.status = status;
        await exam.save();
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update exam config (Toggle features)
exports.updateExamConfig = async (req, res) => {
    try {
        const { examId } = req.params;
        const { controls, proctoringConfig, adaptiveRouting, duration, verificationDuration, passingScore, requireStudentVerification, requireBiometric, requireCamera, allowRecording, autoRecord, totalQuestions } = req.body;

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (totalQuestions !== undefined && (exam.isAdaptive || exam.examType === 'dynamic')) {
            const questions = await ExamQuestion.find({ examId });
            const pool = (questions && questions.length > 0) ? questions : (exam.rawQuestions || []);
            const validation = validateQuestionPool(pool, Number(totalQuestions));
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot update configuration: ${validation.message}`,
                    data: validation
                });
            }
            exam.totalQuestions = Number(totalQuestions);
        }

        if (controls !== undefined) exam.controls = controls;
        if (proctoringConfig !== undefined) exam.proctoringConfig = proctoringConfig;
        if (adaptiveRouting !== undefined) exam.adaptiveRouting = adaptiveRouting;
        if (duration !== undefined) exam.duration = Number(duration);
        if (verificationDuration !== undefined) exam.verificationDuration = Number(verificationDuration);
        if (passingScore !== undefined) exam.passingScore = Number(passingScore);
        if (requireStudentVerification !== undefined) exam.requireStudentVerification = Boolean(requireStudentVerification);
        if (requireBiometric !== undefined) exam.requireBiometric = Boolean(requireBiometric);
        if (requireCamera !== undefined) exam.requireCamera = Boolean(requireCamera);
        if (allowRecording !== undefined) exam.allowRecording = Boolean(allowRecording);
        if (autoRecord !== undefined) exam.autoRecord = Boolean(autoRecord);

        await exam.save();
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get exam results
exports.getExamResults = async (req, res) => {
    try {
        const { examId } = req.params;
        const results = await ExamAttempt.find({ examId }).sort('-submittedAt');
        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get exam analytics
exports.getExamAnalytics = async (req, res) => {
    try {
        const { examId } = req.params;
        const attempts = await ExamAttempt.find({ examId });
        const questions = await ExamQuestion.find({ examId });

        const questionStats = questions.map(q => {
            let correctCount = 0;
            let totalAnswered = 0;
            attempts.forEach(attempt => {
                const answer = attempt.answers.get(q._id.toString());
                if (answer) {
                    totalAnswered++;
                    if (answer === q.correctAnswer) correctCount++;
                }
            });
            return {
                questionId: q.questionId,
                content: q.content,
                correctRate: totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0,
                totalAnswered
            };
        });

        res.status(200).json({ success: true, data: { questionStats, totalAttempts: attempts.length } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get all available questions
exports.getQuestions = async (req, res) => {
    try {
        const Question = require('../models/Question');
        const questions = await Question.find().lean();
        res.status(200).json({ success: true, data: questions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Delete exam
exports.deleteExam = async (req, res) => {
    try {
        const { examId } = req.params;

        // Delete exam and all associated data
        await ExamMaster.findByIdAndDelete(examId);
        await ExamQuestion.deleteMany({ examId });
        await ExamSession.deleteMany({ examId });
        await ExamAttempt.deleteMany({ examId });
        await ExamLog.deleteMany({ examId });

        res.status(200).json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Add student to exam
exports.addStudent = async (req, res) => {
    try {
        const { examId } = req.params;
        const { registerNumber, name } = req.body;

        if (!registerNumber || !name) {
            return res.status(400).json({
                success: false,
                message: 'Register number and name are required'
            });
        }

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        // Check if student already exists
        const existingStudent = exam.students.find(s => s.registerNumber === registerNumber);
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'Student with this register number already exists'
            });
        }

        exam.students.push({ registerNumber, name, hasAttempted: false });
        await exam.save();

        res.status(200).json({ success: true, data: exam.students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Remove student from exam
exports.removeStudent = async (req, res) => {
    try {
        const { examId, registerNumber } = req.params;

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        exam.students = exam.students.filter(s => s.registerNumber !== registerNumber);
        await exam.save();

        res.status(200).json({ success: true, data: exam.students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Get exam students
exports.getExamStudents = async (req, res) => {
    try {
        const { examId } = req.params;

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        res.status(200).json({ success: true, data: exam.students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Set/replace entire student list for an exam (with deduplication & uppercase normalization)
exports.setExamStudents = async (req, res) => {
    try {
        const { examId } = req.params;
        const { students } = req.body;

        if (!Array.isArray(students)) {
            return res.status(400).json({ success: false, message: 'Students must be an array' });
        }

        const exam = await ExamMaster.findById(examId);
        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        const seen = new Set();
        const cleaned = [];
        for (const s of students) {
            if (!s || !s.registerNumber) continue;
            const reg = String(s.registerNumber).trim().toUpperCase();
            const nm = s.name ? String(s.name).trim() : reg;
            if (!reg || seen.has(reg)) continue;
            seen.add(reg);
            cleaned.push({
                registerNumber: reg,
                name: nm,
                hasAttempted: Boolean(s.hasAttempted),
                hasCompleted: Boolean(s.hasCompleted)
            });
        }

        exam.students = cleaned;
        await exam.save();

        res.status(200).json({ success: true, data: exam.students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Update student verification setting
exports.updateStudentVerification = async (req, res) => {
    try {
        const { examId } = req.params;
        const { requireStudentVerification } = req.body;

        const exam = await ExamMaster.findByIdAndUpdate(
            examId,
            { requireStudentVerification },
            { new: true }
        );

        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get exam details for verification (student-facing, no questions)
exports.getExamDetails = async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await ExamMaster.findById(examId);

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        const state = computeExamState(exam, new Date());

        res.status(200).json({
            success: true,
            serverNow: state.serverNow,
            examState: state.status,
            ...state,
            data: {
                _id: exam._id,
                title: exam.title,
                description: exam.description,
                examCode: exam.examCode,
                duration: exam.duration,
                totalQuestions: exam.totalQuestions,
                passingScore: exam.passingScore,
                startTime: state.startTime,
                endTime: state.endTime,
                verificationStart: state.verificationStart,
                verificationDuration: state.verificationDuration,
                requireStudentVerification: exam.requireStudentVerification,
                requireBiometric: exam.requireBiometric,
                requireCamera: exam.requireCamera,
                examState: state.status,
                serverNow: state.serverNow
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== ADAPTIVE QUIZ FUNCTIONS ====================

// Get next question for adaptive quiz
exports.getNextQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        const session = await ExamSession.findOne({ userId, examId });

        if (!exam || !session) {
            return res.status(404).json({ success: false, message: 'Exam or session not found' });
        }

        // STRICT TIME ENFORCEMENT - Block access after exam end time
        const now = new Date();
        const examEnd = new Date(exam.endTime);

        if (now > examEnd) {
            return res.status(403).json({
                success: false,
                message: 'Exam has ended. No further questions can be accessed.'
            });
        }

        // Check if in wait period
        if (session.isWaiting) {
            const now = new Date();
            if (now < session.waitEndTime) {
                return res.status(200).json({
                    success: true,
                    isWaiting: true,
                    waitEndTime: session.waitEndTime,
                    message: 'Please wait while we prepare the next question'
                });
            }
            // Wait period over, clear waiting state
            session.isWaiting = false;
            session.waitEndTime = null;
        }

        // Check if exam is complete
        // For dynamic exams, we check if we've answered the total required questions
        const totalRequired = exam.totalQuestions || 10;
        const answeredCount = session.answers.size;

        if (answeredCount >= totalRequired) {
            return res.status(200).json({
                success: true,
                isComplete: true,
                message: 'All questions completed'
            });
        }

        // Determine if we are resuming an active question or starting a new one
        let nextQuestionNumber = session.currentQuestionNumber;
        let isResuming = false;
        let timeRemaining = exam.timePerQuestion;

        // If we have a current question number but haven't answered it yet (based on count), we are resuming
        // Note: currentQuestionNumber is 1-based. If answeredCount is 0, we are on Q1.
        // If answeredCount is 1, we are on Q2.
        // So if currentQuestionNumber > answeredCount, we are resuming the current question.
        if (session.currentQuestionNumber > answeredCount) {
            isResuming = true;

            // Calculate remaining time
            if (session.questionStartTime) {
                const elapsedSeconds = Math.floor((new Date() - new Date(session.questionStartTime)) / 1000);
                timeRemaining = Math.max(0, exam.timePerQuestion - elapsedSeconds);
            }
        } else {
            // We need a new question
            nextQuestionNumber = answeredCount + 1;
        }

        // Determine difficulty for next question based on ADMIN ROUTING CONFIG
        let difficulty = session.currentDifficulty || 'easy';
        let difficultyChangeReason = null;

        // If not first question and NOT resuming, check routing config for next difficulty
        if (nextQuestionNumber > 1 && !isResuming) {
            // Get last answer to determine if it was correct or wrong
            const lastAnsweredQuestionId = answeredCount > 0 ? Array.from(session.answers.keys())[answeredCount - 1] : null;
            let wasLastCorrect = false;

            if (lastAnsweredQuestionId) {
                // Fetch last question to check correctness
                let lastQuestion;
                if (exam.examType === 'dynamic' || exam.isAdaptive) {
                    lastQuestion = await Question.findById(lastAnsweredQuestionId);
                } else {
                    lastQuestion = await ExamQuestion.findById(lastAnsweredQuestionId);
                }

                if (lastQuestion) {
                    const lastAnswer = session.answers.get(lastAnsweredQuestionId);
                    wasLastCorrect = lastAnswer === lastQuestion.correctAnswer;
                }
            }

            // Use admin routing config to determine next difficulty
            if (exam.adaptiveRoutingConfig && exam.adaptiveRoutingConfig[difficulty]) {
                const routingRule = exam.adaptiveRoutingConfig[difficulty];
                const allowedNextDifficulties = wasLastCorrect ? routingRule.correct : routingRule.wrong;

                if (allowedNextDifficulties && allowedNextDifficulties.length > 0) {
                    const previousDifficulty = difficulty;

                    // If multiple options, randomly select one
                    difficulty = allowedNextDifficulties[Math.floor(Math.random() * allowedNextDifficulties.length)];

                    // Record difficulty change if it changed
                    if (difficulty !== previousDifficulty) {
                        difficultyChangeReason = `Admin routing: ${previousDifficulty} + ${wasLastCorrect ? 'correct' : 'wrong'} → ${difficulty}`;
                        session.difficultyHistory.push({
                            questionNumber: nextQuestionNumber,
                            fromDifficulty: previousDifficulty,
                            toDifficulty: difficulty,
                            reason: difficultyChangeReason,
                            accuracy: session.totalAnsweredCount > 0
                                ? (session.correctAnswersCount / session.totalAnsweredCount) * 100
                                : 0,
                            timestamp: new Date()
                        });
                        console.log(`📊 [ADAPTIVE ROUTING] ${difficultyChangeReason}`);
                    }
                } else {
                    console.warn(`⚠️ [ADAPTIVE] No routing config for ${difficulty} + ${wasLastCorrect ? 'correct' : 'wrong'}, maintaining current difficulty`);
                }
            } else {
                console.warn(`⚠️ [ADAPTIVE] No routing config found for exam, maintaining current difficulty: ${difficulty}`);
            }
        }

        // Get question matching current difficulty using DIFFICULTY TAG (not numeric difficulty)
        let questions = [];
        let question = null;

        // 1. If session has pre-generated questionIds (Dynamic Exam), use them
        if (session.questionIds && session.questionIds.length > 0) {
            // Get IDs of questions already answered
            const answeredIds = Array.from(session.answers.keys());

            // Filter available questions from the pool
            const availableQuestionIds = session.questionIds.filter(id => !answeredIds.includes(id.toString()));

            console.log(`🎯 [ADAPTIVE] Requesting difficulty: ${difficulty}`);
            console.log(`📊 [ADAPTIVE] Total pool: ${session.questionIds.length}, Answered: ${answeredIds.length}, Available: ${availableQuestionIds.length}`);

            // Fetch the actual question objects for the available IDs
            const poolQuestions = await Question.find({ _id: { $in: availableQuestionIds } });

            console.log(`🔍 [ADAPTIVE] Fetched ${poolQuestions.length} available questions from DB`);

            // Filter by difficultyTag (not numeric difficulty)
            const difficultyMatches = poolQuestions.filter(q => q.difficultyTag === difficulty);
            console.log(`✅ [ADAPTIVE] Found ${difficultyMatches.length} questions with difficultyTag='${difficulty}'`);

            if (difficultyMatches.length > 0) {
                questions = difficultyMatches;
                console.log(`✅ [ADAPTIVE] Using ${questions.length} questions matching difficulty: ${difficulty}`);
            } else {
                // Fallback: if no questions of desired difficulty, use ANY available question from the pool
                console.warn(`⚠️ [ADAPTIVE] No questions found for difficulty ${difficulty}, falling back to ANY available question`);
                questions = poolQuestions;
                console.log(`🔄 [ADAPTIVE] Fallback: Using ${questions.length} questions of any difficulty from pool`);
            }
        }
        // 2. Legacy/Fallback: Fetch from DB based on tags (Old Dynamic/Adaptive Logic)
        else if (exam.examType === 'dynamic' || exam.isAdaptive) {
            console.log(`🔍 [ADAPTIVE - LEGACY] Using tag-based question selection for difficulty: ${difficulty}`);

            const query = {};

            // Filter by tags if specified
            if (exam.dynamicConfig?.tags && exam.dynamicConfig.tags.length > 0) {
                query.tags = { $in: exam.dynamicConfig.tags };
                console.log(`🏷️ [ADAPTIVE] Filtering by tags:`, exam.dynamicConfig.tags);
            }

            // Exclude answered questions
            const answeredIds = Array.from(session.answers.keys());
            if (answeredIds.length > 0) {
                query._id = { $nin: answeredIds };
            }

            // Filter by difficultyTag (not numeric difficulty)
            query.difficultyTag = difficulty;

            questions = await Question.find(query);
            console.log(`📊 [ADAPTIVE] Found ${questions.length} questions for difficultyTag=${difficulty} with tags`);

            // If no questions of this difficulty, try without difficulty filter
            if (questions.length === 0) {
                console.warn(`⚠️ [ADAPTIVE] No questions for difficulty ${difficulty}, trying without difficulty filter`);
                delete query.difficultyTag;
                questions = await Question.find(query);
                console.log(`🔄 [ADAPTIVE] Fallback found ${questions.length} questions (any difficulty)`);
            }
        } else {
            // For static exams, use ExamQuestion
            console.log(`📋 [STATIC EXAM] Using ExamQuestion model`);
            questions = await ExamQuestion.find({ examId }).sort('order');
            // For static, we usually just pick by index/order, but here we are randomizing?
            // Actually static exams usually follow order. 
            // If it's static, we should probably just get the question at the current index.
            if (questions[nextQuestionNumber - 1]) {
                question = questions[nextQuestionNumber - 1];
                questions = [question]; // Wrap in array for consistent handling below
            } else {
                questions = [];
            }
        }

        if (!question && (!questions || questions.length === 0)) {
            console.error(`❌ [ADAPTIVE] No questions available for difficulty: ${difficulty}`);
            return res.status(500).json({ success: false, message: 'No questions available' });
        }

        // Pick random question if not already selected
        if (!question) {
            const questionIndex = Math.floor(Math.random() * questions.length);
            question = questions[questionIndex];
            console.log(`🎲 [ADAPTIVE] Selected random question ${questionIndex + 1}/${questions.length} (ID: ${question._id})`);
        }

        if (!question) {
            console.error(`❌ [ADAPTIVE] Failed to select question despite having ${questions.length} available`);
            return res.status(500).json({ success: false, message: 'No questions available' });
        }

        // Update session only if starting new question
        if (!isResuming) {
            session.currentQuestionNumber = nextQuestionNumber;
            session.currentDifficulty = difficulty;
            session.questionStartTime = new Date();
            await session.save();
            console.log(`💾 [ADAPTIVE] Session updated - Q${nextQuestionNumber}, Difficulty: ${difficulty}`);
        } else {
            console.log(`🔄 [ADAPTIVE] Resuming Q${nextQuestionNumber}, Time remaining: ${timeRemaining}s`);
        }

        console.log(`✅ [ADAPTIVE] Returning question - Q${nextQuestionNumber}/${exam.totalQuestions}, Difficulty: ${difficulty}`);

        // Return question without correct answer
        res.status(200).json({
            success: true,
            data: {
                questionNumber: nextQuestionNumber,
                totalQuestions: exam.totalQuestions,
                difficulty,
                timePerQuestion: timeRemaining, // Send remaining time
                question: {
                    _id: question._id,
                    content: question.content,
                    options: question.options,
                    order: question.order
                }
            }
        });
    } catch (error) {
        console.error('Error getting next question:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Submit answer for adaptive quiz
exports.submitAdaptiveAnswer = async (req, res) => {
    try {
        const { examId } = req.params;
        const { questionId, answer } = req.body;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        const session = await ExamSession.findOne({ userId, examId });

        // For dynamic exams, fetch from Question model
        let question;
        if (exam.examType === 'dynamic' || exam.isAdaptive) {
            question = await Question.findById(questionId);
        } else {
            question = await ExamQuestion.findById(questionId);
        }

        if (!exam || !session || !question) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        // Save answer
        session.answers.set(questionId.toString(), answer);

        // Check if answer is correct
        const isCorrect = answer === question.correctAnswer;

        // Update individual performance tracking
        session.totalAnsweredCount += 1;

        if (isCorrect) {
            session.correctAnswersCount += 1;
            session.consecutiveCorrect += 1;
            session.consecutiveIncorrect = 0;
        } else {
            session.consecutiveIncorrect += 1;
            session.consecutiveCorrect = 0;
        }

        // Calculate individual accuracy
        const accuracy = session.totalAnsweredCount > 0
            ? (session.correctAnswersCount / session.totalAnsweredCount) * 100
            : 0;

        // Update difficulty based on Admin Routing Configuration
        const currentLevel = session.currentDifficulty || 'easy';

        // Default routing if missing
        const routing = exam.adaptiveRouting || {
            easy: { correct: ['easy', 'medium'], wrong: ['easy'] },
            medium: { correct: ['medium', 'hard'], wrong: ['easy', 'medium'] },
            hard: { correct: ['hard'], wrong: ['medium'] }
        };

        const allowedNext = routing[currentLevel] ?
            routing[currentLevel][isCorrect ? 'correct' : 'wrong'] :
            [currentLevel]; // Fallback to same level

        // Select next difficulty randomly from allowed options
        let nextLevel = currentLevel;
        if (allowedNext && allowedNext.length > 0) {
            const randomIndex = Math.floor(Math.random() * allowedNext.length);
            nextLevel = allowedNext[randomIndex];
        }

        // Update session difficulty
        if (nextLevel !== currentLevel) {
            session.currentDifficulty = nextLevel;
            session.difficultyHistory.push({
                questionNumber: session.totalAnsweredCount + 1, // For next question
                fromDifficulty: currentLevel,
                toDifficulty: nextLevel,
                reason: `Routing rule (${isCorrect ? 'Correct' : 'Wrong'})`,
                timestamp: new Date()
            });
        }

        // Start wait period
        const waitTime = Math.floor(
            Math.random() * (exam.adaptiveSettings.waitTimeMax - exam.adaptiveSettings.waitTimeMin + 1) +
            exam.adaptiveSettings.waitTimeMin
        );

        session.isWaiting = true;
        session.waitEndTime = new Date(Date.now() + waitTime * 1000);
        await session.save();

        res.status(200).json({
            success: true,
            isCorrect,
            waitTime,
            individualStats: {
                totalAnswered: session.totalAnsweredCount,
                correctAnswers: session.correctAnswersCount,
                accuracy: accuracy.toFixed(1),
                currentDifficulty: session.currentDifficulty,
                consecutiveCorrect: session.consecutiveCorrect,
                consecutiveIncorrect: session.consecutiveIncorrect
            }
        });
    } catch (error) {
        console.error('Error submitting adaptive answer:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get wait status for adaptive quiz
exports.getWaitStatus = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const session = await ExamSession.findOne({ userId, examId });
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (!session.isWaiting) {
            return res.status(200).json({
                success: true,
                isWaiting: false,
                message: 'Not in wait period'
            });
        }

        const now = new Date();
        const timeRemaining = Math.max(0, Math.floor((session.waitEndTime - now) / 1000));

        // Calculate individual accuracy
        const accuracy = session.totalAnsweredCount > 0
            ? (session.correctAnswersCount / session.totalAnsweredCount) * 100
            : 0;

        res.status(200).json({
            success: true,
            isWaiting: true,
            timeRemaining,
            individualStats: {
                totalAnswered: session.totalAnsweredCount,
                correctAnswers: session.correctAnswersCount,
                accuracy: accuracy.toFixed(1),
                currentDifficulty: session.currentDifficulty,
                consecutiveCorrect: session.consecutiveCorrect,
                consecutiveIncorrect: session.consecutiveIncorrect
            }
        });
    } catch (error) {
        console.error('Error getting wait status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// ==================== SYNCHRONIZED ADAPTIVE EXAM FUNCTIONS ====================

// Start synchronized exam (admin or auto-start)
exports.startSynchronizedExam = async (req, res) => {
    try {
        const { examId } = req.params;
        const exam = await ExamMaster.findById(examId);

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (!exam.isSynchronized) {
            return res.status(400).json({ success: false, message: 'This is not a synchronized exam' });
        }

        if (exam.isQuestionActive || exam.examStartedAt) {
            return res.status(400).json({ success: false, message: 'Exam already started' });
        }

        // Mark exam as started
        exam.examStartedAt = new Date();
        exam.currentQuestionNumber = 0;
        exam.currentDifficulty = 'easy';
        await exam.save();

        // Start first question automatically
        await startNextQuestion(exam);

        res.status(200).json({
            success: true,
            message: 'Synchronized exam started',
            data: exam
        });
    } catch (error) {
        console.error('Error starting synchronized exam:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to start next question
async function startNextQuestion(exam) {
    try {
        // Move to next question
        const nextQuestionNumber = exam.currentQuestionNumber + 1;

        if (nextQuestionNumber > exam.totalQuestions) {
            // Exam complete
            exam.status = 'completed';
            exam.isQuestionActive = false;
            exam.isInWaitPeriod = false;
            await exam.save();
            return;
        }

        // Get question based on current difficulty using DIFFICULTY TAG
        const query = {};

        // Filter by tags if specified
        if (exam.dynamicConfig?.tags && exam.dynamicConfig.tags.length > 0) {
            query.tags = { $in: exam.dynamicConfig.tags };
        }

        // Filter by difficultyTag (not numeric difficulty)
        const difficulty = exam.currentDifficulty;
        query.difficultyTag = difficulty;

        const questions = await Question.find(query);

        if (questions.length === 0) {
            // Fallback: get any question
            const fallbackQuery = {};
            if (exam.dynamicConfig?.tags && exam.dynamicConfig.tags.length > 0) {
                fallbackQuery.tags = { $in: exam.dynamicConfig.tags };
            }
            const fallbackQuestions = await Question.find(fallbackQuery);
            if (fallbackQuestions.length === 0) {
                throw new Error('No questions available');
            }
            questions.push(...fallbackQuestions);
        }

        // Pick random question
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selectedQuestion = questions[randomIndex];

        // Update exam state
        exam.currentQuestionNumber = nextQuestionNumber;
        exam.currentQuestionId = selectedQuestion._id;
        exam.currentQuestionStartTime = new Date();
        exam.isQuestionActive = true;
        exam.isInWaitPeriod = false;
        await exam.save();

        // Create question result record
        const questionResult = new ExamQuestionResult({
            examId: exam._id,
            questionNumber: nextQuestionNumber,
            questionId: selectedQuestion._id,
            difficulty: difficulty,
            startedAt: new Date(),
            totalAttempts: 0,
            correctAttempts: 0,
            correctPercentage: 0,
            studentAnswers: []
        });
        await questionResult.save();

        // Schedule auto-end of question
        setTimeout(async () => {
            await endCurrentQuestion(exam._id);
        }, exam.questionTimer * 1000);

        console.log(`Started question ${nextQuestionNumber} (${difficulty}) for exam ${exam._id}`);
    } catch (error) {
        console.error('Error starting next question:', error);
        throw error;
    }
}

// Helper function to end current question
async function endCurrentQuestion(examId) {
    try {
        const exam = await ExamMaster.findById(examId);
        if (!exam || !exam.isQuestionActive) {
            return; // Question already ended
        }

        // Mark question as inactive
        exam.isQuestionActive = false;
        exam.isInWaitPeriod = true;

        // Get question result
        const questionResult = await ExamQuestionResult.findOne({
            examId: exam._id,
            questionNumber: exam.currentQuestionNumber
        });

        if (questionResult) {
            questionResult.endedAt = new Date();

            // Calculate collective performance
            if (questionResult.totalAttempts > 0) {
                questionResult.correctPercentage =
                    (questionResult.correctAttempts / questionResult.totalAttempts) * 100;
            }

            // Determine next difficulty based on 60% THRESHOLD RULE + ADMIN ROUTING CONFIG
            const currentDifficulty = exam.currentDifficulty;
            let nextDifficulty = currentDifficulty;
            let reason = '';

            const correctPercentage = questionResult.correctPercentage || 0;
            const wrongPercentage = 100 - correctPercentage;
            const syncThreshold = exam.syncThreshold || 60;

            // Check if ≥60% of students answered the same way (correct OR wrong)
            let majorityAnswer = null; // 'correct' or 'wrong' or null

            if (correctPercentage >= syncThreshold) {
                majorityAnswer = 'correct';
                reason = `${correctPercentage.toFixed(1)}% correct (≥${syncThreshold}% threshold) - `;
            } else if (wrongPercentage >= syncThreshold) {
                majorityAnswer = 'wrong';
                reason = `${wrongPercentage.toFixed(1)}% wrong (≥${syncThreshold}% threshold) - `;
            } else {
                // No clear majority, maintain current difficulty
                nextDifficulty = currentDifficulty;
                reason = `No clear majority (${correctPercentage.toFixed(1)}% correct, ${wrongPercentage.toFixed(1)}% wrong, threshold=${syncThreshold}%) - maintaining ${currentDifficulty}`;
                console.log(`📊 [SYNC MODE] ${reason}`);
            }

            // If we have a majority answer, apply admin routing config
            if (majorityAnswer && exam.adaptiveRoutingConfig && exam.adaptiveRoutingConfig[currentDifficulty]) {
                const routingRule = exam.adaptiveRoutingConfig[currentDifficulty];
                const allowedNextDifficulties = majorityAnswer === 'correct' ? routingRule.correct : routingRule.wrong;

                if (allowedNextDifficulties && allowedNextDifficulties.length > 0) {
                    // If multiple options, randomly select one
                    nextDifficulty = allowedNextDifficulties[Math.floor(Math.random() * allowedNextDifficulties.length)];
                    reason += `admin routing → ${nextDifficulty}`;
                    console.log(`📊 [SYNC MODE] ${reason}`);
                } else {
                    // No routing config, maintain current difficulty
                    nextDifficulty = currentDifficulty;
                    reason += `no routing config - maintaining ${currentDifficulty}`;
                    console.warn(`⚠️ [SYNC MODE] No routing config for ${currentDifficulty} + ${majorityAnswer}`);
                }
            } else if (majorityAnswer && !exam.adaptiveRoutingConfig) {
                // Fallback: No routing config at all
                nextDifficulty = currentDifficulty;
                reason += `no routing config - maintaining ${currentDifficulty}`;
                console.warn(`⚠️ [SYNC MODE] No routing config found for exam`);
            }

            questionResult.nextDifficulty = nextDifficulty;
            questionResult.difficultyReason = reason;
            await questionResult.save();

            // Update exam difficulty
            exam.currentDifficulty = nextDifficulty;
        }

        // Set wait period (5-10 seconds default)
        const waitTimeMin = 5;
        const waitTimeMax = 10;
        const waitTime = Math.floor(
            Math.random() * (waitTimeMax - waitTimeMin + 1) + waitTimeMin
        );
        exam.waitPeriodEndTime = new Date(Date.now() + waitTime * 1000);
        await exam.save();

        console.log(`Ended question ${exam.currentQuestionNumber} for exam ${exam._id}`);

        // Schedule next question
        setTimeout(async () => {
            const updatedExam = await ExamMaster.findById(examId);
            if (updatedExam) {
                await startNextQuestion(updatedExam);
            }
        }, waitTime * 1000);

    } catch (error) {
        console.error('Error ending current question:', error);
    }
}

// Get current question for synchronized exam (student polling)
exports.getSynchronizedQuestion = async (req, res) => {
    try {
        const { examId } = req.params;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        const session = await ExamSession.findOne({ userId, examId });

        if (!exam) {
            return res.status(404).json({ success: false, message: 'Exam not found' });
        }

        if (!exam.isSynchronized) {
            return res.status(400).json({ success: false, message: 'This is not a synchronized exam' });
        }

        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        // Check late join
        if (!exam.allowLateJoin && exam.examStartedAt && session.joinedAt > exam.examStartedAt) {
            return res.status(403).json({
                success: false,
                message: 'Cannot join exam after it has started'
            });
        }

        // Check if exam is complete
        if (exam.status === 'completed' || exam.currentQuestionNumber >= exam.totalQuestions) {
            return res.status(200).json({
                success: true,
                isComplete: true,
                message: 'Exam completed'
            });
        }

        // Check if in wait period
        if (exam.isInWaitPeriod) {
            const now = new Date();
            const timeRemaining = Math.max(0, Math.floor((exam.waitPeriodEndTime - now) / 1000));

            // Get last question result for stats
            const lastQuestionResult = await ExamQuestionResult.findOne({
                examId: exam._id,
                questionNumber: exam.currentQuestionNumber
            });

            return res.status(200).json({
                success: true,
                isWaiting: true,
                waitTimeRemaining: timeRemaining,
                collectiveStats: lastQuestionResult ? {
                    totalAttempts: lastQuestionResult.totalAttempts,
                    correctPercentage: lastQuestionResult.correctPercentage.toFixed(1),
                    nextDifficulty: lastQuestionResult.nextDifficulty,
                    reason: lastQuestionResult.difficultyReason
                } : null
            });
        }

        // Return current question
        if (exam.isQuestionActive && exam.currentQuestionId) {
            const question = await Question.findById(exam.currentQuestionId);

            if (!question) {
                return res.status(500).json({ success: false, message: 'Question not found' });
            }

            // Calculate time remaining
            const now = new Date();
            const elapsedSeconds = Math.floor((now - new Date(exam.currentQuestionStartTime)) / 1000);
            const timeRemaining = Math.max(0, exam.questionTimer - elapsedSeconds);

            // Check if student already answered this question
            const questionResult = await ExamQuestionResult.findOne({
                examId: exam._id,
                questionNumber: exam.currentQuestionNumber
            });

            const hasAnswered = questionResult?.studentAnswers.some(
                ans => ans.userId === userId.toString()
            );

            return res.status(200).json({
                success: true,
                data: {
                    questionNumber: exam.currentQuestionNumber,
                    totalQuestions: exam.totalQuestions,
                    difficulty: exam.currentDifficulty,
                    timeRemaining,
                    hasAnswered,
                    question: {
                        _id: question._id,
                        content: question.content,
                        options: question.options
                    }
                }
            });
        }

        // Waiting for exam to start
        return res.status(200).json({
            success: true,
            isWaiting: true,
            message: 'Waiting for exam to start',
            startTime: exam.startTime
        });

    } catch (error) {
        console.error('Error getting synchronized question:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Submit answer for synchronized exam
exports.submitSynchronizedAnswer = async (req, res) => {
    try {
        const { examId } = req.params;
        const { questionId, answer } = req.body;
        const userId = req.user.id || req.user._id;

        const exam = await ExamMaster.findById(examId);
        const session = await ExamSession.findOne({ userId, examId });
        const question = await Question.findById(questionId);

        if (!exam || !session || !question) {
            return res.status(404).json({ success: false, message: 'Resource not found' });
        }

        if (!exam.isQuestionActive) {
            return res.status(400).json({ success: false, message: 'No active question' });
        }

        // Get question result
        let questionResult = await ExamQuestionResult.findOne({
            examId: exam._id,
            questionNumber: exam.currentQuestionNumber
        });

        if (!questionResult) {
            return res.status(500).json({ success: false, message: 'Question result not found' });
        }

        // Check if already answered
        const alreadyAnswered = questionResult.studentAnswers.some(
            ans => ans.userId === userId.toString()
        );

        if (alreadyAnswered) {
            return res.status(400).json({ success: false, message: 'Already answered this question' });
        }

        // Check if answer is correct
        const isCorrect = answer === question.correctAnswer;

        // Save answer
        questionResult.studentAnswers.push({
            userId: userId.toString(),
            studentName: session.studentName || 'Anonymous',
            answer,
            isCorrect,
            answeredAt: new Date()
        });

        questionResult.totalAttempts += 1;
        if (isCorrect) {
            questionResult.correctAttempts += 1;
        }

        // Update percentage
        questionResult.correctPercentage =
            (questionResult.correctAttempts / questionResult.totalAttempts) * 100;

        await questionResult.save();

        // Save to session
        session.answers.set(questionId.toString(), answer);
        session.lastSeenQuestionNumber = exam.currentQuestionNumber;

        // Update individual stats
        session.totalAnsweredCount += 1;
        if (isCorrect) {
            session.correctAnswersCount += 1;
        }

        await session.save();

        res.status(200).json({
            success: true,
            isCorrect,
            message: 'Answer submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting synchronized answer:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = exports;
