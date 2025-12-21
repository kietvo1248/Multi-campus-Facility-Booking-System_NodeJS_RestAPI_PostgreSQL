/**
 * Permission Utilities
 * Helper functions for role and permission checking
 */

const { ROLES } = require('./constants');

/**
 * Check if user has admin role
 * @param {string} role - User role
 * @returns {boolean}
 */
function isAdmin(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return [ROLES.ADMIN, ROLES.FACILITY_ADMIN, ROLES.CAMPUS_ADMIN].includes(normalizedRole);
}

/**
 * Check if user has facility admin role
 * @param {string} role - User role
 * @returns {boolean}
 */
function isFacilityAdmin(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return normalizedRole === ROLES.FACILITY_ADMIN;
}

/**
 * Check if user has campus admin role
 * @param {string} role - User role
 * @returns {boolean}
 */
function isCampusAdmin(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return normalizedRole === ROLES.CAMPUS_ADMIN;
}

/**
 * Check if user can manage bookings
 * @param {string} role - User role
 * @returns {boolean}
 */
function canManageBookings(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return isAdmin(normalizedRole) || normalizedRole === ROLES.SECURITY_GUARD;
}

/**
 * Check if user can create bookings
 * @param {string} role - User role
 * @returns {boolean}
 */
function canCreateBookings(role) {
  const normalizedRole = String(role || '').toUpperCase();
  return [
    ROLES.STUDENT,
    ROLES.LECTURER,
    ROLES.CLUB_LEADER,
    ROLES.FACILITY_ADMIN,
    ROLES.CAMPUS_ADMIN,
    ROLES.ADMIN
  ].includes(normalizedRole);
}

/**
 * Check if user can view all bookings
 * @param {string} role - User role
 * @returns {boolean}
 */
function canViewAllBookings(role) {
  return isAdmin(role);
}

module.exports = {
  isAdmin,
  isFacilityAdmin,
  isCampusAdmin,
  canManageBookings,
  canCreateBookings,
  canViewAllBookings
};

