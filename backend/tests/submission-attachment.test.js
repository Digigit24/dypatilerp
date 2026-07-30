import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ── Mock auth/rbac/validate like the other route tests ──────────────────────
vi.mock('../src/middleware/auth.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: req.headers['x-test-userid'], roles: (req.headers['x-test-roles'] || '').split(',').filter(Boolean) };
    next();
  },
  optionalAuth: (req, _res, next) => next(),
}));
vi.mock('../src/middleware/rbac.js', () => ({
  requirePermission: () => (_req, _res, next) => next(),
  requireRole: () => (_req, _res, next) => next(),
  isOwnScope: () => false,
  allowedBatchIds: () => null,
}));
vi.mock('../src/middleware/validate.js', () => ({ validate: () => (_req, _res, next) => next() }));

// ── Mock ONLY object storage; DB stays real (throwaway Postgres) ────────────
const uploaded = [];
const deleted = [];
vi.mock('../src/services/s3.js', () => ({
  isConfigured: () => true,
  buildVideoKey: (c, id, f) => `${c}/${id}/${f}`,
  uploadFile: vi.fn(async (key) => { uploaded.push(key); return {}; }),
  deleteObject: vi.fn(async (key) => { deleted.push(key); return {}; }),
  headObject: vi.fn(),
  presignedUploadUrl: vi.fn(),
}));

import submissionsRouter from '../src/modules/submissions/submissions.routes.js';
import { query } from '../src/config/database.js';
import * as subSvc from '../src/modules/submissions/submissions.service.js';
import * as videosSvc from '../src/modules/videos/videos.service.js';
import * as s3 from '../src/services/s3.js';

const app = express();
app.use('/api/submissions', submissionsRouter);
app.use((err, _req, res, _next) => res.status(err.status || 500).json({ success: false, message: err.message }));

// Valid magic-byte bodies for each allowed type.
const PDF  = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n', 'latin1');
const PPTX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]);
const PPT  = Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(64)]);

let student, other, admin, batch;

const uid = async (role) => (await query(
  `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.name=$1 ORDER BY u.email LIMIT 1`, [role])).rows[0].id;

const makeDraft = async (type = 'progress_report', ownerId = student.id, createdBy = ownerId) =>
  subSvc.createSubmission({ batch_id: batch, title: 'attach test', submission_type: type, semester: 1 }, ownerId, createdBy);

const post = (subId, buf, filename, contentType, user) =>
  request(app).post(`/api/submissions/${subId}/attachment`)
    .set('x-test-userid', user.id).set('x-test-roles', user.roles.join(','))
    .attach('file', buf, { filename, contentType });

const videosFor = async (subId) => (await query(`SELECT * FROM videos WHERE submission_id=$1`, [subId])).rows;
const fileUrls = async (subId) => { const r = (await query(`SELECT file_urls FROM submissions WHERE id=$1`, [subId])).rows[0].file_urls; return Array.isArray(r) ? r : JSON.parse(r || '[]'); };

beforeAll(async () => {
  admin = { id: await uid('admin'), roles: ['admin'] };
  batch = (await query(`SELECT id FROM batches WHERE code='ABRF-2024-A'`)).rows[0].id;
  student = { id: (await query(
    `SELECT be.user_id FROM batch_enrollments be JOIN user_roles ur ON ur.user_id=be.user_id
     JOIN roles r ON r.id=ur.role_id AND r.name='student' WHERE be.batch_id=$1 AND be.status='active' LIMIT 1`, [batch])).rows[0].user_id, roles: ['student'] };
  other = { id: (await query(
    `SELECT be.user_id FROM batch_enrollments be JOIN user_roles ur ON ur.user_id=be.user_id
     JOIN roles r ON r.id=ur.role_id AND r.name='student' WHERE be.batch_id<>$1 AND be.status='active' LIMIT 1`, [batch])).rows[0].user_id, roles: ['student'] };
});

afterEach(() => { uploaded.length = 0; deleted.length = 0; vi.restoreAllMocks(); s3.uploadFile.mockImplementation(async (k) => { uploaded.push(k); return {}; }); s3.deleteObject.mockImplementation(async (k) => { deleted.push(k); return {}; }); });

