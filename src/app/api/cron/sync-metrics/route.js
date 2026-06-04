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
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailyMetrics } from '@/lib/google-health'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request) {
  const auth = request.headers.get('authorization')
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const days = Math.min(
    Math.max(Number(new URL(request.url).searchParams.get('days')) || 7, 1),
    90
  )

  const supabase = createServiceClient()
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, google_health_access_token, google_health_refresh_token, google_health_token_expires_at'
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
      const token = await getValidHealthAccessToken(profile, supabase)
      if (!token) {
        skipped++
        continue
      }
      const metrics = await getDailyMetrics(token, days)
      if (!metrics?.length) {
        skipped++
        continue
      }
      const now = new Date().toISOString()
      const payload = metrics.map((m) => ({ user_id: profile.id, ...m, updated_at: now }))
      const { error: upErr } = await supabase
        .from('daily_metrics')
        .upsert(payload, { onConflict: 'user_id,date' })
      if (upErr) {
        skipped++
        continue
      }
      users++
      rows += payload.length
    } catch {
      skipped++
    }
  }

  return NextResponse.json({ ok: true, users, rows, skipped, days })
}
