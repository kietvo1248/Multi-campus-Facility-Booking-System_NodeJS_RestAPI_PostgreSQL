/**
 * Sanitization Utilities
 * Functions to sanitize user inputs
 */

/**
 * Sanitize string input
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize object by removing undefined, null, and empty string values
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return {};
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
}

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string} Sanitized email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Sanitize integer input
 * @param {*} value - Value to sanitize
 * @param {number} defaultValue - Default value if invalid
 * @returns {number} Sanitized integer
 */
function sanitizeInteger(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isInteger(num) ? num : defaultValue;
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeEmail,
  sanitizeInteger
};

