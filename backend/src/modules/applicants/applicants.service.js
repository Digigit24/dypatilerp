import { query, getClient } from '../../config/database.js';
import { activeEnrolledClause } from '../../utils/enrollmentFilters.js';

/**
 * Build a virtual `personal` and `academic` envelope from flat DB columns
 * so the frontend can always access item.personal.full_name etc.
 */
const normalizeApplicant = (row) => {
  const pd  = row.phd_details || {};
  const appData = row.application_data || {};
  const appAcademic = appData.academic || {};
  return {
    ...row,
    personal: {
      full_name:     `${row.first_name} ${row.last_name}`.trim(),
      first_name:    row.first_name,
      last_name:     row.last_name,
      email:         row.email,
      phone:         row.phone,
      mobile:        row.phone,
      state_country: appData.personal?.state_country || appData.state_country || '',
    },
    academic: {
      // Map stored field names to the keys the frontend expects
      phd_discipline:      pd.subject      || pd.phd_discipline      || appAcademic.phd_discipline      || appAcademic.specialization || null,
      phd_research_title:  pd.thesis_title || pd.phd_research_title  || appAcademic.phd_research_title  || null,
      phd_completion_year: pd.year_awarded || pd.phd_completion_year || appAcademic.phd_completion_year || appAcademic.graduation_year || null,
      scopus_publications: pd.scopus_publications ?? appAcademic.scopus_publications ?? null,
      university:          pd.university   || appAcademic.university   || '—',
      highest_degree:      pd.highest_degree || appAcademic.highest_degree || 'Ph.D.',
      specialization:      pd.subject      || appAcademic.specialization || null,
      graduation_year:     pd.year_awarded || appAcademic.graduation_year || null,
    },
    research_statement: appData.research_statement || row.research_statement || null,
    last_reminded_at: appData.last_reminded_at || null,
    last_payment_reminded_at: appData.last_payment_reminded_at || null,
    rejected_from_status: row.rejected_from_status || null,
  };
};

