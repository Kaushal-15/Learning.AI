const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

/**
 * Multi-Tier Content Generator Service
 * Tier 1: Groq API (fast, free alternative)
 * Tier 2: Gemini API (if key becomes valid)
 * Tier 3: Intelligent Templates (always works)
 */
class ContentGenerator {
  constructor() {
    this.geminiModels = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    this._groqClient = null;
    this._geminiClient = null;
    this._initialized = false;
  }

  /**
   * Lazy initialization of API clients
   */
  _ensureInitialized() {
    if (this._initialized) return;

    // Initialize Groq (primary)
    const groqKey = process.env.GROQ_API_KEY;
    this._groqClient = groqKey ? new Groq({ apiKey: groqKey }) : null;

    // Initialize Gemini (secondary)
    const geminiKey = process.env.GEMINI_API_KEY;
    this._geminiClient = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

    console.log('[ContentGenerator] Initialized with:');
    console.log(`  - Groq API Key: ${groqKey ? groqKey.substring(0, 10) + '...' : 'NOT FOUND'}`);
    console.log(`  - Groq API: ${this._groqClient ? '✓ Available' : '✗ Not configured'}`);
    console.log(`  - Gemini API Key: ${geminiKey ? geminiKey.substring(0, 10) + '...' : 'NOT FOUND'}`);
    console.log(`  - Gemini API: ${this._geminiClient ? '✓ Available' : '✗ Not configured'}`);
    console.log(`  - Template Fallback: ✓ Always available`);

    this._initialized = true;
  }

  get groqClient() {
    this._ensureInitialized();
    return this._groqClient;
  }

