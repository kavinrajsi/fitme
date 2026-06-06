/**
 * App-wide constants. ADMIN_EMAIL gates the /admin area and the admin sidebar link;
 * override via the ADMIN_EMAIL env var in production.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'sikavinraj@gmail.com'

// Public API rate limit: requests allowed per token per fixed window.
export const API_RATE_LIMIT = 120
export const API_RATE_WINDOW = 60 // seconds
