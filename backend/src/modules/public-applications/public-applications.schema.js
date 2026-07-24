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

// Mirrors applicants.schema.js's createApplicantSchema shapes, MINUS
// course_id/batch_id — those are never accepted from the client on this
// endpoint. They are resolved server-side from trusted app_settings (see
// public-applications.service.js). Zod strips unrecognized keys by default,
// so a caller sending course_id/batch_id here has them silently dropped
// before the request ever reaches the service layer.
const applicantSchema = z.union([
  z.object({
    first_name:       z.string().min(1).max(100),
    last_name:        z.string().min(1).max(100),
    email:            z.string().email(),
    phone:            z.string().optional(),
    phd_details:      z.record(z.any()).optional().default({}),
    application_data: z.record(z.any()).optional().default({}),
  }),
  z.object({
    personal:           personalSchema,
    academic:           academicSchema,
    research_statement: z.string().optional(),
    application_data:   z.record(z.any()).optional().default({}),
  }),
]);

export const publicApplicationSchema = z.object({
  program:   z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/, 'Invalid program key'),
  applicant: applicantSchema,
});
