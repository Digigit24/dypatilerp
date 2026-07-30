import { z } from 'zod';

// A stored attachment descriptor. Backward compatible: legacy records were
// { name, url } and new uploads are { name, media_id, type, size }. Either a
// public url OR an internal media_id must be present. object_key is never
// accepted from clients — the server writes it (and hides it) at finalize.
const fileDescriptorSchema = z.object({
  name: z.string(),
  media_id: z.string().uuid().optional(),
  url: z.string().url().optional(),
  type: z.string().optional(),
  size: z.number().optional(),
}).refine((f) => !!(f.url || f.media_id), { message: 'Each file needs a url or media_id' });

export const createSubmissionSchema = z.object({
  // Optional: for a student self-serve progress report the batch is resolved
  // server-side from their active enrollment when omitted.
  batch_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(500),
  submission_type: z.enum(['research_paper','progress_report','thesis_chapter','assignment','other']),
  semester: z.number().int().min(1).default(1),
  content: z.string().optional(),
  file_urls: z.array(fileDescriptorSchema).optional().default([]),
});

export const updateSubmissionSchema = createSubmissionSchema.partial().omit({ batch_id: true });

// Admin uploads a progress report on behalf of a scholar. Owner is always the
// scholar; the acting admin is recorded separately for audit.
export const createSubmissionOnBehalfSchema = z.object({
  student_user_id: z.string().uuid(),
  batch_id: z.string().uuid(),
  title: z.string().min(2).max(500),
  submission_type: z.literal('progress_report').default('progress_report'),
  semester: z.number().int().min(1).default(1),
});

export const reviewActionSchema = z.object({
  comments: z.string().optional(),
});
