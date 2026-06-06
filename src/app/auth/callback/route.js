/**
 * GET /auth/callback — OAuth callback, called by Supabase after Google consent.
 *
 * Exchanges the one-time `code` for a Supabase session (cookies are written by the
 * server client's setAll), persists the Google provider tokens + identity onto the
 * user's profile row, then redirects to `next` (defaults to home).
 *
 * The refresh token is only present on the first consent (or when prompt=consent
 * forces a re-issue), so it is only written when non-null — never overwrite a good
 * stored refresh token with null on a later sign-in.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Exchange the OAuth `code` for a session, mirror the Google provider tokens +
// identity onto the user's profile row, then redirect to `next`.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`)
  }

  // Only persist tokens when Google actually returned a provider token for this session.
  const { session, user } = data
  if (session?.provider_token && user) {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
    const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? null
    const avatarUrl = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null

    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email,
        google_access_token: session.provider_token,
        google_token_expires_at: expiresAt,
        ...(session.provider_refresh_token
          ? { google_refresh_token: session.provider_refresh_token }
          : {}),
        ...(fullName ? { full_name: fullName } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      },
      { onConflict: 'id' }
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
