const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';
jest.setTimeout(20000);

// Mock Document and Chunk models
const mockDocuments = new Map();
const mockChunks = [];

function MockDocument(data) {
  this._id = data._id || 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  this.userId = data.userId;
  this.filename = data.filename;
  this.originalName = data.originalName;
  this.mimeType = data.mimeType;
  this.size = data.size;
  this.path = data.path || null;
  this.storageKey = data.storageKey || null;
  this.status = data.status || 'uploaded';
  this.failureReason = data.failureReason || null;
  this.processed = data.processed || false;
  this.chunkCount = data.chunkCount || 0;
  this.uploadedAt = data.uploadedAt || new Date();
  this.createdAt = new Date();

  this.save = jest.fn().mockImplementation(async () => {
    mockDocuments.set(this._id.toString(), this);
    return this;
  });
}

MockDocument.find = jest.fn().mockImplementation((query) => {
  const docs = Array.from(mockDocuments.values()).filter(d => !query.userId || d.userId.toString() === query.userId.toString());
  return {
    sort: jest.fn().mockReturnValue(docs)
  };
});

MockDocument.findById = jest.fn().mockImplementation(async (id) => {
  return mockDocuments.get(id.toString()) || null;
});

MockDocument.findOne = jest.fn().mockImplementation(async (query) => {
  for (const doc of mockDocuments.values()) {
    if (query._id && doc._id.toString() !== query._id.toString()) continue;
    if (query.userId && doc.userId.toString() !== query.userId.toString()) continue;
    return doc;
  }
  return null;
});

MockDocument.deleteOne = jest.fn().mockImplementation(async (query) => {
  if (query._id) {
    mockDocuments.delete(query._id.toString());
  }
  return { deletedCount: 1 };
});

const MockChunk = {
  insertMany: jest.fn().mockImplementation(async (chunkList) => {
    for (const c of chunkList) {
      mockChunks.push({ ...c, _id: 'chunk_' + Math.random() });
    }
    return chunkList;
  }),
  deleteMany: jest.fn().mockImplementation(async (query) => {
    if (query.documentId) {
      const initialLen = mockChunks.length;
      const filtered = mockChunks.filter(c => c.documentId.toString() !== query.documentId.toString());
      mockChunks.length = 0;
      mockChunks.push(...filtered);
      return { deletedCount: initialLen - filtered.length };
    }
    return { deletedCount: 0 };
  })
};

jest.mock('../models/Document', () => MockDocument);
jest.mock('../models/Chunk', () => MockChunk);

// Mock storageService so tests can assert calls or simulate unconfigured/configured states
const storageService = require('../services/storageService');
jest.mock('../services/storageService', () => {
  const actual = jest.requireActual('../services/storageService');
  return {
    ...actual,
    uploadObject: jest.fn(),
    deleteObject: jest.fn(),
    isRecordingConfigured: jest.fn()
  };
});

// Mock pdf-parse for Jest VM environment compatibility (Jest dynamic import limitation)
jest.mock('pdf-parse', () => {
  return {
    PDFParse: class {
      constructor({ data }) {
        this.data = data;
      }
      async getText() {
        const str = this.data ? this.data.toString('ascii') : '';
        if (str.includes('/Im1 Do')) {
          // Empty/scanned PDF without text layers
          return { text: '' };
        }
        if (str.includes('Corrupted binary content')) {
          throw new Error('Invalid PDF structure');
        }
        const match = str.match(/\((.*?)\)\s*Tj/);
        return { text: match ? match[1] : 'Sample text from PDF extraction.' };
      }
      async destroy() {}
    }
  };
});

// Build sample files
function createSamplePdf(text = 'Hello World from test PDF extraction.') {
  const content = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const o1 = Buffer.byteLength(header);
  const o2 = o1 + Buffer.byteLength(obj1);
  const o3 = o2 + Buffer.byteLength(obj2);
  const o4 = o3 + Buffer.byteLength(obj3);
  const o5 = o4 + Buffer.byteLength(obj4);
  const startxref = o5 + Buffer.byteLength(obj5);
  const pad = (n) => String(n).padStart(10, '0');
  const xref = `xref\n0 6\n0000000000 65535 f \n${pad(o1)} 00000 n \n${pad(o2)} 00000 n \n${pad(o3)} 00000 n \n${pad(o4)} 00000 n \n${pad(o5)} 00000 n \n`;
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer);
}

function createEmptyPdf() {
  const content = 'q 1 0 0 1 0 0 cm /Im1 Do Q';
  const streamLen = Buffer.byteLength(content);
  const header = '%PDF-1.4\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${content}\nendstream\nendobj\n`;
  const o1 = Buffer.byteLength(header);
  const o2 = o1 + Buffer.byteLength(obj1);
  const o3 = o2 + Buffer.byteLength(obj2);
  const o4 = o3 + Buffer.byteLength(obj3);
  const startxref = o4 + Buffer.byteLength(obj4);
  const pad = (n) => String(n).padStart(10, '0');
  const xref = `xref\n0 5\n0000000000 65535 f \n${pad(o1)} 00000 n \n${pad(o2)} 00000 n \n${pad(o3)} 00000 n \n${pad(o4)} 00000 n \n`;
  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + xref + trailer);
}

