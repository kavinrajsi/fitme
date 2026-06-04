/**
 * /leaderboard — ranks all users by total steps over the last 7 days.
 *
 * daily_metrics + profiles are RLS "own-row only", so the ranking is built with the
 * service-role client server-side. Only leaderboard-safe fields are surfaced
 * (display name, avatar, step total) — never emails or tokens.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

const PERIOD_DAYS = 7

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  // IST civil date PERIOD_DAYS-1 ago (matches how daily_metrics dates are stored).
  const since = new Date(Date.now() + 5.5 * 3600 * 1000 - (PERIOD_DAYS - 1) * 86400000)
    .toISOString()
    .slice(0, 10)

  const [{ data: metrics }, { data: profiles }] = await Promise.all([
    service.from('daily_metrics').select('user_id, steps').gte('date', since),
    service.from('profiles').select('id, full_name, avatar_url'),
  ])

  const stepsByUser = {}
  for (const m of metrics ?? []) {
    stepsByUser[m.user_id] = (stepsByUser[m.user_id] ?? 0) + (m.steps ?? 0)
  }

  const ranked = (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Anonymous',
      avatar: p.avatar_url,
      steps: stepsByUser[p.id] ?? 0,
    }))
    .sort((a, b) => b.steps - a.steps)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  // Show participants (have steps) plus the current user even at 0.
  const shown = ranked.filter((r) => r.steps > 0 || r.id === user.id)
  const anySteps = ranked.some((r) => r.steps > 0)

  return (
    <>
      <h1 className={styles.pageTitle}>Leaderboard</h1>
      <p className={styles.pageSub}>Total steps · last {PERIOD_DAYS} days</p>

      {!anySteps ? (
        <p className={styles.note}>No steps on the leaderboard yet — sync to get on the board.</p>
      ) : (
        <div className={styles.card}>
          <ul className={styles.rows}>
            {shown.map((r) => (
              <li
                key={r.id}
                className={r.id === user.id ? `${styles.lbRow} ${styles.lbMe}` : styles.lbRow}
              >
                <span className={styles.lbRank}>{r.rank}</span>
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.lbAvatar} src={r.avatar} alt="" width={32} height={32} />
                ) : (
                  <span className={styles.lbAvatarFallback} aria-hidden="true">
                    {(r.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span className={styles.lbName}>
                  {r.name}
                  {r.id === user.id && <span className={styles.lbYou}> (you)</span>}
                </span>
                <span className={styles.lbSteps}>{r.steps.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
