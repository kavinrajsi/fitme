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
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncUserMetrics } from '@/lib/sync-metrics'
import { notifyTopMovers } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Authorize the cron caller, then sync every Google-Health-connected profile in turn,
// tallying users/rows touched (and skips) for the JSON summary. Runs sequentially to
// stay within the function's compute/rate limits, and pushes leaderboard movers at the end.
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
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, google_health_access_token, google_health_refresh_token, google_health_token_expires_at, health_data_backfilled_at'
    )
    .not('google_health_refresh_token', 'is', null)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  let users = 0
  let rows = 0
  let skipped = 0

  for (const profile of profiles ?? []) {
    try {
      // Full multi-year history backfill runs ONCE per user (then incremental).
      const fullHistory = !profile.health_data_backfilled_at
      const result = await syncUserMetrics(supabase, profile, { days, fullHistory })
      if (result.ok && result.rows > 0) {
        users++
        rows += result.rows
        if (fullHistory && result.historyDays > 0) {
          await supabase
            .from('profiles')
            .update({ health_data_backfilled_at: new Date().toISOString() })
            .eq('id', profile.id)
        }
      } else {
        skipped++
      }
    } catch (err) {
      console.error(`[cron] sync failed for profile ${profile.id}:`, err?.message ?? err)
      skipped++
    }
  }

  await notifyTopMovers(supabase)

  return NextResponse.json({ ok: true, users, rows, skipped, days })
}
