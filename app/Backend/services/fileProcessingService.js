/**
 * fileProcessingService.js
 *
 * Heavy modules (pdf-parse, mammoth) are lazy-required inside each handler so
 * they are not loaded at startup. All file reads come from in-memory buffers
 * (multer memoryStorage) — no disk reads on Vercel.
 */

const Document = require('../models/Document');
const Chunk = require('../models/Chunk');

// Helper to calculate difficulty score (heuristic)
// Returns 'basic', 'intermediate', or 'advanced'
const calculateDifficulty = (text) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return 'basic';
    }
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 'basic';

    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
    const avgSentenceLength = words.length / sentenceCount;

    if (avgWordLength > 6 || avgSentenceLength > 20) return 'advanced';
    if (avgWordLength > 4.5 || avgSentenceLength > 12) return 'intermediate';
    return 'basic';
};

/**
 * Extract text from a buffer.
 * @param {Buffer} buffer  File content as a Buffer (from multer memoryStorage).
 * @param {string} mimeType
 * @param {string} [originalName]
 */
const extractTextFromBuffer = async (buffer, mimeType, originalName = '') => {
    if (!buffer || buffer.length === 0) {
        return '';
    }

    const isPdf = mimeType === 'application/pdf' || (originalName && originalName.toLowerCase().endsWith('.pdf'));
    const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || (originalName && originalName.toLowerCase().endsWith('.docx'));
    const isTxt = mimeType === 'text/plain' || (originalName && originalName.toLowerCase().endsWith('.txt'));

    if (isPdf) {
        const { PDFParse } = require('pdf-parse'); // lazy-require
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return (result && typeof result.text === 'string') ? result.text : '';
        } finally {
            if (parser && typeof parser.destroy === 'function') {
                try {
                    await parser.destroy();
                } catch (destroyErr) {
                    // Suppress parser cleanup error
                }
            }
        }
    } else if (isDocx) {
        const mammoth = require('mammoth'); // lazy-require
        const result = await mammoth.extractRawText({ buffer });
        return (result && typeof result.value === 'string') ? result.value : '';
    } else if (isTxt) {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        return decoder.decode(buffer);
    } else {
        const text = buffer.toString('utf8');
        return text || '';
    }
};

/**
 * Legacy path-based extraction (kept for on-disk backward compat on traditional hosts).
 * On Vercel this should not be called — use extractTextFromBuffer instead.
 */
const extractText = async (filePath, mimeType) => {
    const fs = require('fs');
    try {
        if (mimeType === 'application/pdf') {
            const { PDFParse } = require('pdf-parse');
            const dataBuffer = fs.readFileSync(filePath);
            const parser = new PDFParse({ data: dataBuffer });
            try {
                const result = await parser.getText();
                return (result && typeof result.text === 'string') ? result.text : '';
            } finally {
                if (parser && typeof parser.destroy === 'function') {
                    try {
                        await parser.destroy();
                    } catch (destroyErr) {
                        // Suppress parser cleanup error
                    }
                }
            }
        } else if (
            mimeType ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            return (result && typeof result.value === 'string') ? result.value : '';
        } else if (mimeType === 'text/plain') {
            return fs.readFileSync(filePath, 'utf8');
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        console.error('Error extracting text:', error.message);
        throw error;
    }
};

/**
 * Process a Document record.
 * Accepts buffer directly as second argument, avoiding MongoDB buffer storage or disk dependency.
 * @param {string|mongoose.Types.ObjectId} documentId
 * @param {Buffer} [buffer]
 */
const processDocument = async (documentId, buffer = null) => {
    const document = await Document.findById(documentId);
    if (!document) throw new Error('Document not found');

    document.status = 'processing';
    await document.save();

    try {
        let text = '';
        const fileBuffer = buffer || document.buffer;
        if (fileBuffer) {
            text = await extractTextFromBuffer(fileBuffer, document.mimeType, document.originalName);
        } else if (document.path) {
            text = await extractText(document.path, document.mimeType);
        } else {
            throw new Error('No file buffer or path available for processing');
        }

        // Remove pdf-parse page markers e.g. "-- 1 of 1 --"
        const usableText = (text || '').replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
        if (!usableText) {
            document.status = 'failed';
            document.failureReason = 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.';
            document.processed = false;
            document.chunkCount = 0;
            await document.save();
            await Chunk.deleteMany({ documentId: document._id });
            return {
                success: false,
                chunkCount: 0,
                message: 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            };
        }

        // Simple chunking by paragraphs, then grouping to ensure min length
        const rawParagraphs = usableText.split(/\n\s*\n/);
        const chunks = [];
        let currentChunk = '';

        for (const para of rawParagraphs) {
            const cleanPara = para.trim();
            if (!cleanPara) continue;

            if ((currentChunk + '\n\n' + cleanPara).length < 500) {
                currentChunk = currentChunk ? (currentChunk + '\n\n' + cleanPara) : cleanPara;
            } else {
                if (currentChunk.trim().length > 50) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = cleanPara;
            }
        }
        if (currentChunk.trim().length > 50) {
            chunks.push(currentChunk.trim());
        }

        // If paragraph grouping yielded no chunks > 50 chars, but usableText is non-empty,
        // create at least one chunk so short documents still work
        if (chunks.length === 0 && usableText.length > 0) {
            chunks.push(usableText.slice(0, 1000));
        }

        if (chunks.length === 0) {
            document.status = 'failed';
            document.failureReason = 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.';
            document.processed = false;
            document.chunkCount = 0;
            await document.save();
            await Chunk.deleteMany({ documentId: document._id });
            return {
                success: false,
                chunkCount: 0,
                message: 'We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.'
            };
        }

        // Save chunks
        const chunkDocs = chunks.map((content, index) => ({
            documentId: document._id,
            content,
            index,
            difficulty: calculateDifficulty(content),
            tags: []
        }));

        await Chunk.insertMany(chunkDocs);

        document.status = 'processed';
        document.processed = true;
        document.chunkCount = chunks.length;
        document.failureReason = null;
        await document.save();

        return { success: true, chunkCount: chunks.length };
    } catch (error) {
        document.status = 'failed';
        document.failureReason = 'Processing failed: ' + (error.message || 'Unknown error').slice(0, 100);
        document.processed = false;
        document.chunkCount = 0;
        await document.save();
        await Chunk.deleteMany({ documentId: document._id });
        throw error;
    }
};

module.exports = {
    calculateDifficulty,
    extractText,
    extractTextFromBuffer,
    processDocument
};
