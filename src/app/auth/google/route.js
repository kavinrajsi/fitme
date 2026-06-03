/**
 * GET /auth/google — initiates Google OAuth via Supabase.
 *
 * access_type:offline + prompt:consent ensures a refresh token is always returned.
 * The callback URL must match the URI registered in Google Cloud Console.
 *
 * Both Google Fit (fitness.*) and Google Health (googlehealth.*) scopes are requested
 * so google-data.js can call both APIs and pick whichever has data. Fitbit/Pixel Watch
 * users get Health API data; everyone else falls back to Google Fit automatically.
 *
 * Google Fit scopes:
 *   fitness.activity.read  — steps, calories, distance, activity sessions
 *   fitness.body.read      — weight, height
 *   fitness.sleep.read     — sleep duration
 *
 * Google Health scopes:
 *   activity_and_fitness   — steps, calories, distance, exercise sessions
 *   health_metrics         — weight, height, heart rate
 *   sleep                  — sleep duration
 *   profile                — display name, avatar
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
        // Google Fit — works for all Android users
        'https://www.googleapis.com/auth/fitness.activity.read',
        'https://www.googleapis.com/auth/fitness.body.read',
        'https://www.googleapis.com/auth/fitness.sleep.read',
        // Google Health — works for Fitbit/Pixel Watch users
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
