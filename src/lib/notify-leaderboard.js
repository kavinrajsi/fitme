/**
 * After a sync, push an alert to everyone when any current top-4 person (by last-7-day
 * steps) has gained steps since we last checked. Uses leaderboard_snapshot to compute
 * deltas and dedupe. Best-effort — never throws into the caller.
 */
import { dkey } from '@/lib/date-utils'
import { sendPushToAll } from '@/lib/push'
import { getLeaderboard } from '@/lib/fitness-data'

const THRESHOLD = 100 // ignore trivial bumps

const TOP_TITLES = {
  yesterday: "🏆 Yesterday's leaderboard",
  today: "🏆 Today's leaderboard",
}

// Broadcast the day's top 3 to everyone (opt-in). `period` is 'yesterday' (morning) or
// 'today' (night). Reuses getLeaderboard so the ranking matches the /leaderboard page,
// and always sends — even on an empty day. Best-effort: never throws into the caller.
export async function notifyLeaderboardTop(service, { period }) {
  try {
    const key = period === 'today' ? 'today' : 'yesterday'
    const { ranking } = await getLeaderboard(service, null, { period: key })
    const top3 = (ranking ?? []).slice(0, 3)
    const body = top3.length
      ? top3
          .map((row) => `${row.rank}. ${row.name ?? 'Someone'} — ${Number(row.totalSteps).toLocaleString()}`)
          .join('\n')
      : 'No steps logged yet — get moving!'
    return await sendPushToAll(
      { title: TOP_TITLES[key], body, url: `/leaderboard?period=${key}` },
      { source: `leaderboard-${key}` }
    )
  } catch (err) {
    console.error('[notify] notifyLeaderboardTop failed:', err?.message ?? err)
    return { sent: 0 }
  }
}

// Compare each current top-4 mover's 7-day step total against the last snapshot and
// push a "gained N steps" alert when the gain clears THRESHOLD, then store the new
// totals for next time. Swallows all errors — sync must never fail because a push did.
export async function notifyTopMovers(service) {
  try {
    const since = dkey(6) // last 7 days
    const { data: ranking } = await service.rpc('leaderboard_since', { since_date: since })
    const top4 = (ranking ?? []).slice(0, 4)
    if (!top4.length) return

    const ids = top4.map((row) => row.id)
    const { data: snapshots } = await service
      .from('leaderboard_snapshot')
      .select('user_id, steps_7d')
      .in('user_id', ids)
    const previous = {}
    for (const snapshot of snapshots ?? []) previous[snapshot.user_id] = Number(snapshot.steps_7d)

    const now = new Date().toISOString()
    const rows = []
    for (const row of top4) {
      const current = Number(row.total_steps) || 0
      const before = previous[row.id]
      if (before != null && current - before >= THRESHOLD) {
        const delta = current - before
        await sendPushToAll(
          {
            title: 'Leaderboard',
            body: `${row.full_name ?? 'Someone'} added ${delta.toLocaleString()} steps — now ${current.toLocaleString()}`,
            url: '/leaderboard',
          },
          { source: 'leaderboard' }
        )
      }
      rows.push({ user_id: row.id, steps_7d: current, updated_at: now })
    }
    if (rows.length) {
      await service.from('leaderboard_snapshot').upsert(rows, { onConflict: 'user_id' })
    }
  } catch (err) {
    console.error('[notify] notifyTopMovers failed:', err?.message ?? err)
  }
}
