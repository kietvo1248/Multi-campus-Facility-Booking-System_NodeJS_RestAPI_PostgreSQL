/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 */

const Logger = require('./logger');
const ResponseFormatter = require('./responseFormatter');
const { HTTP_STATUS } = require('./constants');

/**
 * Wrap async route handler to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      Logger.error('Async handler error', error, {
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
      
      // Let error handler middleware handle it
      next(error);
    });
  };
};

module.exports = asyncHandler;

