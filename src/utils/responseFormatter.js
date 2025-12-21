/**
 * API Response Formatter
 * Standardizes API responses across the application
 */

const { HTTP_STATUS } = require('./constants');

class ResponseFormatter {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} errors - Additional error details
   */
  static error(res, message = 'An error occurred', statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) {
    const response = {
      success: false,
      message
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Success message
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 10,
        totalPages: pagination.totalPages || 1,
        totalItems: pagination.totalItems || 0
      }
    });
  }
}

module.exports = ResponseFormatter;

