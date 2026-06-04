import * as svc from './courses.service.js';
import { ok, created, notFound, noContent } from '../../utils/response.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getPagination, buildPaginationMeta } from '../../utils/pagination.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const is_active = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
  const { data, total } = await svc.listCourses({ is_active, limit, offset });
  res.json({ success: true, data, pagination: buildPaginationMeta(total, page, limit) });
});

export const getOne = asyncHandler(async (req, res) => {
  const course = await svc.getCourseById(req.params.id);
  if (!course) return notFound(res, 'Course not found');
  ok(res, course);
});

export const create = asyncHandler(async (req, res) => {
  const course = await svc.createCourse(req.body, req.user.id);
  created(res, course, 'Course created');
});

export const update = asyncHandler(async (req, res) => {
  const course = await svc.updateCourse(req.params.id, req.body);
  if (!course) return notFound(res, 'Course not found');
  ok(res, course, 'Course updated');
});

export const remove = asyncHandler(async (req, res) => {
  await svc.deleteCourse(req.params.id);
  noContent(res);
});

export const dashboard = asyncHandler(async (req, res) => {
  const data = await svc.getCourseDashboard(req.params.id);
  ok(res, data);
});
