import { z } from 'zod';

/**
 * STRICT, bounded public application schema.
 *
 * Design rules (all enforced below):
 *  - Every object is `.strict()` → unknown keys are REJECTED with a 400, never
 *    silently stripped. This is what blocks trusted-field injection
 *    (course_id, batch_id, status, role, user_id, password, credentials,
 *    permissions, …): any key not explicitly listed here fails validation.
 *  - No `z.record(z.any())` / open JSON is exposed publicly — the whole
 *    envelope is explicit and length-bounded.
 *  - `program` must match a safe identifier format AND is not allowed to be a
 *    prototype-polluting key. Whether a well-formed program is actually
 *    *accepted* is decided server-side by trusted config (a valid-but-
 *    unconfigured program resolves to 503, not 400).
 *  - course_id / batch_id are never part of this schema; they are resolved
 *    server-side from trusted settings.
 *
 * This is a deliberately small GENERIC envelope. The final DLitt-specific
 * business fields are NOT invented here — they will be added once the client
 * confirms the form. `academic` / `professional` reuse the existing generic
 * applicant field names the applicants service already understands.
 */

const PROTO_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

// Lowercase alphanumerics plus - and _, 1..50 chars, and never a
// prototype-polluting token. (The service also guards this at lookup time.)
const programSchema = z
  .string()
  .trim()
  .min(1, 'program is required')
  .max(50, 'program is too long')
  .regex(/^[a-z0-9_-]+$/, 'Invalid program key')
  .refine((v) => !PROTO_KEYS.has(v), 'Invalid program key');

// Digits and common international separators only.
const phoneSchema = z
  .string()
  .trim()
  .min(4, 'Enter a valid phone number')
  .max(32, 'Phone number is too long')
  .regex(/^[0-9+()\-\s]+$/, 'Enter a valid phone number');

const personalSchema = z
  .object({
    first_name:    z.string().trim().min(1, 'First name is required').max(100, 'First name is too long'),
    last_name:     z.string().trim().min(1, 'Last name is required').max(100, 'Last name is too long'),
    // trim + lowercase BEFORE validating, so storage + duplicate checks are
    // consistently normalized. 254 = RFC 5321 max email length.
    email:         z.string().trim().toLowerCase().email('Enter a valid email').max(254, 'Email is too long'),
    phone:         phoneSchema.optional(),
    mobile:        phoneSchema.optional(),
    state_country: z.string().trim().max(120, 'This field is too long').optional(),
  })
  .strict();

// Generic academic block — reuses the existing applicant field names; every
// field optional and bounded, unknown keys rejected.
const academicSchema = z
  .object({
    highest_degree:      z.string().trim().max(100, 'This field is too long').optional(),
    phd_discipline:      z.string().trim().max(200, 'This field is too long').optional(),
    specialization:      z.string().trim().max(200, 'This field is too long').optional(),
    phd_research_title:  z.string().trim().max(300, 'This field is too long').optional(),
    university:          z.string().trim().max(200, 'This field is too long').optional(),
    phd_completion_year: z.number().int().min(1900).max(2100).optional(),
    graduation_year:     z.number().int().min(1900).max(2100).optional(),
    scopus_publications: z.number().int().min(0).max(1000).optional(),
    // Count of ALL publications (distinct from scopus_publications, which is
    // Scopus-indexed only). Optional for backward compatibility with older
    // clients; bound mirrors scopus_publications.
    total_publications:  z.number().int().min(0).max(1000).optional(),
    // Prospective research topic — a research-title-like free-text field.
    // Optional for backward compatibility; length mirrors research-text fields.
    prospective_topic:   z.string().trim().max(500, 'This field is too long').optional(),
  })
  .strict();

// Generic professional block — all optional, bounded, unknown keys rejected.
const professionalSchema = z
  .object({
    current_position: z.string().trim().max(200, 'This field is too long').optional(),
    organization:     z.string().trim().max(200, 'This field is too long').optional(),
    experience_years: z.number().int().min(0).max(80).optional(),
  })
  .strict();

const applicantSchema = z
  .object({
    personal:           personalSchema,
    academic:           academicSchema.optional(),
    professional:       professionalSchema.optional(),
    research_statement: z.string().trim().max(5000, 'Research statement is too long').optional(),
    consent:            z.boolean().optional(),
  })
  .strict();

export const publicApplicationSchema = z
  .object({
    program:   programSchema,
    applicant: applicantSchema,
  })
  .strict();
