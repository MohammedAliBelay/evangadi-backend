import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Shared key generator for rate limiters (IPv4 + IPv6 safe)
const keyGenerator = (req) => ipKeyGenerator(req);

/**
 * Login Rate Limiter
 * Resets automatically on successful login
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max failed attempts
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  message: {
    error: "Too many login attempts",
    message: "Please try again after 15 minutes",
  },

  /**
   * IMPORTANT:
   * Skip rate limit if login succeeded
   * (reset happens automatically)
   */
  skip: (req, res) => {
    return res.locals.loginSuccess === true;
  },
});

/**
 * Register Rate Limiter
 * Prevents mass account creation
 */
export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: "Too many registration attempts",
    message: "Please try again later",
  },
});
