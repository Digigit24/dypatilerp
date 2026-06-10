import { z } from 'zod';

export const createBatchSchema = z.object({
  course_id: z.string().uuid(),
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  status: z.enum(['upcoming', 'active', 'completed']).optional().default('upcoming'),
  start_date: z.string().date(),
  end_date: z.string().date().optional(),
  max_students: z.number().int().min(1).default(30),
  description: z.string().optional(),
});

export const updateBatchSchema = createBatchSchema.partial().omit({ course_id: true });

export const assignGuideSchema = z.object({
  guide_user_id: z.string().uuid(),
  guide_type: z.enum(['academic', 'industry']),
  student_user_id: z.string().uuid(),
});
