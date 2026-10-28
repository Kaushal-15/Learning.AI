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
 * Generate a presigned PUT URL for direct browser-to-bucket chunk streaming.
 * Uses key: recordings/<examId>/<userId>/<sessionId>/<chunkIndex>.webm
 */
async function getPresignedUploadUrl({ examId, userId, sessionId, chunkIndex, contentType = 'video/webm' }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  try {
    const s3 = getS3Client();
    const bucket = process.env.STORAGE_BUCKET;
    const resolvedUserId = userId || 'anonymous';
    const key = `recordings/${examId}/${resolvedUserId}/${sessionId}/${chunkIndex}.webm`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType === 'video/webm' ? 'video/webm' : 'video/webm',
    });

    // URL expires in 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      enabled: true,
      uploadUrl,
      key,
      expiresIn: 300
    };
  } catch (err) {
    console.error('Storage service presigned PUT generation failed:', err.message);
    return {
      enabled: false,
      message: `Failed to generate upload URL: ${err.message}`
    };
  }
}

/**
 * Generate a short-lived presigned GET URL for reviewing/downloading recorded chunks.
 * Never returns permanent or public URLs.
 */
async function getPresignedDownloadUrl({ key, expiresIn = 900 }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  try {
    const s3 = getS3Client();
    const bucket = process.env.STORAGE_BUCKET;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    // Default: 15 minutes (900 seconds) short-lived presigned URL
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn });

    return {
      enabled: true,
      downloadUrl,
      key,
      expiresIn
    };
  } catch (err) {
    console.error('Storage service presigned GET generation failed:', err.message);
    return {
      enabled: false,
      message: `Failed to generate download URL: ${err.message}`
    };
  }
}

/**
 * List all chunk keys for a given session and generate short-lived presigned download URLs.
 * Checks both recordings/<examId>/<userId>/<sessionId>/ and legacy recordings/<examId>/<sessionId>/
 */
async function listSessionChunks({ examId, userId, sessionId }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      chunks: [],
      message: 'Cloud recording storage is disabled or not configured in environment variables.'
    };
  }

  try {
    const s3 = getS3Client();
    const bucket = process.env.STORAGE_BUCKET;

    // Check with userId prefix first if available
    let prefix = userId
      ? `recordings/${examId}/${userId}/${sessionId}/`
      : `recordings/${examId}/`;

    let command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    let response = await s3.send(command);
    let contents = response.Contents || [];

    // Fallback: If no objects found with userId prefix, search session prefix directly
    if (contents.length === 0 && userId) {
      const fallbackPrefix = `recordings/${examId}/${sessionId}/`;
      const fallbackCmd = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: fallbackPrefix,
      });
      const fallbackRes = await s3.send(fallbackCmd);
      if (fallbackRes.Contents && fallbackRes.Contents.length > 0) {
        contents = fallbackRes.Contents;
        prefix = fallbackPrefix;
      }
    }

    // Filter to only match this sessionId
    const sessionContents = contents.filter(item => item.Key.includes(`/${sessionId}/`));

    const chunks = await Promise.all(
      sessionContents.map(async (item) => {
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
  } catch (err) {
    console.error('Storage service listSessionChunks error:', err.message);
    return {
      enabled: false,
      chunks: [],
      message: `Failed to list session recordings: ${err.message}`
    };
  }
}

module.exports = {
  isRecordingConfigured,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listSessionChunks,
};
