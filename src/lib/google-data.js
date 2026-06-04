/**
 * Unified health data client.
 *
 * All health metrics are sourced from the Google Health API (google-health.js).
 * This module is the single import surface for pages and routes, so the underlying
 * provider can change in one place without touching consumers.
 *
 * Base URL: https://health.googleapis.com/v4/users/me/dataTypes
 * Scopes:   googlehealth.* (requested at sign-in)
 */
export {
  getHealthSummary,
  getDailySteps,
  getBodyMetrics,
  getSleepData,
  getSleepWeek,
  getActivitySessions,
  getHeartRateWeek,
} from '@/lib/google-health'
