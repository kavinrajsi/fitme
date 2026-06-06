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
import { syncAllConnectedUsers } from '@/lib/sync-metrics'
import { notifyLeaderboardTop } from '@/lib/notify-leaderboard'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // the night run may sync every user first

export async function GET(request) {
  // Require CRON_SECRET — never run unauthenticated even if the env var is missing.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return new NextResponse('CRON_SECRET not configured', { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const params = new URL(request.url).searchParams
  const period = params.get('period') === 'today' ? 'today' : 'yesterday'
  const doSync = params.get('sync') === '1'

  const supabase = createServiceClient()

  // For "today" the morning sync is stale, so refresh first. days:2 covers the IST/UTC
  // day boundary (the server runs UTC; "today" in IST may still be "yesterday" in UTC).
  let synced = null
  if (doSync) {
    try {
      synced = await syncAllConnectedUsers(supabase, { days: 2 })
    } catch (err) {
      console.error('[cron] notify-leaderboard sync failed:', err?.message ?? err)
    }
  }

  const result = await notifyLeaderboardTop(supabase, { period })

  return NextResponse.json({ ok: true, period, synced, sent: result?.sent ?? 0 })
}
