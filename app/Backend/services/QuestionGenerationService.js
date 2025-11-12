/**
 * Question Generation Service
 * Handles AI-powered question generation with prompt templates and content validation
 */

const AIClient = require('./AIClient');

class QuestionGenerationService {
  constructor(aiClient = null) {
    this.aiClient = aiClient;
    this.promptTemplates = this._initializePromptTemplates();
    this.validationRules = this._initializeValidationRules();
    this.fallbackQuestions = this._initializeFallbackQuestions();
    this.aiServiceHealthy = aiClient ? true : false; // Only healthy if we have an AI client
    this.lastHealthCheck = null;
  }

  /**
   * Initialize AI client with OpenAI API key
   * @param {string} apiKey - OpenAI API key
   * @param {Object} options - Additional options for AI client
   */
  initializeAI(apiKey, options = {}) {
    if (!apiKey) {
      console.warn('No OpenAI API key provided, using fallback questions only');
      return;
    }

    try {
      this.aiClient = new AIClient(apiKey, options);
      console.log('AI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI client:', error.message);
      this.aiServiceHealthy = false;
    }
  }

  /**
   * Generate a question based on topic, category, and difficulty
   * @param {Object} params - Generation parameters
   * @param {string} params.topic - Main topic for the question
   * @param {string[]} params.category - Hierarchical category array
   * @param {number} params.difficulty - Difficulty level (1-10)
   * @param {string} params.questionType - Type of question (multiple-choice, true-false, etc.)
   * @returns {Promise<Object>} Generated question object
   */
  async generateQuestion(params) {
    const { topic, category, difficulty, questionType = 'multiple-choice' } = params;
    
    // Validate input parameters
    this._validateGenerationParams(params);
    
    // Get appropriate prompt template
    const prompt = this._buildPrompt(topic, category, difficulty, questionType);
    
    // Generate question using AI with fallback mechanisms
    const generatedContent = await this._callAIService(prompt, params);
    
    // Validate generated content
    const validatedQuestion = this._validateGeneratedContent(generatedContent, params);
    
    return validatedQuestion;
  }

  /**
   * Initialize prompt templates for different question types and categories
   * @private
   */
  _initializePromptTemplates() {
    return {
      'multiple-choice': {
        base: `Generate a multiple-choice question about {topic} in the category {category} at difficulty level {difficulty}/10.

Requirements:
- Create exactly 4 answer options (A, B, C, D)
- Only one option should be correct
- Include a clear, detailed explanation for the correct answer
- Ensure the question tests understanding, not just memorization
- Make distractors plausible but clearly incorrect
- Align with educational standards and learning objectives

Format your response as JSON:
{
  "question": "Your question here",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "A",
  "explanation": "Detailed explanation here",
  "hints": ["Hint 1", "Hint 2"]
}`,
        
        categories: {
          'programming': `Focus on practical coding concepts, algorithms, or programming principles. Include code snippets when relevant. Test understanding of:
- Algorithm complexity and efficiency
- Data structure operations and use cases
- Programming paradigms and best practices
- Debugging and problem-solving skills
- Code optimization and performance considerations`,
          
          'mathematics': `Focus on mathematical concepts, formulas, or problem-solving techniques. Show step-by-step solutions when appropriate. Test understanding of:
- Mathematical reasoning and proof techniques
- Formula application and derivation
- Problem-solving strategies and approaches
- Mathematical relationships and patterns
- Real-world mathematical applications`,
          
          'science': `Focus on scientific principles, theories, or experimental concepts. Include real-world applications and examples. Test understanding of:
- Scientific method and experimental design
- Cause-and-effect relationships in natural phenomena
- Scientific theories and their applications
- Data interpretation and analysis
- Environmental and technological implications`,
          
          'computer-science': `Focus on theoretical computer science concepts and computational thinking. Test understanding of:
- Computational complexity and algorithm analysis
- Computer architecture and system design
- Database design and query optimization
- Network protocols and distributed systems
- Software engineering principles and methodologies`,
          
          'data-science': `Focus on data analysis, statistics, and machine learning concepts. Test understanding of:
- Statistical analysis and hypothesis testing
- Data preprocessing and feature engineering
- Machine learning algorithms and model evaluation
- Data visualization and interpretation
- Big data technologies and scalability considerations`,
          
          'general': `Create a well-structured question that tests conceptual understanding and critical thinking skills.`
        }
      },
      
      'true-false': {
        base: `Generate a true/false question about {topic} in the category {category} at difficulty level {difficulty}/10.

Requirements:
- Create a clear statement that is definitively true or false
- Avoid ambiguous or trick questions
- Include a detailed explanation of why the statement is true or false
- Provide context that helps learning
- Ensure the statement tests genuine understanding

Format your response as JSON:
{
  "question": "Your statement here",
  "options": ["True", "False"],
  "correctAnswer": "True",
  "explanation": "Detailed explanation here",
  "hints": ["Hint 1"]
}`,
        
        categories: {
          'programming': `Create statements about programming concepts, language features, or development practices.`,
          'mathematics': `Create statements about mathematical theorems, properties, or computational results.`,
          'science': `Create statements about scientific facts, theories, or experimental observations.`,
          'computer-science': `Create statements about theoretical CS concepts, algorithms, or system properties.`,
          'data-science': `Create statements about statistical methods, ML algorithms, or data analysis techniques.`,
          'general': `Create clear, factual statements that test conceptual knowledge.`
        }
      },
      
      'fill-in-the-blank': {
        base: `Generate a fill-in-the-blank question about {topic} in the category {category} at difficulty level {difficulty}/10.

Requirements:
- Create a statement with one or more blanks to fill
- Provide 4 possible answers for each blank
- Ensure only one combination is correct
- Include detailed explanation of the correct answer
- Make the question test understanding, not just memorization

Format your response as JSON:
{
  "question": "Complete the statement: The time complexity of _____ is _____.",
  "options": ["binary search, O(log n)", "linear search, O(n)", "bubble sort, O(n²)", "hash table lookup, O(1)"],
  "correctAnswer": "binary search, O(log n)",
  "explanation": "Detailed explanation here",
  "hints": ["Hint 1", "Hint 2"]
}`
      }
    };
  }

