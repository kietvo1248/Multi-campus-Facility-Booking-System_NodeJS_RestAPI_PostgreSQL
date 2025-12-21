/**
 * Query Builder Utilities
 * Helper functions for building database queries
 */

/**
 * Build where clause for date range filtering
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} fieldName - Field name to filter (default: 'createdAt')
 * @returns {Object} Prisma where clause
 */
function buildDateRangeFilter(startDate, endDate, fieldName = 'createdAt') {
  const filter = {};
  
  if (startDate) {
    filter[fieldName] = { ...filter[fieldName], gte: new Date(startDate) };
  }
  
  if (endDate) {
    filter[fieldName] = { ...filter[fieldName], lte: new Date(endDate) };
  }
  
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Build where clause for search filtering
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Fields to search in
 * @returns {Object} Prisma where clause with OR conditions
 */
function buildSearchFilter(searchTerm, fields) {
  if (!searchTerm || !fields || fields.length === 0) {
    return undefined;
  }
  
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }))
  };
}

/**
 * Build include clause for Prisma queries
 * @param {Array<string>} relations - Relations to include
 * @returns {Object} Prisma include clause
 */
function buildInclude(relations) {
  if (!relations || relations.length === 0) {
    return undefined;
  }
  
  const include = {};
  relations.forEach(relation => {
    include[relation] = true;
  });
  
  return include;
}

/**
 * Build orderBy clause for Prisma queries
 * @param {string} field - Field to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Object} Prisma orderBy clause
 */
function buildOrderBy(field, direction = 'desc') {
  if (!field) return undefined;
  
  return {
    [field]: direction.toLowerCase() === 'asc' ? 'asc' : 'desc'
  };
}

module.exports = {
  buildDateRangeFilter,
  buildSearchFilter,
  buildInclude,
  buildOrderBy
};

