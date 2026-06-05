/**
 * GET /auth/google/health — starts a SEPARATE Google consent for the Google Health
 * API only (incremental authorization).
 *
 * Why separate: the Google Health API rejects any access token that also carries
 * the People (gender/birthday) scopes used at sign-in, so health needs its own
 * token from its own consent. This is a raw Google OAuth 2.0 code flow (not Supabase
 * auth) — the resulting tokens are attached to the already-signed-in user's profile
 * by /auth/google/health/callback.
 *
 * The redirect URI `${origin}/auth/google/health/callback` must be registered in the
 * Google Cloud Console OAuth client's Authorized redirect URIs.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.profile.readonly',
  // steps / activity / calories / distance / heart rate for daily metrics
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  // sleep duration
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  // hydration (water intake) — hydration-log data type
  'https://www.googleapis.com/auth/googlehealth.nutrition.readonly',
].join(' ')

export async function GET(request) {
  const { origin } = new URL(request.url)

  // Must be signed in — the health token is attached to the current user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  // CSRF state, verified on the callback.
  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('google_health_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${origin}/auth/google/health/callback`,
    response_type: 'code',
    scope: HEALTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false',
    state,
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