export const listApplicants = async ({ course_id, batch_id, status, search, limit, offset }) => {
  const params = [];
  const conditions = [];
  if (course_id) { params.push(course_id); conditions.push(`a.course_id=$${params.length}`); }
  if (batch_id)  { params.push(batch_id);  conditions.push(`a.batch_id=$${params.length}`); }
  if (status)    { params.push(status);    conditions.push(`a.status=$${params.length}`); }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR a.email ILIKE $${params.length})`);
  }
  // An applicant only appears as 'enrolled' when a matching active
  // batch_enrollment exists (linked via applicant_id). Non-enrolled statuses are
  // untouched. Applied to both the list and its COUNT so the Enrolled tab and its
  // total stay in sync with active enrollments (no schema change).
  conditions.push(activeEnrolledClause('a'));
  const where = `WHERE ${conditions.join(' AND ')}`;
  const { rows: rawData } = await query(
    `SELECT a.*, b.name as batch_name, b.code as batch_code,
            ta.score          AS test_score,
            ta.submitted_at   AS test_submitted_at,
            ta.time_taken_secs AS test_time_taken_secs,
            t.total_marks     AS test_max_score,
            t.passing_marks   AS test_passing_marks,
            la.live_started_at    AS live_attempt_started_at,
            la.live_last_saved_at AS live_attempt_last_saved_at,
            COALESCE(la.live_is_active, false) AS test_in_progress
     FROM applicants a
     LEFT JOIN batches b ON b.id = a.batch_id
     LEFT JOIN LATERAL (
       SELECT score, submitted_at, time_taken_secs, test_id
       FROM test_attempts
       WHERE applicant_id = a.id AND status = 'submitted'
       ORDER BY submitted_at DESC NULLS LAST LIMIT 1
     ) ta ON true
     LEFT JOIN tests t ON t.id = ta.test_id
     LEFT JOIN LATERAL (
       -- Live attempt = an in_progress attempt still inside its allowed time window.
       -- Uses NOW() AT TIME ZONE 'UTC' to match started_at (stored UTC, no tz).
       SELECT ta2.started_at    AS live_started_at,
              ta2.last_saved_at AS live_last_saved_at,
              ((ta2.started_at + (t2.duration_minutes * INTERVAL '1 minute'))
                 > (NOW() AT TIME ZONE 'UTC')) AS live_is_active
       FROM test_attempts ta2
       JOIN tests t2 ON t2.id = ta2.test_id
       WHERE ta2.applicant_id = a.id AND ta2.status = 'in_progress'
       ORDER BY ta2.started_at DESC LIMIT 1
     ) la ON true
     ${where} ORDER BY a.applied_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
    [...params, limit, offset]
  );
  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*) AS total FROM applicants a ${where}`, params
  );
  const data = rawData.map(normalizeApplicant);
  return { data, total: parseInt(total) };
};

export const getApplicantById = async (id) => {
  const { rows } = await query(
    `SELECT a.*, b.name as batch_name,
            ta.score          AS test_score,
            ta.submitted_at   AS test_submitted_at,
            ta.time_taken_secs AS test_time_taken_secs,
            t.total_marks     AS test_max_score,
            la.live_started_at    AS live_attempt_started_at,
            la.live_last_saved_at AS live_attempt_last_saved_at,
            COALESCE(la.live_is_active, false) AS test_in_progress
     FROM applicants a
     LEFT JOIN batches b ON b.id = a.batch_id
     LEFT JOIN LATERAL (
       SELECT score, submitted_at, time_taken_secs, test_id
       FROM test_attempts
       WHERE applicant_id = a.id AND status = 'submitted'
       ORDER BY submitted_at DESC NULLS LAST LIMIT 1
     ) ta ON true
     LEFT JOIN tests t ON t.id = ta.test_id
     LEFT JOIN LATERAL (
       SELECT ta2.started_at    AS live_started_at,
              ta2.last_saved_at AS live_last_saved_at,
              ((ta2.started_at + (t2.duration_minutes * INTERVAL '1 minute'))
                 > (NOW() AT TIME ZONE 'UTC')) AS live_is_active
       FROM test_attempts ta2
       JOIN tests t2 ON t2.id = ta2.test_id
       WHERE ta2.applicant_id = a.id AND ta2.status = 'in_progress'
       ORDER BY ta2.started_at DESC LIMIT 1
     ) la ON true
     WHERE a.id=$1`, [id]
  );
  return rows[0] ? normalizeApplicant(rows[0]) : null;
};

export const createApplicant = async (payload) => {
  // Accept both flat fields and the frontend's nested personal/academic envelope
  const p = payload.personal || {};
  const a = payload.academic || {};
  const first_name = payload.first_name || p.first_name || '';
  const last_name  = payload.last_name  || p.last_name  || '';
  const email      = payload.email      || p.email      || '';
  const phone      = payload.phone      || p.phone      || p.mobile || null;
  const phd_details = payload.phd_details || {
    subject:      a.phd_discipline    || a.specialization || null,
    thesis_title: a.phd_research_title || null,
    year_awarded: a.phd_completion_year || a.graduation_year || null,
    university:   a.university || null,
    scopus_publications: a.scopus_publications ?? null,
    highest_degree: a.highest_degree || null,
  };
  // Preserve the full nested structure in application_data for future reference
  const application_data = {
    ...(payload.application_data || {}),
    personal: { ...p, state_country: p.state_country || null },
    academic: a,
    research_statement: payload.research_statement || null,
  };

  const { rows } = await query(
    `INSERT INTO applicants (course_id,batch_id,first_name,last_name,email,phone,phd_details,application_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [payload.course_id, payload.batch_id || null, first_name, last_name, email, phone,
     JSON.stringify(phd_details), JSON.stringify(application_data)]
  );
  return normalizeApplicant(rows[0]);
};

export const updateApplicantDetails = async (id, payload) => {
  const fields = [];
  const params = [];
  const allowed = ['first_name', 'last_name', 'email', 'phone'];
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      params.push(payload[key]);
      fields.push(`${key}=$${params.length}`);
    }
  }
  if (payload.phd_details !== undefined) {
    params.push(JSON.stringify(payload.phd_details));
    fields.push(`phd_details=$${params.length}::jsonb`);
  }
  if (payload.application_data !== undefined) {
    params.push(JSON.stringify(payload.application_data));
    fields.push(`application_data=$${params.length}::jsonb`);
  }
  if (payload.batch_id !== undefined) {
    params.push(payload.batch_id || null);
    fields.push(`batch_id=$${params.length}`);
  }
  if (!fields.length) return getApplicantById(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE applicants SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
    params
  );
  return rows[0] ? normalizeApplicant(rows[0]) : null;
};

