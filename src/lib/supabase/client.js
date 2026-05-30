'use client'

/**
 * Supabase browser client — used only in Client Components (useEffect, event handlers).
 * Creates a new client instance per call; safe to call inside useEffect without memoising
 * because createBrowserClient is lightweight and manages its own singleton internally.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
