/**
 * Local filesystem video storage — used as primary storage in development
 * and as a hot-fallback when Zata/S3 is unavailable.
 *
 * Files are stored at:
 *   backend/storage/videos/{objectKey}          – original video file
 *   backend/storage/thumbnails/{videoId}.jpg    – extracted thumbnail
 *
 * Streaming uses HTTP 206 Partial Content with byte-range support so
 * browsers can seek without downloading the whole file.
 */
import { createReadStream, statSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dir      = dirname(__filename);

// backend/storage/
const STORAGE_ROOT = join(__dir, '..', '..', '..', 'storage');
export const VIDEO_DIR = join(STORAGE_ROOT, 'videos');
export const THUMB_DIR = join(STORAGE_ROOT, 'thumbnails');

// Create directories on module load
mkdirSync(VIDEO_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

/** Sanitise object key — strip any path-traversal attempts */
const safe = (key) => key.replace(/\.\./g, '_').replace(/^\/+/, '');

export const videoPath    = (objectKey) => join(VIDEO_DIR, safe(objectKey));
export const thumbPath    = (videoId)   => join(THUMB_DIR, `${videoId}.jpg`);

export const videoExists  = (objectKey) => existsSync(videoPath(objectKey));
export const thumbExists  = (videoId)   => existsSync(thumbPath(videoId));

/**
 * Copy a temp file (from formidable) to local storage.
 * The objectKey directory tree is created automatically.
 */
export const saveVideo = (sourcePath, objectKey) => {
  const dest = videoPath(objectKey);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(sourcePath, dest);
  return dest;
};

/**
 * Stream a video with HTTP Range support (206 Partial Content).
 * Chunk size caps at 10 MB so the client buffers progressively.
 */
export const streamRange = (objectKey, range, res, contentType = 'video/mp4') => {
  const fp = videoPath(objectKey);
  if (!existsSync(fp)) throw new Error(`Local video not found: ${objectKey}`);

  const { size } = statSync(fp);

  if (range) {
    const [, rawStart = '0', rawEnd = ''] = /bytes=(\d*)-(\d*)/.exec(range) || [];
    const start = parseInt(rawStart, 10) || 0;
    const end   = rawEnd ? parseInt(rawEnd, 10) : Math.min(start + 10 * 1024 * 1024 - 1, size - 1);

    if (start >= size || end >= size || start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      return res.end();
    }

    const chunkSize = end - start + 1;
    res.writeHead(206, {
      'Content-Range':                `bytes ${start}-${end}/${size}`,
      'Accept-Ranges':                'bytes',
      'Content-Length':               chunkSize,
      'Content-Type':                 contentType,
      'Cache-Control':                'private, no-store',
      'X-Content-Type-Options':       'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    createReadStream(fp, { start, end }).pipe(res);
  } else {
    // Full file
    res.writeHead(200, {
      'Content-Length':               size,
      'Content-Type':                 contentType,
      'Accept-Ranges':                'bytes',
      'Cache-Control':                'private, no-store',
      'X-Content-Type-Options':       'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    createReadStream(fp).pipe(res);
  }
};

/**
 * Use ffmpeg to extract a JPEG thumbnail at `offsetSec` seconds.
 * Returns true on success, false if ffmpeg is not installed or fails.
 */
export const generateThumbnail = async (objectKey, videoId, offsetSec = 3) => {
  const fp   = videoPath(objectKey);
  const dest = thumbPath(videoId);
  if (!existsSync(fp)) return false;
  try {
    await execFileAsync('ffmpeg', [
      '-ss',      String(offsetSec),
      '-i',       fp,
      '-vframes', '1',
      '-vf',      'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black',
      '-q:v',     '3',
      '-y',
      dest,
    ]);
    return true;
  } catch {
    return false;
  }
};

/**
 * Use ffprobe to read the exact video duration in seconds.
 * Returns 0 if ffprobe is not installed or fails.
 */
export const probeDuration = async (objectKey) => {
  const fp = videoPath(objectKey);
  if (!existsSync(fp)) return 0;
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',           'error',
      '-show_entries','format=duration',
      '-of',          'default=noprint_wrappers=1:nokey=1',
      fp,
    ]);
    return Math.round(parseFloat(stdout.trim())) || 0;
  } catch {
    return 0;
  }
};
