import { z } from 'zod';

export const createSubmissionSchema = z.object({
  batch_id: z.string().uuid(),
  title: z.string().min(2).max(500),
  submission_type: z.enum(['research_paper','progress_report','thesis_chapter','assignment','other']),
  semester: z.number().int().min(1).default(1),
  content: z.string().optional(),
  file_urls: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    type: z.string().optional(),
    size: z.number().optional(),
  })).optional().default([]),
});

export const updateSubmissionSchema = createSubmissionSchema.partial().omit({ batch_id: true });

export const reviewActionSchema = z.object({
  comments: z.string().optional(),
});
