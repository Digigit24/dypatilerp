export const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

export const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

export const buildOrderClause = (query, allowedFields, defaultField = 'created_at') => {
  const field = allowedFields.includes(query.sort_by) ? query.sort_by : defaultField;
  const dir = query.sort_dir === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${field} ${dir}`;
};
