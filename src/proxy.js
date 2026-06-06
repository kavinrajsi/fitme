/**
 * Next.js 16 middleware — exported as `proxy`, NOT `middleware`.
 * Runs on every non-static request (see matcher below).
 *
 * Responsibilities:
 * - Refreshes the Supabase session cookie on every request so tokens stay alive.
 * - Redirects already-authenticated users away from /signin.
 *
 * Note: getUser() must be called so the session is validated/refreshed; the
 * supabaseResponse (with any refreshed cookies) must be the one returned.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function proxy(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect while preserving any refreshed session cookies (Supabase SSR pattern).
  const redirectTo = (path) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // Already signed in? Skip the login page / root and go to the dashboard.
  if (user && (pathname === '/signin' || pathname === '/')) {
    return redirectTo('/dashboard')
  }

  // Protect the authenticated pages for signed-out users.
  const protectedPaths = [
    '/dashboard',
    '/data',
    '/workouts',
    '/leaderboard',
    '/ai',
    '/profile',
    '/admin',
  ]
  if (!user && protectedPaths.some((p) => pathname.startsWith(p))) {
    return redirectTo('/signin')
  }

  return supabaseResponse
}

export const config = {
  // Run on all paths except Next.js internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
