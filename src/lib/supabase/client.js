'use client'

/**
 * Supabase browser client — used only in Client Components (useEffect, event handlers).
 * createBrowserClient manages its own singleton internally, so calling this per use is safe.
 */
import { createBrowserClient } from '@supabase/ssr'

// Return the browser client (anon key, own-row RLS). createBrowserClient is itself a
// singleton, so calling this on every use is fine.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
