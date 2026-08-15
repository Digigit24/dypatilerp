import { z } from 'zod';

const targetItem = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  due_date: z.string().optional().nullable(),
  requires_file: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const createTargetSchema = targetItem.extend({
  batch_id: z.string().uuid(),
  student_user_id: z.string().uuid(),
  semester: z.number().int().min(1),
});

export const updateTargetSchema = targetItem.partial().extend({
  semester: z.number().int().min(1).optional(),
});

/**
 * Create one set of targets across a whole batch.
 * Omit student_user_ids to apply to every actively-enrolled scholar.
 */
export const bulkCreateTargetSchema = z.object({
  batch_id: z.string().uuid(),
  semester: z.number().int().min(1),
  targets: z.array(targetItem).min(1).max(50),
  student_user_ids: z.array(z.string().uuid()).optional(),
});
