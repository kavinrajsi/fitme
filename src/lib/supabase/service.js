/**
 * Supabase service-role client — bypasses RLS. Use ONLY in trusted server code
 * (e.g. the cron sync), never in anything reachable by a user's session.
 */
import { createClient } from '@supabase/supabase-js'

// Build a stateless client authenticated with the service-role key (RLS bypassed,
// no session persistence/refresh). For cron, admin and cross-user/webhook reads only.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
