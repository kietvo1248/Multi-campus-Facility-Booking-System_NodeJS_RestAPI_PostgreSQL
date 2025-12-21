/**
 * Rate Limiter Middleware
 * Simple in-memory rate limiting (for production, use Redis)
 */

const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limiter middleware factory
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Custom error message
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes default
    maxRequests = 100, // 100 requests default
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      // Create new record or reset expired one
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    record.count++;
    next();
  };
};

// Pre-configured rate limiters
const rateLimiters = {
  // Strict rate limiter for auth endpoints
  strict: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests
    message: 'Too many authentication attempts, please try again later.'
  }),

  // Standard rate limiter for general endpoints
  standard: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // 100 requests
  }),

  // Lenient rate limiter for read operations
  lenient: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200 // 200 requests
  })
};

module.exports = {
  createRateLimiter,
  rateLimiters
};

