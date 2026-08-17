import { query } from '../../config/database.js';

// ─── Slot catalogue (V4-FEATURE-PLAN.md §5 / §7) ──────────────────────────────
// Every slot is stored as a `videos` row with owner_user_id set and no
// course_id/batch_id/assignment_id/submission_id — these aren't submissions,
// just a bare-user file. A slot holds exactly one current file; re-upload
// replaces it (see videos.service.js#upsertOwnerSlotVideo).
export const UPLOAD_SLOTS = ['cv', 'research_proposal', 'publications_list', 'research_statement'];
export const DOCUMENT_SLOTS = [
  'passport', 'aadhar_card', 'pan_card',
  'marksheet_graduation', 'marksheet_postgraduation', 'phd_result', 'photo',
];
export const ALL_SLOTS = [...UPLOAD_SLOTS, ...DOCUMENT_SLOTS];

// The "8 info fields" from the plan = the 5 columns below (which live on the
// new student_profile_details table, one row per student) + first_name /
// last_name / phone, which already live on `users`. Email is intentionally
// excluded — it's the account identifier and isn't part of onboarding.
const PROFILE_DETAIL_FIELDS = ['father_name', 'mother_name', 'date_of_birth', 'postal_address', 'blood_group'];
const USER_INFO_FIELDS = ['first_name', 'last_name', 'phone'];
export const INFO_FIELDS = [...USER_INFO_FIELDS, ...PROFILE_DETAIL_FIELDS];

// ─── Profile details (personal info) ──────────────────────────────────────────

export const getProfileDetails = async (userId) => {
  const [{ rows: [details] }, { rows: [user] }] = await Promise.all([
    query('SELECT * FROM student_profile_details WHERE user_id=$1', [userId]),
    query('SELECT id, first_name, last_name, phone, email FROM users WHERE id=$1', [userId]),
  ]);
  return {
    user_id: userId,
    first_name: user?.first_name ?? null,
    last_name: user?.last_name ?? null,
    phone: user?.phone ?? null,
    email: user?.email ?? null,
    father_name: details?.father_name ?? null,
    mother_name: details?.mother_name ?? null,
    date_of_birth: details?.date_of_birth ?? null,
    postal_address: details?.postal_address ?? null,
    blood_group: details?.blood_group ?? null,
    onboarding_completed_at: details?.onboarding_completed_at ?? null,
    onboarding_skip: details?.onboarding_skip ?? false,
  };
};

export const setOnboardingSkip = async (userId, skip) => {
  await query(
    `INSERT INTO student_profile_details (user_id, onboarding_skip)
     VALUES ($1,$2)
     ON CONFLICT (user_id) DO UPDATE SET onboarding_skip=EXCLUDED.onboarding_skip, updated_at=NOW()`,
    [userId, !!skip]
  );
  return getProfileDetails(userId);
};

/** first_name/last_name/phone live on `users` — updated here for onboarding-form convenience (same fields PUT /users/:id already allows). */
export const updateBasicUserFields = async (userId, { first_name, last_name, phone } = {}) => {
  const fields = [];
  const params = [];
  if (first_name !== undefined) { params.push(first_name); fields.push(`first_name=$${params.length}`); }
  if (last_name !== undefined)  { params.push(last_name);  fields.push(`last_name=$${params.length}`); }
  if (phone !== undefined)      { params.push(phone);      fields.push(`phone=$${params.length}`); }
  if (!fields.length) return;
  params.push(userId);
  await query(`UPDATE users SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length}`, params);
};

export const upsertProfileDetails = async (userId, body = {}) => {
  const v = (k) => (body[k] !== undefined ? body[k] || null : null);
  await query(
    `INSERT INTO student_profile_details (user_id, father_name, mother_name, date_of_birth, postal_address, blood_group)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET
       father_name=EXCLUDED.father_name, mother_name=EXCLUDED.mother_name,
       date_of_birth=EXCLUDED.date_of_birth, postal_address=EXCLUDED.postal_address,
       blood_group=EXCLUDED.blood_group, updated_at=NOW()`,
    [userId, v('father_name'), v('mother_name'), v('date_of_birth'), v('postal_address'), v('blood_group')]
  );
  return getProfileDetails(userId);
};

// ─── Documents ─────────────────────────────────────────────────────────────

export const listDocuments = async (userId) => {
  const { rows } = await query(
    `SELECT id, slot, title, mime_type, file_size, created_at AS uploaded_at, verified_at
     FROM videos WHERE owner_user_id=$1 AND slot = ANY($2::text[])`,
    [userId, ALL_SLOTS]
  );
  const bySlot = new Map(rows.map((r) => [r.slot, r]));
  return ALL_SLOTS.map((slot) => {
    const row = bySlot.get(slot);
    return {
      slot,
      kind: UPLOAD_SLOTS.includes(slot) ? 'upload' : 'document',
      present: !!row,
      media_id: row?.id ?? null,
      filename: row?.title ?? null,
      mime_type: row?.mime_type ?? null,
      file_size: row?.file_size ?? null,
      uploaded_at: row?.uploaded_at ?? null,
      verified: !!row?.verified_at,
    };
  });
};

// ─── Onboarding completeness gate ─────────────────────────────────────────────
//
// Complete = all 8 info fields set AND all 11 slots (4 uploads + 7 documents)
// present. Computed and stamped server-side only — a client can never claim
// completion. Once stamped, onboarding_completed_at is never cleared again:
// there's no "unset a field" flow, so a scholar who already passed the gate
// can't regress into being locked out again by editing a later field.
export const getOnboardingStatus = async (userId) => {
  const details = await getProfileDetails(userId);
  const missingInfoFields = INFO_FIELDS.filter((f) => {
    const val = details[f];
    return val === null || val === undefined || String(val).trim() === '';
  });
  const documents = await listDocuments(userId);
  const missingDocuments = documents.filter((d) => !d.present).map((d) => d.slot);

  const genuinelyComplete = missingInfoFields.length === 0 && missingDocuments.length === 0;
  let completedAt = details.onboarding_completed_at;

  if (genuinelyComplete && !completedAt) {
    const { rows: [row] } = await query(
      `INSERT INTO student_profile_details (user_id, onboarding_completed_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         onboarding_completed_at = COALESCE(student_profile_details.onboarding_completed_at, NOW())
       RETURNING onboarding_completed_at`,
      [userId]
    );
    completedAt = row.onboarding_completed_at;
  }

  // Skip flags let a scholar in without finishing onboarding, but they stay
  // LIVE — never stamped to onboarding_completed_at — so turning a skip back
  // off immediately re-locks a scholar who hasn't genuinely completed.
  const { rows: [globalSetting] } = await query(`SELECT value FROM app_settings WHERE key='onboarding'`);
  const globalSkip = !!globalSetting?.value?.skip_all;
  const complete = genuinelyComplete || details.onboarding_skip || globalSkip;

  return {
    complete,
    onboarding_completed_at: completedAt,
    info_complete: missingInfoFields.length === 0,
    documents_complete: missingDocuments.length === 0,
    missing_info_fields: missingInfoFields,
    missing_documents: missingDocuments,
    onboarding_skip: details.onboarding_skip,
    global_skip: globalSkip,
  };
};
