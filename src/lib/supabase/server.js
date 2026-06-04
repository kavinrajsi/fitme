/**
 * Supabase server client — used in Server Components, Route Handlers, and Server Actions.
 *
 * Must be awaited (Next.js 16: cookies() is async).
 * The setAll catch block silences the error thrown when cookies are set inside a
 * Server Component render — cookies are read-only there and can only be written
 * from Route Handlers or Server Actions (the proxy refreshes them anyway).
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies can't be set here.
          }
        },
      },
    }
  )
}
