const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Document = require('../models/Document');
const Chunk = require('../models/Chunk');

// Helper to calculate difficulty score (heuristic)
// Returns 'basic', 'intermediate', or 'advanced'
const calculateDifficulty = (text) => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentenceCount;

    if (avgWordLength > 6 || avgSentenceLength > 20) return 'advanced';
    if (avgWordLength > 4.5 || avgSentenceLength > 12) return 'intermediate';
    return 'basic';
};

const extractText = async (filePath, mimeType) => {
    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        } else if (mimeType === 'text/plain') {
            return fs.readFileSync(filePath, 'utf8');
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        throw error;
    }
};

const processDocument = async (documentId) => {
    const document = await Document.findById(documentId);
    if (!document) throw new Error('Document not found');

    try {
        const text = await extractText(document.path, document.mimeType);

        // Simple chunking by paragraphs, then grouping to ensure min length
        const rawParagraphs = text.split(/\n\s*\n/);
        const chunks = [];
        let currentChunk = '';

        for (const para of rawParagraphs) {
            if ((currentChunk + para).length < 500) {
                currentChunk += para + '\n\n';
            } else {
                if (currentChunk.trim().length > 50) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = para + '\n\n';
            }
        }
        if (currentChunk.trim().length > 50) {
            chunks.push(currentChunk.trim());
        }

        // Save chunks
        const chunkDocs = chunks.map((content, index) => ({
            documentId: document._id,
            content,
            index,
            difficulty: calculateDifficulty(content),
            tags: [] // Could use AI to generate tags here later
        }));

        await Chunk.insertMany(chunkDocs);

        document.processed = true;
        document.chunkCount = chunks.length;
        await document.save();

        return { success: true, chunkCount: chunks.length };
    } catch (error) {
        console.error('Error processing document:', error);
        throw error;
    }
};

module.exports = {
    extractText,
    processDocument
};
