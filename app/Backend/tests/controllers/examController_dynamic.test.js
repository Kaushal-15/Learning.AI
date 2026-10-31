const mongoose = require('mongoose');
const { ExamMaster, ExamSession, ExamQuestion } = require('../../config/examDatabase');
const Question = require('../../models/Question');

// Mock dependencies
jest.mock('../../config/examDatabase');
jest.mock('../../models/Question');
jest.mock('../../config/database', () => jest.fn().mockResolvedValue());

const examController = require('../../controllers/examController');

describe('Exam Controller - getNextQuestion', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { examId: 'exam123' },
            user: { id: 'user123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        Object.defineProperty(mongoose.connection, 'readyState', {
            value: 1,
            writable: true,
            configurable: true
        });
    });

    it('should prioritize session.questionIds for dynamic exams', async () => {
        const mockExam = {
            _id: 'exam123',
            examType: 'dynamic',
            totalQuestions: 5,
            timePerQuestion: 30,
            adaptiveSettings: { minQuestionsBeforeAdjust: 5 }
        };
        const mockSession = {
            userId: 'user123',
            examId: 'exam123',
            questionIds: ['q1', 'q2', 'q3'],
            answers: new Map([['q1', 'A']]),
            currentQuestionNumber: 1,
            totalAnsweredCount: 1,
            save: jest.fn()
        };
        const mockQuestions = [
            { _id: 'q2', content: 'Question 2', difficulty: 5 },
            { _id: 'q3', content: 'Question 3', difficulty: 5 }
        ];

        ExamMaster.findById.mockResolvedValue(mockExam);
        ExamSession.findOne.mockResolvedValue(mockSession);
        Question.find.mockResolvedValue(mockQuestions);

        await examController.getNextQuestion(req, res);

        expect(Question.find).toHaveBeenCalled();
    });

    it('should always serve easy difficulty for the first question', async () => {
        const mockExam = {
            _id: 'exam123',
            examType: 'dynamic',
            totalQuestions: 5,
            timePerQuestion: 30
        };
        const mockSession = {
            userId: 'user123',
            examId: 'exam123',
            questionIds: ['q1', 'q2'],
            answers: new Map(), // No answers yet -> Question 1
            currentQuestionNumber: 0,
            currentDifficulty: 'hard', // Even if previously hard, Q1 must be easy
            totalAnsweredCount: 0,
            save: jest.fn()
        };
        const mockQuestions = [
            { _id: 'q1', content: 'Easy Q', difficulty: 2, difficultyLevel: 'easy' }
        ];

        ExamMaster.findById.mockResolvedValue(mockExam);
        ExamSession.findOne.mockResolvedValue(mockSession);
        Question.find.mockResolvedValue(mockQuestions);

        await examController.getNextQuestion(req, res);

        expect(mockSession.currentDifficulty).toBe('easy');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                difficulty: 'easy',
                questionNumber: 1
            })
        }));
    });
});

