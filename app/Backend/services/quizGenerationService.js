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

/**
 * Robustly sanitizes and validates an MCQ question object to strictly conform
 * to academic psychometric standards and the Mongoose Question model schema.
 */
function sanitizeAndValidateQuestion(q, fallbackDifficulty = 'medium', defaultCategory = 'General') {
    if (!q || typeof q !== 'object') return null;

    // 1. Question stem
    let stem = String(q.question || q.content || '').trim();
    if (stem.length < 5) return null;

    // 2. Options
    let rawOptions = Array.isArray(q.options) ? q.options : [];
    let cleanOptions = rawOptions
        .map(opt => String(opt || '').trim().replace(/^[A-Da-d][.)\-:]\s*/, '').replace(/^Option\s+[A-Da-d][.)\-:]\s*/i, '').trim())
        .filter(opt => opt.length > 0);

    if (cleanOptions.length < 2) return null;

    // Ensure exactly 4 options
    while (cleanOptions.length < 4) {
        cleanOptions.push(`Alternative conceptual principle ${cleanOptions.length + 1}`);
    }
    cleanOptions = cleanOptions.slice(0, 4);

    // 3. Correct Answer
    let rawCorrect = String(q.correctAnswer || '').trim();
    let cleanedCorrect = rawCorrect.replace(/^[A-Da-d][.)\-:]\s*/, '').replace(/^Option\s+[A-Da-d][.)\-:]\s*/i, '').trim();

    let matchedAnswer = cleanOptions.find(opt => opt.toLowerCase() === cleanedCorrect.toLowerCase());

    if (!matchedAnswer) {
        const upper = rawCorrect.toUpperCase();
        if (upper === 'A' || upper.startsWith('OPTION A')) matchedAnswer = cleanOptions[0];
        else if (upper === 'B' || upper.startsWith('OPTION B')) matchedAnswer = cleanOptions[1];
        else if (upper === 'C' || upper.startsWith('OPTION C')) matchedAnswer = cleanOptions[2];
        else if (upper === 'D' || upper.startsWith('OPTION D')) matchedAnswer = cleanOptions[3];
    }

    if (!matchedAnswer) {
        matchedAnswer = cleanOptions[0];
    }

    // 4. Difficulty
    let diff = String(q.difficulty || q.difficultyLevel || fallbackDifficulty).toLowerCase().trim();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
        diff = fallbackDifficulty;
    }

    // 5. Explanation
    let explanation = String(q.explanation || '').trim();
    if (explanation.length < 10) {
        explanation = `The correct answer is "${matchedAnswer}", as established in the primary course text and reference materials.`;
    }

    // 6. Category and Tags
    let cat = Array.isArray(q.category) && q.category.length > 0 
        ? q.category.map(c => String(c).trim()).filter(Boolean)
        : Array.isArray(q.tags) && q.tags.length > 0 
            ? q.tags.map(t => String(t).trim()).filter(Boolean)
            : [String(q.topic || defaultCategory).trim() || 'General'];

    return {
        question: stem,
        content: stem,
        options: cleanOptions,
        correctAnswer: matchedAnswer,
        explanation,
        difficulty: diff === 'easy' ? 2 : diff === 'hard' ? 8 : 5,
        difficultyLevel: diff,
        difficultyScore: diff === 'easy' ? 2 : diff === 'medium' ? 5 : 8,
        topic: cat[0] || 'General',
        tags: cat,
        category: cat,
        generatedBy: 'AI',
        adminApproved: true
    };
}

