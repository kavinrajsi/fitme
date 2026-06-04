/**
 * Supabase service-role client — bypasses RLS. Use ONLY in trusted server code
 * (e.g. the cron sync), never in anything reachable by a user's session.
 */
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
