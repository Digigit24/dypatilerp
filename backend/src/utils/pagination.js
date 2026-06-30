export const getPagination = (query) => {
  const limit = Math.min(2000, Math.max(1, parseInt(query.limit) || 20));

  // Support both pagination styles:
  // page-based:   ?page=2&limit=100
  // offset-based: ?offset=100&limit=100
  // Load more / infinite scroll usually sends offset.
  const hasOffset =
    query.offset !== undefined &&
    query.offset !== '' &&
    query.offset !== null;

  let offset;
  let page;

  if (hasOffset) {
    offset = Math.max(0, parseInt(query.offset) || 0);
    page = Math.floor(offset / limit) + 1;
  } else {
    page = Math.max(1, parseInt(query.page) || 1);
    offset = (page - 1) * limit;
  }

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
