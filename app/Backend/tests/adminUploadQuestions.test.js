const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-12345';

// Mock User for auth and adminMiddleware
const mockUsers = new Map();
const MockUser = {
  findById: jest.fn().mockImplementation(async (id) => {
    return mockUsers.get(id ? id.toString() : '') || null;
  })
};
jest.mock('../models/User', () => MockUser);

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
  return { sort: jest.fn().mockReturnValue(docs) };
});

MockDocument.findById = jest.fn().mockImplementation(async (id) => {
  return mockDocuments.get(id.toString()) || null;
});

MockDocument.findByIdAndDelete = jest.fn().mockImplementation(async (id) => {
  mockDocuments.delete(id.toString());
  return { _id: id };
});

const MockChunk = {
  find: jest.fn().mockImplementation((query) => {
    let results = mockChunks.filter(c => !query.documentId || c.documentId.toString() === query.documentId.toString());
    if (query.difficulty) {
      results = results.filter(c => c.difficulty === query.difficulty);
    }
    return {
      limit: jest.fn().mockReturnValue(results)
    };
  }),
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

// Mock storageService
const storageService = require('../services/storageService');
jest.mock('../services/storageService', () => {
  const actual = jest.requireActual('../services/storageService');
  return {
    ...actual,
    uploadObject: jest.fn().mockResolvedValue({ success: true }),
    deleteObject: jest.fn().mockResolvedValue({ success: true }),
    isRecordingConfigured: jest.fn().mockReturnValue(true)
  };
});

// Mock pdf-parse for Jest VM environment compatibility
jest.mock('pdf-parse', () => {
  return {
    PDFParse: class {
      constructor({ data }) {
        this.data = data;
      }
      async getText() {
        const str = this.data ? this.data.toString('ascii') : '';
        if (str.includes('/Im1 Do')) {
          // Scanned/empty PDF without text
          return { text: '' };
        }
        if (str.includes('Corrupted binary content')) {
          throw new Error('Invalid PDF structure');
        }
        const match = str.match(/\((.*?)\)\s*Tj/);
        return { text: match ? match[1] : 'Sample text extracted from PDF for exam questions.' };
      }
      async destroy() {}
    }
  };
});

// Sample PDF generators
function createSamplePdf(text = 'Data structures and algorithms form the backbone of computer science.') {
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

describe('POST /api/exams/admin/upload-questions', () => {
  let app;
  const adminId = 'admin_user_001';
  const studentId = 'student_user_002';
  let adminToken;
  let studentToken;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const examRoutes = require('../routes/examRoutes');
    app.use('/api/exams', examRoutes);

    mockUsers.set(adminId, { _id: adminId, role: 'admin', email: 'admin@test.com' });
    mockUsers.set(studentId, { _id: studentId, role: 'student', email: 'student@test.com' });

    adminToken = jwt.sign({ id: adminId }, process.env.JWT_SECRET);
    studentToken = jwt.sign({ id: studentId }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    mockDocuments.clear();
    mockChunks.length = 0;
    jest.clearAllMocks();
  });

  test('CSV with valid headers: returns 200 and parsed questions', async () => {
    const csvContent = 'question,optionA,optionB,optionC,optionD,correctAnswer,difficulty\n' +
      '"What is 2+2?","3","4","5","6","4","easy"\n' +
      '"What is 5*5?","20","25","30","35","25","medium"\n';

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent), 'questions.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].question).toBe('What is 2+2?');
    expect(res.body.data[0].options).toHaveLength(4);
    expect(res.body.data[0].correctAnswer).toBe('4');
    expect(res.body.data[0].difficulty).toBe('easy');
  });

  test('CSV with a missing column: returns 400 with the missing column name', async () => {
    // Missing 'optionD' and 'difficulty'
    const invalidCsv = 'question,optionA,optionB,optionC,correctAnswer\n' +
      '"What is 2+2?","3","4","5","4"\n';

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(invalidCsv), 'invalid.csv');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/optiond/i);
  });

  test('Text PDF: returns 200, creates Document and generated questions', async () => {
    const pdfBuf = createSamplePdf('Operating systems manage hardware memory CPU and peripheral devices.');

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('questionCount', '10')
      .attach('file', pdfBuf, 'os-concepts.pdf');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.documentId).toBeDefined();

    // Verify Document was saved
    const doc = mockDocuments.get(res.body.documentId.toString());
    expect(doc).toBeDefined();
    expect(doc.status).toBe('processed');
    expect(doc.storageKey).toMatch(new RegExp(`^documents/${adminId}/${doc._id}/os-concepts\\.pdf$`));
  });

  test('Scanned PDF: returns 422 with friendly message and no orphan chunks', async () => {
    const scannedPdf = createEmptyPdf();

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', scannedPdf, 'scanned.pdf');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('We could not read any text from this file. If it is a scanned PDF, upload a text-based PDF or a DOCX.');
    expect(mockChunks).toHaveLength(0);
  });

  test('5 MB file: returns 413 "File is larger than 4 MB"', async () => {
    const largeBuf = Buffer.alloc(5 * 1024 * 1024, 'a');

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', largeBuf, 'large.txt');

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('File is larger than 4 MB');
  });

  test('questionCount=0: returns 400', async () => {
    const txtBuf = Buffer.from('Some educational material content');

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('questionCount', '0')
      .attach('file', txtBuf, 'content.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/between 1 and 100/i);
  });

  test('questionCount=500: returns 400', async () => {
    const txtBuf = Buffer.from('Some educational material content');

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('questionCount', '500')
      .attach('file', txtBuf, 'content.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/between 1 and 100/i);
  });

  test('Non-admin user: returns 403', async () => {
    const csvContent = 'question,optionA,optionB,optionC,optionD,correctAnswer,difficulty\n' +
      '"What is 1+1?","1","2","3","4","2","easy"\n';

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from(csvContent), 'questions.csv');

    expect(res.status).toBe(403);
  });

  test('Unauthenticated request: returns 401', async () => {
    const csvContent = 'question,optionA,optionB,optionC,optionD,correctAnswer,difficulty\n' +
      '"What is 1+1?","1","2","3","4","2","easy"\n';

    const res = await request(app)
      .post('/api/exams/admin/upload-questions')
      .attach('file', Buffer.from(csvContent), 'questions.csv');

    expect(res.status).toBe(401);
  });
});
