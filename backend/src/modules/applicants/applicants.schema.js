import { z } from 'zod';

export const createApplicantSchema = z.object({
  course_id: z.string().uuid(),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  phd_details: z.object({
    university: z.string().optional(),
    year_awarded: z.number().int().optional(),
    subject: z.string().optional(),
    thesis_title: z.string().optional(),
  }).optional().default({}),
  application_data: z.record(z.any()).optional().default({}),
});

export const updateApplicantStatusSchema = z.object({
  status: z.enum(['submitted','test_pending','test_completed','shortlisted','rejected','enrolled']),
  batch_id: z.string().uuid().optional(),
});

export const convertToStudentSchema = z.object({
  batch_id: z.string().uuid(),
  enrollment_number: z.string().optional(),
});

export const bulkConvertSchema = z.object({
  applicant_ids: z.array(z.string().uuid()).min(1),
  batch_id: z.string().uuid(),
});