describe('Custom Learning Upload & Document Lifecycle', () => {
  let app;
  let authToken;
  const testUserId = 'user_test_12345';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const routes = require('../routes/customLearningRoutes');
    app.use('/api/custom-learning', routes);

    authToken = jwt.sign({ id: testUserId }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    mockDocuments.clear();
    mockChunks.length = 0;
    jest.clearAllMocks();

    // Default: storage configured and uploadObject resolves successfully
    storageService.isRecordingConfigured.mockReturnValue(true);
    storageService.uploadObject.mockImplementation(async ({ key }) => ({
      success: true,
      key
    }));
    storageService.deleteObject.mockImplementation(async () => ({
      success: true
    }));
  });

  test('Upload normal PDF while logged in: expect 201, chunks created, S3 object under documents/<userId>/...', async () => {
    const pdfBuf = createSamplePdf('This is a comprehensive study guide about artificial intelligence and neural networks.');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', pdfBuf, 'study-guide.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.documentId).toBeDefined();

    // Verify Document stored in DB
    const savedDoc = mockDocuments.get(res.body.documentId.toString());
    expect(savedDoc).toBeDefined();
    expect(savedDoc.status).toBe('processed');
    expect(savedDoc.processed).toBe(true);
    expect(savedDoc.chunkCount).toBeGreaterThan(0);
    expect(savedDoc.storageKey).toMatch(new RegExp(`^documents/${testUserId}/${savedDoc._id}/study-guide\\.pdf$`));

    // Verify S3 uploadObject was called with correct key and body
    expect(storageService.uploadObject).toHaveBeenCalledWith(expect.objectContaining({
      key: `documents/${testUserId}/${savedDoc._id}/study-guide.pdf`,
      contentType: 'application/pdf'
    }));

    // Verify chunks were created
    expect(MockChunk.insertMany).toHaveBeenCalled();
    expect(mockChunks.length).toBeGreaterThan(0);
  });

  test('Upload normal DOCX while logged in: expect 201 and chunks created', async () => {
    const docxPath = path.join(__dirname, '../node_modules/mammoth/test/test-data/single-paragraph.docx');
    const docxBuf = fs.readFileSync(docxPath);

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', docxBuf, 'sample.docx');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockChunks.length).toBeGreaterThan(0);
  });

  test('Upload normal TXT while logged in: expect 201 and chunks created', async () => {
    const txtBuf = Buffer.from('Quantum computing uses quantum bits or qubits which can exist in superposition. This enables quantum computers to solve certain problems exponentially faster than classical computers.');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', txtBuf, 'quantum.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockChunks.length).toBeGreaterThan(0);
  });

  test('Upload a 5 MB file: expect 413 "File is larger than 4 MB"', async () => {
    const largeBuf = Buffer.alloc(5 * 1024 * 1024, 'a');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', largeBuf, 'large.txt');

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('File is larger than 4 MB');
  });

  test('Upload a .png file: expect 400 "Invalid file type"', async () => {
    const pngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', pngBuf, 'image.png');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid file type/);
  });

  test('Upload with no token: expect 401', async () => {
    const txtBuf = Buffer.from('Some text content');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .attach('file', txtBuf, 'note.txt');

    expect(res.status).toBe(401);
  });

  test('Upload a scanned/empty PDF: expect 422 with friendly message and no orphan chunks', async () => {
    const emptyPdf = createEmptyPdf();

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', emptyPdf, 'scanned.pdf');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.');

    // Verify document marked as failed and no orphan chunks
    expect(mockChunks.length).toBe(0);
    const docs = Array.from(mockDocuments.values());
    expect(docs.length).toBe(1);
    expect(docs[0].status).toBe('failed');
  });

  test('Upload an empty TXT: expect 422 with friendly message', async () => {
    const emptyTxt = Buffer.from('');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', emptyTxt, 'empty.txt');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.');
  });

  test('Unset STORAGE_BUCKET: uploads still succeed (no S3 copy)', async () => {
    // Simulate S3 disabled / not configured
    storageService.uploadObject.mockResolvedValueOnce({
      enabled: false,
      message: 'Cloud storage is disabled or not configured in environment variables.'
    });

    const txtBuf = Buffer.from('Document content processed even when S3 is completely disabled.');

    const res = await request(app)
      .post('/api/custom-learning/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', txtBuf, 's3-disabled.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const doc = mockDocuments.get(res.body.documentId.toString());
    expect(doc).toBeDefined();
    expect(doc.status).toBe('processed');
    expect(doc.storageKey).toBeNull();
  });

  test('Delete a document: the chunks, S3 object, and DB record are all deleted', async () => {
    const docId = 'doc_to_delete_999';
    const storageKey = `documents/${testUserId}/${docId}/sample.pdf`;

    const existingDoc = new MockDocument({
      _id: docId,
      userId: testUserId,
      filename: '12345-sample.pdf',
      originalName: 'sample.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      storageKey,
      status: 'processed',
      processed: true,
      chunkCount: 2
    });
    mockDocuments.set(docId, existingDoc);

    mockChunks.push(
      { documentId: docId, content: 'Chunk 1', index: 0 },
      { documentId: docId, content: 'Chunk 2', index: 1 }
    );

    const res = await request(app)
      .delete(`/api/custom-learning/documents/${docId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Chunks deleted
    expect(MockChunk.deleteMany).toHaveBeenCalledWith({ documentId: docId });
    expect(mockChunks.length).toBe(0);

    // S3 object deleted
    expect(storageService.deleteObject).toHaveBeenCalledWith(storageKey);

    // Document record deleted
    expect(MockDocument.deleteOne).toHaveBeenCalledWith({ _id: docId });
    expect(mockDocuments.get(docId)).toBeUndefined();
  });
});
