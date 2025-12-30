const Chunk = require('../models/Chunk');
const Question = require('../models/Question');
const Groq = require('groq-sdk');

// Initialize Groq AI (preferred) or fallback to Gemini
let aiClient = null;
let aiProvider = 'none';

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
    aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    aiProvider = 'groq';
    console.log('✅ Using Groq AI for quiz generation');
} else if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    aiProvider = 'gemini';
    console.log('✅ Using Gemini AI for quiz generation');
} else {
    console.warn('⚠️ No AI API key configured. Using content-based fallback.');
}

const generateQuestionsFromChunks = async (chunks, count, difficulty) => {
    try {
        if (!aiClient) {
            console.warn('⚠️ No AI provider configured, using content-based fallback generator');
            return generateContentBasedQuestions(chunks, count, difficulty);
        }

        // Combine chunk content
        const context = chunks.map(c => c.content).join('\n\n');

        const prompt = `Generate EXACTLY ${count} UNIQUE multiple-choice questions based on the following text.
Difficulty level: ${difficulty}.

IMPORTANT: 
- Each question MUST be completely different and unique
- Questions should test understanding of the concepts in the text
- DO NOT generate questions about CSS, HTML, or web development unless that's what the text is about
- Base ALL questions on the actual content provided below

Text:
${context.substring(0, 8000)}

Format the output as a JSON array with EXACTLY ${count} objects:
[
  {
    "question": "Unique question text based on the content above",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct option text (must match one of the options exactly)",
    "explanation": "Brief explanation of the answer"
  }
]

Return ONLY the JSON array, no other text or markdown.`;

        let responseText = '';

        if (aiProvider === 'groq') {
            const completion = await aiClient.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 4000,
            });
            responseText = completion.choices[0]?.message?.content || '';
        } else if (aiProvider === 'gemini') {
            const model = aiClient.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            responseText = response.text();
        }

        // Clean up markdown code blocks if present
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const questions = JSON.parse(jsonStr);

        // Ensure we have the correct number of unique questions
        if (questions.length < count) {
            console.warn(`AI generated only ${questions.length} questions, expected ${count}. Adding content-based questions.`);
            const additionalQuestions = generateContentBasedQuestions(chunks, count - questions.length, difficulty);
            return [...questions, ...additionalQuestions];
        }

        console.log(`✅ Generated ${questions.length} questions using ${aiProvider.toUpperCase()}`);
        return questions.slice(0, count);
    } catch (error) {
        console.error('Error generating questions with AI:', error.message);
        console.warn('Falling back to content-based question generation');
        return generateContentBasedQuestions(chunks, count, difficulty);
    }
};

const generateContentBasedQuestions = (chunks, count, difficulty) => {
    const questions = [];
    const combinedText = chunks.map(c => c.content).join(' ');

    // Split into sentences and clean
    const sentences = combinedText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 200);

    if (sentences.length === 0) {
        return generateGenericQuestions(count);
    }

    // Extract key concepts (words that appear frequently and are meaningful)
    const words = combinedText.toLowerCase().split(/\W+/);
    const wordFreq = {};
    words.forEach(word => {
        if (word.length > 4) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    // Get top concepts
    const topConcepts = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, count * 3)
        .map(([word]) => word);

    // Shuffle sentences for variety
    const shuffledSentences = sentences.sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffledSentences.length); i++) {
        const sentence = shuffledSentences[i];
        const concept = topConcepts[i] || 'concept';

        // Extract a meaningful phrase from the sentence
        const words = sentence.split(/\s+/);
        const keyPhrase = words.slice(0, Math.min(8, words.length)).join(' ');

        // Create question based on the actual content
        const questionTypes = [
            {
                question: `According to the material, which statement about "${concept}" is most accurate?`,
                options: [
                    `${keyPhrase}...`,
                    `${concept} is not discussed in the material`,
                    `${concept} is only briefly mentioned`,
                    `The material contradicts the importance of ${concept}`
                ],
                correctAnswer: `${keyPhrase}...`,
                explanation: `This is directly stated in the source material.`
            },
            {
                question: `What is the significance of "${concept}" in the context of this material?`,
                options: [
                    `It is a fundamental concept explained in detail`,
                    `It is not mentioned`,
                    `It is only used as an example`,
                    `It is presented as outdated`
                ],
                correctAnswer: `It is a fundamental concept explained in detail`,
                explanation: `The term "${concept}" appears multiple times in the material, indicating its importance.`
            },
            {
                question: `Based on the text, which of the following best describes "${concept}"?`,
                options: [
                    sentence.substring(0, 80) + '...',
                    `An unrelated topic`,
                    `A deprecated approach`,
                    `A minor detail`
                ],
                correctAnswer: sentence.substring(0, 80) + '...',
                explanation: `This description is taken directly from the source material.`
            }
        ];

        const selectedType = questionTypes[i % questionTypes.length];
        questions.push(selectedType);
    }

    // If we still don't have enough, add more generic but content-aware questions
    while (questions.length < count) {
        const idx = questions.length;
        const concept = topConcepts[idx % topConcepts.length] || 'the material';

        questions.push({
            question: `Question ${idx + 1}: Which of the following is discussed in relation to ${concept}?`,
            options: [
                `Key concepts and principles related to ${concept}`,
                `${concept} is not covered`,
                `Only historical context of ${concept}`,
                `Criticism of ${concept}`
            ],
            correctAnswer: `Key concepts and principles related to ${concept}`,
            explanation: `The material covers important aspects of ${concept}.`
        });
    }

    return questions;
};

const generateGenericQuestions = (count) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push({
            question: `Question ${i + 1}: Based on the uploaded content, what is a key takeaway?`,
            options: [
                "The material covers important concepts",
                "The material is completely unrelated",
                "The material contains no useful information",
                "The material is self-contradictory"
            ],
            correctAnswer: "The material covers important concepts",
            explanation: "This is a general question based on the uploaded content."
        });
    }
    return questions;
};

const generateQuiz = async (documentId, mode, config) => {
    // 1. Select Chunks
    let chunks;
    if (mode === 'static') {
        chunks = await Chunk.find({
            documentId,
            difficulty: config.difficulty
        }).limit(10);

        if (chunks.length === 0) {
            chunks = await Chunk.find({ documentId }).limit(10);
        }
    } else {
        // Dynamic mode: Get a mix of difficulties
        const basicChunks = await Chunk.find({ documentId, difficulty: 'basic' }).limit(3);
        const intermediateChunks = await Chunk.find({ documentId, difficulty: 'intermediate' }).limit(4);
        const advancedChunks = await Chunk.find({ documentId, difficulty: 'advanced' }).limit(3);
        chunks = [...basicChunks, ...intermediateChunks, ...advancedChunks];

        if (chunks.length < 5) {
            chunks = await Chunk.find({ documentId }).limit(10);
        }
    }

    if (chunks.length === 0) {
        throw new Error('No content found to generate quiz');
    }

    console.log(`📚 Generating quiz from ${chunks.length} chunks of content`);
    console.log(`🎯 Mode: ${mode}, Difficulty: ${config.difficulty}, Questions: ${config.questionCount}`);
    console.log(`🤖 AI Provider: ${aiProvider}`);

    // 2. Generate Questions
    const questionsData = await generateQuestionsFromChunks(chunks, config.questionCount, config.difficulty || 'mixed');

    // 3. Format for Quiz Model - ensure unique IDs
    return questionsData.map((q, i) => ({
        questionId: `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: 'Custom Learning',
        difficulty: config.difficulty || 'medium',
        status: 'unanswered'
    }));
};

module.exports = {
    generateQuiz
};
