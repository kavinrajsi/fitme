/**
 * GET /auth/google — initiates Google OAuth via Supabase.
 *
 * Supabase returns the Google consent URL; we redirect the browser to it.
 * After consent, Google sends the user back to /auth/callback (see redirectTo).
 * The callback URL must match a redirect URI registered in Google Cloud Console
 * and in the Supabase Auth provider settings.
 *
 * Sign-in scopes are email/profile plus the People API demographics:
 * - user.birthday.read / user.gender.read → People API birthday + gender (sensitive)
 *
 * The Google Health scopes are intentionally NOT requested here: the Google Health
 * API rejects any token that also carries the People scopes
 * (error DISALLOWED_OAUTH_SCOPES). Health uses a separate consent + token obtained
 * via /auth/google/health (incremental authorization).
 *
 * access_type:offline + prompt:consent force Google to return a refresh token so
 * the People API can be called later without re-authenticating.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Ask Supabase for the Google consent URL (sign-in scopes only) and redirect to it;
// on failure bounce back to /signin with an error flag.
export async function GET(request) {
  const { origin } = new URL(request.url)
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/user.birthday.read',
        'https://www.googleapis.com/auth/user.gender.read',
      ].join(' '),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/signin?error=google_oauth_failed`)
  }

  return NextResponse.redirect(data.url)
}
