/**
 * Pagination Utilities
 * Helper functions for pagination calculations
 */

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('./constants');

/**
 * Calculate pagination metadata
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page number
 * @param {number} pageSize - Items per page
 * @returns {Object} Pagination metadata
 */
function calculatePagination(totalItems, page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  // Normalize inputs
  const currentPage = Math.max(1, Number(page) || 1);
  const itemsPerPage = Math.min(Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    page: currentPage,
    pageSize: itemsPerPage,
    totalItems,
    totalPages,
    skip,
    hasNextPage,
    hasPreviousPage
  };
}

/**
 * Extract pagination parameters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Pagination parameters
 */
function getPaginationParams(query) {
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || DEFAULT_PAGE_SIZE;
  
  return {
    page: Math.max(1, page),
    pageSize: Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE)
  };
}

module.exports = {
  calculatePagination,
  getPaginationParams
};

