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

function getAIClient() {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here') {
        if (!aiClient || aiProvider !== 'groq') {
            aiClient = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: AI_TIMEOUT_MS });
            aiProvider = 'groq';
            console.log('✅ Using Groq AI for quiz generation');
        }
        return { client: aiClient, provider: 'groq' };
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        if (!aiClient || aiProvider !== 'gemini') {
            const { GoogleGenerativeAI } = require('@google/generative-ai');
            aiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            aiProvider = 'gemini';
            console.log('✅ Using Gemini AI for quiz generation');
        }
        return { client: aiClient, provider: 'gemini' };
    }
    return { client: null, provider: 'none' };
}

function extractQuestionsFromJson(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    // 1. Direct parse
    try {
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
    } catch { }

    // 2. Bracket slice for object { "questions": [...] }
    const firstObj = clean.indexOf('{');
    const lastObj = clean.lastIndexOf('}');
    if (firstObj !== -1 && lastObj > firstObj) {
        try {
            const obj = JSON.parse(clean.substring(firstObj, lastObj + 1));
            if (obj && Array.isArray(obj.questions)) return obj.questions;
        } catch { }
    }

    // 3. Bracket slice for array [...]
    const firstArr = clean.indexOf('[');
    const lastArr = clean.lastIndexOf(']');
    if (firstArr !== -1 && lastArr > firstArr) {
        try {
            const arr = JSON.parse(clean.substring(firstArr, lastArr + 1));
            if (Array.isArray(arr)) return arr;
        } catch { }
    }

    return null;
}

