import { z } from 'zod';

const modulePrefsSchema = z.record(z.string(), z.boolean()).optional();

const preferencesSchema = z.object({
  modules: modulePrefsSchema,
  display: z.record(z.string(), z.string()).optional(),
}).optional();

export const createCourseSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().min(2).max(50),
  description: z.string().optional(),
  duration_months: z.number().int().min(1).default(24),
  max_students_per_batch: z.number().int().min(1).default(30),
  fee_structure: z.record(z.string(), z.number()).optional().default({}),
  is_active: z.boolean().optional().default(true),
  preferences: preferencesSchema,
});

export const updateCourseSchema = createCourseSchema.partial();
