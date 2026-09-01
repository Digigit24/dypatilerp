import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, badRequest, forbidden } from '../../utils/response.js';
import * as svc from './admission-letter.service.js';
import { query } from '../../config/database.js';

// GET is gated with requirePermission('students','read'), which a
// batch-scoped role (guide/mentor) can hold — unlike the requireRole-gated
// mutating routes below, where 'admin'/'coordinator' are always all-scope in
// this app's model. Mirror GET /students' own scope check so a batch-scoped
// grant can't be used to read another batch's roster by guessing its id.
const assertBatchInScope = (req, res) => {
  if (req.perm?.scope === 'batch' && !req.perm.batchIds.includes(req.params.id)) {
    forbidden(res, 'You do not have access to this batch.');
    return false;
  }
  return true;
};

export const getRoster = asyncHandler(async (req, res) => {
  if (!assertBatchInScope(req, res)) return;
  const roster = await svc.getBatchLetterStatus(req.params.id);
  ok(res, roster);
});

/** Kicks off generation in the background and returns immediately — poll getGenerateAllStatus for progress. */
export const generateAll = asyncHandler(async (req, res) => {
  const { letterRefPrefix } = req.body || {};
  const { rows: [batch] } = await query('SELECT letter_ref_prefix FROM batches WHERE id=$1', [req.params.id]);
  if (!batch) return badRequest(res, 'Batch not found');
  if (!letterRefPrefix?.trim() && !batch.letter_ref_prefix?.trim()) {
    return badRequest(res, 'Set a Ref No. prefix for this batch before generating letters.');
  }
  const job = await svc.startGenerateAllJob({ batchId: req.params.id, letterRefPrefix, adminUserId: req.user.id });
  ok(res, job, `Generating letters for ${job.total} scholar(s)…`);
});

export const getGenerateAllStatus = asyncHandler(async (req, res) => {
  if (!assertBatchInScope(req, res)) return;
  const job = svc.getGenerateAllJobStatus(req.params.id);
  ok(res, job || { status: 'idle', total: 0, processed: 0, generated: [], skipped: [] });
});

export const generateOne = asyncHandler(async (req, res) => {
  const { rows: [batch] } = await query('SELECT letter_ref_prefix FROM batches WHERE id=$1', [req.params.id]);
  if (!batch?.letter_ref_prefix?.trim()) {
    return badRequest(res, 'Set a Ref No. prefix for this batch before generating letters.');
  }
  const assets = await svc.getLetterheadAssets();
  const result = await svc.generateForScholar({ userId: req.params.userId, batchId: req.params.id, assets, adminUserId: req.user.id });
  if (result.status === 'skipped') return badRequest(res, result.reason);
  ok(res, result, 'Letter generated');
});

/** Kicks off emailing in the background and returns immediately — poll getEmailAllStatus for progress. */
export const emailAll = asyncHandler(async (req, res) => {
  const job = await svc.startEmailAllJob({ batchId: req.params.id });
  ok(res, job, `Emailing ${job.total} scholar(s)…`);
});

export const getEmailAllStatus = asyncHandler(async (req, res) => {
  if (!assertBatchInScope(req, res)) return;
  const job = svc.getEmailAllJobStatus(req.params.id);
  ok(res, job || { status: 'idle', total: 0, processed: 0, sent: [], skipped: [] });
});

export const emailOne = asyncHandler(async (req, res) => {
  const result = await svc.sendLetterEmail(req.params.userId);
  if (result.status !== 'sent') return badRequest(res, result.reason || 'Could not send email');
  ok(res, result, 'Email sent');
});

export const publishAll = asyncHandler(async (req, res) => {
  const result = await svc.publishAllInBatch(req.params.id);
  ok(res, result, `Published ${result.published.length} letter(s)`);
});

/** Also backs the per-row "Publish" button — called with a single-element array. */
export const publishSelected = asyncHandler(async (req, res) => {
  const userIds = Array.isArray(req.body?.user_ids) ? req.body.user_ids : [];
  if (!userIds.length) return badRequest(res, 'No scholars selected.');
  const published = await svc.publishMany(userIds);
  ok(res, { published }, `Published ${published.length} letter(s)`);
});

/** Deletes every unpublished admission-letter draft across the batch. Published versions are never touched. */
export const deleteAllDrafts = asyncHandler(async (req, res) => {
  const result = await svc.deleteAllDraftsInBatch(req.params.id);
  ok(res, result, `Deleted ${result.deleted} draft(s)`);
});
