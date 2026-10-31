const Chunk = require('../models/Chunk');
const Question = require('../models/Question');
const Groq = require('groq-sdk');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Initialize Groq AI (preferred) or fallback to Gemini
let aiClient = null;
let aiProvider = 'none';

const AI_TIMEOUT_MS = 45000;

const withTimeout = (promise, ms, name = 'AI request') =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => {
                const err = new Error(`${name} timed out after ${ms}ms`);
                err.code = 'ETIMEDOUT';
                reject(err);
            }, ms)
        )
    ]);

if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
    aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: AI_TIMEOUT_MS });
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

const generateQuestionsFromChunks = async (chunks, count, difficulty, distribution = null) => {
    try {
        const easyCount = distribution?.easy || Math.ceil(count * 0.3);
        const mediumCount = distribution?.medium || Math.ceil(count * 0.4);
        const hardCount = distribution?.hard || Math.max(0, count - easyCount - mediumCount);
        const totalCount = distribution ? (easyCount + mediumCount + hardCount) : count;

        if (!aiClient) {
            console.warn('⚠️ No AI provider configured, using content-based fallback generator');
            return generateContentBasedQuestions(chunks, count, difficulty, distribution);
        }

        // Combine chunk content capped to token budget (max 8000 characters ~ 2000 tokens)
        const context = chunks.map(c => c.content).join('\n\n');

        const prompt = `Generate EXACTLY ${totalCount} UNIQUE multiple-choice questions based on the following text.
Generate questions across ALL difficulty levels:
- ${easyCount} EASY questions (basic recall, definitions)
- ${mediumCount} MEDIUM questions (understanding, application)
- ${hardCount} HARD questions (analysis, synthesis, evaluation)

IMPORTANT: 
- Each question MUST be completely different and unique
- Questions should test understanding of the concepts in the text
- DO NOT generate questions about CSS, HTML, or web development unless that's what the text is about
- Base ALL questions on the actual content provided below
- Cover ALL major topics and concepts from the text
- Tag each question with appropriate difficulty level and topic

Text:
${context.substring(0, 8000)}

Format the output as a JSON array with EXACTLY ${totalCount} objects:
[
  {
    "question": "Unique question text based on the content above",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct option text (must match one of the options exactly)",
    "explanation": "Brief explanation of the answer",
    "difficulty": "easy|medium|hard",
    "topic": "Main topic/concept this question covers",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

Return ONLY the JSON array, no other text or markdown.`;

        let responseText = '';

        try {
            if (aiProvider === 'groq') {
                const completion = await withTimeout(
                    aiClient.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: 'llama-3.3-70b-versatile',
                        temperature: 0.7,
                        max_tokens: 4000,
                    }),
                    AI_TIMEOUT_MS,
                    'Groq AI'
                );
                responseText = completion.choices[0]?.message?.content || '';
            } else if (aiProvider === 'gemini') {
                const model = aiClient.getGenerativeModel({ model: "gemini-pro" });
                const result = await withTimeout(
                    model.generateContent(prompt),
                    AI_TIMEOUT_MS,
                    'Gemini AI'
                );
                const response = await result.response;
                responseText = response.text();
            }
        } catch (aiErr) {
            if (aiErr.code === 'ETIMEDOUT' || (aiErr.message && (aiErr.message.includes('timed out') || aiErr.message.includes('timeout')))) {
                const timeoutErr = new Error('AI question generation timed out');
                timeoutErr.code = 'ETIMEDOUT';
                throw timeoutErr;
            }
            if (aiProvider !== 'none') {
                const providerErr = new Error(`AI service failure: ${aiErr.message}`);
                providerErr.code = 'EAIFAIL';
                throw providerErr;
            }
            console.warn(`⚠️ AI call failed (${aiErr.message}), falling back to content-based generation`);
            return generateContentBasedQuestions(chunks, count, difficulty, distribution);
        }

        // Clean up markdown code blocks if present
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const questions = JSON.parse(jsonStr);

        // VALIDATE AND FIX DIFFICULTY TAGS
        questions.forEach((q, idx) => {
            // Ensure difficulty field exists
            if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
                if (idx < easyCount) {
                    q.difficulty = 'easy';
                } else if (idx < easyCount + mediumCount) {
                    q.difficulty = 'medium';
                } else {
                    q.difficulty = 'hard';
                }
            }

            // Ensure difficultyScore exists
            if (!q.difficultyScore) {
                q.difficultyScore = q.difficulty === 'easy' ? 2 :
                    q.difficulty === 'medium' ? 5 : 8;
            }

            // Ensure tags exist
            if (!q.tags || !Array.isArray(q.tags)) {
                q.tags = [q.topic || 'General'];
            }

            // Ensure topic exists
            if (!q.topic) {
                q.topic = q.tags[0] || 'General';
            }

            // Add adminApproved flag (AI questions require admin approval)
            q.adminApproved = false;
        });

        // Ensure we have the correct number of unique questions
        if (questions.length < totalCount) {
            console.warn(`AI generated only ${questions.length} questions, expected ${totalCount}. Adding content-based questions.`);
            const additionalQuestions = generateContentBasedQuestions(chunks, totalCount - questions.length, difficulty, distribution);
            return [...questions, ...additionalQuestions];
        }

        console.log(`✅ Generated ${questions.length} questions using ${aiProvider.toUpperCase()}`);

        const segregated = {
            easy: questions.filter(q => q.difficulty === 'easy'),
            medium: questions.filter(q => q.difficulty === 'medium'),
            hard: questions.filter(q => q.difficulty === 'hard'),
            all: questions.slice(0, totalCount)
        };

        return segregated;
    } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'EAIFAIL') {
            throw error;
        }
        console.error('Error generating questions with AI:', error.message);
        console.warn('Falling back to content-based question generation');
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }
};