describe('POST /submissions/:id/attachment (server-proxied)', () => {
  it('student uploads a PDF → stored, private, ready, bound; descriptor added', async () => {
    const d = await makeDraft();
    const res = await post(d.id, PDF, 'report.pdf', 'application/pdf', student);
    expect(res.status).toBe(200);
    const vids = await videosFor(d.id);
    expect(vids.length).toBe(1);
    expect(vids[0].upload_status).toBe('ready');
    expect(vids[0].visibility).toBe('private');
    expect(uploaded.length).toBe(1);
    const fu = await fileUrls(d.id);
    expect(fu.length).toBe(1);
    expect(fu[0].media_id).toBe(vids[0].id);       // media_id === videos.id
    expect(fu[0].type).toBe('pdf');
    expect(fu[0].object_key).toBeUndefined();       // object_key not exposed
  });

  it('admin uploads on behalf (draft owned by scholar) → 200', async () => {
    const d = await makeDraft('progress_report', student.id, admin.id);
    const res = await post(d.id, PPTX, 'deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', admin);
    expect(res.status).toBe(200);
    expect((await videosFor(d.id)).length).toBe(1);
  });

  it('accepts PPT (legacy OLE)', async () => {
    const d = await makeDraft();
    const res = await post(d.id, PPT, 'old.ppt', 'application/vnd.ms-powerpoint', student);
    expect(res.status).toBe(200);
  });

  it('rejects MP4 (extension/mime not allowed) → 400, nothing stored', async () => {
    const d = await makeDraft();
    const res = await post(d.id, Buffer.from('\x00\x00\x00\x18ftypmp42'), 'v.mp4', 'video/mp4', student);
    expect(res.status).toBe(400);
    expect((await videosFor(d.id)).length).toBe(0);
    expect(uploaded.length).toBe(0);
  });

  it('rejects .exe → 400', async () => {
    const d = await makeDraft();
    const res = await post(d.id, PDF, 'x.exe', 'application/pdf', student);
    expect(res.status).toBe(400);
  });

  it('rejects content/extension mismatch (.pdf without %PDF header) → 400', async () => {
    const d = await makeDraft();
    const res = await post(d.id, Buffer.from('not really a pdf'), 'fake.pdf', 'application/pdf', student);
    expect(res.status).toBe(400);
    expect(uploaded.length).toBe(0);
  });

  it('rejects a file over 25MB → 400, nothing stored', async () => {
    const d = await makeDraft();
    const big = Buffer.concat([PDF, Buffer.alloc(26 * 1024 * 1024)]);
    const res = await post(d.id, big, 'big.pdf', 'application/pdf', student);
    expect(res.status).toBe(400);
    expect((await videosFor(d.id)).length).toBe(0);
  });

  it('unauthorized caller (unrelated student) → 403', async () => {
    const d = await makeDraft();
    const res = await post(d.id, PDF, 'r.pdf', 'application/pdf', other);
    expect(res.status).toBe(403);
    expect((await videosFor(d.id)).length).toBe(0);
  });

  it('non progress_report submission → 400', async () => {
    const d = await makeDraft('research_paper');
    const res = await post(d.id, PDF, 'r.pdf', 'application/pdf', student);
    expect(res.status).toBe(400);
  });

  it('non-draft submission → 400', async () => {
    const d = await makeDraft();
    await query(`UPDATE submissions SET status='submitted' WHERE id=$1`, [d.id]);
    const res = await post(d.id, PDF, 'r.pdf', 'application/pdf', student);
    expect(res.status).toBe(400);
  });

  it('Zata upload failure → no DB media, no descriptor', async () => {
    const d = await makeDraft();
    s3.uploadFile.mockImplementationOnce(async () => { throw new Error('zata down'); });
    const res = await post(d.id, PDF, 'r.pdf', 'application/pdf', student);
    expect(res.status).toBe(500);
    expect((await videosFor(d.id)).length).toBe(0);
    expect((await fileUrls(d.id)).length).toBe(0);
  });

  it('DB media-create failure after upload → uploaded object deleted, no descriptor', async () => {
    const d = await makeDraft();
    vi.spyOn(videosSvc, 'createVideo').mockRejectedValueOnce(new Error('db boom'));
    const res = await post(d.id, PDF, 'r.pdf', 'application/pdf', student);
    expect(res.status).toBe(500);
    expect(uploaded.length).toBe(1);
    expect(deleted.length).toBe(1);              // compensating delete ran
    expect(deleted[0]).toBe(uploaded[0]);
    expect((await videosFor(d.id)).length).toBe(0);
    expect((await fileUrls(d.id)).length).toBe(0);
  });
});
