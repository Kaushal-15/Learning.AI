/**
 * Cloud Object Storage Service (AWS S3 & Cloudflare R2 compatible)
 * Path: app/Backend/services/storageService.js
 * 
 * Provides presigned upload/download URLs for proctoring video chunks.
 * Eliminates local disk dependency and serverless memory bottlenecks.
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3ClientInstance = null;

function isRecordingConfigured() {
  const isEnabledFlag = process.env.RECORDING_ENABLED !== 'false';
  const hasCredentials = Boolean(
    process.env.STORAGE_BUCKET &&
    process.env.STORAGE_ACCESS_KEY_ID &&
    process.env.STORAGE_SECRET_ACCESS_KEY
  );
  return isEnabledFlag && hasCredentials;
}

function getS3Client() {
  if (!isRecordingConfigured()) {
    return null;
  }

  if (!s3ClientInstance) {
    const region = process.env.STORAGE_REGION || 'auto';
    const endpoint = process.env.STORAGE_ENDPOINT || undefined;

    s3ClientInstance = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      },
      // Force path style is recommended for Cloudflare R2 and MinIO
      forcePathStyle: Boolean(endpoint && !endpoint.includes('amazonaws.com')),
    });
  }

  return s3ClientInstance;
}

/**
 * Generate a presigned PUT URL for direct browser-to-bucket chunk streaming
 */
async function getPresignedUploadUrl({ examId, sessionId, chunkIndex, contentType = 'video/webm' }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  const s3 = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;
  const key = `recordings/${examId}/${sessionId}/${chunkIndex}.webm`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  // URL expires in 5 minutes (sufficient for uploading a 10s chunk)
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    enabled: true,
    uploadUrl,
    key,
    expiresIn: 300
  };
}

/**
 * Generate a presigned GET URL for reviewing/downloading recorded chunks
 */
async function getPresignedDownloadUrl({ key, expiresIn = 900 }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  const s3 = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(s3, command, { expiresIn });

  return {
    enabled: true,
    downloadUrl,
    key,
    expiresIn
  };
}

/**
 * List all chunk keys for a given session and generate presigned download URLs
 */
async function listSessionChunks({ examId, sessionId }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      chunks: [],
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  const s3 = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;
  const prefix = `recordings/${examId}/${sessionId}/`;

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await s3.send(command);
  const contents = response.Contents || [];

  const chunks = await Promise.all(
    contents.map(async (item) => {
      const { downloadUrl } = await getPresignedDownloadUrl({ key: item.Key, expiresIn: 1800 });
      return {
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified,
        downloadUrl
      };
    })
  );

  return {
    enabled: true,
    prefix,
    totalChunks: chunks.length,
    chunks
  };
}

module.exports = {
  isRecordingConfigured,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listSessionChunks,
};