const generateContentBasedQuestions = (chunks, count, difficulty, distribution = null) => {
    const easyCount = distribution?.easy || Math.ceil(count * 0.3);
    const mediumCount = distribution?.medium || Math.ceil(count * 0.4);
    const hardCount = distribution?.hard || Math.max(0, count - easyCount - mediumCount);
    const totalCount = distribution ? (easyCount + mediumCount + hardCount) : count;

    const questions = [];
    const combinedText = chunks.map(c => c.content).join(' ');

    // Split into sentences and clean
    const sentences = combinedText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20 && s.length < 300);

    const words = combinedText.toLowerCase().split(/\W+/);
    const wordFreq = {};
    words.forEach(word => {
        if (word.length > 4) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
    });

    const topConcepts = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(30, totalCount * 3))
        .map(([word]) => word);

    for (let i = 0; i < totalCount; i++) {
        const sentence = sentences[i % Math.max(1, sentences.length)] || `Core learning concepts and principles.`;
        const concept = topConcepts[i % Math.max(1, topConcepts.length)] || `topic_${i + 1}`;
        const keyPhrase = sentence.split(/\s+/).slice(0, 8).join(' ');

        let diff = 'medium';
        if (i < easyCount) {
            diff = 'easy';
        } else if (i < easyCount + mediumCount) {
            diff = 'medium';
        } else {
            diff = 'hard';
        }

        questions.push({
            question: `According to the material, which statement about "${concept}" is most accurate?`,
            options: [
                `${keyPhrase}...`,
                `${concept} is not discussed in the material`,
                `${concept} is only briefly mentioned`,
                `The material contradicts the importance of ${concept}`
            ],
            correctAnswer: `${keyPhrase}...`,
            explanation: `This is directly stated in the source material.`,
            difficulty: diff,
            difficultyScore: diff === 'easy' ? 2 : diff === 'medium' ? 5 : 8,
            topic: concept,
            tags: [concept],
            adminApproved: false
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
            explanation: "This is a general question based on the uploaded content.",
            difficulty: 'easy'
        });
    }
    return questions;
};

