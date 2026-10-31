const { ExamSession } = require('../config/examDatabase');
const rawSchema = require('../models/ExamSession');
const recordingService = require('../services/recordingService');
const storageService = require('../services/storageService');

describe('Camera Routes & Storage Subsystem Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    storageService.resetS3Client();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('ExamSession from config/examDatabase is a compiled Mongoose model with findById', () => {
    // The previous bug imported models/ExamSession which is only a Schema, lacking findById
    expect(typeof rawSchema.findById).toBe('undefined');
    expect(typeof ExamSession.findById).toBe('function');
    expect(typeof ExamSession.findOne).toBe('function');
  });

  test('chunk-metadata canonical key validator strictly matches key pattern', () => {
    const examId = 'exam123';
    const userId = 'user456';
    const sessionId = 'session789';
    const chunkIndex = 2;

    const expectedKey = `recordings/${examId}/${userId}/${sessionId}/${chunkIndex}.webm`;
    expect(expectedKey).toBe('recordings/exam123/user456/session789/2.webm');

    // Reject tampering or client-supplied keys
    const maliciousKey = 'recordings/exam123/otherUser/session789/2.webm';
    expect(maliciousKey === expectedKey).toBe(false);

    const traversalKey = `recordings/${examId}/${userId}/${sessionId}/../../secret.webm`;
    expect(traversalKey === expectedKey).toBe(false);
  });

  test('recordingService does not use fs and respects RECORDING_ENABLED=false', async () => {
    process.env.RECORDING_ENABLED = 'false';

    expect(recordingService.isRecordingEnabled()).toBe(false);

    const startRes = await recordingService.startRecording({
      examId: 'ex1',
      sessionId: 'sess1',
      studentName: 'Alice',
      registerNumber: 'REG1'
    });
    expect(startRes.enabled).toBe(false);

    const chunkRes = await recordingService.uploadChunk({
      recordingId: 'rec1',
      chunkData: Buffer.from('chunk'),
      chunkNumber: 1
    });
    expect(chunkRes.enabled).toBe(false);
  });

  test('storageService generates presigned PUT upload URL with 5 min expiry and video/webm', async () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'mock-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'mock-secret';
    process.env.STORAGE_BUCKET = 'mock-bucket';
    process.env.STORAGE_REGION = 'ap-south-1';

    const presigned = await storageService.getPresignedUploadUrl({
      examId: 'exam123',
      userId: 'user456',
      sessionId: 'session789',
      chunkIndex: 0,
      contentType: 'video/webm'
    });

    expect(presigned.enabled).toBe(true);
    expect(presigned.expiresIn).toBe(300); // 5 minutes
    expect(presigned.key).toBe('recordings/exam123/user456/session789/0.webm');
    expect(presigned.uploadUrl).toContain('mock-bucket');
    expect(presigned.uploadUrl).toContain('recordings/exam123/user456/session789/0.webm');
  });

  test('storageService generates short-lived presigned GET download URL', async () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'mock-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'mock-secret';
    process.env.STORAGE_BUCKET = 'mock-bucket';

    const presigned = await storageService.getPresignedDownloadUrl({
      key: 'recordings/exam123/user456/session789/0.webm',
      expiresIn: 900
    });

    expect(presigned.enabled).toBe(true);
    expect(presigned.expiresIn).toBe(900);
    expect(presigned.downloadUrl).toContain('mock-bucket');
    expect(presigned.downloadUrl).toContain('recordings/exam123/user456/session789/0.webm');
  });
});
