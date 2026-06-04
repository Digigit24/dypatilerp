export const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

export const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

export const paginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

export const noContent = (res) => res.status(204).send();

export const badRequest = (res, message = 'Bad request', errors = []) =>
  res.status(400).json({ success: false, message, errors });

export const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, message });

export const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, message });

export const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, message });

export const conflict = (res, message = 'Conflict') =>
  res.status(409).json({ success: false, message });

export const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, message });
