/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / 7D / 30D, ?period=, default 7D) switch which window loads.
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

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
]

export default async function LeaderboardPage({ searchParams }) {
  const { period: periodParam } = await searchParams
  const period = PERIODS.find((p) => p.key === periodParam) ?? PERIODS[1] // default 7D

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  const istNow = Date.now() + 5.5 * 3600 * 1000
  const since = new Date(istNow - (period.days - 1) * 86400000).toISOString().slice(0, 10)

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

  const shown = ranked.filter((r) => r.steps > 0 || r.id === user.id)
  const anySteps = ranked.some((r) => r.steps > 0)

  return (
    <>
      <h1 className={styles['page__title']}>Leaderboard</h1>
      <p className={styles['page__subtitle']}>Steps · {period.label}</p>

      <div className={styles['leaderboard__tabs']}>
        {PERIODS.map((p) => (
          <a
            key={p.key}
            href={`/leaderboard?period=${p.key}`}
            className={
              p.key === period.key
                ? `${styles['leaderboard__tab']} ${styles['leaderboard__tab--active']}`
                : styles['leaderboard__tab']
            }
          >
            {p.label}
          </a>
        ))}
      </div>

      {!anySteps ? (
        <p className={styles.note}>No steps on the leaderboard yet — sync to get on the board.</p>
      ) : (
        <div className={styles.card}>
          <ul className={styles['leaderboard__list']}>
            {shown.map((r) => (
              <li
                key={r.id}
                className={
                  r.id === user.id
                    ? `${styles['leaderboard__row']} ${styles['leaderboard__row--me']}`
                    : styles['leaderboard__row']
                }
              >
                <span className={styles['leaderboard__rank']}>{r.rank}</span>
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={styles['leaderboard__avatar']}
                    src={r.avatar}
                    alt=""
                    width={32}
                    height={32}
                  />
                ) : (
                  <span className={styles['leaderboard__avatar--fallback']} aria-hidden="true">
                    {(r.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span className={styles['leaderboard__name']}>
                  {r.name}
                  {r.id === user.id && <span className={styles['leaderboard__you']}> (you)</span>}
                </span>
                <span className={styles['leaderboard__steps']}>{r.steps.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