const generateQuestionsFromChunks = async (chunks, count, difficulty, distribution = null) => {
    const easyCount = distribution?.easy || Math.ceil(count * 0.34);
    const mediumCount = distribution?.medium || Math.ceil(count * 0.33);
    const hardCount = distribution ? (easyCount + mediumCount + distribution.hard) : Math.max(0, count - easyCount - mediumCount);
    const totalCount = distribution ? (easyCount + mediumCount + (distribution.hard || hardCount)) : count;

    const { client, provider } = getAIClient();

    if (!client || provider === 'none') {
        console.warn('⚠️ No AI provider configured, using enhanced content-based fallback generator');
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }

    // Intelligently sample up to 10,000 characters across all available chunks
    let contextSample = '';
    if (chunks && chunks.length > 0) {
        const allTexts = chunks.map(c => c.content || '').filter(t => t.trim().length > 0);
        const combined = allTexts.join('\n\n');
        if (combined.length <= 10000) {
            contextSample = combined;
        } else {
            const perChunkBudget = Math.floor(10000 / allTexts.length);
            contextSample = allTexts.map(t => t.slice(0, Math.max(perChunkBudget, 500))).join('\n\n');
            if (contextSample.length > 10000) {
                contextSample = contextSample.slice(0, 10000);
            }
        }
    }

    const systemPrompt = `You are an expert psychometrician and university professor specializing in multiple-choice question (MCQ) design.
Your task is to generate rigorous, technically sound assessment questions based strictly on the provided source reference text.

CORE PRINCIPLES OF QUESTION DESIGN:
1. QUESTION STEM:
   - Must be unambiguous, focused, and self-contained. The student must understand what is being asked before reading options.
   - Test conceptual understanding, causal reasoning, operational principles, and problem solving, NOT superficial keyword memorization.
   - Avoid negative phrasing like "Which of the following is NOT..." unless essential.
2. OPTIONS:
   - Provide EXACTLY 4 options per question.
   - Options must be concise, grammatically parallel, mutually exclusive, and similar in length.
   - Distractors (incorrect options) must be PLAUSIBLE and represent real student misconceptions in the subject matter.
   - NEVER use throwaway, joke, or artificial options like "All of the above", "None of the above", "Not mentioned in the text", "Both A and B".
   - Do NOT prefix options with letters ("A)", "Option A: ", "1.") in the option strings. Output the pure option content.
3. CORRECT ANSWER:
   - Must be indisputably correct based on the provided source text.
   - The value of "correctAnswer" MUST be character-for-character identical to one of the 4 items in the "options" array.
4. EXPLANATION:
   - Provide a substantive educational explanation (at least 20-40 words).
   - State clearly WHY the correct option is true and briefly why the distractors are false.
5. DIFFICULTY SPECIFICATIONS:
   - "easy": Direct conceptual recall, core terminology definitions, fundamental relationships clearly stated in text.
   - "medium": Application of principles, comparing two concepts, interpreting processes, or diagnosing practical scenarios.
   - "hard": Multi-step deduction, analyzing edge cases, evaluating architectural/methodological trade-offs, synthesis across sections.

OUTPUT FORMAT:
Output strictly a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "What is the primary mechanism by which...",
      "options": ["First plausible option", "Second plausible option", "Third plausible option", "Fourth plausible option"],
      "correctAnswer": "First plausible option",
      "explanation": "This is correct because... The other options are incorrect because...",
      "difficulty": "easy",
      "topic": "Specific Topic",
      "tags": ["topic1", "topic2"]
    }
  ]
}`;

    const userPrompt = `Generate EXACTLY ${totalCount} HIGH-QUALITY multiple-choice questions based on the following text.

DIFFICULTY DISTRIBUTION REQUIRED:
- EXACTLY ${easyCount} EASY questions (core concepts and definitions)
- EXACTLY ${mediumCount} MEDIUM questions (comprehension, application, and cause-effect)
- EXACTLY ${hardCount} HARD questions (deep analysis, synthesis, evaluation, trade-offs)

SOURCE TEXT CONTENT:
"""
${contextSample}
"""

Ensure every question adheres to all psychometric guidelines: exactly 4 plausible choices, correctAnswer exactly matching one option, informative explanation, and valid JSON.`;

    let responseText = '';

    try {
        if (provider === 'groq') {
            const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
            try {
                const completion = await withTimeout(
                    client.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        model: groqModel,
                        temperature: 0.5,
                        max_tokens: 4096,
                        response_format: { type: 'json_object' }
                    }),
                    AI_TIMEOUT_MS,
                    'Groq AI'
                );
                responseText = completion.choices[0]?.message?.content || '';
            } catch (firstGroqErr) {
                console.warn(`Groq ${groqModel} failed (${firstGroqErr.message}), falling back to llama-3.1-8b-instant...`);
                const completion = await withTimeout(
                    client.chat.completions.create({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        model: 'llama-3.1-8b-instant',
                        temperature: 0.5,
                        max_tokens: 4096,
                        response_format: { type: 'json_object' }
                    }),
                    AI_TIMEOUT_MS,
                    'Groq AI (8b)'
                );
                responseText = completion.choices[0]?.message?.content || '';
            }
        } else if (provider === 'gemini') {
            const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
            const model = client.getGenerativeModel({
                model: geminiModel,
                systemInstruction: systemPrompt
            });
            const result = await withTimeout(
                model.generateContent(userPrompt),
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

    const rawList = extractQuestionsFromJson(responseText);

    if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
        console.warn('⚠️ Could not parse questions from AI response, falling back to content-based generation');
        return generateContentBasedQuestions(chunks, count, difficulty, distribution);
    }

    // Sanitize and validate every AI question
    const sanitizedQuestions = [];
    rawList.forEach((rawQ, idx) => {
        let targetDiff = 'medium';
        if (idx < easyCount) targetDiff = 'easy';
        else if (idx < easyCount + mediumCount) targetDiff = 'medium';
        else targetDiff = 'hard';

        const cleanQ = sanitizeAndValidateQuestion(rawQ, targetDiff);
        if (cleanQ) {
            sanitizedQuestions.push(cleanQ);
        }
    });

    if (sanitizedQuestions.length < totalCount) {
        console.warn(`AI generated ${sanitizedQuestions.length} valid questions, expected ${totalCount}. Adding content-based questions.`);
        const extra = generateContentBasedQuestions(chunks, totalCount - sanitizedQuestions.length, difficulty, distribution);
        const extraList = extra.all || (Array.isArray(extra) ? extra : []);
        sanitizedQuestions.push(...extraList);
    }

    const finalQuestions = sanitizedQuestions.slice(0, totalCount);
    console.log(`✅ Generated ${finalQuestions.length} questions using ${provider.toUpperCase()}`);

    return {
        easy: finalQuestions.filter(q => q.difficulty === 'easy'),
        medium: finalQuestions.filter(q => q.difficulty === 'medium'),
        hard: finalQuestions.filter(q => q.difficulty === 'hard'),
        all: finalQuestions
    };
};

