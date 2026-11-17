const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[Unhandled Error] ${req.method} ${req.url}:`, err.stack || err.message);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFound,
};
