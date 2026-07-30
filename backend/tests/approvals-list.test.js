import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { query } from '../src/config/database.js';
import { listApprovals } from '../src/modules/approvals/approvals.service.js';

// Exercises the additive scholar/batch/course fields + course/batch filters +
// RBAC (allowed_batch_ids) AND-combination in listApprovals. Uses the throwaway DB.

const uid = async (role) => (await query(
  `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name=$1 ORDER BY u.email LIMIT 1`, [role])).rows[0].id;

let subId, studentId, adminId, batchId, otherBatchId, courseId, otherCourseId, studentRow, adminRow, batchRow, courseRow;

beforeAll(async () => {
  adminId = await uid('admin');
  const b = (await query(`SELECT id, name, course_id FROM batches WHERE code='ABRF-2024-A'`)).rows[0];
  batchId = b.id; courseId = b.course_id;
  const ob = (await query(`SELECT id, course_id FROM batches WHERE course_id <> $1 LIMIT 1`, [courseId])).rows[0];
  otherBatchId = ob.id; otherCourseId = ob.course_id;
  studentId = (await query(
    `SELECT be.user_id FROM batch_enrollments be JOIN user_roles ur ON ur.user_id=be.user_id
     JOIN roles r ON r.id=ur.role_id AND r.name='student' WHERE be.batch_id=$1 AND be.status='active' LIMIT 1`, [batchId])).rows[0].user_id;

  studentRow = (await query(`SELECT first_name, last_name, email FROM users WHERE id=$1`, [studentId])).rows[0];
  adminRow   = (await query(`SELECT first_name, last_name FROM users WHERE id=$1`, [adminId])).rows[0];
  batchRow   = (await query(`SELECT name FROM batches WHERE id=$1`, [batchId])).rows[0];
  courseRow  = (await query(`SELECT name FROM courses WHERE id=$1`, [courseId])).rows[0];

  const { rows: [s] } = await query(
    `INSERT INTO submissions (batch_id, student_user_id, title, submission_type, semester, status)
     VALUES ($1,$2,'Approvals List Test Report','progress_report',1,'submitted') RETURNING id`,
    [batchId, studentId]
  );
  subId = s.id;
  await query(
    `INSERT INTO approvals (submission_id, stage, status, order_index, reviewer_user_id, reviewer_role)
     VALUES ($1,'coordinator','pending',1,$2,'admin')`,
    [subId, adminId]
  );
});

afterAll(async () => {
  await query(`DELETE FROM approvals WHERE submission_id=$1`, [subId]);
  await query(`DELETE FROM submissions WHERE id=$1`, [subId]);
});

const listForSub = (extra = {}) => listApprovals({ submission_id: subId, limit: 50, offset: 0, ...extra });

describe('listApprovals — scholar/batch/course + filters', () => {
  it('returns the scholar name/email, batch name, course name, and reviewer aliases', async () => {
    const { data } = await listForSub();
    expect(data.length).toBe(1);
    const r = data[0];
    expect(r.student_first_name).toBe(studentRow.first_name);
    expect(r.student_last_name).toBe(studentRow.last_name);
    expect(r.student_email).toBe(studentRow.email);
    expect(r.batch_name).toBe(batchRow.name);
    expect(r.course_name).toBe(courseRow.name);
    expect(r.reviewer_first_name).toBe(adminRow.first_name);
    expect(r.reviewer_last_name).toBe(adminRow.last_name);
    expect(r.title).toBe('Approvals List Test Report');
    expect(r.student_user_id).toBe(studentId);
  });

  it('filters by batch_id (matches its batch; excludes another)', async () => {
    expect((await listForSub({ batch_id: batchId })).data.length).toBe(1);
    expect((await listForSub({ batch_id: otherBatchId })).data.length).toBe(0);
  });

  it('filters by course_id (matches its course; excludes another)', async () => {
    expect((await listForSub({ course_id: courseId })).data.length).toBe(1);
    expect((await listForSub({ course_id: otherCourseId })).data.length).toBe(0);
  });

  it('RBAC allowed_batch_ids still applies and AND-combines with the picker', async () => {
    expect((await listForSub({ allowed_batch_ids: [batchId] })).data.length).toBe(1);
    expect((await listForSub({ allowed_batch_ids: [otherBatchId] })).data.length).toBe(0);
    // RBAC restricts to other batch → picker asking for our batch yields nothing (AND).
    expect((await listForSub({ allowed_batch_ids: [otherBatchId], batch_id: batchId })).data.length).toBe(0);
    expect((await listForSub({ allowed_batch_ids: [batchId], batch_id: batchId })).data.length).toBe(1);
  });
});