const generateQuestionsFromChunks = async (chunks, count, difficulty, distribution = null) => {
    const easyCount = distribution?.easy || Math.ceil(count * 0.3);
    const mediumCount = distribution?.medium || Math.ceil(count * 0.4);
    const hardCount = distribution?.hard || Math.max(0, count - easyCount - mediumCount);
    const totalCount = distribution ? (easyCount + mediumCount + hardCount) : count;

    const { client, provider } = getAIClient();

    if (!client || provider === 'none') {
        console.warn('⚠️ No AI provider configured, using content-based fallback generator');
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }

    // Combine chunk content capped to token budget (max 4000 characters ~ 1000 tokens for Groq TPM budget)
    const context = chunks.map(c => c.content).join('\n\n');

    const prompt = `Generate EXACTLY ${totalCount} UNIQUE multiple-choice questions based on the following text.
Generate questions across ALL difficulty levels:
- ${easyCount} EASY questions (basic recall, definitions)
- ${mediumCount} MEDIUM questions (understanding, application)
- ${hardCount} HARD questions (analysis, synthesis, evaluation)

IMPORTANT:
- Each question MUST be completely different and unique
- Base ALL questions on the actual content provided below
- Cover ALL major topics and concepts from the text
- Respond with a JSON object containing a "questions" array

Text:
${context.substring(0, 4000)}

Respond strictly in this JSON format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation",
      "difficulty": "easy",
      "topic": "Topic name",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

    let responseText = '';

    try {
        if (provider === 'groq') {
            const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
            try {
                const completion = await withTimeout(
                    client.chat.completions.create({
                        messages: [
                            { role: 'system', content: 'You are an educational assistant that outputs strictly valid JSON.' },
                            { role: 'user', content: prompt }
                        ],
                        model: groqModel,
                        temperature: 0.6,
                        max_tokens: 2500,
                        response_format: { type: 'json_object' }
                    }),
                    AI_TIMEOUT_MS,
                    'Groq AI'
                );
                responseText = completion.choices[0]?.message?.content || '';
            } catch (firstGroqErr) {
                // If rate limited or 70b failed, retry with high-throughput model (30,000 TPM)
                console.warn(`Groq ${groqModel} failed (${firstGroqErr.message}), falling back to llama-3.1-8b-instant...`);
                const completion = await withTimeout(
                    client.chat.completions.create({
                        messages: [
                            { role: 'system', content: 'You are an educational assistant that outputs strictly valid JSON.' },
                            { role: 'user', content: prompt }
                        ],
                        model: 'llama-3.1-8b-instant',
                        temperature: 0.6,
                        max_tokens: 2500,
                        response_format: { type: 'json_object' }
                    }),
                    AI_TIMEOUT_MS,
                    'Groq AI (8b)'
                );
                responseText = completion.choices[0]?.message?.content || '';
            }
        } else if (provider === 'gemini') {
            const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
            const model = client.getGenerativeModel({ model: geminiModel });
            const result = await withTimeout(
                model.generateContent(prompt),
                AI_TIMEOUT_MS,
                'Gemini AI'
            );
            const response = await result.response;
            responseText = response.text();
        }
    } catch (aiErr) {
        console.warn(`⚠️ AI generation error (${aiErr.message}), falling back to content-based generation`);
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }

    const rawQuestions = extractQuestionsFromJson(responseText);

    if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        console.warn('⚠️ Could not parse questions from AI response, falling back to content-based generation');
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }

    // VALIDATE AND FIX DIFFICULTY TAGS
    rawQuestions.forEach((q, idx) => {
        if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
            if (idx < easyCount) {
                q.difficulty = 'easy';
            } else if (idx < easyCount + mediumCount) {
                q.difficulty = 'medium';
            } else {
                q.difficulty = 'hard';
            }
        }

        if (!q.difficultyScore) {
            q.difficultyScore = q.difficulty === 'easy' ? 2 :
                q.difficulty === 'medium' ? 5 : 8;
        }

        if (!q.tags || !Array.isArray(q.tags)) {
            q.tags = [q.topic || 'General'];
        }

        if (!q.topic) {
            q.topic = q.tags[0] || 'General';
        }

        q.adminApproved = false;
    });

    if (rawQuestions.length < totalCount) {
        console.warn(`AI generated ${rawQuestions.length} questions, expected ${totalCount}. Adding content-based questions.`);
        const extra = generateContentBasedQuestions(chunks, totalCount - rawQuestions.length, difficulty, distribution);
        const extraList = extra.all || (Array.isArray(extra) ? extra : []);
        return [...rawQuestions, ...extraList].slice(0, totalCount);
    }

    console.log(`✅ Generated ${rawQuestions.length} questions using ${provider.toUpperCase()}`);

    return {
        easy: rawQuestions.filter(q => q.difficulty === 'easy'),
        medium: rawQuestions.filter(q => q.difficulty === 'medium'),
        hard: rawQuestions.filter(q => q.difficulty === 'hard'),
        all: rawQuestions.slice(0, totalCount)
    };
};

const generateContentBasedQuestions = (chunks, count, difficulty, distribution = null) => {
    const easyCount = distribution?.easy || Math.ceil(count * 0.3);
    const mediumCount = distribution?.medium || Math.ceil(count * 0.4);
    const hardCount = distribution?.hard || Math.max(0, count - easyCount - mediumCount);
    const totalCount = distribution ? (easyCount + mediumCount + hardCount) : count;

    const questions = [];
    const combinedText = (chunks || []).map(c => c.content || '').join(' ');

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

    return {
        easy: questions.filter(q => q.difficulty === 'easy'),
        medium: questions.filter(q => q.difficulty === 'medium'),
        hard: questions.filter(q => q.difficulty === 'hard'),
        all: questions
    };
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

    const { provider } = getAIClient();
    console.log(`📚 Generating quiz from ${chunks.length} chunks of content`);
    console.log(`🎯 Mode: ${mode}, Difficulty: ${config.difficulty}, Questions: ${config.questionCount}`);
    console.log(`🤖 AI Provider: ${provider}`);

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

    const questionsArray = questionsData.all || (Array.isArray(questionsData) ? questionsData : []);

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

module.exports = {
    generateQuiz,
    parseCSVFromBuffer
};
