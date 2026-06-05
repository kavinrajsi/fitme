/**
 * App-wide constants. ADMIN_EMAIL gates the /admin area and the admin sidebar link;
 * override via the ADMIN_EMAIL env var in production.
 */
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'sikavinraj@gmail.com'
