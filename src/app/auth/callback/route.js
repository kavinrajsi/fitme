/**
 * GET /auth/callback — OAuth callback handler, called by Supabase after Google consent.
 *
 * Exchanges the one-time `code` param for a Supabase session, then saves the
 * Google provider tokens to the `profiles` table so the Fitness API can be
 * called later without re-authenticating.
 *
 * Token expiry is hardcoded at 1 hour (Google's access token lifetime).
 * The refresh token is stored for future token renewal flows.
 *
 * `full_name` from Google user_metadata is backfilled into `profiles` on every
 * sign-in so the display name stays current if the user changes their Google name.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`)
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
  }

  // Persist Google provider tokens for Fitness API access
  const { session, user } = data
  if (session?.provider_token && user) {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    const googleName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
    await supabase
      .from('profiles')
      .update({
        google_access_token: session.provider_token,
        google_refresh_token: session.provider_refresh_token ?? null,
        google_token_expires_at: expiresAt,
        ...(googleName ? { full_name: googleName } : {}),
      })
      .eq('id', user.id)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
