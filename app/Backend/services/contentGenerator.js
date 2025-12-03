const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Content Generator Service
 * Generates learning content using Google Gemini AI
 */
class ContentGenerator {
  constructor() {
    // Try multiple model options in order of preference
    // Using Gemini 2.5 and 2.0 models (verified working models)
    this.modelNames = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-pro'
    ];
    this.currentModelIndex = 0;
    this.model = null;
    this.initializeModel();
  }

  initializeModel() {
    const modelName = this.modelNames[this.currentModelIndex];
    console.log(`[ContentGenerator] Initializing with model: ${modelName}`);
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.warn('[ContentGenerator] GEMINI_API_KEY not properly configured');
        this.model = null;
        return;
      }
      this.model = genAI.getGenerativeModel({ model: modelName });
    } catch (error) {
      console.error(`[ContentGenerator] Failed to initialize model ${modelName}:`, error.message);
      this.model = null;
    }
  }

  async tryNextModel() {
    this.currentModelIndex++;
    if (this.currentModelIndex < this.modelNames.length) {
      console.log(`[ContentGenerator] Trying next model...`);
      this.initializeModel();
      return true;
    }
    return false;
  }

  /**
   * Get difficulty level based on day number
   */
  getDifficultyLevel(day) {
    if (day <= 7) return 'Beginner';
    if (day <= 21) return 'Intermediate';
    return 'Advanced';
  }

  /**
   * Generate text content
   */
  async generateTextContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are an expert educator creating learning content for a "${roadmap}" roadmap.

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate comprehensive text-based learning content in the following JSON format (respond ONLY with valid JSON, no markdown code blocks):

{
  "conceptExplanation": "Clear, beginner-friendly explanation of ${subtopic} with practical examples (2-3 paragraphs, 150-200 words)",
  "realWorldAnalogy": "Simple real-world analogy to explain ${subtopic}",
  "codeExamples": ["// Example 1: Basic usage\\ncode here", "// Example 2: Advanced usage\\ncode here"],
  "keyPoints": [
    "Key point 1 about ${subtopic}",
    "Key point 2 about ${subtopic}",
    "Key point 3 about ${subtopic}",
    "Key point 4 about ${subtopic}"
  ]
}

Make it concise, beginner-friendly, and actionable. Focus on ${subtopic} specifically within the context of ${topic}.`;

    return this.generateContent(prompt);
  }

  /**
   * Generate video script content
   */
  async generateVideoContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are creating video resource recommendations for a "${roadmap}" learning roadmap.

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate video recommendations in the following JSON format (respond ONLY with valid JSON, no markdown code blocks):

{
  "links": [
    {
      "title": "Beginner-friendly introduction to ${subtopic}",
      "description": "Covers the basics and fundamental concepts",
      "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(subtopic + ' tutorial')}",
      "duration": "10-15 min"
    },
    {
      "title": "Practical examples of ${subtopic}",
      "description": "Real-world applications and use cases",
      "url": "https://www.youtube.com/results?search_query=${encodeURIComponent(subtopic + ' examples')}",
      "duration": "15-20 min"
    }
  ]
}

Provide 2-3 video recommendations with realistic titles and descriptions.`;

    return this.generateContent(prompt);
  }

  /**
   * Generate audio content
   */
  async generateAudioContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are creating a podcast-style audio lesson for a "${roadmap}" learning roadmap.

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate audio content in the following JSON format (respond ONLY with valid JSON, no markdown code blocks):

{
  "script": "Write a 90-120 second conversational script explaining ${subtopic} in simple terms. Use a friendly, engaging tone as if teaching a friend. Include natural pauses marked with [pause]. Make it easy to understand with practical examples.",
  "estimatedDuration": "2-3 minutes"
}

