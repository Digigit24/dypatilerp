import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err);

  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate entry – record already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Referenced record does not exist.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(env.isDev && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};
