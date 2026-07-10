import { z } from 'zod';

const personalSchema = z.object({
  full_name:     z.string().optional(),
  first_name:    z.string().min(1),
  last_name:     z.string().min(1),
  email:         z.string().email(),
  phone:         z.string().optional(),
  mobile:        z.string().optional(),
  state_country: z.string().optional(),
});

const academicSchema = z.record(z.any()).optional();

export const createApplicantSchema = z.union([
  // Flat structure (direct API usage)
  z.object({
    course_id:        z.string().uuid().optional(),
    batch_id:         z.string().uuid().optional(),
    first_name:       z.string().min(1).max(100),
    last_name:        z.string().min(1).max(100),
    email:            z.string().email(),
    phone:            z.string().optional(),
    phd_details:      z.record(z.any()).optional().default({}),
    application_data: z.record(z.any()).optional().default({}),
  }),
  // Nested structure (frontend form)
  z.object({
    course_id:          z.string().uuid().optional(),
    batch_id:           z.string().uuid().optional(),
    personal:           personalSchema,
    academic:           academicSchema,
    research_statement: z.string().optional(),
    application_data:   z.record(z.any()).optional().default({}),
  }),
]);

export const updateApplicantDetailsSchema = z.object({
  first_name:    z.string().min(1).max(100).optional(),
  last_name:     z.string().min(1).max(100).optional(),
  email:         z.string().email().optional(),
  phone:         z.string().optional(),
  phd_details:   z.record(z.any()).optional(),
  application_data: z.record(z.any()).optional(),
});

export const updateApplicantStatusSchema = z.object({
  status: z.enum(['submitted','shortlisted_test','test_pending','test_completed','shortlisted','payment_received','rejected','enrolled']),
  batch_id: z.string().uuid().optional(),
  // Optional free-text reason, saved when an applicant is rejected.
  remark: z.string().max(500).optional(),
});

export const convertToStudentSchema = z.object({
  batch_id: z.string().uuid(),
  enrollment_number: z.string().optional(),
  send_credentials: z.boolean().optional(),
});

export const bulkConvertSchema = z.object({
  applicant_ids: z.array(z.string().uuid()).min(1),
  batch_id: z.string().uuid(),
});
