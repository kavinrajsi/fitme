/**
 * Next.js 16 middleware — exported as `proxy`, NOT `middleware`.
 * Runs on every non-static request (see matcher below).
 *
 * Responsibilities:
 * - Refreshes the Supabase session cookie on every request so tokens stay alive.
 * - Redirects unauthenticated users away from protected routes (/dashboard, /profile).
 * - Redirects authenticated users away from /signin to avoid showing the login page.
 *
 * Protected path list must be kept in sync with actual dashboard routes.
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

  const protectedPaths = ['/dashboard', '/profile']

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))
  const isSignIn = pathname === '/signin'

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  if (user && isSignIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
}
