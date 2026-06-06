/**
 * GET /api/cron/notify-leaderboard — leaderboard push to all opt-in subscribers.
 *
 * Authorized via CRON_SECRET (Vercel sends `Authorization: Bearer <CRON_SECRET>`
 * automatically). Scheduled run (see vercel.json):
 *   - 21:00 IST  ?period=today&sync=1   → top 3 of today (re-syncs first, since the
 *                                         main sync only runs each morning)
 * The morning push (yesterday's top 3) rides on the 07:30 sync cron instead of a
 * separate schedule, but `?period=yesterday` is still supported for manual triggers.
 *
 * Uses the service-role client (bypasses RLS) — there's no user session.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { authorizeCron } from '@/lib/cron-auth'
import { syncAllConnectedUsers } from '@/lib/sync-metrics'
import { notifyLeaderboardTop } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // the night run may sync every user first

export async function GET(request) {
  const denied = authorizeCron(request)
  if (denied) return denied

  const params = new URL(request.url).searchParams
  const doSync = params.get('sync') === '1'

  const supabase = createServiceClient()

  // For "today" the morning sync is stale, so refresh first. days:2 covers the IST/UTC
  // day boundary (the server runs UTC; "today" in IST may still be "yesterday" in UTC).
  // Skip first-time full backfills here — those belong to the morning sync cron.
  let synced = null
  let syncFailed = false
  if (doSync) {
    try {
      synced = await syncAllConnectedUsers(supabase, { days: 2, backfill: false })
    } catch (err) {
      console.error('[cron] notify-leaderboard sync failed:', err?.message ?? err)
      syncFailed = true
    }
  }

  // We asked for fresh data and didn't get it — skip the push rather than broadcasting a
  // stale/empty "today" board to everyone.
  if (syncFailed) {
    return NextResponse.json({ ok: false, error: 'sync_failed', synced }, { status: 502 })
  }

  const result = await notifyLeaderboardTop(supabase, { period: params.get('period') })

  return NextResponse.json({ ok: true, period: result.period, synced, sent: result.sent ?? 0 })
}
