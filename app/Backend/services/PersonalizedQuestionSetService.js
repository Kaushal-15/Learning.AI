/**
 * Personalized Question Set Service
 * Implements logic for analyzing learner weak areas and generating targeted question sets
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

const mongoose = require('mongoose');
const Learner = require('../models/Learner');
const Question = require('../models/Question');
const Performance = require('../models/Performance');
const SpacedRepetition = require('../models/SpacedRepetition');

class PersonalizedQuestionSetService {
  constructor() {
    this.config = {
      // Question set composition ratios
      WEAK_AREA_RATIO: 0.6,        // 60% from weak areas
      REVIEW_RATIO: 0.25,          // 25% review questions
      NEW_CONTENT_RATIO: 0.15,     // 15% new content
      
      // Weak area thresholds
      WEAK_MASTERY_THRESHOLD: 60,   // Categories below 60% mastery are weak
      STRONG_MASTERY_THRESHOLD: 80, // Categories above 80% mastery are strong
      
      // Question selection parameters
      DEFAULT_SET_SIZE: 10,
      MIN_SET_SIZE: 5,
      MAX_SET_SIZE: 50,
      
      // Difficulty adjustment ranges
      DIFFICULTY_VARIANCE: 2,       // ±2 levels from preferred
      
      // Performance analysis windows
      RECENT_PERFORMANCE_DAYS: 7,
      LONG_TERM_PERFORMANCE_DAYS: 30,
      
      // Spaced repetition parameters
      DUE_REVIEW_BUFFER_HOURS: 2,   // Include reviews due within 2 hours
      
      // Category balancing
      MAX_CATEGORIES_PER_SET: 5,
      MIN_QUESTIONS_PER_CATEGORY: 2
    };
  }

  /**
   * Generate a personalized question set for a learner
   * @param {string} learnerId - The learner's ID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Personalized question set with metadata
   */
  async generatePersonalizedSet(learnerId, options = {}) {
    try {
      const {
        setSize = this.config.DEFAULT_SET_SIZE,
        focusCategories = null,
        excludeQuestionIds = [],
        sessionId = null,
        includeReviews = true,
        difficultyOverride = null
      } = options;

      // Validate set size
      const validatedSetSize = Math.max(
        this.config.MIN_SET_SIZE, 
        Math.min(this.config.MAX_SET_SIZE, setSize)
      );

      // Get learner profile and performance data
      const learner = await Learner.findById(learnerId);
      if (!learner) {
        throw new Error('Learner not found');
      }

      // Analyze learner's current state
      const learnerAnalysis = await this.analyzeLearnerProfile(learnerId, focusCategories);
      
      // Calculate question distribution
      const distribution = this.calculateQuestionDistribution(
        validatedSetSize, 
        learnerAnalysis,
        includeReviews
      );

      // Generate question set based on distribution
      const questionSet = await this.buildQuestionSet(
        learner,
        learnerAnalysis,
        distribution,
        excludeQuestionIds,
        difficultyOverride
      );

      // Add metadata and personalization insights
      const personalizedSet = {
        questions: questionSet,
        metadata: {
          learnerId,
          sessionId,
          generatedAt: new Date(),
          setSize: questionSet.length,
          distribution,
          learnerAnalysis: {
            weakAreas: learnerAnalysis.weakAreas,
            strongAreas: learnerAnalysis.strongAreas,
            recommendedDifficulty: learnerAnalysis.recommendedDifficulty,
            totalQuestionsAnswered: learnerAnalysis.totalQuestionsAnswered
          },
          personalizationFactors: this.getPersonalizationFactors(learner, learnerAnalysis)
        }
      };

      return personalizedSet;

    } catch (error) {
      throw new Error(`Failed to generate personalized question set: ${error.message}`);
    }
  }

  /**
   * Analyze learner profile to identify weak areas and learning patterns
   * @param {string} learnerId - The learner's ID
   * @param {Array} focusCategories - Optional categories to focus on
   * @returns {Promise<Object>} - Learner analysis object
   */
  async analyzeLearnerProfile(learnerId, focusCategories = null) {
    const learner = await Learner.findById(learnerId);
    
    // Get recent performance data
    const recentPerformance = await this.getRecentPerformanceData(learnerId);
    
    // Analyze category mastery
    const categoryAnalysis = this.analyzeCategoryMastery(learner, focusCategories);
    
    // Identify weak and strong areas
    const weakAreas = this.identifyWeakAreas(categoryAnalysis, recentPerformance);
    const strongAreas = this.identifyStrongAreas(categoryAnalysis);
    
    // Calculate recommended difficulty
    const recommendedDifficulty = this.calculateRecommendedDifficulty(
      learner, 
      weakAreas, 
      recentPerformance
    );
    
    // Analyze learning patterns
    const learningPatterns = await this.analyzeLearningPatterns(learnerId, recentPerformance);
    
    return {
      learner,
      categoryAnalysis,
      weakAreas,
      strongAreas,
      recommendedDifficulty,
      recentPerformance,
      learningPatterns,
      totalQuestionsAnswered: learner.totalQuestionsAnswered || 0
    };
  }

  /**
   * Get recent performance data for analysis
   * @param {string} learnerId - The learner's ID
   * @returns {Promise<Array>} - Recent performance records
   */
  async getRecentPerformanceData(learnerId) {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - this.config.RECENT_PERFORMANCE_DAYS);
    
    return await Performance.find({
      learnerId,
      createdAt: { $gte: recentDate }
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  }

  /**
   * Analyze category mastery from learner profile
   * @param {Object} learner - Learner object
   * @param {Array} focusCategories - Optional focus categories
   * @returns {Object} - Category analysis
   */
  analyzeCategoryMastery(learner, focusCategories = null) {
    const categoryAnalysis = {};
    
    // Convert Map to object for easier processing
    for (const [category, mastery] of learner.categoryMastery) {
      // Skip if focus categories specified and this isn't one of them
      if (focusCategories && !focusCategories.includes(category)) {
        continue;
      }
      
      categoryAnalysis[category] = {
        level: mastery.level,
        confidence: mastery.confidence,
        questionsAnswered: mastery.questionsAnswered,
        averageAccuracy: mastery.averageAccuracy,
        lastAssessed: mastery.lastAssessed,
        needsAttention: mastery.level < this.config.WEAK_MASTERY_THRESHOLD,
        isStrong: mastery.level >= this.config.STRONG_MASTERY_THRESHOLD
      };
    }
    
    return categoryAnalysis;
  }

  /**
   * Identify weak areas that need attention
   * @param {Object} categoryAnalysis - Category analysis object
   * @param {Array} recentPerformance - Recent performance data
   * @returns {Array} - Array of weak area objects
   */
  identifyWeakAreas(categoryAnalysis, recentPerformance) {
    const weakAreas = [];
    
    // Identify from category mastery
    for (const [category, analysis] of Object.entries(categoryAnalysis)) {
      if (analysis.needsAttention) {
        weakAreas.push({
          category,
          masteryLevel: analysis.level,
          confidence: analysis.confidence,
          questionsAnswered: analysis.questionsAnswered,
          priority: this.calculateWeakAreaPriority(analysis, recentPerformance, category),
          reason: 'Low mastery level'
        });
      }
    }
    
    // Identify from recent poor performance
    const recentWeakAreas = this.identifyRecentWeakAreas(recentPerformance);
    
    // Merge and deduplicate
    for (const recentWeak of recentWeakAreas) {
      const existing = weakAreas.find(w => w.category === recentWeak.category);
      if (existing) {
        existing.priority = Math.max(existing.priority, recentWeak.priority);
        existing.reason += ', Recent poor performance';
      } else {
        weakAreas.push(recentWeak);
      }
    }
    
    // Sort by priority (highest first)
    return weakAreas.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Identify strong areas where learner excels
   * @param {Object} categoryAnalysis - Category analysis object
   * @returns {Array} - Array of strong area objects
   */
  identifyStrongAreas(categoryAnalysis) {
    const strongAreas = [];
    
    for (const [category, analysis] of Object.entries(categoryAnalysis)) {
      if (analysis.isStrong) {
        strongAreas.push({
          category,
          masteryLevel: analysis.level,
          confidence: analysis.confidence,
          questionsAnswered: analysis.questionsAnswered
        });
      }
    }
    
    return strongAreas.sort((a, b) => b.masteryLevel - a.masteryLevel);
  }

  /**
   * Calculate priority for weak areas
   * @param {Object} analysis - Category analysis
   * @param {Array} recentPerformance - Recent performance data
   * @param {string} category - Category name
   * @returns {number} - Priority score (0-100)
   */
  calculateWeakAreaPriority(analysis, recentPerformance, category) {
    let priority = 0;
    
    // Base priority on how weak the area is (inverted mastery level)
    priority += (100 - analysis.level) * 0.4;
    
    // Add priority based on confidence (lower confidence = higher priority)
    priority += (1 - analysis.confidence) * 20;
    
    // Add priority based on recent activity
    const recentCategoryPerformance = recentPerformance.filter(p => 
      p.category.includes(category)
    );
    
    if (recentCategoryPerformance.length > 0) {
      const recentAccuracy = recentCategoryPerformance.reduce((sum, p) => 
        sum + (p.correct ? 1 : 0), 0) / recentCategoryPerformance.length;
      
      // Lower recent accuracy increases priority
      priority += (1 - recentAccuracy) * 30;
    }
    
    // Add priority based on time since last assessment
    const daysSinceAssessment = (Date.now() - new Date(analysis.lastAssessed)) / (1000 * 60 * 60 * 24);
    if (daysSinceAssessment > 7) {
      priority += Math.min(10, daysSinceAssessment - 7);
    }
    
    return Math.min(100, priority);
  }

  /**
   * Identify weak areas from recent performance
   * @param {Array} recentPerformance - Recent performance data
   * @returns {Array} - Array of recent weak areas
   */
  identifyRecentWeakAreas(recentPerformance) {
    const categoryPerformance = {};
    
    // Group performance by category
    for (const performance of recentPerformance) {
      for (const category of performance.category) {
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = [];
        }
        categoryPerformance[category].push(performance);
      }
    }
    
    const recentWeakAreas = [];
    
    // Analyze each category's recent performance
    for (const [category, performances] of Object.entries(categoryPerformance)) {
      if (performances.length >= 3) { // Need at least 3 questions for reliable analysis
        const accuracy = performances.reduce((sum, p) => sum + (p.correct ? 1 : 0), 0) / performances.length;
        
        if (accuracy < 0.6) { // Less than 60% accuracy in recent questions
          recentWeakAreas.push({
            category,
            masteryLevel: accuracy * 100,
            confidence: Math.min(1, performances.length / 10),
            questionsAnswered: performances.length,
            priority: (1 - accuracy) * 80,
            reason: 'Recent poor performance'
          });
        }
      }
    }
    
    return recentWeakAreas;
  }

  /**
   * Calculate recommended difficulty for the learner
   * @param {Object} learner - Learner object
   * @param {Array} weakAreas - Identified weak areas
   * @param {Array} recentPerformance - Recent performance data
   * @returns {number} - Recommended difficulty level
   */
  calculateRecommendedDifficulty(learner, weakAreas, recentPerformance) {
    let baseDifficulty = learner.difficultyPreference;
    
    // Adjust based on overall recent performance
    if (recentPerformance.length > 0) {
      const recentAccuracy = recentPerformance.reduce((sum, p) => 
        sum + (p.correct ? 1 : 0), 0) / recentPerformance.length;
      
      if (recentAccuracy < 0.5) {
        baseDifficulty = Math.max(1, baseDifficulty - 1);
      } else if (recentAccuracy > 0.8) {
        baseDifficulty = Math.min(10, baseDifficulty + 1);
      }
    }
    
    // Adjust based on number of weak areas
    if (weakAreas.length > 3) {
      baseDifficulty = Math.max(1, baseDifficulty - 1);
    }
    
    return baseDifficulty;
  }

  /**
   * Analyze learning patterns from performance data
   * @param {string} learnerId - The learner's ID
   * @param {Array} recentPerformance - Recent performance data
   * @returns {Promise<Object>} - Learning patterns analysis
   */
  async analyzeLearningPatterns(learnerId, recentPerformance) {
    // Analyze time-of-day performance
    const timePatterns = this.analyzeTimePatterns(recentPerformance);
    
    // Analyze difficulty progression
    const difficultyPatterns = this.analyzeDifficultyPatterns(recentPerformance);
    
    // Analyze hint usage patterns
    const hintPatterns = this.analyzeHintPatterns(recentPerformance);
    
    // Analyze session length preferences
    const sessionPatterns = await this.analyzeSessionPatterns(learnerId);
    
    return {
      timePatterns,
      difficultyPatterns,
      hintPatterns,
      sessionPatterns
    };
  }

  /**
   * Calculate question distribution for the set
   * @param {number} setSize - Total number of questions in set
   * @param {Object} learnerAnalysis - Learner analysis object
   * @param {boolean} includeReviews - Whether to include review questions
   * @returns {Object} - Question distribution object
   */
  calculateQuestionDistribution(setSize, learnerAnalysis, includeReviews) {
    const distribution = {
      weakAreas: 0,
      reviews: 0,
      newContent: 0,
      total: setSize
    };
    
    // Adjust ratios based on learner state
    let weakAreaRatio = this.config.WEAK_AREA_RATIO;
    let reviewRatio = includeReviews ? this.config.REVIEW_RATIO : 0;
    let newContentRatio = this.config.NEW_CONTENT_RATIO;
    
    // If learner has many weak areas, increase weak area focus
    if (learnerAnalysis.weakAreas.length > 3) {
      weakAreaRatio = 0.7;
      reviewRatio = includeReviews ? 0.2 : 0;
      newContentRatio = 0.1;
    }
    
    // If learner is new (few questions answered), focus more on new content
    if (learnerAnalysis.totalQuestionsAnswered < 20) {
      weakAreaRatio = 0.3;
      reviewRatio = includeReviews ? 0.1 : 0;
      newContentRatio = 0.6;
    }
    
    // Normalize ratios if reviews are disabled
    if (!includeReviews) {
      const totalRatio = weakAreaRatio + newContentRatio;
      weakAreaRatio = weakAreaRatio / totalRatio;
      newContentRatio = newContentRatio / totalRatio;
    }
    
    // Calculate actual numbers
    distribution.weakAreas = Math.round(setSize * weakAreaRatio);
    distribution.reviews = includeReviews ? Math.round(setSize * reviewRatio) : 0;
    distribution.newContent = setSize - distribution.weakAreas - distribution.reviews;
    
    // Ensure we don't exceed set size
    const total = distribution.weakAreas + distribution.reviews + distribution.newContent;
    if (total !== setSize) {
      distribution.newContent += (setSize - total);
    }
    
    return distribution;
  }

  /**
   * Build the actual question set based on distribution and analysis
   * @param {Object} learner - Learner object
   * @param {Object} learnerAnalysis - Learner analysis
   * @param {Object} distribution - Question distribution
   * @param {Array} excludeQuestionIds - Questions to exclude
   * @param {number} difficultyOverride - Optional difficulty override
   * @returns {Promise<Array>} - Array of selected questions
   */
  async buildQuestionSet(learner, learnerAnalysis, distribution, excludeQuestionIds, difficultyOverride) {
    const questionSet = [];
    
    // Get weak area questions
    if (distribution.weakAreas > 0) {
      const weakAreaQuestions = await this.getWeakAreaQuestions(
        learnerAnalysis.weakAreas,
        distribution.weakAreas,
        learner,
        excludeQuestionIds,
        difficultyOverride
      );
      questionSet.push(...weakAreaQuestions);
    }
    
    // Get review questions (spaced repetition)
    if (distribution.reviews > 0) {
      const reviewQuestions = await this.getReviewQuestions(
        learner._id,
        distribution.reviews,
        excludeQuestionIds.concat(questionSet.map(q => q._id))
      );
      questionSet.push(...reviewQuestions);
    }
    
    // Get new content questions
    if (distribution.newContent > 0) {
      const newContentQuestions = await this.getNewContentQuestions(
        learner,
        learnerAnalysis,
        distribution.newContent,
        excludeQuestionIds.concat(questionSet.map(q => q._id)),
        difficultyOverride
      );
      questionSet.push(...newContentQuestions);
    }
    
    // Shuffle the final set to avoid predictable patterns
    return this.shuffleQuestions(questionSet);
  }

  /**
   * Get questions targeting weak areas
   * @param {Array} weakAreas - Identified weak areas
   * @param {number} count - Number of questions needed
   * @param {Object} learner - Learner object
   * @param {Array} excludeIds - Question IDs to exclude
   * @param {number} difficultyOverride - Optional difficulty override
   * @returns {Promise<Array>} - Array of weak area questions
   */
  async getWeakAreaQuestions(weakAreas, count, learner, excludeIds, difficultyOverride) {
    if (weakAreas.length === 0) return [];
    
    const questions = [];
    const questionsPerArea = Math.max(1, Math.floor(count / Math.min(weakAreas.length, this.config.MAX_CATEGORIES_PER_SET)));
    
    for (const weakArea of weakAreas.slice(0, this.config.MAX_CATEGORIES_PER_SET)) {
      if (questions.length >= count) break;
      
      const difficulty = difficultyOverride || this.calculateTargetDifficulty(learner, weakArea.category);
      
      const areaQuestions = await Question.find({
        _id: { $nin: excludeIds.concat(questions.map(q => q._id)) },
        category: { $in: [weakArea.category] },
        difficulty: {
          $gte: Math.max(1, difficulty - this.config.DIFFICULTY_VARIANCE),
          $lte: Math.min(10, difficulty + this.config.DIFFICULTY_VARIANCE)
        }
      })
      .sort({ timesUsed: 1, createdAt: -1 }) // Prefer less used questions
      .limit(questionsPerArea);
      
      questions.push(...areaQuestions);
    }
    
    return questions.slice(0, count);
  }

  /**
   * Get review questions based on spaced repetition
   * @param {string} learnerId - Learner ID
   * @param {number} count - Number of review questions needed
   * @param {Array} excludeIds - Question IDs to exclude
   * @returns {Promise<Array>} - Array of review questions
   */
  async getReviewQuestions(learnerId, count, excludeIds) {
    const now = new Date();
    const bufferTime = new Date(now.getTime() + (this.config.DUE_REVIEW_BUFFER_HOURS * 60 * 60 * 1000));
    
    // Get due reviews
    const dueReviews = await SpacedRepetition.find({
      learnerId,
      nextReviewDate: { $lte: bufferTime }
    })
    .populate('questionId')
    .sort({ nextReviewDate: 1 })
    .limit(count);
    
    const reviewQuestions = dueReviews
      .filter(review => review.questionId && !excludeIds.includes(review.questionId._id.toString()))
      .map(review => review.questionId)
      .slice(0, count);
    
    return reviewQuestions;
  }

  /**
   * Get new content questions for exploration
   * @param {Object} learner - Learner object
   * @param {Object} learnerAnalysis - Learner analysis
   * @param {number} count - Number of new questions needed
   * @param {Array} excludeIds - Question IDs to exclude
   * @param {number} difficultyOverride - Optional difficulty override
   * @returns {Promise<Array>} - Array of new content questions
   */
  async getNewContentQuestions(learner, learnerAnalysis, count, excludeIds, difficultyOverride) {
    const difficulty = difficultyOverride || learnerAnalysis.recommendedDifficulty;
    
    // Prefer categories where learner has some experience but isn't weak
    const preferredCategories = Object.keys(learnerAnalysis.categoryAnalysis)
      .filter(cat => {
        const analysis = learnerAnalysis.categoryAnalysis[cat];
        return analysis.level >= this.config.WEAK_MASTERY_THRESHOLD && 
               analysis.level < this.config.STRONG_MASTERY_THRESHOLD;
      });
    
    let query = {
      _id: { $nin: excludeIds },
      difficulty: {
        $gte: Math.max(1, difficulty - this.config.DIFFICULTY_VARIANCE),
        $lte: Math.min(10, difficulty + this.config.DIFFICULTY_VARIANCE)
      }
    };
    
    // If we have preferred categories, use them
    if (preferredCategories.length > 0) {
      query.category = { $in: preferredCategories };
    }
    
    const newQuestions = await Question.find(query)
      .sort({ timesUsed: 1, createdAt: -1 })
      .limit(count);
    
    return newQuestions;
  }

  /**
   * Calculate target difficulty for a specific category
   * @param {Object} learner - Learner object
   * @param {string} category - Category name
   * @returns {number} - Target difficulty level
   */
  calculateTargetDifficulty(learner, category) {
    const categoryMastery = learner.categoryMastery.get(category);
    let targetDifficulty = learner.difficultyPreference;
    
    if (categoryMastery) {
      // Adjust based on mastery level
      if (categoryMastery.level < 30) {
        targetDifficulty = Math.max(1, learner.difficultyPreference - 2);
      } else if (categoryMastery.level < 60) {
        targetDifficulty = Math.max(1, learner.difficultyPreference - 1);
      } else if (categoryMastery.level > 80) {
        targetDifficulty = Math.min(10, learner.difficultyPreference + 1);
      }
    }
    
    return targetDifficulty;
  }

  /**
   * Shuffle questions to avoid predictable patterns
   * @param {Array} questions - Array of questions
   * @returns {Array} - Shuffled array of questions
   */
  shuffleQuestions(questions) {
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get personalization factors for metadata
   * @param {Object} learner - Learner object
   * @param {Object} learnerAnalysis - Learner analysis
   * @returns {Object} - Personalization factors
   */
  getPersonalizationFactors(learner, learnerAnalysis) {
    return {
      experienceLevel: this.categorizeExperienceLevel(learner.totalQuestionsAnswered),
      learningVelocity: learner.learningVelocity,
      preferredDifficulty: learner.difficultyPreference,
      weakAreaCount: learnerAnalysis.weakAreas.length,
      strongAreaCount: learnerAnalysis.strongAreas.length,
      overallAccuracy: learner.overallAccuracy,
      currentStreak: learner.currentStreak,
      daysSinceLastActive: Math.floor((Date.now() - new Date(learner.lastActive)) / (1000 * 60 * 60 * 24))
    };
  }

  /**
   * Categorize learner's experience level
   * @param {number} totalQuestions - Total questions answered
   * @returns {string} - Experience level category
   */
  categorizeExperienceLevel(totalQuestions) {
    if (totalQuestions < 10) return 'beginner';
    if (totalQuestions < 50) return 'novice';
    if (totalQuestions < 200) return 'intermediate';
    if (totalQuestions < 500) return 'advanced';
    return 'expert';
  }

  /**
   * Analyze time-of-day performance patterns
   * @param {Array} performances - Performance data
   * @returns {Object} - Time pattern analysis
   */
  analyzeTimePatterns(performances) {
    const hourlyPerformance = {};
    
    for (const performance of performances) {
      const hour = new Date(performance.createdAt).getHours();
      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { correct: 0, total: 0 };
      }
      hourlyPerformance[hour].total++;
      if (performance.correct) {
        hourlyPerformance[hour].correct++;
      }
    }
    
    // Find best and worst performance hours
    let bestHour = null;
    let worstHour = null;
    let bestAccuracy = 0;
    let worstAccuracy = 1;
    
    for (const [hour, data] of Object.entries(hourlyPerformance)) {
      if (data.total >= 3) { // Need at least 3 data points
        const accuracy = data.correct / data.total;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestHour = parseInt(hour);
        }
        if (accuracy < worstAccuracy) {
          worstAccuracy = accuracy;
          worstHour = parseInt(hour);
        }
      }
    }
    
    return {
      bestHour,
      worstHour,
      bestAccuracy,
      worstAccuracy,
      hourlyData: hourlyPerformance
    };
  }

  /**
   * Analyze difficulty progression patterns
   * @param {Array} performances - Performance data
   * @returns {Object} - Difficulty pattern analysis
   */
  analyzeDifficultyPatterns(performances) {
    const difficultyPerformance = {};
    
    for (const performance of performances) {
      const difficulty = performance.difficulty;
      if (!difficultyPerformance[difficulty]) {
        difficultyPerformance[difficulty] = { correct: 0, total: 0 };
      }
      difficultyPerformance[difficulty].total++;
      if (performance.correct) {
        difficultyPerformance[difficulty].correct++;
      }
    }
    
    // Calculate accuracy by difficulty
    const accuracyByDifficulty = {};
    for (const [difficulty, data] of Object.entries(difficultyPerformance)) {
      accuracyByDifficulty[difficulty] = data.correct / data.total;
    }
    
    return {
      accuracyByDifficulty,
      difficultyData: difficultyPerformance
    };
  }

  /**
   * Analyze hint usage patterns
   * @param {Array} performances - Performance data
   * @returns {Object} - Hint pattern analysis
   */
  analyzeHintPatterns(performances) {
    const totalHints = performances.reduce((sum, p) => sum + p.hintsUsed, 0);
    const averageHints = performances.length > 0 ? totalHints / performances.length : 0;
    
    const hintsByCorrectness = {
      correct: performances.filter(p => p.correct).reduce((sum, p) => sum + p.hintsUsed, 0),
      incorrect: performances.filter(p => !p.correct).reduce((sum, p) => sum + p.hintsUsed, 0)
    };
    
    return {
      averageHints,
      totalHints,
      hintsByCorrectness,
      hintsPerQuestion: averageHints
    };
  }

  /**
   * Analyze session patterns
   * @param {string} learnerId - Learner ID
   * @returns {Promise<Object>} - Session pattern analysis
   */
  async analyzeSessionPatterns(learnerId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sessionData = await Performance.aggregate([
      {
        $match: {
          learnerId: new mongoose.Types.ObjectId(learnerId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          questionCount: { $sum: 1 },
          totalTime: { $sum: '$timeSpent' },
          accuracy: { $avg: { $cond: ['$correct', 1, 0] } },
          startTime: { $min: '$createdAt' },
          endTime: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          questionCount: 1,
          totalTime: 1,
          accuracy: 1,
          sessionDuration: { $subtract: ['$endTime', '$startTime'] }
        }
      }
    ]);
    
    const averageSessionLength = sessionData.length > 0 
      ? sessionData.reduce((sum, s) => sum + s.questionCount, 0) / sessionData.length 
      : 0;
    
    const averageSessionTime = sessionData.length > 0
      ? sessionData.reduce((sum, s) => sum + s.totalTime, 0) / sessionData.length
      : 0;
    
    return {
      averageSessionLength,
      averageSessionTime,
      totalSessions: sessionData.length,
      sessionData
    };
  }
}

module.exports = PersonalizedQuestionSetService;