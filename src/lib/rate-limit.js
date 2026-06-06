/**
 * Fixed-window rate limiting for the public API, backed by Postgres so the count
 * is shared across Vercel's serverless instances (in-memory wouldn't be).
 *
 * `enforceRateLimit` increments the caller's bucket via the `check_rate_limit` RPC
 * and reports whether they're under the limit. It FAILS OPEN — an infra hiccup must
 * never block legitimate traffic; we'd rather under-limit than 500 everyone.
 */
import { API_RATE_LIMIT, API_RATE_WINDOW } from '@/lib/constants'

export async function enforceRateLimit(
  service,
  key,
  { limit = API_RATE_LIMIT, windowSeconds = API_RATE_WINDOW } = {}
) {
  // Window resets align to wall-clock buckets; reset = start of the next bucket.
  const now = Math.floor(Date.now() / 1000)
  const reset = (Math.floor(now / windowSeconds) + 1) * windowSeconds

  try {
    const { data: count, error } = await service.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window: windowSeconds,
    })
    if (error || typeof count !== 'number') {
      return { allowed: true, limit, remaining: limit, reset } // fail open
    }
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      reset,
    }
  } catch {
    return { allowed: true, limit, remaining: limit, reset } // fail open
  }
}
