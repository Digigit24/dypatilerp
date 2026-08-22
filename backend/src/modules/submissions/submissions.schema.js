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
  submission_type: z.enum(['research_paper','progress_report','thesis_chapter','assignment','target','other']),
  // V2 links: a submission is made against an assignment, a progress-report
  // cycle, or a target. At most one is ever set.
  target_id: z.string().uuid().optional().nullable(),
  cycle_id: z.string().uuid().optional().nullable(),
  semester: z.number().int().min(1).default(1),
  content: z.string().optional(),
  file_urls: z.array(fileDescriptorSchema).optional().default([]),
});

export const updateSubmissionSchema = createSubmissionSchema.partial().omit({ batch_id: true });

// Admin uploads a progress report OR an assignment submission on behalf of a
// scholar. Owner is always the scholar; the acting admin is recorded separately
// for audit. When assignment_id is supplied, batch_id/title/semester/
// submission_type are all resolved server-side from the assignment — the
// client only needs to say which scholar and which assignment.
export const createSubmissionOnBehalfSchema = z.object({
  student_user_id: z.string().uuid(),
  assignment_id: z.string().uuid().optional(),
  batch_id: z.string().uuid().optional(),
  title: z.string().min(2).max(500).optional(),
  submission_type: z.enum(['progress_report', 'assignment', 'target']).default('progress_report'),
  target_id: z.string().uuid().optional(),
  semester: z.number().int().min(1).default(1),
}).refine((b) => !!(b.assignment_id || b.target_id || b.batch_id), {
  // Progress reports no longer need a caller-supplied title — the service
  // defaults it to "Progress Report — Semester N", same as self-submit.
  message: 'Either assignment_id, target_id, or batch_id, is required',
});

// A single free-form remark on a submission's feedback thread. `author_role`
// is normally resolved server-side from the poster's own roles; an admin may
// override it to post "on behalf of" coordinator/guide/mentor (the author is
// still recorded as the admin — this only changes the displayed role tag).
export const createRemarkSchema = z.object({
  remark: z.string().min(1).max(30000),
  author_role: z.enum(['admin', 'coordinator', 'academic_guide', 'industry_mentor']).optional(),
});

export const reviewActionSchema = z.object({
  comments: z.string().optional(),
});
