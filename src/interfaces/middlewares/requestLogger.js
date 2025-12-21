/**
 * Request Logger Middleware
 * Logs all incoming HTTP requests
 */

const Logger = require('../../utils/logger');

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  Logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    Logger.http(req.method, req.path, res.statusCode, duration);
  });

  next();
};

module.exports = requestLogger;