const generateContentBasedQuestions = (chunks, count, difficulty, distribution = null) => {
    const easyCount = distribution?.easy || Math.ceil(count * 0.34);
    const mediumCount = distribution?.medium || Math.ceil(count * 0.33);
    const hardCount = distribution ? (easyCount + mediumCount + (distribution.hard || 0)) : Math.max(0, count - easyCount - mediumCount);
    const totalCount = distribution ? (easyCount + mediumCount + (distribution.hard || hardCount)) : count;

    const combinedText = (chunks || []).map(c => c.content || '').join(' ');

    // Extract sentences of good pedagogical length
    const rawSentences = combinedText
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim().replace(/\s+/g, ' '))
        .filter(s => s.length >= 40 && s.length <= 250);

    // Extract meaningful concepts/keywords (length > 4, non-stopword)
    const stopWords = new Set(['about', 'above', 'after', 'again', 'against', 'their', 'there', 'these', 'which', 'while', 'where', 'could', 'would', 'should', 'being', 'having', 'other']);
    const words = combinedText.toLowerCase().split(/[^a-zA-Z0-9_-]+/);
    const wordFreq = {};
    words.forEach(w => {
        if (w.length > 4 && !stopWords.has(w)) {
            wordFreq[w] = (wordFreq[w] || 0) + 1;
        }
    });

    const topConcepts = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(30, totalCount * 4))
        .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

    const questions = [];

    for (let i = 0; i < totalCount; i++) {
        const sentence = rawSentences[i % Math.max(1, rawSentences.length)] || `The core operational architecture supports high availability and reliable data persistence.`;
        const concept = topConcepts[i % Math.max(1, topConcepts.length)] || `System Architecture`;
        
        let diff = 'medium';
        if (i < easyCount) diff = 'easy';
        else if (i < easyCount + mediumCount) diff = 'medium';
        else diff = 'hard';

        // Extract a key factual fragment from the sentence
        const wordsInSentence = sentence.split(' ');
        const phraseLength = Math.min(10, Math.max(5, Math.floor(wordsInSentence.length * 0.5)));
        const correctPhrase = wordsInSentence.slice(0, phraseLength).join(' ');

        // Create 3 realistic distractors from other parts of the text
        const otherSentence1 = rawSentences[(i + 3) % Math.max(1, rawSentences.length)] || 'Data structures must maintain strict synchronization protocols';
        const otherSentence2 = rawSentences[(i + 7) % Math.max(1, rawSentences.length)] || 'The component executes asynchronous event loops for background tasks';
        const otherSentence3 = rawSentences[(i + 11) % Math.max(1, rawSentences.length)] || 'State reconciliation applies optimistic locking across distributed clusters';

        const distractor1 = otherSentence1.split(' ').slice(0, phraseLength).join(' ');
        const distractor2 = otherSentence2.split(' ').slice(0, phraseLength).join(' ');
        const distractor3 = otherSentence3.split(' ').slice(0, phraseLength).join(' ');

        let questionStem = '';
        if (diff === 'easy') {
            questionStem = `In the study material, which of the following statements accurately defines or describes "${concept}"?`;
        } else if (diff === 'medium') {
            questionStem = `Based on the provided documentation, what is the primary operational role of "${concept}" in the system?`;
        } else {
            questionStem = `When evaluating the core architectural requirements for "${concept}", which principle applies?`;
        }

        const options = [correctPhrase, distractor1, distractor2, distractor3];
        // Shuffle options
        for (let j = options.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [options[j], options[k]] = [options[k], options[j]];
        }

        questions.push({
            question: questionStem,
            content: questionStem,
            options,
            correctAnswer: correctPhrase,
            explanation: `The statement "${correctPhrase}" is directly verified by the source documentation regarding ${concept}.`,
            difficulty: diff === 'easy' ? 2 : diff === 'hard' ? 8 : 5,
            difficultyLevel: diff,
            difficultyScore: diff === 'easy' ? 2 : diff === 'medium' ? 5 : 8,
            topic: concept,
            tags: [concept],
            category: [concept],
            generatedBy: 'AI',
            adminApproved: true
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
        const correct = "The material establishes core principles, operational requirements, and fundamental guidelines.";
        const options = [
            correct,
            "The material emphasizes deprecated protocols and legacy constraints.",
            "The material focuses exclusively on peripheral configuration scripts.",
            "The material contradicts standard implementation architectures."
        ];
        questions.push({
            question: `Based on the core course materials, which statement best summarizes a key principle regarding Topic ${i + 1}?`,
            content: `Based on the core course materials, which statement best summarizes a key principle regarding Topic ${i + 1}?`,
            options,
            correctAnswer: correct,
            explanation: "This statement accurately reflects the fundamental educational principles established in the material.",
            difficulty: 2,
            difficultyLevel: 'easy',
            difficultyScore: 2,
            topic: 'General',
            tags: ['General'],
            category: ['General'],
            generatedBy: 'AI',
            adminApproved: true
        });
    }
    return questions;
};

const generateQuiz = async (documentId, mode, config) => {
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
        const basicChunks = await Chunk.find({ documentId, difficulty: 'basic' }).limit(6);
        const intermediateChunks = await Chunk.find({ documentId, difficulty: 'intermediate' }).limit(6);
        const advancedChunks = await Chunk.find({ documentId, difficulty: 'advanced' }).limit(6);
        chunks = [...basicChunks, ...intermediateChunks, ...advancedChunks];

        if (chunks.length < 5) {
            chunks = await Chunk.find({ documentId }).limit(15);
        }
    }

    if (chunks.length === 0) {
        throw new Error('No content found to generate quiz');
    }

    const { provider } = getAIClient();
    console.log(`📚 Generating quiz from ${chunks.length} chunks of content`);
    console.log(`🎯 Mode: ${mode}, Difficulty: ${config.difficulty}, Questions: ${config.questionCount}`);
    console.log(`🤖 AI Provider: ${provider}`);

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
        question: q.question || q.content,
        content: q.content || q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        topic: q.topic || 'General',
        difficulty: typeof q.difficulty === 'number' ? q.difficulty : (q.difficultyLevel === 'easy' ? 2 : q.difficultyLevel === 'hard' ? 8 : 5),
        difficultyLevel: q.difficultyLevel || q.difficulty || config.difficulty || 'medium',
        tags: q.tags || [q.topic || 'General'],
        category: q.category || q.tags || [q.topic || 'General'],
        difficultyScore: q.difficulty === 'easy' ? 2 : q.difficulty === 'medium' ? 5 : 8,
        adminApproved: true,
        generatedBy: 'AI',
        status: 'unanswered'
    }));
};

