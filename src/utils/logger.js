/**
 * Logger Utility
 * Centralized logging for the application
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

class Logger {
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    console.log(`[${timestamp}] [INFO] ${message}${logData}`);
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {*} data - Additional data
   */
  static error(message, error = null, data = null) {
    const timestamp = new Date().toISOString();
    const errorStack = error?.stack ? ` | Stack: ${error.stack}` : '';
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    console.error(`[${timestamp}] [ERROR] ${message}${errorStack}${logData}`);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {*} data - Additional data
   */
  static warn(message, data = null) {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    console.warn(`[${timestamp}] [WARN] ${message}${logData}`);
  }

  /**
   * Log debug message (only in development)
   * @param {string} message - Debug message
   * @param {*} data - Additional data
   */
  static debug(message, data = null) {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
      console.debug(`[${timestamp}] [DEBUG] ${message}${logData}`);
    }
  }

  /**
   * Log HTTP request
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  static http(method, path, statusCode, duration = null) {
    const timestamp = new Date().toISOString();
    const durationStr = duration ? ` | Duration: ${duration}ms` : '';
    console.log(`[${timestamp}] [HTTP] ${method} ${path} | Status: ${statusCode}${durationStr}`);
  }
}

module.exports = Logger;

