import { z } from 'zod';

// A target is a batch-scoped definition (like an assignment) — no due_date
// (the semester itself governs timing) and no student_user_id (scholars
// submit against it via submissions.target_id, they don't own a row).
const targetItem = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  requires_file: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const createTargetSchema = targetItem.extend({
  batch_id: z.string().uuid(),
  semester: z.number().int().min(1),
});

export const updateTargetSchema = targetItem.partial().extend({
  semester: z.number().int().min(1).optional(),
  batch_id: z.string().uuid().optional(),
});

/**
 * Create a SET of targets for a batch+semester in one call — 6 targets in
 * one request instead of 6, not 6 × every scholar (that was the bug: this
 * used to also loop over every enrolled scholar and write one row each).
 */
export const bulkCreateTargetSchema = z.object({
  batch_id: z.string().uuid(),
  semester: z.number().int().min(1),
  targets: z.array(targetItem).min(1).max(50),
});
