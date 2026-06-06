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
 * After syncing this also fires the morning leaderboard push (yesterday's top 3); the
 * night push (today's top 3) is a separate cron, /api/cron/notify-leaderboard.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncAllConnectedUsers } from '@/lib/sync-metrics'
import { notifyTopMovers, notifyLeaderboardTop } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Authorize the cron caller, then sync every Google-Health-connected profile in turn,
// tallying users/rows touched (and skips) for the JSON summary. Runs sequentially to
// stay within the function's compute/rate limits, then pushes leaderboard movers and
// the morning "yesterday's top 3" leaderboard at the end.
export async function GET(request) {
  // Require CRON_SECRET — never run unauthenticated even if the env var is missing.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new NextResponse('CRON_SECRET not configured', { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

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

  await notifyTopMovers(supabase)
  // Morning leaderboard push: the day's data is now synced, so broadcast yesterday's top 3.
  await notifyLeaderboardTop(supabase, { period: 'yesterday' })

  // Prune stale rate-limit buckets + expired OAuth grants (best-effort housekeeping).
  await supabase.from('api_rate_limits').delete().lt('window_start', new Date(Date.now() - 86400000).toISOString())
  await supabase.from('oauth_authorization_codes').delete().lt('expires_at', new Date().toISOString())

  return NextResponse.json({ ok: true, users, rows, skipped, days })
}