  /**
   * Initialize fallback questions for when AI service is unavailable
   * @private
   */
  _initializeFallbackQuestions() {
    return {
      programming: [
        {
          question: "What is the time complexity of binary search in a sorted array?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
          correctAnswer: "O(log n)",
          explanation: "Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.",
          hints: ["Think about how the search space changes", "Consider the number of comparisons needed"],
          difficulty: 5,
          questionType: "multiple-choice"
        },
        {
          question: "Which data structure uses LIFO (Last In, First Out) principle?",
          options: ["Queue", "Stack", "Array", "Linked List"],
          correctAnswer: "Stack",
          explanation: "A stack follows the LIFO principle where the last element added is the first one to be removed.",
          hints: ["Think about how elements are added and removed", "Consider the order of operations"],
          difficulty: 3,
          questionType: "multiple-choice"
        },
        {
          question: "What is the worst-case time complexity of quicksort?",
          options: ["O(n log n)", "O(n²)", "O(n)", "O(log n)"],
          correctAnswer: "O(n²)",
          explanation: "Quicksort has O(n²) worst-case complexity when the pivot is always the smallest or largest element.",
          hints: ["Consider when quicksort performs poorly", "Think about pivot selection"],
          difficulty: 7,
          questionType: "multiple-choice"
        },
        {
          question: "In object-oriented programming, what does encapsulation mean?",
          options: ["Hiding implementation details", "Creating multiple objects", "Inheriting from parent classes", "Overloading methods"],
          correctAnswer: "Hiding implementation details",
          explanation: "Encapsulation is the principle of hiding internal implementation details and exposing only necessary interfaces.",
          hints: ["Think about data hiding", "Consider access modifiers"],
          difficulty: 4,
          questionType: "multiple-choice"
        },
        {
          question: "What is the space complexity of merge sort?",
          options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
          correctAnswer: "O(n)",
          explanation: "Merge sort requires O(n) additional space for the temporary arrays used during the merge process.",
          hints: ["Consider the auxiliary space needed", "Think about the merge operation"],
          difficulty: 6,
          questionType: "multiple-choice"
        },
        {
          question: "Binary search can only be applied to sorted arrays.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "Binary search requires the array to be sorted to work correctly, as it relies on the sorted property to eliminate half of the search space in each iteration.",
          hints: ["Consider the prerequisites for binary search"],
          difficulty: 3,
          questionType: "true-false"
        },
        {
          question: "Recursion always uses more memory than iteration.",
          options: ["True", "False"],
          correctAnswer: "False",
          explanation: "While recursion typically uses more memory due to function call overhead, this is not always the case. Some recursive algorithms can be optimized with tail recursion.",
          hints: ["Think about tail recursion optimization", "Consider the call stack"],
          difficulty: 6,
          questionType: "true-false"
        }
      ],
      
      'computer-science': [
        {
          question: "What is the halting problem in computer science?",
          options: ["A problem about stopping infinite loops", "The impossibility of determining if a program will halt", "A scheduling algorithm", "A memory management technique"],
          correctAnswer: "The impossibility of determining if a program will halt",
          explanation: "The halting problem is a decision problem about determining whether a program will finish running or continue forever.",
          hints: ["Think about decidability", "Consider Turing's work"],
          difficulty: 8,
          questionType: "multiple-choice"
        },
        {
          question: "In database normalization, what is the purpose of First Normal Form (1NF)?",
          options: ["Eliminate redundancy", "Ensure atomic values", "Remove transitive dependencies", "Establish foreign keys"],
          correctAnswer: "Ensure atomic values",
          explanation: "First Normal Form requires that each column contains atomic (indivisible) values and each record is unique.",
          hints: ["Think about atomic values", "Consider table structure"],
          difficulty: 5,
          questionType: "multiple-choice"
        }
      ],
      
      'data-science': [
        {
          question: "What is overfitting in machine learning?",
          options: ["Model performs well on training but poorly on test data", "Model has too few parameters", "Training takes too long", "Data has too many features"],
          correctAnswer: "Model performs well on training but poorly on test data",
          explanation: "Overfitting occurs when a model learns the training data too well, including noise, leading to poor generalization.",
          hints: ["Think about generalization", "Consider training vs test performance"],
          difficulty: 6,
          questionType: "multiple-choice"
        },
        {
          question: "What does the p-value represent in statistical hypothesis testing?",
          options: ["The probability the null hypothesis is true", "The probability of observing the data given the null hypothesis", "The confidence level", "The effect size"],
          correctAnswer: "The probability of observing the data given the null hypothesis",
          explanation: "The p-value is the probability of obtaining test results at least as extreme as observed, assuming the null hypothesis is true.",
          hints: ["Think about conditional probability", "Consider the null hypothesis"],
          difficulty: 7,
          questionType: "multiple-choice"
        }
      ],
      
      mathematics: [
        {
          question: "What is the derivative of x²?",
          options: ["x", "2x", "x²", "2"],
          correctAnswer: "2x",
          explanation: "Using the power rule: d/dx(x²) = 2x^(2-1) = 2x",
          hints: ["Use the power rule", "Bring down the exponent and subtract 1"],
          difficulty: 4,
          questionType: "multiple-choice"
        },
        {
          question: "What is the value of sin(90°)?",
          options: ["0", "1", "-1", "√2/2"],
          correctAnswer: "1",
          explanation: "sin(90°) = 1, as 90° corresponds to the highest point on the unit circle.",
          hints: ["Think about the unit circle", "Consider the y-coordinate at 90°"],
          difficulty: 2,
          questionType: "multiple-choice"
        },
        {
          question: "What is the integral of 1/x dx?",
          options: ["ln|x| + C", "x²/2 + C", "1/x² + C", "-1/x + C"],
          correctAnswer: "ln|x| + C",
          explanation: "The integral of 1/x is the natural logarithm of the absolute value of x, plus a constant of integration.",
          hints: ["Think about the antiderivative of 1/x", "Consider logarithmic functions"],
          difficulty: 5,
          questionType: "multiple-choice"
        },
        {
          question: "The derivative of a constant is always zero.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "The derivative of any constant value is zero because constants do not change with respect to the variable.",
          hints: ["Think about the rate of change of constants"],
          difficulty: 2,
          questionType: "true-false"
        }
      ],
      
      science: [
        {
          question: "What is the chemical formula for water?",
          options: ["H₂O", "CO₂", "NaCl", "CH₄"],
          correctAnswer: "H₂O",
          explanation: "Water consists of two hydrogen atoms bonded to one oxygen atom, hence H₂O.",
          hints: ["Think about hydrogen and oxygen", "Consider the molecular structure"],
          difficulty: 1,
          questionType: "multiple-choice"
        },
        {
          question: "What is Newton's second law of motion?",
          options: ["F = ma", "E = mc²", "v = u + at", "s = ut + ½at²"],
          correctAnswer: "F = ma",
          explanation: "Newton's second law states that Force equals mass times acceleration (F = ma).",
          hints: ["Think about force and acceleration", "Consider the relationship between mass and force"],
          difficulty: 3,
          questionType: "multiple-choice"
        },
        {
          question: "What is the speed of light in a vacuum?",
          options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "9.8 m/s²", "6.67 × 10⁻¹¹ m³/kg·s²"],
          correctAnswer: "3 × 10⁸ m/s",
          explanation: "The speed of light in a vacuum is approximately 299,792,458 meters per second, commonly approximated as 3 × 10⁸ m/s.",
          hints: ["Think about electromagnetic radiation", "Consider fundamental physical constants"],
          difficulty: 4,
          questionType: "multiple-choice"
        }
      ],
      
      general: [
        {
          question: "Which of the following is a renewable energy source?",
          options: ["Coal", "Solar", "Natural Gas", "Oil"],
          correctAnswer: "Solar",
          explanation: "Solar energy is renewable as it comes from the sun, which is a virtually inexhaustible source.",
          hints: ["Think about sources that don't run out", "Consider environmental impact"],
          difficulty: 2,
          questionType: "multiple-choice"
        },
        {
          question: "What is the primary purpose of the scientific method?",
          options: ["To prove theories correct", "To systematically investigate phenomena", "To create new technologies", "To support existing beliefs"],
          correctAnswer: "To systematically investigate phenomena",
          explanation: "The scientific method provides a systematic approach to understanding the natural world through observation, hypothesis formation, and testing.",
          hints: ["Think about systematic investigation", "Consider the process of discovery"],
          difficulty: 3,
          questionType: "multiple-choice"
        }
      ]
    };
  }

  /**
   * Initialize content validation rules
   * @private
   */
  _initializeValidationRules() {
    return {
      question: {
        minLength: 10,
        maxLength: 500,
        required: true,
        pattern: /^[A-Z].*[?.]$/  // Should start with capital and end with ? or .
      },
      options: {
        minCount: 2,
        maxCount: 6,
        minLength: 1,
        maxLength: 200,
        required: true
      },
      correctAnswer: {
        required: true,
        mustBeInOptions: true
      },
      explanation: {
        minLength: 20,
        maxLength: 1000,
        required: true
      },
      hints: {
        minCount: 0,
        maxCount: 3,
        minLength: 5,
        maxLength: 150
      }
    };
  }

  /**
   * Build prompt based on parameters
   * @private
   */
  _buildPrompt(topic, category, difficulty, questionType) {
    const template = this.promptTemplates[questionType];
    if (!template) {
      throw new Error(`Unsupported question type: ${questionType}`);
    }

    let prompt = template.base
      .replace('{topic}', topic)
      .replace('{category}', category.join(' > '))
      .replace('{difficulty}', difficulty);

    // Add category-specific instructions
    const categoryKey = this._getCategoryKey(category);
    if (template.categories && template.categories[categoryKey]) {
      prompt += '\n\nAdditional Instructions:\n' + template.categories[categoryKey];
    }

    // Add difficulty-specific adjustments
    prompt += this._getDifficultyAdjustments(difficulty);

    return prompt;
  }

  /**
   * Get category key for template lookup
   * @private
   */
  _getCategoryKey(category) {
    const categoryMap = {
      'programming': ['programming', 'coding', 'algorithms', 'data structures', 'software development', 'web development'],
      'computer-science': ['computer science', 'theoretical cs', 'computational theory', 'system design', 'software engineering'],
      'data-science': ['data science', 'machine learning', 'statistics', 'data analysis', 'artificial intelligence', 'ml', 'ai'],
      'mathematics': ['math', 'mathematics', 'algebra', 'calculus', 'geometry', 'statistics', 'probability'],
      'science': ['physics', 'chemistry', 'biology', 'science', 'natural sciences', 'life sciences']
    };

    // Check for exact matches first
    for (const [key, values] of Object.entries(categoryMap)) {
      if (values.some(val => category.some(cat => cat.toLowerCase() === val.toLowerCase()))) {
        return key;
      }
    }

    // Then check for partial matches
    for (const [key, values] of Object.entries(categoryMap)) {
      if (values.some(val => category.some(cat => cat.toLowerCase().includes(val.toLowerCase())))) {
        return key;
      }
    }
    
    return 'general';
  }

  /**
   * Get difficulty-specific prompt adjustments
   * @private
   */
  _getDifficultyAdjustments(difficulty) {
    if (difficulty <= 3) {
      return '\n\nDifficulty Level: Basic - Focus on fundamental concepts and straightforward applications.';
    } else if (difficulty <= 6) {
      return '\n\nDifficulty Level: Intermediate - Include some analysis and application of concepts.';
    } else if (difficulty <= 8) {
      return '\n\nDifficulty Level: Advanced - Require deeper understanding and complex reasoning.';
    } else {
      return '\n\nDifficulty Level: Expert - Include edge cases, advanced applications, and synthesis of multiple concepts.';
    }
  }

  /**
   * Call AI service to generate content with fallback mechanisms
   * @private
   */
  async _callAIService(prompt, params) {
    // First, try AI generation if available and healthy
    if (this.aiClient && this.aiServiceHealthy) {
      try {
        // Check AI service health periodically
        await this._checkAIServiceHealth();
        
        const response = await this.aiClient.generateCompletion(prompt, {
          temperature: this._getTemperatureForDifficulty(params.difficulty),
          maxTokens: 1500
        });
        
        const parsedResponse = JSON.parse(response);
        
        // Validate AI response structure
        if (!this._isValidAIResponse(parsedResponse)) {
          throw new Error('Invalid AI response structure');
        }
        
        // Additional content quality validation
        if (!this._validateAIContentQuality(parsedResponse, params)) {
          throw new Error('AI response failed quality validation');
        }
        
        // Log successful AI generation
        console.log(`AI question generated successfully for topic: ${params.topic}`);
        return parsedResponse;
        
      } catch (error) {
        console.error('AI service error:', error.message);
        
        // Enhanced error categorization and handling
        const errorCategory = this._categorizeAIError(error);
        
        switch (errorCategory) {
          case 'RATE_LIMIT':
            console.warn('Rate limit exceeded, implementing exponential backoff');
            this._handleRateLimitError();
            break;
          case 'TEMPORARY':
            console.warn('Temporary AI service failure, marking as unhealthy');
            this._handleTemporaryFailure();
            break;
          case 'PERMANENT':
            console.error('Permanent AI service failure, disabling AI integration');
            this._handlePermanentFailure();
            break;
          case 'CONTENT_QUALITY':
            console.warn('AI generated low-quality content, using fallback');
            break;
          default:
            console.warn('Unknown AI service error, using fallback');
        }
        
        // Fall through to fallback mechanism
        console.log(`Falling back to curated questions for topic: ${params.topic}`);
      }
    }

    // Fallback to curated questions
    return this._getFallbackQuestion(params);
  }

  /**
   * Check AI service health
   * @private
   */
  async _checkAIServiceHealth() {
    const now = Date.now();
    
    // Only check health every 5 minutes
    if (this.lastHealthCheck && (now - this.lastHealthCheck) < 300000) {
      return;
    }
    
    try {
      const isHealthy = await this.aiClient.testConnection();
      this.aiServiceHealthy = isHealthy;
      this.lastHealthCheck = now;
      
      if (!isHealthy) {
        console.warn('AI service health check failed');
      }
    } catch (error) {
      console.error('AI service health check error:', error.message);
      this.aiServiceHealthy = false;
      this.lastHealthCheck = now;
    }
  }

  /**
   * Get temperature setting based on difficulty level
   * @private
   */
  _getTemperatureForDifficulty(difficulty) {
    // Lower temperature for higher difficulty to ensure accuracy
    if (difficulty >= 8) return 0.3;
    if (difficulty >= 6) return 0.5;
    if (difficulty >= 4) return 0.7;
    return 0.8;
  }

  /**
   * Validate AI response structure
   * @private
   */
  _isValidAIResponse(response) {
    return (
      response &&
      typeof response.question === 'string' &&
      Array.isArray(response.options) &&
      typeof response.correctAnswer === 'string' &&
      typeof response.explanation === 'string' &&
      response.options.length >= 2
    );
  }

  /**
   * Check if error is temporary and should trigger fallback
   * @private
   */
  _isTemporaryFailure(error) {
    // Rate limiting, timeout, or server errors are temporary
    if (error.status) {
      return error.status === 429 || error.status >= 500;
    }
    
    // Network or timeout errors
    return error.message.includes('timeout') || 
           error.message.includes('network') ||
           error.message.includes('ECONNRESET');
  }

  /**
   * Categorize AI service errors for appropriate handling
   * @private
   */
  _categorizeAIError(error) {
    // Check for rate limiting first
    if (error.status === 429 || error.message.includes('Rate limit')) {
      return 'RATE_LIMIT';
    }
    
    // Check for authentication/authorization errors
    if (error.status && (error.status === 401 || error.status === 403) ||
        error.message.includes('Invalid API key') || error.message.includes('Unauthorized')) {
      return 'PERMANENT';
    }
    
    // Check for server errors
    if (error.status && error.status >= 500) {
      return 'TEMPORARY';
    }
    
    // Check for content quality issues
    if (error.message.includes('Invalid AI response') || 
        error.message.includes('quality validation')) {
      return 'CONTENT_QUALITY';
    }
    
    // Check for network/timeout issues
    if (error.message.includes('timeout') || 
        error.message.includes('network') ||
        error.message.includes('ECONNRESET')) {
      return 'TEMPORARY';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Handle rate limit errors with exponential backoff
   * @private
   */
  _handleRateLimitError() {
    this.aiServiceHealthy = false;
    const backoffTime = Math.min(600000, 60000 * Math.pow(2, this.rateLimitRetries || 0)); // Max 10 minutes
    
    setTimeout(() => {
      this.aiServiceHealthy = true;
      this.rateLimitRetries = 0;
      console.log('AI service re-enabled after rate limit backoff');
    }, backoffTime);
    
    this.rateLimitRetries = (this.rateLimitRetries || 0) + 1;
  }

  /**
   * Handle temporary failures
   * @private
   */
  _handleTemporaryFailure() {
    this.aiServiceHealthy = false;
    setTimeout(() => {
      this.aiServiceHealthy = true;
      console.log('AI service marked as healthy again after temporary failure');
    }, 300000); // 5 minutes
  }

  /**
   * Handle permanent failures
   * @private
   */
  _handlePermanentFailure() {
    this.aiServiceHealthy = false;
    this.aiClient = null; // Disable AI client completely
    console.error('AI service permanently disabled due to authentication/authorization failure');
  }

  /**
   * Validate AI content quality beyond basic structure
   * @private
   */
  _validateAIContentQuality(content, params) {
    // Check for minimum content quality standards
    if (content.question && content.question.length < 20) {
      return false;
    }
    
    if (content.explanation && content.explanation.length < 30) {
      return false;
    }
    
    // Check for topic relevance (basic keyword matching)
    const topicKeywords = params.topic.toLowerCase().split(' ');
    const questionText = (content.question + ' ' + content.explanation).toLowerCase();
    
    const relevanceScore = topicKeywords.filter(keyword => 
      questionText.includes(keyword)
    ).length / topicKeywords.length;
    
    if (relevanceScore < 0.3) { // At least 30% keyword overlap
      return false;
    }
    
    // Check for appropriate difficulty indicators
    if (params.difficulty >= 7) {
      // High difficulty questions should have more complex language
      const complexWords = ['analyze', 'evaluate', 'synthesize', 'compare', 'contrast', 'optimize'];
      const hasComplexity = complexWords.some(word => questionText.includes(word));
      if (!hasComplexity && content.question.length < 50) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get fallback question from curated collection
   * @private
   */
  _getFallbackQuestion(params) {
    const { topic, category, difficulty, questionType = 'multiple-choice' } = params;
    
    // Find matching fallback questions
    const categoryKey = this._getCategoryKey(category);
    const fallbackPool = this.fallbackQuestions[categoryKey] || this.fallbackQuestions.general;
    
    // Filter by difficulty range (±2 levels) and question type
    const suitableQuestions = fallbackPool.filter(q => 
      Math.abs(q.difficulty - difficulty) <= 2 &&
      q.questionType === questionType
    );
    
    if (suitableQuestions.length === 0) {
      // If no suitable questions, use any from the category with matching type
      const anyQuestions = fallbackPool.filter(q => q.questionType === questionType);
      if (anyQuestions.length > 0) {
        const selected = anyQuestions[Math.floor(Math.random() * anyQuestions.length)];
        return { ...selected, difficulty }; // Adjust difficulty to requested level
      }
      
      // If no questions of the requested type, try multiple-choice as fallback
      if (questionType !== 'multiple-choice') {
        const mcQuestions = fallbackPool.filter(q => q.questionType === 'multiple-choice');
        if (mcQuestions.length > 0) {
          const selected = mcQuestions[Math.floor(Math.random() * mcQuestions.length)];
          return { ...selected, difficulty, questionType }; // Keep original type but use MC content
        }
      }
    }
    
    // Select random question from suitable pool
    if (suitableQuestions.length > 0) {
      return suitableQuestions[Math.floor(Math.random() * suitableQuestions.length)];
    }
    
    // Ultimate fallback - generic question
    return this._getGenericFallbackQuestion(params);
  }

  /**
   * Get generic fallback question when no curated questions match
   * @private
   */
  _getGenericFallbackQuestion(params) {
    const { topic, difficulty, questionType = 'multiple-choice' } = params;
    
    if (questionType === 'true-false') {
      return {
        question: `${topic} is considered an advanced concept in its field.`,
        options: ['True', 'False'],
        correctAnswer: difficulty >= 6 ? 'True' : 'False',
        explanation: `This is a fallback true/false question about ${topic}. The complexity level depends on the context and difficulty level requested.`,
        hints: [`Consider the complexity of ${topic}`, "Think about the difficulty level"]
      };
    }
    
    return {
      question: `Which of the following best describes ${topic}?`,
      options: [
        `${topic} is a fundamental concept in this domain`,
        `${topic} is an advanced technique requiring expertise`,
        `${topic} is rarely used in practical applications`,
        `${topic} is primarily theoretical with no real applications`
      ],
      correctAnswer: difficulty <= 5 ? 
        `${topic} is a fundamental concept in this domain` :
        `${topic} is an advanced technique requiring expertise`,
      explanation: `This is a fallback question about ${topic}. For accurate, detailed questions, please ensure the AI service is properly configured.`,
      hints: [`Consider the context of ${topic}`, "Think about practical applications"]
    };
  }

  /**
   * Validate input parameters for question generation
   * @private
   */
  _validateGenerationParams(params) {
    const { topic, category, difficulty, questionType } = params;

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      throw new Error('Topic is required and must be a non-empty string');
    }

    if (!Array.isArray(category) || category.length === 0) {
      throw new Error('Category must be a non-empty array');
    }

    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) {
      throw new Error('Difficulty must be an integer between 1 and 10');
    }

    if (questionType && !this.promptTemplates[questionType]) {
      throw new Error(`Unsupported question type: ${questionType}`);
    }
  }

  /**
   * Validate generated content against rules
   * @private
   */
  _validateGeneratedContent(content, params) {
    const errors = [];

    // Validate question
    if (!this._validateField(content.question, this.validationRules.question)) {
      errors.push('Invalid question format or length');
    }

    // Validate options
    if (!Array.isArray(content.options) || 
        content.options.length < this.validationRules.options.minCount ||
        content.options.length > this.validationRules.options.maxCount) {
      errors.push('Invalid number of options');
    }

    // Validate each option
    if (content.options) {
      content.options.forEach((option, index) => {
        if (!this._validateField(option, { 
          minLength: this.validationRules.options.minLength,
          maxLength: this.validationRules.options.maxLength 
        })) {
          errors.push(`Invalid option ${index + 1}`);
        }
      });
    }

    // Validate correct answer
    if (!content.correctAnswer || !content.options?.includes(content.correctAnswer)) {
      errors.push('Correct answer must be one of the provided options');
    }

    // Validate explanation
    if (!this._validateField(content.explanation, this.validationRules.explanation)) {
      errors.push('Invalid explanation format or length');
    }

    // Validate hints (optional)
    if (content.hints && Array.isArray(content.hints)) {
      if (content.hints.length > this.validationRules.hints.maxCount) {
        errors.push('Too many hints provided');
      }
      content.hints.forEach((hint, index) => {
        if (!this._validateField(hint, {
          minLength: this.validationRules.hints.minLength,
          maxLength: this.validationRules.hints.maxLength
        })) {
          errors.push(`Invalid hint ${index + 1}`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Content validation failed: ${errors.join(', ')}`);
    }

    // Return validated and enhanced content
    return {
      ...content,
      category: params.category,
      difficulty: params.difficulty,
      questionType: params.questionType || 'multiple-choice',
      generatedAt: new Date(),
      validationScore: this._calculateValidationScore(content)
    };
  }

  /**
   * Validate individual field against rules
   * @private
   */
  _validateField(value, rules) {
    if (rules.required && (!value || value.toString().trim().length === 0)) {
      return false;
    }

    if (value) {
      const str = value.toString();
      
      if (rules.minLength && str.length < rules.minLength) {
        return false;
      }
      
      if (rules.maxLength && str.length > rules.maxLength) {
        return false;
      }
      
      if (rules.pattern && !rules.pattern.test(str)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate validation score for generated content
   * @private
   */
  _calculateValidationScore(content) {
    let score = 0.5; // Base score

    // Question quality indicators
    if (content.question && content.question.length > 50) score += 0.1;
    if (content.explanation && content.explanation.length > 100) score += 0.1;
    if (content.hints && content.hints.length > 0) score += 0.1;
    
    // Option quality
    if (content.options && content.options.length === 4) score += 0.1;
    if (content.options && content.options.every(opt => opt.length > 5)) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get available question types
   */
  getAvailableQuestionTypes() {
    return Object.keys(this.promptTemplates);
  }

  /**
   * Get prompt template for a specific question type
   */
  getPromptTemplate(questionType) {
    return this.promptTemplates[questionType];
  }

  /**
   * Check if AI service is available and healthy
   */
  isAIServiceHealthy() {
    return !!(this.aiClient && this.aiServiceHealthy);
  }

  /**
   * Get AI service status information
   */
  getAIServiceStatus() {
    return {
      hasClient: !!this.aiClient,
      isHealthy: this.aiServiceHealthy,
      lastHealthCheck: this.lastHealthCheck,
      fallbackQuestionsAvailable: Object.keys(this.fallbackQuestions).length,
      rateLimitRetries: this.rateLimitRetries || 0,
      availableCategories: Object.keys(this.fallbackQuestions),
      supportedQuestionTypes: Object.keys(this.promptTemplates)
    };
  }

  /**
   * Get detailed AI service metrics and statistics
   */
  getAIServiceMetrics() {
    const totalFallbackQuestions = Object.values(this.fallbackQuestions)
      .reduce((total, questions) => total + questions.length, 0);
    
    const categoryDistribution = {};
    Object.entries(this.fallbackQuestions).forEach(([category, questions]) => {
      categoryDistribution[category] = questions.length;
    });
    
    return {
      service: {
        hasClient: !!this.aiClient,
        isHealthy: this.aiServiceHealthy,
        lastHealthCheck: this.lastHealthCheck,
        rateLimitRetries: this.rateLimitRetries || 0
      },
      fallback: {
        totalQuestions: totalFallbackQuestions,
        categoryDistribution,
        availableCategories: Object.keys(this.fallbackQuestions)
      },
      capabilities: {
        supportedQuestionTypes: Object.keys(this.promptTemplates),
        categorySpecificPrompts: Object.keys(this.promptTemplates['multiple-choice'].categories),
        difficultyLevels: '1-10',
        temperatureAdjustment: true,
        contentValidation: true
      }
    };
  }

  /**
   * Force AI service health check
   */
  async checkAIServiceHealth() {
    if (!this.aiClient) {
      return false;
    }
    
    try {
      const isHealthy = await this.aiClient.testConnection();
      this.aiServiceHealthy = isHealthy;
      this.lastHealthCheck = Date.now();
      return isHealthy;
    } catch (error) {
      console.error('AI service health check failed:', error.message);
      this.aiServiceHealthy = false;
      this.lastHealthCheck = Date.now();
      return false;
    }
  }

  /**
   * Check if fallback questions are available
   * @returns {boolean} True if fallback questions exist
   */
  hasFallbackQuestions() {
    return Object.keys(this.fallbackQuestions).length > 0 &&
           Object.values(this.fallbackQuestions).some(categoryQuestions => 
             Array.isArray(categoryQuestions) && categoryQuestions.length > 0
           );
  }

  /**
   * Get available question types
   * @returns {string[]} Array of supported question types
   */
  getAvailableQuestionTypes() {
    return Object.keys(this.promptTemplates);
  }
}

module.exports = QuestionGenerationService;