Make it conversational and easy to listen to.`;

    return this.generateContent(prompt);
  }

  /**
   * Generate image/mindmap content
   */
  async generateImageContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are creating a mindmap structure for a "${roadmap}" learning roadmap.

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate a mindmap in the following JSON format (respond ONLY with valid JSON, no markdown code blocks):

{
  "mindmap": {
    "mainConcept": "${subtopic}",
    "subConcepts": [
      "Key concept 1",
      "Key concept 2",
      "Key concept 3",
      "Key concept 4"
    ],
    "useCases": [
      "Use case 1: Practical application",
      "Use case 2: Another application",
      "Use case 3: Real-world scenario"
    ],
    "commonMistakes": [
      "Common mistake 1 to avoid",
      "Common mistake 2 to watch out for",
      "Common mistake 3 beginners make"
    ]
  }
}

Create a comprehensive mindmap that helps visualize ${subtopic}.`;

    return this.generateContent(prompt);
  }

  /**
   * Core content generation method with improved error handling
   */
  async generateContent(prompt, retryCount = 0) {
    const maxRetries = this.modelNames.length;

    try {
      console.log(`[ContentGenerator] Generating content (attempt ${retryCount + 1}/${maxRetries})...`);

      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        throw new Error('GEMINI_API_KEY is not properly configured in environment variables');
      }

      if (!this.model) {
        throw new Error('AI model not initialized. Please check your API key configuration.');
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      console.log(`[ContentGenerator] Generated ${text.length} characters`);

      // Clean up response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Fix common JSON issues
      // Replace control characters that might break JSON parsing
      text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Parse JSON
      const content = JSON.parse(text);

      console.log(`[ContentGenerator] Successfully generated and parsed content`);
      return content;

    } catch (error) {
      console.error(`[ContentGenerator] Error with model ${this.modelNames[this.currentModelIndex]}:`, error.message);

      // If it's a model not found error and we have more models to try
      if ((error.message.includes('not found') || error.message.includes('404') || error.message.includes('models/')) && retryCount < maxRetries - 1) {
        const hasNext = await this.tryNextModel();
        if (hasNext) {
          return this.generateContent(prompt, retryCount + 1);
        }
      }

      // If JSON parsing failed, return a fallback response
      if (error.name === 'SyntaxError') {
        console.warn('[ContentGenerator] JSON parsing failed, returning fallback content');
        return this.getFallbackContent();
      }

      // For API key issues, return fallback content instead of throwing
      if (error.message.includes('API key') || error.message.includes('not properly configured')) {
        console.warn('[ContentGenerator] API key issue, returning fallback content');
        return this.getFallbackContent();
      }

      // Generic error - return fallback instead of throwing
      console.warn(`[ContentGenerator] Content generation failed: ${error.message}, returning fallback content`);
      return this.getFallbackContent();
    }
  }

  getFallbackContent() {
    return {
      conceptExplanation: "This is a placeholder explanation. The AI content generation service is currently unavailable. Please check your API configuration.",
      realWorldAnalogy: "Think of this concept like a basic building block in construction.",
      codeExamples: ["// Example code will be available when AI service is configured", "// Please check your GEMINI_API_KEY in .env file"],
      keyPoints: [
        "AI content generation is currently unavailable",
        "Please configure your GEMINI_API_KEY",
        "This is fallback content",
        "Check server logs for more details"
      ]
    };
  }

  /**
   * Main entry point - generates content based on type
   */
  async generate(params) {
    const { content_type } = params;

    console.log(`[ContentGenerator] Generating ${content_type} content for:`, {
      roadmap: params.roadmap,
      day: params.day,
      topic: params.topic,
      subtopic: params.subtopic
    });

    switch (content_type) {
      case 'text':
        return this.generateTextContent(params);
      case 'video':
        return this.generateVideoContent(params);
      case 'audio':
        return this.generateAudioContent(params);
      case 'image':
        return this.generateImageContent(params);
      default:
        throw new Error(`Invalid content_type: ${content_type}. Must be one of: text, video, audio, image`);
    }
  }
}

module.exports = new ContentGenerator();
