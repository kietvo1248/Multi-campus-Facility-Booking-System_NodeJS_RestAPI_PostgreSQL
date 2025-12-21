/**
 * Input Validation Utilities
 * Common validation functions for request inputs
 */

const { AppError } = require('../interfaces/middlewares/errorHandler');
const { HTTP_STATUS } = require('./constants');

class Validators {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate required fields
   * @param {Object} data - Data object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @throws {AppError} If validation fails
   */
  static validateRequired(data, requiredFields) {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missingFields.length > 0) {
      throw new AppError(
        `Missing required fields: ${missingFields.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
  }

  /**
   * Validate email
   * @param {string} email - Email to validate
   * @throws {AppError} If validation fails
   */
  static validateEmail(email) {
    if (!email || !this.isValidEmail(email)) {
      throw new AppError('Invalid email format', HTTP_STATUS.BAD_REQUEST);
    }
  }

  /**
   * Validate numeric ID
   * @param {*} id - ID to validate
   * @param {string} fieldName - Field name for error message
   * @returns {number} Validated numeric ID
   * @throws {AppError} If validation fails
   */
  static validateId(id, fieldName = 'ID') {
    const numId = Number(id);
    if (Number.isNaN(numId) || numId <= 0 || !Number.isInteger(numId)) {
      throw new AppError(`Invalid ${fieldName}`, HTTP_STATUS.BAD_REQUEST);
    }
    return numId;
  }

  /**
   * Validate date
   * @param {*} date - Date to validate
   * @param {string} fieldName - Field name for error message
   * @returns {Date} Validated date object
   * @throws {AppError} If validation fails
   */
  static validateDate(date, fieldName = 'Date') {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new AppError(`Invalid ${fieldName}`, HTTP_STATUS.BAD_REQUEST);
    }
    return dateObj;
  }

  /**
   * Validate date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @throws {AppError} If validation fails
   */
  static validateDateRange(startDate, endDate) {
    if (startDate >= endDate) {
      throw new AppError('Start date must be before end date', HTTP_STATUS.BAD_REQUEST);
    }
  }

  /**
   * Validate pagination parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Object} Validated pagination object
   */
  static validatePagination(page, pageSize) {
    const DEFAULT_PAGE_SIZE = 10;
    const MAX_PAGE_SIZE = 100;

    const validPage = Math.max(1, Number(page) || 1);
    let validPageSize = Number(pageSize) || DEFAULT_PAGE_SIZE;
    validPageSize = Math.min(Math.max(1, validPageSize), MAX_PAGE_SIZE);

    return {
      page: validPage,
      pageSize: validPageSize,
      skip: (validPage - 1) * validPageSize
    };
  }

  /**
   * Validate string length
   * @param {string} str - String to validate
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @param {string} fieldName - Field name for error message
   * @throws {AppError} If validation fails
   */
  static validateStringLength(str, minLength, maxLength, fieldName = 'String') {
    if (!str || typeof str !== 'string') {
      throw new AppError(`Invalid ${fieldName}`, HTTP_STATUS.BAD_REQUEST);
    }
    if (str.length < minLength) {
      throw new AppError(`${fieldName} must be at least ${minLength} characters`, HTTP_STATUS.BAD_REQUEST);
    }
    if (str.length > maxLength) {
      throw new AppError(`${fieldName} must be at most ${maxLength} characters`, HTTP_STATUS.BAD_REQUEST);
    }
  }
}

module.exports = Validators;

