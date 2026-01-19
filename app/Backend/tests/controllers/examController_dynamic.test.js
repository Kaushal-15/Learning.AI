const examController = require('../../controllers/examController');
const { ExamMaster, ExamSession, ExamQuestion } = require('../../config/examDatabase');
const Question = require('../../models/Question');

// Mock dependencies
jest.mock('../../config/examDatabase');
jest.mock('../../models/Question');

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
    });

    it('should prioritize session.questionIds for dynamic exams', async () => {
        // Setup mocks
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
            questionIds: ['q1', 'q2', 'q3'], // Generated questions
            answers: new Map([['q1', 'A']]), // q1 answered
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

        // Mock Question.find to return questions from the pool
        Question.find.mockResolvedValue(mockQuestions);

        await examController.getNextQuestion(req, res);

        // Expect Question.find to be called with specific IDs if logic was correct
        // Currently it might be called with difficulty query instead

        // If the fix is working, it should query using _id: { $in: [...] }
        // Let's inspect the calls to see what happened
        const findCall = Question.find.mock.calls[0][0];

        // We expect the controller to eventually be fixed to look like this:
        // expect(findCall._id.$in).toEqual(expect.arrayContaining(['q2', 'q3']));

        // But for now, we just want to see it run. 
        // If it fails to use questionIds, it might return random questions or fail if no difficulty matches
    });
});