const generateQuiz = async (documentId, mode, config) => {
    // 1. Select Chunks capped to first N chunks up to token budget
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
        const basicChunks = await Chunk.find({ documentId, difficulty: 'basic' }).limit(4);
        const intermediateChunks = await Chunk.find({ documentId, difficulty: 'intermediate' }).limit(4);
        const advancedChunks = await Chunk.find({ documentId, difficulty: 'advanced' }).limit(4);
        chunks = [...basicChunks, ...intermediateChunks, ...advancedChunks];

        if (chunks.length < 5) {
            chunks = await Chunk.find({ documentId }).limit(12);
        }
    }

    if (chunks.length === 0) {
        throw new Error('No content found to generate quiz');
    }

    console.log(`📚 Generating quiz from ${chunks.length} chunks of content`);
    console.log(`🎯 Mode: ${mode}, Difficulty: ${config.difficulty}, Questions: ${config.questionCount}`);
    console.log(`🤖 AI Provider: ${aiProvider}`);

    // 2. Generate Questions
    const distribution = config.easyCount && config.mediumCount && config.hardCount
        ? { easy: config.easyCount, medium: config.mediumCount, hard: config.hardCount }
        : null;

    const questionsData = await generateQuestionsFromChunks(
        chunks,
        config.questionCount,
        config.difficulty || 'mixed',
        distribution
    );

    const questionsArray = questionsData.all || questionsData;

    return questionsArray.map((q, i) => ({
        questionId: `${Date.now()}_${i}_${Math.random().toString(36).substring(7)}`,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic || 'Custom Learning',
        difficulty: q.difficulty || config.difficulty || 'medium',
        difficultyLevel: q.difficulty || config.difficulty || 'medium',
        tags: q.tags || [q.topic || 'General'],
        difficultyScore: q.difficulty === 'easy' ? 2 : q.difficulty === 'medium' ? 5 : 8,
        adminApproved: false,
        generatedBy: 'AI',
        status: 'unanswered'
    }));
};

const parseCSVFromBuffer = (buffer) => {
    try {
        const fileContent = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer);

        // Check header row even if there are 0 or more data rows
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length > 0) {
            const headerCells = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
            const required = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'difficulty'];
            const missing = required.filter(r => !headerCells.includes(r));
            if (missing.length > 0) {
                throw new Error(`Missing required column: ${missing.join(', ')}`);
            }
        }

        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        // Validate headers from parsed records
        if (records.length > 0) {
            const headers = Object.keys(records[0]).map(h => h.toLowerCase());
            const required = ['question', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'difficulty'];
            const missing = required.filter(r => !headers.includes(r));

            if (missing.length > 0) {
                throw new Error(`Missing required column: ${missing.join(', ')}`);
            }
        }

        return records.map((record) => {
            const normalized = {};
            Object.keys(record).forEach(key => {
                normalized[key.toLowerCase()] = record[key];
            });

            return {
                question: normalized.question,
                options: [
                    normalized.optiona,
                    normalized.optionb,
                    normalized.optionc,
                    normalized.optiond
                ].filter(Boolean),
                correctAnswer: normalized.correctanswer,
                difficulty: normalized.difficulty ? normalized.difficulty.toLowerCase() : 'medium',
                difficultyLevel: normalized.difficulty ? normalized.difficulty.toLowerCase() : 'medium',
                explanation: normalized.explanation || ''
            };
        });
    } catch (error) {
        console.error('Error parsing CSV from buffer:', error.message);
        throw new Error(`Failed to parse CSV: ${error.message}`);
    }
};

const parseCSVQuestions = (filePath) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parseCSVFromBuffer(fileContent);
};

module.exports = {
    generateQuiz,
    parseCSVQuestions,
    parseCSVFromBuffer
};