describe('Exam Controller - submitAdaptiveAnswer Collective Adaptability', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { examId: 'exam123' },
            body: { questionId: 'q1', answer: 'Paris' },
            user: { id: 'user123' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
        Object.defineProperty(mongoose.connection, 'readyState', {
            value: 1,
            writable: true,
            configurable: true
        });
    });

    it('should increase difficulty from easy to medium when overall accuracy >= threshold (60%)', async () => {
        const now = new Date();
        const mockExam = {
            _id: 'exam123',
            examType: 'dynamic',
            isAdaptive: true,
            startTime: new Date(now.getTime() - 60000),
            endTime: new Date(now.getTime() + 600000),
            adaptiveSettings: { increaseThreshold: 60, decreaseThreshold: 35 }
        };

        const mockSession = {
            userId: 'user123',
            examId: 'exam123',
            currentDifficulty: 'easy',
            answers: new Map(),
            totalAnsweredCount: 0,
            correctAnswersCount: 0,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            difficultyHistory: [],
            save: jest.fn()
        };

        const mockQuestion = {
            _id: 'q1',
            correctAnswer: 'Paris'
        };

        const mockSessions = [
            mockSession,
            { answers: new Map([['q1', 'Paris']]) }, // Correct
            { answers: new Map([['q1', 'Rome']]) }   // Wrong
        ];

        ExamMaster.findById.mockResolvedValue(mockExam);
        ExamSession.findOne.mockResolvedValue(mockSession);
        ExamSession.find.mockResolvedValue(mockSessions);
        Question.findById.mockResolvedValue(mockQuestion);

        await examController.submitAdaptiveAnswer(req, res);

        // 2 out of 3 correct = 66.7% >= 60% threshold -> increase to medium
        expect(mockSession.currentDifficulty).toBe('medium');
        expect(mockSession.isWaiting).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            waitTime: 10,
            collectiveStats: expect.objectContaining({
                currentDifficulty: 'easy',
                nextDifficulty: 'medium'
            })
        }));
    });

    it('should decrease difficulty from hard to medium when overall accuracy < 35%', async () => {
        const now = new Date();
        const mockExam = {
            _id: 'exam123',
            examType: 'dynamic',
            isAdaptive: true,
            startTime: new Date(now.getTime() - 60000),
            endTime: new Date(now.getTime() + 600000),
            adaptiveSettings: { increaseThreshold: 60, decreaseThreshold: 35 }
        };

        const mockSession = {
            userId: 'user123',
            examId: 'exam123',
            currentDifficulty: 'hard',
            answers: new Map(),
            totalAnsweredCount: 0,
            correctAnswersCount: 0,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            difficultyHistory: [],
            save: jest.fn()
        };

        const mockQuestion = {
            _id: 'q1',
            correctAnswer: 'Paris'
        };

        const mockSessions = [
            mockSession,
            { answers: new Map([['q1', 'London']]) },
            { answers: new Map([['q1', 'Berlin']]) }
        ];

        ExamMaster.findById.mockResolvedValue(mockExam);
        ExamSession.findOne.mockResolvedValue(mockSession);
        ExamSession.find.mockResolvedValue(mockSessions);
        Question.findById.mockResolvedValue(mockQuestion);

        req.body.answer = 'Madrid'; // Wrong answer

        await examController.submitAdaptiveAnswer(req, res);

        // 0 out of 3 correct = 0% < 35% min threshold -> decrease to medium
        expect(mockSession.currentDifficulty).toBe('medium');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            collectiveStats: expect.objectContaining({
                currentDifficulty: 'hard',
                nextDifficulty: 'medium'
            })
        }));
    });

    it('should record __UNANSWERED__ on timeout and reject answering again', async () => {
        const now = new Date();
        const mockExam = {
            _id: 'exam123',
            examType: 'dynamic',
            isAdaptive: true,
            startTime: new Date(now.getTime() - 60000),
            endTime: new Date(now.getTime() + 600000),
            adaptiveSettings: { increaseThreshold: 60, decreaseThreshold: 35 }
        };

        const mockSession = {
            userId: 'user123',
            examId: 'exam123',
            currentDifficulty: 'easy',
            answers: new Map(),
            totalAnsweredCount: 0,
            correctAnswersCount: 0,
            consecutiveCorrect: 0,
            consecutiveIncorrect: 0,
            difficultyHistory: [],
            save: jest.fn()
        };

        const mockQuestion = {
            _id: 'q1',
            correctAnswer: 'Paris'
        };

        ExamMaster.findById.mockResolvedValue(mockExam);
        ExamSession.findOne.mockResolvedValue(mockSession);
        ExamSession.find.mockResolvedValue([mockSession]);
        Question.findById.mockResolvedValue(mockQuestion);

        req.body.answer = '__UNANSWERED__';

        await examController.submitAdaptiveAnswer(req, res);

        expect(mockSession.answers.get('q1')).toBe('__UNANSWERED__');

        // Second attempt on same question should be rejected
        res.status.mockClear();
        res.json.mockClear();

        await examController.submitAdaptiveAnswer(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            message: expect.stringContaining('already been answered')
        }));
    });
});
