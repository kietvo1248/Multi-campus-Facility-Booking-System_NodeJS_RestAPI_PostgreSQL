/**
 * Date and Time Utilities
 * Helper functions for date/time operations
 */

const { addDays, addHours, addMinutes, format, parseISO, isBefore, isAfter, differenceInMinutes, differenceInHours } = require('date-fns');

class DateUtils {
  /**
   * Format date to ISO string
   * @param {Date} date - Date to format
   * @returns {string} ISO string
   */
  static toISO(date) {
    return date instanceof Date ? date.toISOString() : parseISO(date);
  }

  /**
   * Get start of day
   * @param {Date} date - Date
   * @returns {Date} Start of day
   */
  static startOfDay(date) {
    const d = date instanceof Date ? date : parseISO(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Get end of day
   * @param {Date} date - Date
   * @returns {Date} End of day
   */
  static endOfDay(date) {
    const d = date instanceof Date ? date : parseISO(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Check if date is in the past
   * @param {Date} date - Date to check
   * @returns {boolean}
   */
  static isPast(date) {
    return isBefore(date, new Date());
  }

  /**
   * Check if date is in the future
   * @param {Date} date - Date to check
   * @returns {boolean}
   */
  static isFuture(date) {
    return isAfter(date, new Date());
  }

  /**
   * Add days to date
   * @param {Date} date - Base date
   * @param {number} days - Number of days to add
   * @returns {Date} New date
   */
  static addDays(date, days) {
    return addDays(date instanceof Date ? date : parseISO(date), days);
  }

  /**
   * Add hours to date
   * @param {Date} date - Base date
   * @param {number} hours - Number of hours to add
   * @returns {Date} New date
   */
  static addHours(date, hours) {
    return addHours(date instanceof Date ? date : parseISO(date), hours);
  }

  /**
   * Add minutes to date
   * @param {Date} date - Base date
   * @param {number} minutes - Number of minutes to add
   * @returns {Date} New date
   */
  static addMinutes(date, minutes) {
    return addMinutes(date instanceof Date ? date : parseISO(date), minutes);
  }

  /**
   * Calculate difference in minutes between two dates
   * @param {Date} dateLeft - First date
   * @param {Date} dateRight - Second date
   * @returns {number} Difference in minutes
   */
  static diffInMinutes(dateLeft, dateRight) {
    return differenceInMinutes(
      dateLeft instanceof Date ? dateLeft : parseISO(dateLeft),
      dateRight instanceof Date ? dateRight : parseISO(dateRight)
    );
  }

  /**
   * Calculate difference in hours between two dates
   * @param {Date} dateLeft - First date
   * @param {Date} dateRight - Second date
   * @returns {number} Difference in hours
   */
  static diffInHours(dateLeft, dateRight) {
    return differenceInHours(
      dateLeft instanceof Date ? dateLeft : parseISO(dateLeft),
      dateRight instanceof Date ? dateRight : parseISO(dateRight)
    );
  }

  /**
   * Format date to string
   * @param {Date} date - Date to format
   * @param {string} formatStr - Format string
   * @returns {string} Formatted date string
   */
  static format(date, formatStr = 'yyyy-MM-dd') {
    return format(date instanceof Date ? date : parseISO(date), formatStr);
  }

  /**
   * Check if date is today
   * @param {Date} date - Date to check
   * @returns {boolean}
   */
  static isToday(date) {
    const d = date instanceof Date ? date : parseISO(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  /**
   * Get current date/time
   * @returns {Date} Current date
   */
  static now() {
    return new Date();
  }
}

module.exports = DateUtils;

