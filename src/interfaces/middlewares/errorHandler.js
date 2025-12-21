/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const Logger = require('../../utils/logger');
const ResponseFormatter = require('../../utils/responseFormatter');
const { HTTP_STATUS } = require('../../utils/constants');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  Logger.error('Error occurred', err, {
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return ResponseFormatter.error(
      res,
      'Duplicate entry. This record already exists.',
      HTTP_STATUS.CONFLICT
    );
  }

  if (err.code === 'P2003') {
    return ResponseFormatter.error(
      res,
      'Foreign key constraint failed. Related record does not exist.',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (err.code === 'P2025') {
    return ResponseFormatter.error(
      res,
      'Record not found.',
      HTTP_STATUS.NOT_FOUND
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseFormatter.error(
      res,
      'Invalid token.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  if (err.name === 'TokenExpiredError') {
    return ResponseFormatter.error(
      res,
      'Token has expired.',
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseFormatter.error(
      res,
      err.message || 'Validation error',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Custom application errors
  if (err instanceof AppError) {
    return ResponseFormatter.error(
      res,
      err.message,
      err.statusCode
    );
  }

  // Default error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  return ResponseFormatter.error(res, message, statusCode);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  ResponseFormatter.error(
    res,
    `Route ${req.method} ${req.path} not found`,
    HTTP_STATUS.NOT_FOUND
  );
};

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError
};

