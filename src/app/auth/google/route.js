/**
 * GET /auth/google — initiates Google OAuth via Supabase.
 *
 * Requests Google Fit scopes in addition to basic profile scopes so the
 * access token returned after consent can be used to call the Fitness REST API.
 * `access_type: offline` + `prompt: consent` ensures Google always returns a
 * refresh token (without consent prompt, refresh token is only issued on first auth).
 *
 * The callback URL must exactly match the URI registered in Google Cloud Console
 * (Supabase handles the exchange at its own /auth/v1/callback endpoint).
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { origin } = new URL(request.url)
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      scopes: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.heart_rate.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
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
