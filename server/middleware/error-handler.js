export function errorHandler(err, req, res, next) {
  console.error('[Server Error]:', err.message);

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Server error';

  res.status(status).json({ error: message });
}