export const updateApplicantStatus = async (id, { status, batch_id, remark }, reviewedBy) => {
  // Capture the current status BEFORE updating so callers can detect a real
  // transition (e.g. first entry into "shortlisted") and avoid duplicate side
  // effects on repeated same-status updates.
  const { rows: prev } = await query('SELECT status FROM applicants WHERE id=$1', [id]);
  if (!prev.length) return null;
  const previousStatus = prev[0].status;

  // Only touch rejection_remark when actually rejecting — leave any prior remark
  // intact on other transitions (e.g. reconsidering keeps the history).
  const setRemark = status === 'rejected';
  const remarkVal = setRemark ? (remark?.trim() || null) : null;

  // Build the SET clause dynamically so batch_id is ONLY overwritten when the
  // caller explicitly supplies one. The old query always ran `batch_id = $2`
  // with (batch_id || null), which silently WIPED the applicant's batch on any
  // status change that didn't re-send it — including Final Shortlist, which
  // sends no batch_id. A null batch then dropped the applicant out of every
  // batch-scoped list, so they vanished from the Final Shortlist after a reload.
  const sets = ['status=$1', 'reviewed_by=$2', 'reviewed_at=NOW()', 'updated_at=NOW()'];
  const params = [status, reviewedBy];

  const hasBatch = batch_id !== undefined && batch_id !== null && batch_id !== '';
  if (hasBatch) {
    params.push(batch_id);
    sets.push(`batch_id=$${params.length}`);
  }
  if (setRemark) {
    params.push(remarkVal);
    sets.push(`rejection_remark=$${params.length}`);
    // Record the stage the candidate was rejected FROM (for the Rejected basket's
    // "Shortlisted → Rejected" label). Skip if they were already rejected so a
    // repeat action can't overwrite it with 'rejected'.
    if (previousStatus !== 'rejected') {
      params.push(previousStatus);
      sets.push(`rejected_from_status=$${params.length}`);
    }
  } else if (previousStatus === 'rejected') {
    // Reconsidered back into the pipeline → clear the from-stage marker so a stale
    // "rejected from X" label never lingers on an active applicant.
    sets.push('rejected_from_status=NULL');
  }
  params.push(id);

  const { rows } = await query(
    `UPDATE applicants SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) return null;
  const applicant = normalizeApplicant(rows[0]);
  applicant.previous_status = previousStatus;
  return applicant;
};

export const convertToStudent = async (applicantId, { batch_id, enrollment_number, rotate_password = true }, enrolledBy) => {
  const { default: bcrypt } = await import('bcryptjs');
  const { randomBytes } = await import('crypto');
  const genPassword = () => randomBytes(6).toString('base64url').slice(0, 10);

  const client = await getClient();
  let plainPassword = null;
  try {
    await client.query('BEGIN');
    const { rows: [applicant] } = await client.query('SELECT * FROM applicants WHERE id=$1', [applicantId]);
    if (!applicant) throw new Error('Applicant not found');

    let userId = applicant.user_id;
    if (!userId) {
      // Always create with a REAL password — never the PENDING_SETUP lockout
      plainPassword = genPassword();
      const hash = await bcrypt.hash(plainPassword, 10);
      const { rows: [user] } = await client.query(
        `INSERT INTO users (email,password_hash,first_name,last_name,is_active,email_verified)
         VALUES ($1,$2,$3,$4,true,false) RETURNING id`,
        [applicant.email, hash, applicant.first_name, applicant.last_name]
      );
      userId = user.id;
      await client.query('UPDATE applicants SET user_id=$1 WHERE id=$2', [userId, applicantId]);
    } else if (rotate_password) {
      // Existing account (e.g. from the test flow): issue fresh scholar credentials
      plainPassword = genPassword();
      const hash = await bcrypt.hash(plainPassword, 10);
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);
    }

    const enrNum = enrollment_number || `ENR-${Date.now()}`;
    await client.query(
      `INSERT INTO batch_enrollments (batch_id,user_id,applicant_id,enrollment_number,enrolled_by)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [batch_id, userId, applicantId, enrNum, enrolledBy]
    );

    const { rows: [role] } = await client.query(`SELECT id FROM roles WHERE name='student'`);
    if (role) {
      await client.query(
        `INSERT INTO user_roles (user_id,role_id,batch_id,assigned_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [userId, role.id, batch_id, enrolledBy]
      );
    }

    await client.query(
      `UPDATE applicants SET status='enrolled', batch_id=$1, updated_at=NOW() WHERE id=$2`,
      [batch_id, applicantId]
    );
    await client.query('COMMIT');
    return { user_id: userId, enrollment_number: enrNum, password: plainPassword, applicant };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
