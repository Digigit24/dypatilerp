/**
 * Zata S3-compatible object storage service.
 * Zata uses the same API surface as AWS S3 with a custom endpoint.
 *
 * If ZATA credentials are not set, every method returns a stub response
 * so the rest of the application can boot and the gallery UI still renders.
 */
import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

const BUCKET = env.ZATA_VIDEOS_BUCKET || env.ZATA_BUCKETS || '';
const CONFIGURED = !!(env.ZATA_ACCESS_KEY && env.ZATA_SECRET_KEY && env.ZATA_ENDPOINT && BUCKET);

export const isConfigured = () => CONFIGURED;

// Lazily initialised so the server doesn't crash on missing keys
let _client = null;
const client = () => {
  if (!CONFIGURED) throw new Error('Zata storage is not configured — set ZATA_ACCESS_KEY, ZATA_SECRET_KEY, ZATA_ENDPOINT, ZATA_VIDEOS_BUCKET in .env');
  if (!_client) {
    _client = new S3Client({
      endpoint: env.ZATA_ENDPOINT,
      region: 'us-east-1', // Zata requires a region value even though it's ignored
      credentials: { accessKeyId: env.ZATA_ACCESS_KEY, secretAccessKey: env.ZATA_SECRET_KEY },
      forcePathStyle: true, // required for S3-compatible services
    });
  }
  return _client;
};

/**
 * Stream a video range directly into an Express response as 206 Partial Content.
 * @param {string} objectKey   - S3 object key (e.g. "courses/xxx/video.mp4")
 * @param {string|null} range  - HTTP Range header value (e.g. "bytes=0-1048576")
 * @param {import('express').Response} res
 */
export const streamVideoRange = async (objectKey, range, res) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ...(range ? { Range: range } : {}),
  });

  const response = await client().send(command);

  const statusCode = range ? 206 : 200;
  const contentLength = response.ContentLength;
  const contentRange = response.ContentRange;
  const contentType = response.ContentType || 'video/mp4';

  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': contentLength,
    ...(contentRange ? { 'Content-Range': contentRange } : {}),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store, no-cache, private',
    'X-Content-Type-Options': 'nosniff',
  });

  response.Body.pipe(res);
};

/**
 * Get object metadata (size, content-type) without downloading the body.
 */
export const headObject = async (objectKey) => {
  const command = new HeadObjectCommand({ Bucket: BUCKET, Key: objectKey });
  return client().send(command);
};

/**
 * Delete an object from the bucket.
 */
export const deleteObject = async (objectKey) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey });
  return client().send(command);
};

/**
 * List objects under a prefix (used to browse course video folders).
 */
export const listObjects = async (prefix = '') => {
  const command = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  return client().send(command);
};

/**
 * Generate a presigned PUT URL so the frontend can upload directly to Zata.
 * @param {string} objectKey  - Destination key in the bucket
 * @param {number} expiresIn  - Seconds until the URL expires (default 1 hour)
 * @param {string} contentType - MIME type of the upload
 */
export const presignedUploadUrl = async (objectKey, expiresIn = 3600, contentType = 'video/mp4') => {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: objectKey, ContentType: contentType });
  return getSignedUrl(client(), command, { expiresIn });
};

/**
 * Create a "folder" (zero-byte marker object) in the bucket for a course.
 * Object key pattern: {courseCode}/  (e.g. "ABRF-2024/")
 * S3-compatible stores don't have real folders; a trailing-slash empty object
 * is the conventional way to represent them.
 */
export const createCourseFolder = async (courseCode) => {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const key = `${courseCode}/`;
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: '', ContentType: 'application/x-directory' });
  await client().send(command);
  return key;
};

/**
 * Build a canonical object key for a new video file.
 * Pattern: {courseCode}/{videoId}/{safeFilename}
 */
export const buildVideoKey = (courseCode, videoId, originalFilename) => {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'mp4';
  const safe = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  return `${courseCode}/${videoId}/${safe}`;
};