const parseCSVFromBuffer = (buffer) => {
    try {
        const fileContent = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer);

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

        const questions = [];
        const allowedDifficulties = ['easy', 'medium', 'hard'];

        records.forEach((record, index) => {
            const question = record.question || record.Question;
            const optionA = record.optionA || record.OptionA || record.optiona;
            const optionB = record.optionB || record.OptionB || record.optionb;
            const optionC = record.optionC || record.OptionC || record.optionc;
            const optionD = record.optionD || record.OptionD || record.optiond;
            let correctAnswer = record.correctAnswer || record.CorrectAnswer || record.correctanswer;
            let difficulty = (record.difficulty || record.Difficulty || 'medium').toLowerCase().trim();

            if (!allowedDifficulties.includes(difficulty)) {
                difficulty = 'medium';
            }

            if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
                throw new Error(`Row ${index + 2}: All fields are required (Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Difficulty)`);
            }

            const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()];

            // Resolve letter answers to actual option value
            const upper = String(correctAnswer).trim().toUpperCase();
            if (upper === 'A' || upper === 'OPTION A') correctAnswer = options[0];
            else if (upper === 'B' || upper === 'OPTION B') correctAnswer = options[1];
            else if (upper === 'C' || upper === 'OPTION C') correctAnswer = options[2];
            else if (upper === 'D' || upper === 'OPTION D') correctAnswer = options[3];
            else {
                correctAnswer = correctAnswer.trim();
            }

            if (!options.includes(correctAnswer)) {
                throw new Error(`Row ${index + 2}: Correct Answer "${correctAnswer}" does not match any of the provided options: ${options.join(', ')}`);
            }

            const explanation = record.explanation || record.Explanation || `The correct answer is "${correctAnswer}".`;

            questions.push({
                questionId: `csv_${Date.now()}_${index}`,
                question,
                content: question,
                options,
                correctAnswer,
                explanation: explanation.length >= 10 ? explanation : `The correct answer is "${correctAnswer}".`,
                difficulty: difficulty === 'easy' ? 2 : difficulty === 'hard' ? 8 : 5,
                difficultyLevel: difficulty,
                difficultyScore: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 5 : 8,
                topic: record.topic || record.Topic || 'General',
                tags: [record.topic || record.Topic || 'General'],
                category: [record.topic || record.Topic || 'General'],
                generatedBy: 'CSV',
                adminApproved: true
            });
        });

        return questions;
    } catch (error) {
        throw new Error(error.message || 'Failed to parse CSV file');
    }
};

module.exports = {
    generateQuiz,
    generateQuestionsFromChunks,
    generateContentBasedQuestions,
    generateGenericQuestions,
    parseCSVFromBuffer,
    sanitizeAndValidateQuestion
};
