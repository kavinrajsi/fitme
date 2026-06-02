/**
 * GET /auth/google — initiates Google OAuth via Supabase.
 *
 * access_type:offline + prompt:consent ensures a refresh token is always returned.
 * The callback URL must match the URI registered in Google Cloud Console.
 *
 * Scopes requested and why:
 *   activity_and_fitness  — steps, calories, distance, 7-day chart, activity
 *                           sessions, leaderboard sync (nightly cron → health_daily)
 *   health_metrics        — heart rate (Dashboard), weight + height (Profile)
 *   sleep                 — last night's sleep duration (Dashboard + Data page)
 *   profile               — display name and avatar saved on first sign-in
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
        'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
        'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
        'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
        'https://www.googleapis.com/auth/googlehealth.profile.readonly',
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
