const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Learner = require('../../models/Learner');
const Performance = require('../../models/Performance');
const Question = require('../../models/Question');

describe('Profile API Endpoints', () => {
  let testLearner;
  let testQuestion;
  let testPerformanceData;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mcq_system_test');
    }
  });

  beforeEach(async () => {
    // Clean up database
    await Learner.deleteMany({});
    await Performance.deleteMany({});
    await Question.deleteMany({});

    // Create test learner
    testLearner = new Learner({
      email: 'test@example.com',
      name: 'Test Learner',
      difficultyPreference: 5,
      learningVelocity: 1.2,
      retentionRate: 0.85,
      totalQuestionsAnswered: 50,
      totalTimeSpent: 3000,
      overallAccuracy: 0.75,
      currentStreak: 5,
      longestStreak: 12,
      preferences: {
        hintsEnabled: true,
        explanationsEnabled: true,
        timerEnabled: false,
        soundEnabled: false
      }
    });

    // Add some category mastery data
    testLearner.categoryMastery.set('Mathematics', {
      level: 75,
      confidence: 0.8,
      lastAssessed: new Date(),
      questionsAnswered: 20,
      averageAccuracy: 0.8,
      averageTimePerQuestion: 45,
      streakCount: 3
    });

    testLearner.categoryMastery.set('Physics', {
      level: 45,
      confidence: 0.5,
      lastAssessed: new Date(),
      questionsAnswered: 15,
      averageAccuracy: 0.6,
      averageTimePerQuestion: 65,
      streakCount: 1
    });

    await testLearner.save();

    // Create test question
    testQuestion = new Question({
      content: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4',
      explanation: 'Basic addition: 2 + 2 = 4',
      category: ['Mathematics', 'Arithmetic'],
      difficulty: 3,
      generatedBy: 'Human',
      validationScore: 1.0
    });
    await testQuestion.save();

    // Create test performance data
    const performanceRecords = [];
    for (let i = 0; i < 10; i++) {
      performanceRecords.push({
        learnerId: testLearner._id,
        questionId: testQuestion._id,
        selectedAnswer: i % 3 === 0 ? '3' : '4', // Mix of correct and incorrect
        correct: i % 3 !== 0,
        timeSpent: 30 + (i * 5),
        hintsUsed: i % 4,
        difficulty: 3 + (i % 3),
        category: ['Mathematics'],
        sessionId: `session_${Math.floor(i / 3)}`,
        createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Spread over days
      });
    }

    testPerformanceData = await Performance.insertMany(performanceRecords);
  });

  afterAll(async () => {
    // Clean up and close connection
    await Learner.deleteMany({});
    await Performance.deleteMany({});
    await Question.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/profile/:learnerId', () => {
    it('should retrieve learner profile successfully', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('learnerId');
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.name).toBe('Test Learner');
      expect(response.body.data.difficultyPreference).toBe(5);
      expect(response.body.data.learningVelocity).toBe(1.2);
      expect(response.body.data.retentionRate).toBe(0.85);
      expect(response.body.data.overallAccuracy).toBe(0.75);
      expect(response.body.data.currentStreak).toBe(5);
      expect(response.body.data.longestStreak).toBe(12);
      
      // Check knowledge map
      expect(response.body.data.knowledgeMap).toHaveProperty('Mathematics');
      expect(response.body.data.knowledgeMap.Mathematics.level).toBe(75);
      expect(response.body.data.knowledgeMap.Mathematics.confidence).toBe(0.8);
      
      // Check weak and strong areas
      expect(response.body.data.weakAreas).toContain('Physics');
      expect(response.body.data.strongAreas).toContain('Mathematics');
      
      // Check preferences
      expect(response.body.data.preferences.hintsEnabled).toBe(true);
      expect(response.body.data.preferences.timerEnabled).toBe(false);
    });

    it('should return 404 for non-existent learner', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/profile/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Learner profile not found');
    });

    it('should return 400 for invalid learner ID format', async () => {
      const response = await request(app)
        .get('/api/profile/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid learner ID format');
    });

    it('should include all required profile fields', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}`)
        .expect(200);

      const requiredFields = [
        'learnerId', 'email', 'name', 'knowledgeMap', 'weakAreas', 'strongAreas',
        'difficultyPreference', 'learningVelocity', 'retentionRate', 
        'totalQuestionsAnswered', 'totalTimeSpent', 'overallAccuracy',
        'currentStreak', 'longestStreak', 'averageSessionTime', 'lastActive',
        'preferences', 'createdAt', 'updatedAt'
      ];

      requiredFields.forEach(field => {
        expect(response.body.data).toHaveProperty(field);
      });
    });
  });

  describe('PUT /api/profile/:learnerId', () => {
    it('should update learner profile successfully', async () => {
      const updateData = {
        name: 'Updated Test Learner',
        difficultyPreference: 7,
        learningVelocity: 1.5,
        retentionRate: 0.9,
        preferences: {
          hintsEnabled: false,
          explanationsEnabled: true,
          timerEnabled: true,
          soundEnabled: true
        }
      };

      const response = await request(app)
        .put(`/api/profile/${testLearner._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Learner');
      expect(response.body.data.difficultyPreference).toBe(7);
      expect(response.body.data.learningVelocity).toBe(1.5);
      expect(response.body.data.retentionRate).toBe(0.9);
      expect(response.body.data.preferences.hintsEnabled).toBe(false);
      expect(response.body.data.preferences.timerEnabled).toBe(true);
      expect(response.body.updatedFields).toEqual(expect.arrayContaining(['name', 'difficultyPreference']));
    });

    it('should update partial profile data', async () => {
      const updateData = {
        name: 'Partially Updated Learner'
      };

      const response = await request(app)
        .put(`/api/profile/${testLearner._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Partially Updated Learner');
      expect(response.body.data.difficultyPreference).toBe(5); // Should remain unchanged
      expect(response.body.updatedFields).toEqual(['name']);
    });

    it('should return 404 for non-existent learner', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { name: 'New Name' };
      
      const response = await request(app)
        .put(`/api/profile/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Learner profile not found');
    });

    it('should return 400 for invalid learner ID format', async () => {
      const updateData = { name: 'New Name' };
      
      const response = await request(app)
        .put('/api/profile/invalid-id')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid learner ID format');
    });

    it('should validate update data and return 400 for invalid values', async () => {
      const invalidData = {
        name: '', // Empty name
        difficultyPreference: 15, // Out of range
        learningVelocity: -1, // Negative value
        retentionRate: 1.5 // Out of range
      };

      const response = await request(app)
        .put(`/api/profile/${testLearner._id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation error');
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(0);
    });

    it('should update lastActive timestamp', async () => {
      const originalLastActive = testLearner.lastActive;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const updateData = { name: 'Updated Name' };
      
      const response = await request(app)
        .put(`/api/profile/${testLearner._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.lastActive)).toBeInstanceOf(Date);
      expect(new Date(response.body.data.lastActive).getTime()).toBeGreaterThan(originalLastActive.getTime());
    });
  });

  describe('GET /api/profile/:learnerId/analytics', () => {
    it('should retrieve comprehensive analytics successfully', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('learnerProfile');
      expect(response.body.data).toHaveProperty('timeRange');
      expect(response.body.data).toHaveProperty('performanceMetrics');
      expect(response.body.data).toHaveProperty('categoryAnalysis');
      expect(response.body.data).toHaveProperty('progressTrends');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('metadata');
    });

    it('should include learner profile in analytics', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const profile = response.body.data.learnerProfile;
      expect(profile.learnerId).toBe(testLearner._id.toString());
      expect(profile.name).toBe('Test Learner');
      expect(profile.email).toBe('test@example.com');
      expect(profile.overallAccuracy).toBe(0.75);
      expect(profile.currentStreak).toBe(5);
      expect(profile.longestStreak).toBe(12);
    });

    it('should include performance metrics', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const metrics = response.body.data.performanceMetrics;
      expect(metrics).toHaveProperty('totalQuestions');
      expect(metrics).toHaveProperty('correctAnswers');
      expect(metrics).toHaveProperty('accuracy');
      expect(metrics).toHaveProperty('totalTimeSpent');
      expect(metrics).toHaveProperty('averageTimePerQuestion');
      expect(metrics).toHaveProperty('totalHintsUsed');
      expect(metrics).toHaveProperty('averageDifficulty');
      
      expect(typeof metrics.totalQuestions).toBe('number');
      expect(typeof metrics.accuracy).toBe('number');
    });

    it('should include category analysis', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const categoryAnalysis = response.body.data.categoryAnalysis;
      expect(categoryAnalysis).toHaveProperty('totalCategories');
      expect(categoryAnalysis).toHaveProperty('weakAreas');
      expect(categoryAnalysis).toHaveProperty('strongAreas');
      expect(categoryAnalysis).toHaveProperty('masteryDistribution');
      expect(categoryAnalysis).toHaveProperty('categoryTrends');
      
      expect(categoryAnalysis.totalCategories).toBe(2); // Mathematics and Physics
      expect(categoryAnalysis.weakAreas).toContain('Physics');
      expect(categoryAnalysis.strongAreas).toContain('Mathematics');
      
      // Check mastery distribution
      const mastery = categoryAnalysis.masteryDistribution;
      expect(mastery).toHaveProperty('beginner');
      expect(mastery).toHaveProperty('intermediate');
      expect(mastery).toHaveProperty('advanced');
      expect(mastery).toHaveProperty('expert');
    });

    it('should include progress trends', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const trends = response.body.data.progressTrends;
      expect(trends).toHaveProperty('accuracyTrend');
      expect(trends).toHaveProperty('speedTrend');
      expect(trends).toHaveProperty('difficultyTrend');
      expect(trends).toHaveProperty('consistencyTrend');
      
      // Check trend structure
      expect(trends.accuracyTrend).toHaveProperty('trend');
      expect(trends.accuracyTrend).toHaveProperty('change');
      expect(['improving', 'declining', 'stable']).toContain(trends.accuracyTrend.trend);
    });

    it('should include recommendations', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const recommendations = response.body.data.recommendations;
      expect(Array.isArray(recommendations)).toBe(true);
      
      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('message');
        expect(recommendation).toHaveProperty('action');
      }
    });

    it('should support custom time range parameter', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics?timeRange=7`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeRange.days).toBe(7);
    });

    it('should support category filtering', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics?categories=Mathematics,Physics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const categoryTrends = response.body.data.categoryAnalysis.categoryTrends;
      expect(categoryTrends).toHaveProperty('Mathematics');
      expect(categoryTrends).toHaveProperty('Physics');
    });

    it('should return 404 for non-existent learner', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/profile/${nonExistentId}/analytics`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Learner profile not found');
    });

    it('should return 400 for invalid learner ID format', async () => {
      const response = await request(app)
        .get('/api/profile/invalid-id/analytics')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid learner ID format');
    });

    it('should handle learners with no performance data', async () => {
      // Create a new learner with no performance data
      const newLearner = new Learner({
        email: 'new@example.com',
        name: 'New Learner'
      });
      await newLearner.save();

      const response = await request(app)
        .get(`/api/profile/${newLearner._id}/analytics`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.performanceMetrics.totalQuestions).toBe(0);
      expect(response.body.data.categoryAnalysis.totalCategories).toBe(0);
    });

    it('should include metadata about the analytics', async () => {
      const response = await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);

      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty('generatedAt');
      expect(metadata).toHaveProperty('dataPoints');
      expect(metadata).toHaveProperty('categoriesAnalyzed');
      
      expect(new Date(metadata.generatedAt)).toBeInstanceOf(Date);
      expect(typeof metadata.dataPoints).toBe('number');
      expect(typeof metadata.categoriesAnalyzed).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Temporarily close the database connection
      await mongoose.connection.close();

      const response = await request(app)
        .get(`/api/profile/${testLearner._id}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve learner profile');

      // Reconnect for other tests
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mcq_system_test');
    });

    it('should handle malformed request bodies in PUT requests', async () => {
      const response = await request(app)
        .put(`/api/profile/${testLearner._id}`)
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // The exact error message may vary depending on Express version
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/profile/${testLearner._id}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle analytics requests efficiently', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get(`/api/profile/${testLearner._id}/analytics`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Analytics may take longer but should be under 2 seconds
    });
  });
});