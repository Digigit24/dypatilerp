import * as svc from './batches.service.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { data, total } = await svc.listBatches({ ...req.query, limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const batch = await svc.getBatchById(req.params.id);
  if (!batch) return notFound(res, 'Batch not found');
  ok(res, batch);
});

export const create = asyncHandler(async (req, res) => {
  const batch = await svc.createBatch(req.body, req.user.id);
  created(res, batch, 'Batch created');
});

export const update = asyncHandler(async (req, res) => {
  const batch = await svc.updateBatch(req.params.id, req.body);
  if (!batch) return notFound(res, 'Batch not found');
  ok(res, batch, 'Batch updated');
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteBatch(req.params.id);
  noContent(res);
});

export const students = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { data, total } = await svc.getBatchStudents(req.params.id, { limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const stats = asyncHandler(async (req, res) => {
  const data = await svc.getBatchStats(req.params.id);
  ok(res, data);
});

export const updateApprovalConfig = asyncHandler(async (req, res) => {
  const { stages } = req.body;
  if (!Array.isArray(stages)) {
    return res.status(400).json({ success: false, message: 'stages must be an array' });
  }
  const batch = await svc.updateApprovalConfig(req.params.id, stages);
  if (!batch) return notFound(res, 'Batch not found');
  ok(res, batch, 'Approval workflow saved');
});
