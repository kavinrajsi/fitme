/**
 * GET /api/cron/sync-metrics — daily background sync of Google Health metrics into
 * public.daily_metrics for every user who connected Google Health.
 *
 * Triggered by Vercel Cron (see vercel.json). Authorized via CRON_SECRET: Vercel
 * sends `Authorization: Bearer <CRON_SECRET>` automatically when that env var is set.
 *
 * Uses the service-role client (bypasses RLS) since there's no user session.
 * `?days=N` (default 7, max 90) controls how many trailing days to (re)sync — pass
 * a larger value once to backfill history.
 *
 * After syncing this refreshes the leaderboard_snapshot baseline (no push) and fires the
 * morning leaderboard push (yesterday's top 3); the night push (today's top 3) is a
 * separate cron, /api/cron/notify-leaderboard.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { authorizeCron } from '@/lib/cron-auth'
import { syncAllConnectedUsers } from '@/lib/sync-metrics'
import { notifyLeaderboardTop, notifyTopMovers } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Authorize the cron caller, then sync every Google-Health-connected profile in turn,
// tallying users/rows touched (and skips) for the JSON summary. Runs sequentially to
// stay within the function's compute/rate limits, then refreshes the leaderboard_snapshot
// baseline and pushes the morning "yesterday's top 3" leaderboard at the end.
export async function GET(request) {
  const denied = authorizeCron(request)
  if (denied) return denied

  // Clamp ?days into [1, 90] (Health rollup windows cap at 90d); default 7.
  const days = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get('days')) || 7, 1),
    90
  )

  const supabase = createServiceClient()
  let users, rows, skipped
  try {
    ;({ users, rows, skipped } = await syncAllConnectedUsers(supabase, { days }))
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }

  // Refresh the leaderboard_snapshot baseline (no push) so the "added N steps" deltas on
  // manual /api/sync + the webhook stay ~1 day fresh now that the cron doesn't push movers.
  await notifyTopMovers(supabase, { push: false })
  // Morning leaderboard push: the day's data is now synced, so broadcast yesterday's top 3.
  await notifyLeaderboardTop(supabase, { period: 'yesterday' })

  // Prune stale rate-limit buckets + expired OAuth grants (best-effort housekeeping).
  await supabase.from('api_rate_limits').delete().lt('window_start', new Date(Date.now() - 86400000).toISOString())
  await supabase.from('oauth_authorization_codes').delete().lt('expires_at', new Date().toISOString())

  return NextResponse.json({ ok: true, users, rows, skipped, days })
}
