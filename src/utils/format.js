/**
 * Formatting Utilities
 * Helper functions for formatting data
 */

/**
 * Format booking status for display
 * @param {string} status - Booking status
 * @returns {string} Formatted status
 */
function formatBookingStatus(status) {
  const statusMap = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Đã từ chối',
    CANCELLED: 'Đã hủy',
    COMPLETED: 'Hoàn thành'
  };
  
  return statusMap[status] || status;
}

/**
 * Format user role for display
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
function formatUserRole(role) {
  const roleMap = {
    ADMIN: 'Quản trị viên',
    LECTURER: 'Giảng viên',
    STUDENT: 'Sinh viên',
    FACILITY_ADMIN: 'Quản lý cơ sở vật chất',
    CAMPUS_ADMIN: 'Quản lý cơ sở',
    SECURITY_GUARD: 'Bảo vệ',
    CLUB_LEADER: 'Trưởng CLB'
  };
  
  return roleMap[role] || role;
}

/**
 * Format currency (VND)
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  if (typeof amount !== 'number') return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string (default: 'dd/MM/yyyy')
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'dd/MM/yyyy') {
  if (!date) return '';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', year)
    .replace('HH', hours)
    .replace('mm', minutes);
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  formatBookingStatus,
  formatUserRole,
  formatCurrency,
  formatDate,
  formatFileSize
};

