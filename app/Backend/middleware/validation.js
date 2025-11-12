const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Common validation schemas
const schemas = {
  // Question generation validation
  generateQuestion: Joi.object({
    topic: Joi.string().required().min(1).max(100),
    category: Joi.array().items(Joi.string().min(1).max(50)).required(),
    difficulty: Joi.number().integer().min(1).max(10).required(),
    learnerId: Joi.string().required(),
    excludeQuestionIds: Joi.array().items(Joi.string()).optional()
  }),

  // Answer submission validation
  submitAnswer: Joi.object({
    questionId: Joi.string().required(),
    learnerId: Joi.string().required(),
    selectedAnswer: Joi.string().required(),
    timeSpent: Joi.number().positive().required()
  }),

  // Learner profile validation
  updateLearnerProfile: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    email: Joi.string().email().optional(),
    difficultyPreference: Joi.number().integer().min(1).max(10).optional(),
    learningVelocity: Joi.number().positive().optional()
  }),

  // Learner creation validation
  createLearner: Joi.object({
    name: Joi.string().required().min(1).max(100),
    email: Joi.string().email().required()
  })
};

module.exports = {
  validate,
  schemas
};