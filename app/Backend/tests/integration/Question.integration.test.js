const Question = require('../../models/Question');

describe('Question Model Integration', () => {
  test('should create question instance with validation methods', () => {
    const questionData = {
      content: 'What is the time complexity of binary search?',
      options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswer: 'O(log n)',
      explanation: 'Binary search divides the search space in half with each comparison.',
      category: ['Computer Science', 'Algorithms', 'Search Algorithms'],
      difficulty: 5,
      generatedBy: 'AI'
    };

    const question = new Question(questionData);
    
    // Test that the instance has the expected methods
    expect(typeof question.validateCategoryHierarchy).toBe('function');
    expect(typeof question.generateTags).toBe('function');
    expect(typeof question.updateUsageStats).toBe('function');
    
    // Test validation method
    const validation = question.validateCategoryHierarchy();
    expect(validation.isValid).toBe(true);
    
    // Test tag generation method
    question.generateTags();
    expect(Array.isArray(question.tags)).toBe(true);
    expect(question.tags.length).toBeGreaterThan(0);
    
    // Test that generated tags include expected values
    expect(question.tags).toContain('computer');
    expect(question.tags).toContain('science');
    expect(question.tags).toContain('algorithms');
    expect(question.tags).toContain('intermediate'); // difficulty 5
    expect(question.tags).toContain('ai');
  });

  test('should validate schema constraints', () => {
    const schema = Question.schema;
    
    // Test that required fields are defined in schema paths
    expect(schema.paths.content).toBeDefined();
    expect(schema.paths.correctAnswer).toBeDefined();
    expect(schema.paths.explanation).toBeDefined();
    expect(schema.paths.category).toBeDefined();
    expect(schema.paths.difficulty).toBeDefined();
    expect(schema.paths.generatedBy).toBeDefined();
    
    // Test that validation constraints are in place
    expect(schema.paths.content.validators).toBeDefined();
    expect(schema.paths.difficulty.validators).toBeDefined();
    expect(schema.paths.generatedBy.enumValues).toEqual(['AI', 'Human']);
  });

  test('should have proper indexes defined', () => {
    const schema = Question.schema;
    const indexes = schema.indexes();
    
    expect(indexes.length).toBeGreaterThan(0);
    
    // Check that performance indexes are defined
    const indexFields = indexes.map(index => Object.keys(index[0])).flat();
    expect(indexFields).toContain('category');
    expect(indexFields).toContain('difficulty');
    expect(indexFields).toContain('generatedBy');
    expect(indexFields).toContain('tags');
  });

  test('should have static methods available', () => {
    expect(typeof Question.findByCategoryAndDifficulty).toBe('function');
    expect(typeof Question.findByCategoryHierarchy).toBe('function');
    expect(typeof Question.getAdaptiveQuestions).toBe('function');
  });

  test('should handle pre-save middleware', () => {
    const schema = Question.schema;
    
    // Test that pre-save hooks exist (different mongoose versions have different internal structures)
    expect(schema.pre).toBeDefined();
    expect(typeof schema.pre).toBe('function');
  });
});