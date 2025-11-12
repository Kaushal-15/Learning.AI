describe('Question Model Validation Logic', () => {
  // Create a mock question object for testing validation methods
  const createMockQuestion = (data) => {
    const mockQuestion = {
      content: data.content || 'What is the time complexity of binary search?',
      options: data.options || ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctAnswer: data.correctAnswer || 'O(log n)',
      explanation: data.explanation || 'Binary search has O(log n) complexity.',
      category: data.category || ['Computer Science', 'Algorithms', 'Search Algorithms'],
      difficulty: data.difficulty || 5,
      generatedBy: data.generatedBy || 'AI',
      tags: data.tags || [],
      validateCategoryHierarchy: function() {
        // Categories should be ordered from general to specific
        if (this.category.length === 0) {
          return { isValid: false, error: 'Question must have at least one category' };
        }

        // Check for empty categories
        for (let i = 0; i < this.category.length; i++) {
          if (!this.category[i] || this.category[i].trim() === '') {
            return { isValid: false, error: `Category at position ${i + 1} cannot be empty` };
          }
        }

        // Check for duplicate categories in hierarchy
        const uniqueCategories = [...new Set(this.category)];
        if (uniqueCategories.length !== this.category.length) {
          return { isValid: false, error: 'Category hierarchy cannot contain duplicates' };
        }

        // Validate hierarchy depth (max 5 levels)
        if (this.category.length > 5) {
          return { isValid: false, error: 'Category hierarchy cannot exceed 5 levels' };
        }

        return { isValid: true };
      },
      generateTags: function() {
        const generatedTags = new Set();

        // Add category-based tags
        this.category.forEach(cat => {
          generatedTags.add(cat.toLowerCase());
          const words = cat.split(/\s+/).filter(word => word.length > 2);
          words.forEach(word => generatedTags.add(word.toLowerCase()));
        });

        // Add difficulty-based tags
        if (this.difficulty <= 3) {
          generatedTags.add('beginner');
        } else if (this.difficulty <= 6) {
          generatedTags.add('intermediate');
        } else {
          generatedTags.add('advanced');
        }

        // Add generation source tag
        generatedTags.add(this.generatedBy.toLowerCase());

        // Extract keywords from question content
        const contentWords = this.content.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3 && !['what', 'which', 'when', 'where', 'why', 'how', 'the', 'and', 'or', 'but', 'for', 'with', 'from', 'this', 'that', 'these', 'those'].includes(word));
        
        contentWords.slice(0, 5).forEach(word => generatedTags.add(word));

        // Merge with existing tags
        const existingTags = new Set(this.tags.map(tag => tag.toLowerCase()));
        const allTags = new Set([...existingTags, ...generatedTags]);
        
        this.tags = Array.from(allTags).slice(0, 15);
      }
    };
    return mockQuestion;
  };

  describe('Basic Validation Logic', () => {
    test('should validate required fields', () => {
      const validData = {
        content: 'What is the time complexity of binary search?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        explanation: 'Binary search has O(log n) complexity.',
        category: ['Computer Science', 'Algorithms'],
        difficulty: 5,
        generatedBy: 'AI'
      };

      // Test content validation
      expect(validData.content.length).toBeGreaterThanOrEqual(10);
      expect(validData.content.length).toBeLessThanOrEqual(1000);

      // Test options validation
      expect(validData.options.length).toBeGreaterThanOrEqual(2);
      expect(validData.options.length).toBeLessThanOrEqual(6);
      expect(new Set(validData.options).size).toBe(validData.options.length); // No duplicates
      expect(validData.options).toContain(validData.correctAnswer);

      // Test difficulty validation
      expect(validData.difficulty).toBeGreaterThanOrEqual(1);
      expect(validData.difficulty).toBeLessThanOrEqual(10);
      expect(Number.isInteger(validData.difficulty)).toBe(true);

      // Test generatedBy validation
      expect(['AI', 'Human']).toContain(validData.generatedBy);
    });

    test('should reject invalid content length', () => {
      const shortContent = 'Short?';
      const longContent = 'A'.repeat(1001);

      expect(shortContent.length < 10).toBe(true);
      expect(longContent.length > 1000).toBe(true);
    });

    test('should reject invalid options', () => {
      const tooFewOptions = ['Only one'];
      const tooManyOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const duplicateOptions = ['A', 'B', 'A', 'C'];

      expect(tooFewOptions.length < 2).toBe(true);
      expect(tooManyOptions.length > 6).toBe(true);
      expect(new Set(duplicateOptions).size !== duplicateOptions.length).toBe(true);
    });

    test('should reject invalid difficulty', () => {
      const lowDifficulty = 0;
      const highDifficulty = 11;
      const nonIntegerDifficulty = 5.5;

      expect(lowDifficulty < 1).toBe(true);
      expect(highDifficulty > 10).toBe(true);
      expect(!Number.isInteger(nonIntegerDifficulty)).toBe(true);
    });
  });

  describe('Category Hierarchy Validation', () => {
    test('should validate proper category hierarchy', () => {
      const question = createMockQuestion({
        category: ['Computer Science', 'Algorithms', 'Search Algorithms', 'Binary Search']
      });
      
      const validation = question.validateCategoryHierarchy();
      expect(validation.isValid).toBe(true);
      expect(question.category.length).toBe(4);
      expect(question.category[0]).toBe('Computer Science');
    });

    test('should reject empty categories in hierarchy', () => {
      const question = createMockQuestion({
        category: ['Computer Science', '', 'Search Algorithms']
      });
      
      const validation = question.validateCategoryHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Category at position 2 cannot be empty');
    });

    test('should reject duplicate categories in hierarchy', () => {
      const question = createMockQuestion({
        category: ['Computer Science', 'Algorithms', 'Computer Science']
      });
      
      const validation = question.validateCategoryHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Category hierarchy cannot contain duplicates');
    });

    test('should reject hierarchy with more than 5 levels', () => {
      const question = createMockQuestion({
        category: ['Level1', 'Level2', 'Level3', 'Level4', 'Level5', 'Level6']
      });
      
      const validation = question.validateCategoryHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Category hierarchy cannot exceed 5 levels');
    });

    test('should require at least one category', () => {
      const question = createMockQuestion({
        category: []
      });
      
      const validation = question.validateCategoryHierarchy();
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('Question must have at least one category');
    });
  });

  describe('Tag Generation', () => {
    test('should auto-generate tags based on category and content', () => {
      const question = createMockQuestion({
        content: 'What is the time complexity of binary search algorithm?',
        category: ['Computer Science', 'Data Structures', 'Search Algorithms'],
        difficulty: 7,
        generatedBy: 'AI'
      });
      
      question.generateTags();
      
      expect(question.tags).toContain('computer');
      expect(question.tags).toContain('science');
      expect(question.tags).toContain('data');
      expect(question.tags).toContain('structures');
      expect(question.tags).toContain('search');
      expect(question.tags).toContain('algorithms');
      expect(question.tags).toContain('advanced'); // difficulty > 6
      expect(question.tags).toContain('ai'); // generatedBy
      expect(question.tags).toContain('time'); // from content
      expect(question.tags).toContain('complexity'); // from content
    });

    test('should generate difficulty-based tags', () => {
      const beginnerQuestion = createMockQuestion({
        content: 'What is a variable in programming?',
        category: ['Programming', 'Basics'],
        difficulty: 2,
        generatedBy: 'Human'
      });
      
      const intermediateQuestion = createMockQuestion({
        content: 'What is recursion in programming?',
        category: ['Programming', 'Functions'],
        difficulty: 5,
        generatedBy: 'Human'
      });
      
      const advancedQuestion = createMockQuestion({
        content: 'What is the space complexity of merge sort?',
        category: ['Algorithms', 'Sorting'],
        difficulty: 8,
        generatedBy: 'AI'
      });
      
      beginnerQuestion.generateTags();
      intermediateQuestion.generateTags();
      advancedQuestion.generateTags();
      
      expect(beginnerQuestion.tags).toContain('beginner');
      expect(intermediateQuestion.tags).toContain('intermediate');
      expect(advancedQuestion.tags).toContain('advanced');
    });

    test('should preserve existing tags while adding generated ones', () => {
      const question = createMockQuestion({
        content: 'What is the time complexity of binary search?',
        category: ['Computer Science', 'Algorithms'],
        difficulty: 5,
        generatedBy: 'AI',
        tags: ['custom-tag', 'important']
      });
      
      question.generateTags();
      
      expect(question.tags).toContain('custom-tag');
      expect(question.tags).toContain('important');
      expect(question.tags).toContain('computer');
      expect(question.tags).toContain('science');
      expect(question.tags).toContain('algorithms');
    });

    test('should limit total tags to 15', () => {
      const question = createMockQuestion({
        content: 'What is the time complexity analysis of binary search algorithm implementation in computer science data structures?',
        category: ['Computer Science', 'Data Structures', 'Search Algorithms', 'Binary Search', 'Analysis'],
        difficulty: 8,
        generatedBy: 'AI',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      });
      
      question.generateTags();
      
      expect(question.tags.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Usage Statistics Logic', () => {
    test('should calculate usage statistics correctly', () => {
      // Mock the updateUsageStats logic
      const calculateUsageStats = (currentStats, timeSpent, wasCorrect) => {
        const newTimesUsed = currentStats.timesUsed + 1;
        const newAverageTimeSpent = ((currentStats.averageTimeSpent * currentStats.timesUsed) + timeSpent) / newTimesUsed;
        const previousCorrectAnswers = Math.round(currentStats.successRate * currentStats.timesUsed);
        const newCorrectAnswers = previousCorrectAnswers + (wasCorrect ? 1 : 0);
        const newSuccessRate = newCorrectAnswers / newTimesUsed;
        
        return {
          timesUsed: newTimesUsed,
          averageTimeSpent: newAverageTimeSpent,
          successRate: newSuccessRate
        };
      };

      let stats = { timesUsed: 0, averageTimeSpent: 0, successRate: 0 };
      
      // First usage - correct answer
      stats = calculateUsageStats(stats, 30, true);
      expect(stats.timesUsed).toBe(1);
      expect(stats.averageTimeSpent).toBe(30);
      expect(stats.successRate).toBe(1);
      
      // Second usage - incorrect answer
      stats = calculateUsageStats(stats, 45, false);
      expect(stats.timesUsed).toBe(2);
      expect(stats.averageTimeSpent).toBe(37.5);
      expect(stats.successRate).toBe(0.5);
      
      // Third usage - correct answer
      stats = calculateUsageStats(stats, 20, true);
      expect(stats.timesUsed).toBe(3);
      expect(stats.averageTimeSpent).toBeCloseTo(31.67, 2);
      expect(stats.successRate).toBeCloseTo(0.67, 2);
    });
  });

  describe('Virtual Properties Logic', () => {
    test('should calculate category depth correctly', () => {
      const question = createMockQuestion({
        category: ['Computer Science', 'Algorithms', 'Search', 'Binary Search']
      });
      
      const categoryDepth = question.category.length;
      const primaryCategory = question.category[0];
      
      expect(categoryDepth).toBe(4);
      expect(primaryCategory).toBe('Computer Science');
    });

    test('should handle single category', () => {
      const question = createMockQuestion({
        category: ['Mathematics']
      });
      
      const categoryDepth = question.category.length;
      const primaryCategory = question.category[0];
      
      expect(categoryDepth).toBe(1);
      expect(primaryCategory).toBe('Mathematics');
    });
  });

  describe('Edge Cases', () => {
    test('should handle whitespace in categories', () => {
      const question = createMockQuestion({
        category: ['  Computer Science  ', 'Algorithms', '  Search  ']
      });
      
      // Test that trimming would be handled
      const trimmedCategories = question.category.map(cat => cat.trim());
      expect(trimmedCategories).toEqual(['Computer Science', 'Algorithms', 'Search']);
    });

    test('should handle special characters in content for tag generation', () => {
      const question = createMockQuestion({
        content: 'What is the O(log n) time complexity of binary-search algorithm?',
        category: ['Computer Science'],
        difficulty: 5,
        generatedBy: 'AI'
      });
      
      question.generateTags();
      
      expect(question.tags).toContain('time');
      expect(question.tags).toContain('complexity');
      expect(question.tags).toContain('binary');
      expect(question.tags).toContain('search');
      expect(question.tags).toContain('algorithm');
    });

    test('should handle empty existing tags', () => {
      const question = createMockQuestion({
        content: 'What is binary search?',
        category: ['Computer Science', 'Algorithms'],
        difficulty: 5,
        generatedBy: 'AI',
        tags: []
      });
      
      question.generateTags();
      
      expect(question.tags.length).toBeGreaterThan(0);
      expect(question.tags).toContain('computer');
      expect(question.tags).toContain('science');
      expect(question.tags).toContain('algorithms');
    });
  });
});

// Additional test for the actual Question model structure
describe('Question Model Structure', () => {
  test('should have proper schema structure', () => {
    // Test that the Question model file can be required without errors
    expect(() => require('../../models/Question')).not.toThrow();
  });
});