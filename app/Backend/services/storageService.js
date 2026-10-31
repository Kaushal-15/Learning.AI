/**
 * Cloud Object Storage Service (AWS S3 & Cloudflare R2 compatible)
 * Path: app/Backend/services/storageService.js
 * 
 * Provides presigned upload/download URLs for proctoring video chunks.
 * Eliminates local disk dependency and serverless memory bottlenecks.
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

let s3ClientInstance = null;

function cleanEnv(val) {
  return (val || '').trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Get sanitized storage configuration with fallback support.
 * Primary keys match exact dashboard envs: STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, STORAGE_BUCKET
 */
function getStorageConfig() {
  const isEnabledFlag = process.env.RECORDING_ENABLED !== 'false';

  const bucket = cleanEnv(
    process.env.STORAGE_BUCKET ||
    process.env.AWS_BUCKET_NAME ||
    process.env.S3_BUCKET ||
    process.env.AWS_S3_BUCKET
  );

  const accessKeyId = cleanEnv(
    process.env.STORAGE_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID
  );

  const secretAccessKey = cleanEnv(
    process.env.STORAGE_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY
  );

  const endpoint = cleanEnv(process.env.STORAGE_ENDPOINT) || undefined;

  // Custom endpoint (e.g. Cloudflare R2, MinIO) supports 'auto'.
  // Standard AWS S3 requires a valid AWS region (defaults to ap-south-1).
  const isCustomEndpoint = Boolean(endpoint && !endpoint.includes('amazonaws.com'));
  const fallbackRegion = isCustomEndpoint ? 'auto' : 'ap-south-1';

  const region = cleanEnv(
    process.env.STORAGE_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    fallbackRegion
  );

  const isConfigured = isEnabledFlag && Boolean(bucket && accessKeyId && secretAccessKey);

  return {
    isConfigured,
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
    endpoint,
    isCustomEndpoint
  };
}

function isRecordingConfigured() {
  return getStorageConfig().isConfigured;
}

function getS3Client() {
  const config = getStorageConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Force path style is recommended for Cloudflare R2 and MinIO
      forcePathStyle: config.isCustomEndpoint,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  return s3ClientInstance;
}

/**
 * Reset client instance (useful for testing or dynamic configuration updates)
 */
function resetS3Client() {
  s3ClientInstance = null;
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
    const { bucket } = getStorageConfig();
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
 * Generate a short-lived presigned GET URL for reviewing/downloading recorded chunks or documents.
 * Supports both getPresignedDownloadUrl({ key, expiresIn }) and getPresignedDownloadUrl(key, expiresIn).
 * Never returns permanent or public URLs.
 */
async function getPresignedDownloadUrl(keyOrParams, maybeExpiresIn = 900) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud storage is disabled or not configured in environment variables.'
    };
  }

  try {
    let key;
    let expiresIn = 900;

    if (typeof keyOrParams === 'object' && keyOrParams !== null) {
      key = keyOrParams.key;
      expiresIn = keyOrParams.expiresIn !== undefined ? keyOrParams.expiresIn : 900;
    } else {
      key = keyOrParams;
      if (maybeExpiresIn !== undefined) {
        expiresIn = maybeExpiresIn;
      }
    }

    const s3 = getS3Client();
    const { bucket } = getStorageConfig();

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
 * Upload an object directly to cloud storage.
 * @param {Object} params
 * @param {string} params.key
 * @param {Buffer|Uint8Array|string} params.body
 * @param {string} [params.contentType]
 */
async function uploadObject({ key, body, contentType = 'application/octet-stream' }) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud storage is disabled or not configured in environment variables.'
    };
  }

  try {
    const s3 = getS3Client();
    const { bucket } = getStorageConfig();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await s3.send(command);

    return {
      success: true,
      enabled: true,
      key,
      bucket
    };
  } catch (err) {
    console.error('Storage service uploadObject failed:', err.message);
    throw err;
  }
}

/**
 * Delete an object from cloud storage.
 * @param {string} key
 */
async function deleteObject(key) {
  if (!isRecordingConfigured()) {
    return {
      enabled: false,
      message: 'Cloud storage is disabled or not configured in environment variables.'
    };
  }

  try {
    const s3 = getS3Client();
    const { bucket } = getStorageConfig();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3.send(command);

    return {
      success: true,
      enabled: true,
      key
    };
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return {
        success: true,
        enabled: true,
        key,
        notFound: true
      };
    }
    console.error('Storage service deleteObject failed:', err.message);
    throw err;
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
    const { bucket } = getStorageConfig();

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
  getStorageConfig,
  isRecordingConfigured,
  getS3Client,
  resetS3Client,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  listSessionChunks,
  uploadObject,
  deleteObject,
};
