const storageService = require('../services/storageService');

describe('Storage Service Environment & S3 Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    storageService.resetS3Client();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('isRecordingConfigured returns true when STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, and STORAGE_BUCKET are set', () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'test-access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.STORAGE_BUCKET = 'test-bucket';

    expect(storageService.isRecordingConfigured()).toBe(true);

    const config = storageService.getStorageConfig();
    expect(config.bucket).toBe('test-bucket');
    expect(config.accessKeyId).toBe('test-access-key');
    expect(config.secretAccessKey).toBe('test-secret-key');
    // Default region for standard S3 when no endpoint is provided should be ap-south-1, NOT 'auto'
    expect(config.region).toBe('ap-south-1');
    expect(config.isCustomEndpoint).toBe(false);
  });

  test('isRecordingConfigured returns false if any required storage env is missing', () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'test-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'test-secret';
    delete process.env.STORAGE_BUCKET;

    expect(storageService.isRecordingConfigured()).toBe(false);
  });

  test('isRecordingConfigured returns false when RECORDING_ENABLED is "false"', () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'test-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'test-secret';
    process.env.STORAGE_BUCKET = 'test-bucket';
    process.env.RECORDING_ENABLED = 'false';

    expect(storageService.isRecordingConfigured()).toBe(false);
  });

  test('sanitizes quotes and surrounding whitespace from storage envs', () => {
    process.env.STORAGE_ACCESS_KEY_ID = '  "test-access-key-quoted"  ';
    process.env.STORAGE_SECRET_ACCESS_KEY = "  'test-secret-key-quoted'  ";
    process.env.STORAGE_BUCKET = '  test-bucket-with-spaces  ';

    const config = storageService.getStorageConfig();
    expect(config.accessKeyId).toBe('test-access-key-quoted');
    expect(config.secretAccessKey).toBe('test-secret-key-quoted');
    expect(config.bucket).toBe('test-bucket-with-spaces');
  });

  test('uses STORAGE_REGION when explicitly provided', () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'test-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'test-secret';
    process.env.STORAGE_BUCKET = 'test-bucket';
    process.env.STORAGE_REGION = 'us-east-1';

    const config = storageService.getStorageConfig();
    expect(config.region).toBe('us-east-1');
  });

  test('supports fallback variable names (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME)', () => {
    delete process.env.STORAGE_ACCESS_KEY_ID;
    delete process.env.STORAGE_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_BUCKET;

    process.env.AWS_ACCESS_KEY_ID = 'aws-fallback-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'aws-fallback-secret';
    process.env.AWS_BUCKET_NAME = 'aws-fallback-bucket';

    expect(storageService.isRecordingConfigured()).toBe(true);
    const config = storageService.getStorageConfig();
    expect(config.accessKeyId).toBe('aws-fallback-key');
    expect(config.secretAccessKey).toBe('aws-fallback-secret');
    expect(config.bucket).toBe('aws-fallback-bucket');
  });

  test('handles custom endpoint (e.g. Cloudflare R2) and defaults region to auto', () => {
    process.env.STORAGE_ACCESS_KEY_ID = 'r2-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'r2-secret';
    process.env.STORAGE_BUCKET = 'r2-bucket';
    process.env.STORAGE_ENDPOINT = 'https://accountid.r2.cloudflarestorage.com';

    const config = storageService.getStorageConfig();
    expect(config.isCustomEndpoint).toBe(true);
    expect(config.region).toBe('auto');
  });
});

