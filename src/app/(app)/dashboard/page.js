/**
 * Dashboard — modeled on shadcn's dashboard-01 block: a row of stat cards with
 * trend badges, an interactive chart card with a range toggle, and an achievements
 * section. Steps come from daily_metrics; goal from profiles.daily_step_goal.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { computeGamification } from '@/lib/gamification'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting' }

const IST = 5.5 * 3600 * 1000
const RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

function dkey(offset) {
  return new Date(Date.now() + IST - offset * 86400000).toISOString().slice(0, 10)
}

function pct(cur, prev) {
  if (prev > 0) return Math.round(((cur - prev) / prev) * 100)
  return cur > 0 ? 100 : 0
}

export default async function DashboardPage({ searchParams }) {
  const { range: rangeParam } = await searchParams
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1] // default 30D

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rows }, d] = await Promise.all([
    supabase.from('profiles').select('daily_step_goal').eq('id', user.id).maybeSingle(),
    supabase.from('daily_metrics').select('date, steps').eq('user_id', user.id),
    getUserDetails(),
  ])

  const goal = profile?.daily_step_goal ?? 10000
  const game = computeGamification(rows ?? [], goal)

  const byDate = {}
  for (const r of rows ?? []) byDate[r.date] = r.steps ?? 0
  const sum = (a, b) => {
    let t = 0
    for (let i = a; i <= b; i++) t += byDate[dkey(i)] ?? 0
    return t
  }
  const today = byDate[dkey(0)] ?? 0
  const yesterday = byDate[dkey(1)] ?? 0
  const last7 = sum(0, 6)
  const prev7 = sum(7, 13)
  const avg7 = Math.round(last7 / 7)

  // Chart series for the selected range (oldest → newest, left to right).
  const series = []
  let chartMax = 0
  let chartTotal = 0
  for (let i = range.days - 1; i >= 0; i--) {
    const steps = byDate[dkey(i)] ?? 0
    chartTotal += steps
    if (steps > chartMax) chartMax = steps
    series.push({ key: dkey(i), steps })
  }
  const chartAvg = Math.round(chartTotal / range.days)

  const name = d?.name ?? 'there'
  const initial = (name?.[0] ?? d?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      <div className={styles.user}>
        {d?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles['user__avatar']} src={d.avatar} alt="" width={56} height={56} />
        ) : (
          <div className={styles['user__avatar--fallback']} aria-hidden="true">
            {initial}
          </div>
        )}
        <div>
          <h1 className={styles['user__name']}>Hi, {name}</h1>
          {d?.email && <p className={styles['user__email']}>{d.email}</p>}
        </div>
      </div>

      <div className={styles['section-cards']}>
        <Metric
          label="Steps today"
          value={today.toLocaleString()}
          trend={pct(today, yesterday)}
          footLine={today >= goal ? 'Goal reached 🎉' : 'Keep moving'}
          footNote={`${Math.round(game.pct * 100)}% of ${goal.toLocaleString()} goal`}
        />
        <Metric
          label="This week"
          value={last7.toLocaleString()}
          trend={pct(last7, prev7)}
          footLine="vs. previous 7 days"
          footNote={`${avg7.toLocaleString()} avg/day`}
        />
        <Metric
          label="Current streak"
          value={`${game.currentStreak}d`}
          badge="🔥"
          footLine={`Best: ${game.bestStreak} days`}
          footNote={`Goal ${goal.toLocaleString()}/day`}
        />
        <Metric
          label="Goal today"
          value={`${Math.round(game.pct * 100)}%`}
          progress={game.pct}
          footLine={`${today.toLocaleString()} / ${goal.toLocaleString()}`}
          footNote="Daily step goal"
        />
      </div>

      <div className={styles.card}>
        <div className={styles['activity__head']}>
          <div>
            <h2 className={styles['card__title']}>Activity</h2>
            <p className={styles['activity__desc']}>
              {chartTotal.toLocaleString()} steps · {chartAvg.toLocaleString()}/day avg
            </p>
          </div>
          <div className={styles.segmented}>
            {RANGES.map((r) => (
              <a
                key={r.key}
                href={`/dashboard?range=${r.key}`}
                className={
                  r.key === range.key
                    ? `${styles['segmented__item']} ${styles['segmented__item--active']}`
                    : styles['segmented__item']
                }
              >
                {r.label}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.bars}>
          {series.map((s) => (
            <span
              key={s.key}
              className={styles['bars__col']}
              style={{ height: chartMax ? `${Math.max((s.steps / chartMax) * 100, 1.5)}%` : '1.5%' }}
              title={`${s.key}: ${s.steps.toLocaleString()}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles['card__title']}>Achievements</h2>
        <div className={styles.achievements}>
          {game.achievements.map((a) => (
            <div
              key={a.id}
              className={
                a.earned
                  ? `${styles.achievement} ${styles['achievement--earned']}`
                  : `${styles.achievement} ${styles['achievement--locked']}`
              }
              title={a.name}
            >
              <span className={styles['achievement__icon']}>{a.earned ? a.icon : '🔒'}</span>
              <span className={styles['achievement__name']}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      {!d?.healthConnected && (
        <a
          href="/auth/google/health"
          className={`${styles.button} ${styles['button--primary']} ${styles['button--full']}`}
        >
          Connect Google Health
        </a>
      )}
    </>
  )
}

function Metric({ label, value, trend, badge, progress, footLine, footNote }) {
  return (
    <div className={`${styles.card} ${styles.metric}`}>
      <div className={styles['metric__head']}>
        <span className={styles['metric__label']}>{label}</span>
        {badge && <span className={styles.badge}>{badge}</span>}
        {trend != null && (
          <span
            className={
              trend >= 0
                ? `${styles.badge} ${styles['badge--up']}`
                : `${styles.badge} ${styles['badge--down']}`
            }
          >
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={styles['metric__value']}>{value}</div>
      {progress != null && (
        <div className={styles['metric__progress']}>
          <span style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      )}
      <div className={styles['metric__foot']}>
        <div className={styles['metric__foot-line']}>{footLine}</div>
        <div className={styles['metric__foot-note']}>{footNote}</div>
      </div>
    </div>
  )
}
