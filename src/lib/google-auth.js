/**
 * Google OAuth token helpers.
 *
 * Supabase stores the Google provider tokens on the `profiles` row at sign-in.
 * Google access tokens live ~1 hour; refreshGoogleToken mints a new one from the
 * stored refresh token, and getValidAccessToken transparently refreshes + persists
 * when the cached token is expired.
 */
import { createClient } from '@/lib/supabase/server'

export async function refreshGoogleToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ? data : null
}

/**
 * Returns a usable access token for the given profile, refreshing + persisting when
 * expired. `kind` selects which token set: 'signin' (People API + identity) or
 * 'health' (Google Health API). Returns null when there's no offline access (no
 * refresh token) or the refresh fails (e.g. 7-day expiry in an unverified app).
 */
// `client` lets callers pass a Supabase client to persist the refreshed token —
// the user-session client by default, or the service-role client from the cron.
async function getValidToken(profile, kind, client) {
  if (!profile) return null

  const cols =
    kind === 'health'
      ? {
          access: 'google_health_access_token',
          refresh: 'google_health_refresh_token',
          expires: 'google_health_token_expires_at',
        }
      : {
          access: 'google_access_token',
          refresh: 'google_refresh_token',
          expires: 'google_token_expires_at',
        }

  const expired =
    !profile[cols.expires] || new Date(profile[cols.expires]) <= new Date()

  if (!expired && profile[cols.access]) return profile[cols.access]
  if (!profile[cols.refresh]) return null

  const refreshed = await refreshGoogleToken(profile[cols.refresh])
  if (!refreshed) return null

  const accessToken = refreshed.access_token
  const expiresAt = new Date(
    Date.now() + (refreshed.expires_in ?? 3600) * 1000
  ).toISOString()

  const supabase = client ?? (await createClient())
  await supabase
    .from('profiles')
    .update({ [cols.access]: accessToken, [cols.expires]: expiresAt })
    .eq('id', profile.id)

  return accessToken
}

// Sign-in token (carries People/identity scopes).
export function getValidAccessToken(profile, client) {
  return getValidToken(profile, 'signin', client)
}

// Separate Google Health token (googlehealth.* scopes only).
export function getValidHealthAccessToken(profile, client) {
  return getValidToken(profile, 'health', client)
}
