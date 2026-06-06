/**
 * JSON response helpers for the public REST API (`/api/v1/*`).
 *
 * Every endpoint returns the same envelope shape and the same permissive CORS
 * headers so browser-based third-party apps can call it with a Bearer token (no
 * cookies are involved, so `*` is safe). Errors are `{ error: { code, message } }`.
 */

// CORS for token-auth (no cookies) APIs — any origin, Authorization + JSON allowed.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Max-Age': '86400',
}

/** A successful JSON response with CORS headers merged in. */
export function apiJson(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers ?? {}) },
  })
}

/** A `{ error: { code, message } }` response at the given status, with CORS headers. */
export function apiError(status, code, message) {
  return Response.json({ error: { code, message } }, { status, headers: CORS_HEADERS })
}

/** Preflight handler — export as `OPTIONS` from any v1 route. */
export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
