/**
 * GET /auth/google/health/callback — completes the Google Health consent.
 *
 * Verifies the CSRF state, exchanges the authorization code for a Google Health
 * access + refresh token (same OAuth client as sign-in, different redirect URI),
 * and stores them on the signed-in user's profile in the google_health_* columns.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Validate the CSRF state cookie, exchange the code for Health tokens, store them on the
// signed-in user's profile, and redirect to /profile flagged connected or connect_failed.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // Read then immediately clear the one-shot CSRF state cookie.
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('google_health_oauth_state')?.value
  cookieStore.delete('google_health_oauth_state')

  if (oauthError || !code || !state || state !== expectedState) {
    return NextResponse.redirect(`${origin}/profile?health=connect_failed`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/signin`)
  }

  // Exchange the code for Google Health tokens.
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/auth/google/health/callback`,
    }),
  })

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${origin}/profile?health=connect_failed`)
  }
  const token = await tokenResponse.json()

  const expiresAt = new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString()
  await supabase
    .from('profiles')
    .update({
      google_health_access_token: token.access_token,
      google_health_token_expires_at: expiresAt,
      // refresh_token only returned on first consent / prompt=consent — keep a good one.
      ...(token.refresh_token ? { google_health_refresh_token: token.refresh_token } : {}),
      // Force a re-sync of health fields on the next home load.
      details_synced_at: null,
    })
    .eq('id', user.id)

  return NextResponse.redirect(`${origin}/profile?health=connected`)
}
