/**
 * Central feature flags for the frontend.
 *
 * VIDEO — video upload, streaming and the whole Lectures module are DISABLED.
 * Documents are unaffected: formats, submission attachments and the media
 * library all continue to work for PDF / PPT / DOCX / images.
 *
 * To revive video: set VITE_FEATURE_VIDEO=true in the frontend env AND
 * VIDEO_UPLOADS_ENABLED=true in the backend env. Both are required — the
 * backend rejects video uploads with 422 VIDEO_DISABLED regardless of the UI.
 *
 * See CLAUDE.md -> "Disabled features" before changing any of this.
 */
export const FEATURES = {
  VIDEO: import.meta.env.VITE_FEATURE_VIDEO === 'true',
}

export const isVideoEnabled = () => FEATURES.VIDEO

/** Media types the library accepts while video is disabled. */
export const ALLOWED_MEDIA_ACCEPT = FEATURES.VIDEO
  ? undefined // everything
  : '.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip'

/** True when a File/mime should be refused by the uploader right now. */
export const isBlockedMedia = (mimeOrFile) => {
  if (FEATURES.VIDEO) return false
  const mime = typeof mimeOrFile === 'string' ? mimeOrFile : (mimeOrFile?.type || '')
  return mime.startsWith('video/') || mime.startsWith('audio/')
}
