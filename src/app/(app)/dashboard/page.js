/**
 * Dashboard — gamified home: daily step-goal ring, streak, achievements, plus a few
 * body stats. Steps come from daily_metrics; goal from profiles.daily_step_goal.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { computeGamification } from '@/lib/gamification'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting aa' }

const R = 52
const CIRC = 2 * Math.PI * R

export default async function DashboardPage() {
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

      <div className={`${styles.card} ${styles['goal-card']}`}>
        <div className={styles.ring}>
          <svg viewBox="0 0 120 120" className={styles['ring__svg']} aria-hidden="true">
            <circle cx="60" cy="60" r={R} className={styles['ring__track']} />
            <circle
              cx="60"
              cy="60"
              r={R}
              className={styles['ring__fill']}
              transform="rotate(-90 60 60)"
              style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - game.pct) }}
            />
          </svg>
          <div className={styles['ring__text']}>
            <span className={styles['ring__steps']}>{game.today.toLocaleString()}</span>
            <span className={styles['ring__goal']}>/ {goal.toLocaleString()}</span>
            <span className={styles['ring__pct']}>{Math.round(game.pct * 100)}%</span>
          </div>
        </div>

        <div className={styles.streak}>
          <span className={styles['streak__flame']} aria-hidden="true">🔥</span>
          <div>
            <div className={styles['streak__count']}>{game.currentStreak}-day streak</div>
            <div className={styles['streak__best']}>Best: {game.bestStreak} days</div>
            <div className={styles['streak__hint']}>Goal: {goal.toLocaleString()} steps/day</div>
          </div>
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

      <div className={styles.stats}>
        <Stat label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : '—'} />
        <Stat label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : '—'} />
        <Stat label="Age" value={d?.age != null ? `${d.age}` : '—'} />
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

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles['stat__value']}>{value}</span>
      <span className={styles['stat__label']}>{label}</span>
    </div>
  )
}
