/**
 * Application Constants
 * Centralized constants for the Facility Booking System
 */

module.exports = {
  // User Roles
  ROLES: {
    ADMIN: 'ADMIN',
    LECTURER: 'LECTURER',
    STUDENT: 'STUDENT',
    FACILITY_ADMIN: 'FACILITY_ADMIN',
    CAMPUS_ADMIN: 'CAMPUS_ADMIN',
    SECURITY_GUARD: 'SECURITY_GUARD',
    CLUB_LEADER: 'CLUB_LEADER'
  },

  // Booking Status
  BOOKING_STATUS: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED'
  },

  // Facility Status
  FACILITY_STATUS: {
    ACTIVE: 'ACTIVE',
    MAINTENANCE: 'MAINTENANCE',
    INACTIVE: 'INACTIVE'
  },

  // Report Status
  REPORT_STATUS: {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected'
  },

  // Report Category
  REPORT_CATEGORY: {
    INCIDENT: 'INCIDENT',
    DAMAGE: 'DAMAGE',
    CLEANING: 'CLEANING',
    OTHER: 'OTHER'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },

  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // Date Formats
  DATE_FORMAT: 'YYYY-MM-DD',
  DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',

  // Token Expiration (in seconds)
  JWT_EXPIRATION: 24 * 60 * 60, // 24 hours

  // Booking Constraints
  MAX_BOOKING_DURATION_HOURS: 8,
  MIN_BOOKING_DURATION_MINUTES: 30,
  MAX_ADVANCE_BOOKING_DAYS: 90
};