  get geminiClient() {
    this._ensureInitialized();
    return this._geminiClient;
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
   * Generate content using Groq API
   */
  async generateWithGroq(prompt, contentType) {
    if (!this.groqClient) {
      throw new Error('Groq API not configured');
    }

    try {
      const completion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator. Always respond with valid, properly escaped JSON only. No markdown code blocks. Ensure all strings are properly escaped with backslashes for special characters like quotes and newlines.'
          },
          {
            role: 'user',
            content: prompt + '\n\nIMPORTANT: Return ONLY valid JSON. Escape all special characters in strings (quotes, newlines, backslashes).'
          }
        ],
        model: 'llama-3.3-70b-versatile', // Fast and capable model
        temperature: 0.7,
        max_tokens: 2048,
        response_format: { type: 'json_object' } // Force JSON output
      });

      const text = completion.choices[0]?.message?.content || '';
      return this.parseJSON(text);
    } catch (error) {
      console.error('[Groq] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate content using Gemini API
   */
  async generateWithGemini(prompt, contentType) {
    if (!this.geminiClient) {
      throw new Error('Gemini API not configured');
    }

    for (const modelName of this.geminiModels) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return this.parseJSON(text);
      } catch (error) {
        console.error(`[Gemini ${modelName}] Error:`, error.message);
        continue;
      }
    }

    throw new Error('All Gemini models failed');
  }

  /**
   * Parse JSON from AI response
   */
  parseJSON(text) {
    // Clean up response - remove markdown code blocks
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Find JSON object
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1) {
      let jsonText = text.substring(firstOpen, lastClose + 1);
      
      try {
        return JSON.parse(jsonText);
      } catch (error) {
        // Try to fix common JSON issues
        // Fix unescaped newlines in strings
        jsonText = jsonText.replace(/([^\\])\n/g, '$1\\n');
        
        // Fix unescaped quotes in strings (be careful not to break valid JSON)
        // This is a simple heuristic - may need refinement
        jsonText = jsonText.replace(/([^\\])"/g, (match, p1, offset) => {
          // Check if this quote is inside a string value
          const before = jsonText.substring(0, offset);
          const quoteCount = (before.match(/"/g) || []).length;
          // If odd number of quotes before, we're inside a string
          if (quoteCount % 2 === 1) {
            return p1 + '\\"';
          }
          return match;
        });
        
        try {
          return JSON.parse(jsonText);
        } catch (secondError) {
          console.error('[JSON Parse] Failed to parse even after cleanup:', secondError.message);
          console.error('[JSON Parse] Problematic text:', jsonText.substring(0, 200));
          throw new Error('Failed to parse JSON response');
        }
      }
    }

    throw new Error('No valid JSON found in response');
  }

  /**
   * Generate content with automatic fallback
   */
  async generateContent(prompt, contentType) {
    const strategies = [
      { name: 'Groq', fn: () => this.generateWithGroq(prompt, contentType) },
      { name: 'Gemini', fn: () => this.generateWithGemini(prompt, contentType) },
      { name: 'Template', fn: () => Promise.resolve(this.getTemplateContent(contentType, prompt)) }
    ];

    for (const strategy of strategies) {
      try {
        console.log(`[ContentGenerator] Trying ${strategy.name}...`);
        const result = await strategy.fn();
        console.log(`[ContentGenerator] ✓ ${strategy.name} succeeded`);
        return result;
      } catch (error) {
        console.log(`[ContentGenerator] ✗ ${strategy.name} failed: ${error.message}`);
        continue;
      }
    }

    // This should never happen since template always works
    return this.getTemplateContent(contentType, prompt);
  }

  /**
   * Get intelligent template content
   */
  getTemplateContent(contentType, prompt) {
    // Extract topic from prompt
    const topicMatch = prompt.match(/Subtopic: (.+)/);
    const topic = topicMatch ? topicMatch[1] : 'this topic';

    const roadmapMatch = prompt.match(/Roadmap: (.+)/);
    const roadmap = roadmapMatch ? roadmapMatch[1] : 'development';

    switch (contentType) {
      case 'text':
        return {
          conceptExplanation: `${topic} is a fundamental concept in ${roadmap}. It provides essential functionality that developers use regularly to build robust applications. Understanding ${topic} will help you write better code and solve complex problems more efficiently. This concept builds upon previous knowledge and serves as a foundation for more advanced topics.`,
          realWorldAnalogy: `Think of ${topic} like a Swiss Army knife in your developer toolkit - it's versatile, reliable, and you'll reach for it often. Just as a Swiss Army knife has multiple tools for different situations, ${topic} provides various capabilities that you can apply to different programming challenges.`,
          codeExamples: [
            `// Example 1: Basic ${topic} usage\n// This demonstrates the fundamental concept\nconst example = () => {\n  // Implementation here\n  console.log('Learning ${topic}');\n};\n\nexample();`,
            `// Example 2: Practical ${topic} application\n// Real-world scenario\nconst advancedExample = (data) => {\n  // Process data using ${topic}\n  return data.map(item => {\n    // Transform using ${topic} principles\n    return item;\n  });\n};`
          ],
          keyPoints: [
            `${topic} is essential for modern ${roadmap}`,
            `Understand when and how to apply ${topic} effectively`,
            `Practice with real-world examples to build proficiency`,
            `Avoid common pitfalls by following best practices`,
            `${topic} integrates well with other development concepts`
          ]
        };

      case 'video':
        const videoQueries = [
          `${topic} tutorial for beginners ${roadmap}`,
          `${topic} crash course`,
          `${topic} explained with examples`,
          `${topic} best practices`,
          `${topic} project tutorial`
        ];
        
        return {
          videoQueries,
          videos: videoQueries.map((query, index) => ({
            id: `video-${index}`,
            title: query,
            description: `Learn ${topic} through this curated video tutorial`,
            searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            embedUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`,
            query: query
          })),
          links: videoQueries.map(query => ({
            title: query,
            description: `Curated video resource for ${topic}`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            duration: '10-20 min'
          }))
        };

      case 'audio':
        return {
          title: `${topic} - Deep Dive`,
          estimatedDuration: '5-7 minutes',
          dialogue: [
            {
              speaker: 'Host',
              text: `Hey everyone! Welcome back to our ${roadmap} learning series. Today we're tackling ${topic}. This is such an exciting concept! So, what makes ${topic} so important?`
            },
            {
              speaker: 'Expert',
              text: `Great question! ${topic} is fundamental because it solves a really common problem in ${roadmap}. Think about it this way - every time you're building an application, you need reliable ways to handle certain tasks. That's exactly what ${topic} gives you.`
            },
            {
              speaker: 'Host',
              text: `Okay, so it's like having a proven solution ready to go instead of reinventing the wheel every time?`
            },
            {
              speaker: 'Expert',
              text: `Exactly! And the beauty of ${topic} is that it's not just about saving time. It's about writing code that's more maintainable, more reliable, and easier for other developers to understand. When you use ${topic} properly, you're following patterns that the entire development community recognizes.`
            },
            {
              speaker: 'Host',
              text: `That makes sense. Can you give us a real-world example of where we'd use ${topic}?`
            },
            {
              speaker: 'Expert',
              text: `Absolutely! Imagine you're building a web application. ${topic} comes into play when you need to manage data flow, handle user interactions, or organize your code structure. It's one of those concepts that once you learn it, you'll see opportunities to use it everywhere.`
            },
            {
              speaker: 'Host',
              text: `Love it! So what's the best way for our listeners to start practicing ${topic}?`
            },
            {
              speaker: 'Expert',
              text: `Start small. Build a simple project that focuses specifically on ${topic}. Don't try to learn everything at once. Master the basics first, then gradually add complexity. And most importantly, experiment! Break things, fix them, and learn from the process.`
            },
            {
              speaker: 'Host',
              text: `Perfect advice! Thanks for breaking down ${topic} for us today. Remember everyone, practice makes perfect. Keep coding, keep learning, and we'll see you in the next episode!`
            }
          ],
          key_points: [
            `${topic} is a fundamental concept in ${roadmap}`,
            `It provides proven solutions to common development challenges`,
            `Using ${topic} makes code more maintainable and reliable`,
            `Start with simple projects and gradually increase complexity`,
            `Practice and experimentation are key to mastery`
          ]
        };

      case 'image':
        return {
          mainConcept: topic,
          subConcepts: [
            `Core ${topic} principles`,
            `Practical ${topic} applications`,
            `${topic} best practices`,
            `Common ${topic} patterns`,
            `Advanced ${topic} techniques`
          ],
          useCases: [
            `Building scalable ${roadmap} applications`,
            `Solving complex development challenges`,
            `Improving code quality and maintainability`,
            `Optimizing application performance`
          ],
          commonMistakes: [
            `Misunderstanding ${topic} fundamentals`,
            `Overcomplicating simple ${topic} implementations`,
            `Not following ${topic} best practices`,
            `Ignoring ${topic} performance implications`
          ]
        };

      case 'flashcards':
        return {
          flashcards: [
            {
              id: 'card-1',
              front: `What is ${topic}?`,
              back: `${topic} is a fundamental concept in ${roadmap} that helps developers build better applications. It provides structure and best practices for common development challenges.`,
              category: 'definition',
              difficulty: 'beginner'
            },
            {
              id: 'card-2',
              front: `Why is ${topic} important in ${roadmap}?`,
              back: `${topic} is important because it improves code quality, maintainability, and follows industry best practices. It's widely used in production applications.`,
              category: 'concepts',
              difficulty: 'beginner'
            },
            {
              id: 'card-3',
              front: `When should you use ${topic}?`,
              back: `Use ${topic} when building scalable applications, following best practices, or solving common development challenges in ${roadmap}.`,
              category: 'application',
              difficulty: 'intermediate'
            },
            {
              id: 'card-4',
              front: `What are the key benefits of ${topic}?`,
              back: `Key benefits include: improved code organization, better maintainability, enhanced performance, and following industry standards.`,
              category: 'concepts',
              difficulty: 'intermediate'
            },
            {
              id: 'card-5',
              front: `What are common mistakes when using ${topic}?`,
              back: `Common mistakes include: overcomplicating implementations, ignoring best practices, not understanding fundamentals, and improper usage patterns.`,
              category: 'best-practices',
              difficulty: 'intermediate'
            },
            {
              id: 'card-6',
              front: `How does ${topic} improve code quality?`,
              back: `${topic} improves code quality by providing structure, enforcing best practices, making code more readable, and easier to maintain and test.`,
              category: 'concepts',
              difficulty: 'intermediate'
            },
            {
              id: 'card-7',
              front: `What are real-world applications of ${topic}?`,
              back: `${topic} is used in web applications, mobile apps, enterprise systems, and modern software development across various industries.`,
              category: 'application',
              difficulty: 'intermediate'
            },
            {
              id: 'card-8',
              front: `How do you get started with ${topic}?`,
              back: `Start by understanding the fundamentals, practice with simple examples, build small projects, and gradually increase complexity while following best practices.`,
              category: 'application',
              difficulty: 'beginner'
            }
          ],
          totalCards: 8,
          categories: ['definition', 'concepts', 'application', 'best-practices'],
          estimatedStudyTime: '15-20 minutes'
        };

      case 'full_module':
        return {
          title: topic,
          oneLineSummary: `Master ${topic} - a fundamental concept in ${roadmap}`,
          difficulty: 'intermediate',
          overview: `${topic} is an essential concept in modern ${roadmap}. This comprehensive module will take you from basics to advanced applications, ensuring you understand not just how to use ${topic}, but when and why to use it effectively.`,
          whyItMatters: `Understanding ${topic} is crucial for any developer working in ${roadmap}. It's used in countless real-world applications and is a skill that employers actively look for. Mastering ${topic} will make you a more effective and valuable developer.`,
          prerequisites: [
            `Basic understanding of ${roadmap}`,
            'Familiarity with programming fundamentals',
            'Willingness to practice and experiment'
          ],
          fullLesson: {
            explanation: `${topic} represents a core concept that every ${roadmap} developer should master. At its heart, ${topic} provides a structured way to solve common development challenges. By understanding ${topic}, you'll be able to write cleaner, more efficient code that's easier to maintain and scale.`,
            stepByStepBreakdown: [
              `Understand what ${topic} is and why it exists`,
              `Learn the fundamental principles of ${topic}`,
              `See ${topic} in action with practical examples`,
              `Practice implementing ${topic} yourself`,
              `Apply ${topic} to real-world scenarios`,
              `Master advanced ${topic} techniques`
            ],
            realLifeExamples: [
              `Using ${topic} in web application development`,
              `Applying ${topic} to solve data management challenges`,
              `Leveraging ${topic} for better code organization`,
              `Implementing ${topic} in production systems`
            ],
            analogies: [
              `${topic} is like a blueprint for building - it provides structure and guidance`,
              `Think of ${topic} as a recipe - it gives you proven steps to achieve consistent results`,
              `${topic} works like a Swiss Army knife - versatile and reliable for many situations`
            ],
            commonMisconceptions: [
              `${topic} is not just theoretical - it has immediate practical applications`,
              `You don't need to memorize everything - understanding the concepts is more important`,
              `${topic} isn't overly complex - start simple and build up gradually`
            ]
          },
          mindmap: {
            mainConcept: topic,
            subConcepts: [
              'Fundamentals',
              'Practical Applications',
              'Best Practices',
              'Common Patterns',
              'Advanced Techniques'
            ],
            useCases: [
              'Web Development',
              'Application Architecture',
              'Code Organization',
              'Performance Optimization'
            ],
            commonMistakes: [
              'Overcomplicating implementations',
              'Ignoring best practices',
              'Not practicing enough'
            ]
          },
          imageIdeas: [
            {
              title: `${topic} Concept Diagram`,
              description: `Visual representation of ${topic} architecture and flow`,
              prompt: `Create an educational diagram showing ${topic} in ${roadmap}`
            }
          ],
          videoQueries: [
            `${topic} tutorial ${roadmap}`,
            `${topic} best practices`,
            `${topic} real-world examples`
          ],
          videoLinks: [
            {
              title: `${topic} Complete Guide`,
              description: `Comprehensive tutorial covering all aspects of ${topic}`,
              url: `https://www.youtube.com/results?search_query=${encodeURIComponent(topic + ' tutorial')}`,
              duration: '20-30 min'
            }
          ],
          videoScript: {
            sceneBreakdown: [
              { scene: 'Intro', description: `Introduction to ${topic}` },
              { scene: 'Concepts', description: `Core ${topic} principles` },
              { scene: 'Examples', description: `Practical demonstrations` }
            ],
            finalScript: `Welcome! Today we're learning ${topic}, a crucial concept in ${roadmap}. Let's explore how it works and why it matters.`
          },
          audioScript: `Welcome to this deep dive on ${topic}. This is one of the most important concepts you'll learn in ${roadmap}. Let's break it down together and see how you can apply it in your projects.`,
          flashcards: [
            { front: `What is ${topic}?`, back: `A fundamental concept in ${roadmap} used for solving common development challenges` },
            { front: `Why is ${topic} important?`, back: `It provides structure, improves code quality, and is widely used in production applications` },
            { front: `When should you use ${topic}?`, back: `When building scalable applications and following best practices` },
            { front: `How do you learn ${topic}?`, back: `Start with basics, practice with examples, build projects, and experiment` },
            { front: `What are common ${topic} mistakes?`, back: `Overcomplicating, ignoring best practices, and not practicing enough` }
          ],
          studyPlan: [
            {
              day: 'Day 1',
              tasks: [
                `Read about ${topic} fundamentals`,
                `Watch introductory video`,
                `Try basic ${topic} examples`
              ]
            },
            {
              day: 'Day 2',
              tasks: [
                `Practice ${topic} implementations`,
                `Build a simple project`,
                `Review best practices`
              ]
            },
            {
              day: 'Day 3',
              tasks: [
                `Work on advanced ${topic} concepts`,
                `Complete a real-world project`,
                `Review and reflect on learning`
              ]
            }
          ]
        };

      default:
        return {
          error: 'Unknown content type',
          message: 'Please use: text, video, audio, image, or full_module'
        };
    }
  }

  /**
   * Generate text content
   */
  async generateTextContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are an expert educator creating learning content for "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate comprehensive text-based learning content in JSON format:

{
  "conceptExplanation": "Clear explanation of ${subtopic} with practical examples (150-200 words)",
  "realWorldAnalogy": "Simple real-world analogy to explain ${subtopic}",
  "codeExamples": ["// Example 1\\ncode here", "// Example 2\\ncode here"],
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"]
}

Respond ONLY with valid JSON, no markdown.`;

    return this.generateContent(prompt, 'text');
  }

  /**
   * Generate video content with YouTube search
   */
  async generateVideoContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `Create 3-5 specific YouTube search queries for learning "${subtopic}" in "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate JSON with specific, searchable video queries:

{
  "videoQueries": [
    "${subtopic} tutorial for beginners",
    "${subtopic} crash course",
    "${subtopic} explained with examples",
    "${subtopic} best practices",
    "${subtopic} project tutorial"
  ]
}

Make queries specific and likely to find quality educational content. Respond ONLY with valid JSON.`;

    const content = await this.generateContent(prompt, 'video');

    // Generate video links with proper YouTube search URLs
    if (content && content.videoQueries) {
      content.videos = content.videoQueries.map((query, index) => ({
        id: `video-${index}`,
        title: query,
        description: `Learn ${subtopic} through this curated video tutorial`,
        searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        embedUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`,
        query: query
      }));
      
      // Keep links for backward compatibility
      content.links = content.videos.map(v => ({
        title: v.title,
        description: v.description,
        url: v.searchUrl,
        duration: '10-20 min'
      }));
    }

    return content;
  }

  /**
   * Generate audio content
   */
  async generateAudioContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `Create a podcast-style dialogue about "${subtopic}" for "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate JSON with Host and Expert dialogue:

{
  "title": "${subtopic} - Deep Dive",
  "estimatedDuration": "3-5 minutes",
  "dialogue": [
    {"speaker": "Host", "text": "Welcome! Today we're learning about ${subtopic}..."},
    {"speaker": "Expert", "text": "Thanks! ${subtopic} is important because..."}
  ],
  "key_points": ["Point 1", "Point 2"]
}

Create 8-10 dialogue turns. Respond ONLY with valid JSON.`;

    return this.generateContent(prompt, 'audio');
  }

  /**
   * Generate image/mindmap content
   */
  async generateImageContent(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `Create a mindmap for "${subtopic}" in "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate JSON:

{
  "mainConcept": "${subtopic}",
  "subConcepts": ["Concept 1", "Concept 2", "Concept 3", "Concept 4"],
  "useCases": ["Use case 1", "Use case 2"],
  "commonMistakes": ["Mistake 1", "Mistake 2"]
}

Respond ONLY with valid JSON.`;

    return this.generateContent(prompt, 'image');
  }

  /**
   * Generate flashcards for spaced repetition learning
   */
  async generateFlashcards(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `Create educational flashcards for "${subtopic}" in "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate 8-12 flashcards covering key concepts, definitions, examples, and best practices.

JSON format:

{
  "flashcards": [
    {
      "id": "card-1",
      "front": "What is ${subtopic}?",
      "back": "Clear, concise answer with key points",
      "category": "definition",
      "difficulty": "${difficulty.toLowerCase()}"
    },
    {
      "id": "card-2",
      "front": "When should you use ${subtopic}?",
      "back": "Practical use cases and scenarios",
      "category": "application",
      "difficulty": "${difficulty.toLowerCase()}"
    },
    {
      "id": "card-3",
      "front": "What are the key benefits of ${subtopic}?",
      "back": "List of main advantages",
      "category": "concepts",
      "difficulty": "${difficulty.toLowerCase()}"
    }
  ],
  "totalCards": 10,
  "categories": ["definition", "application", "concepts", "examples", "best-practices"],
  "estimatedStudyTime": "15-20 minutes"
}

Create diverse questions covering:
- Definitions and core concepts
- Practical applications and use cases
- Code examples and syntax
- Best practices and common pitfalls
- Real-world scenarios

Respond ONLY with valid JSON.`;

    return this.generateContent(prompt, 'flashcards');
  }

  /**
   * Generate full learning module
   */
  async generateFullModule(params) {
    const { roadmap, day, topic, subtopic } = params;
    const difficulty = this.getDifficultyLevel(day);

    const prompt = `You are ANTIGRAVITY - an advanced Learning Intelligence Engine.

Generate a complete learning module for "${subtopic}" in "${roadmap}".

Context:
- Roadmap: ${roadmap}
- Day: ${day} (${difficulty} level)
- Main Topic: ${topic}
- Subtopic: ${subtopic}

Generate comprehensive JSON with ALL these fields:

{
  "title": "${subtopic}",
  "oneLineSummary": "Brief summary",
  "difficulty": "${difficulty.toLowerCase()}",
  "overview": "Overview text",
  "whyItMatters": "Why this matters",
  "prerequisites": ["Prerequisite 1"],
  "fullLesson": {
    "explanation": "Detailed explanation",
    "stepByStepBreakdown": ["Step 1", "Step 2"],
    "realLifeExamples": ["Example 1"],
    "analogies": ["Analogy 1"],
    "commonMisconceptions": ["Misconception 1"]
  },
  "mindmap": {
    "mainConcept": "${subtopic}",
    "subConcepts": ["Concept 1"],
    "useCases": ["Use 1"],
    "commonMistakes": ["Mistake 1"]
  },
  "videoQueries": ["Query 1", "Query 2"],
  "videoScript": {
    "sceneBreakdown": [{"scene": "Intro", "description": "Intro"}],
    "finalScript": "Script text"
  },
  "audioScript": "Audio script",
  "flashcards": [{"front": "Q", "back": "A"}],
  "studyPlan": [{"day": "Day 1", "tasks": ["Task 1"]}]
}

Respond ONLY with valid JSON.`;

    const content = await this.generateContent(prompt, 'full_module');

    // Add video links
    if (content && content.videoQueries) {
      content.videoLinks = content.videoQueries.map(query => ({
        title: query,
        description: `Curated video resource for ${query}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        duration: '10-20 min'
      }));
    }

    return content;
  }

  /**
   * Main entry point
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
      case 'flashcards':
        return this.generateFlashcards(params);
      case 'full_module':
        return this.generateFullModule(params);
      default:
        throw new Error(`Invalid content_type: ${content_type}`);
    }
  }
}

module.exports = new ContentGenerator();
