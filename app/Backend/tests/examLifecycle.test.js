const examController = require('../controllers/examController');
const adaptiveExamController = require('../controllers/adaptiveExamController');
const { ExamMaster, ExamSession, ExamAttempt } = require('../config/examDatabase');
const Question = require('../models/Question');
const ExamQuestionResult = require('../models/ExamQuestionResult');
const AdaptiveDifficulty = require('../models/AdaptiveDifficulty');
const mongoose = require('mongoose');

// Mock dependencies
jest.mock('../config/examDatabase');
jest.mock('../models/Question');
jest.mock('../models/ExamQuestionResult');
jest.mock('../models/AdaptiveDifficulty');
jest.mock('../config/database', () => jest.fn().mockResolvedValue());

describe('Exam Lifecycle & 10-Second Grace Period Enforcement', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { examId: 'exam_abc' },
            body: { questionId: 'q_1', answer: 'Option A' },
            user: { id: 'user_123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        // Default readyState to 1 (connected)
        mongoose.connection.readyState = 1;
    });

    describe('Database readyState check (Rule 1)', () => {
        it('should return 503 if database readyState is not 1', async () => {
            mongoose.connection.readyState = 0;
            await examController.submitExam(req, res);
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('Database')
            }));
        });
    });

    describe('examController.submitExam grace period', () => {
        it('should reject submission with 403 when past 10s grace period', async () => {
            // Exam ended 15 seconds ago (beyond 10s grace)
            const pastEndTime = new Date(Date.now() - 15000);
            const pastStartTime = new Date(pastEndTime.getTime() - 3600000);

            ExamMaster.findById.mockResolvedValue({
                _id: 'exam_abc',
                startTime: pastStartTime.toISOString(),
                endTime: pastEndTime.toISOString(),
                verificationDuration: 15
            });

            await examController.submitExam(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('grace period has expired')
            }));
        });

        it('should allow submission within 10s grace period', async () => {
            // Exam ended 5 seconds ago (within 10s grace)
            const pastEndTime = new Date(Date.now() - 5000);
            const pastStartTime = new Date(pastEndTime.getTime() - 3600000);

            ExamMaster.findById.mockResolvedValue({
                _id: 'exam_abc',
                startTime: pastStartTime.toISOString(),
                endTime: pastEndTime.toISOString(),
                verificationDuration: 15,
                examType: 'dynamic',
                proctoringConfig: { tabSwitchLimit: 3 }
            });

            const mockSession = {
                _id: 'sess_123',
                userId: 'user_123',
                examId: 'exam_abc',
                answers: new Map(),
                questionIds: ['q_1'],
                studentName: 'Test Student',
                registerNumber: 'REG123',
                violations: 0,
                startTime: pastStartTime
            };

            ExamSession.findOne.mockResolvedValue(mockSession);
            Question.find.mockResolvedValue([{ _id: 'q_1', correctAnswer: 'Option A' }]);
            ExamAttempt.prototype.save = jest.fn().mockResolvedValue({});
            ExamSession.deleteOne = jest.fn().mockResolvedValue({});

            await examController.submitExam(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('adaptiveExamController.submitAdaptiveAnswer grace period', () => {
        it('should reject adaptive answer submission with 403 when past 10s grace period', async () => {
            // Exam ended 20 seconds ago
            const pastEndTime = new Date(Date.now() - 20000);
            const pastStartTime = new Date(pastEndTime.getTime() - 3600000);

            ExamMaster.findById.mockResolvedValue({
                _id: 'exam_abc',
                isAdaptive: true,
                startTime: pastStartTime.toISOString(),
                endTime: pastEndTime.toISOString(),
                verificationDuration: 15
            });

            await adaptiveExamController.submitAdaptiveAnswer(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: expect.stringContaining('grace period has expired')
            }));
        });
    });
});

