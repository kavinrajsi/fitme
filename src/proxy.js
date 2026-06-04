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

  // Send signed-in users away from the login page.
  if (user && pathname === '/signin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect the profile and data pages for signed-out users.
  if (!user && (pathname.startsWith('/profile') || pathname.startsWith('/data'))) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Run on all paths except Next.js internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
