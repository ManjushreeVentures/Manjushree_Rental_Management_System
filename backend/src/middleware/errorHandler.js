export function errorHandler(err, req, res, next) {
  console.error('❌', err.message);
  res.status(err.status ?? 500).json({
    success: false,
    message: err.message ?? 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}