/**
 * /data — daily step counts (last 90 days) from the Google Health API (not Google Fit).
 *
 * Steps use the separate health token (getValidHealthAccessToken) and require the
 * googlehealth.activity_and_fitness.readonly scope. States:
 * - no health token        → prompt to connect Google Health
 * - token but steps null    → token predates the activity scope → prompt reconnect
 * - steps present           → total + average + a per-day table with CSS bars
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailySteps } from '@/lib/google-health'
import styles from './data.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Steps data — KyaReFitting aa' }

const DAYS = 90

export default async function DataPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const token = await getValidHealthAccessToken(profile)
  const steps = token ? await getDailySteps(token, DAYS) : null

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Steps</h1>
          <p className={styles.subtitle}>Last {DAYS} days · Google Health</p>
        </header>

        {!token ? (
          <ConnectPrompt
            message="Connect Google Health to see your steps."
            cta="Connect Google Health"
          />
        ) : steps === null ? (
          <ConnectPrompt
            message="Reconnect Google Health to grant access to steps."
            cta="Reconnect Google Health"
          />
        ) : (
          <>
            <div className={styles.stats}>
              <Stat label="Total" value={steps.total.toLocaleString()} />
              <Stat label="Daily avg" value={steps.average.toLocaleString()} />
            </div>

            {steps.max === 0 && (
              <p className={styles.note}>
                No step data for this account yet (Google Health only has steps for
                Fitbit / Pixel Watch users).
              </p>
            )}

            <ul className={styles.rows}>
              {steps.days.map((d) => (
                <li key={d.isoDate} className={styles.row}>
                  <span className={styles.date}>{d.label}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.bar}
                      style={{ width: steps.max ? `${(d.steps / steps.max) * 100}%` : '0%' }}
                    />
                  </span>
                  <span className={styles.count}>{d.steps.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <a href="/profile" className={styles.link}>
          ← Back to profile
        </a>
      </div>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function ConnectPrompt({ message, cta }) {
  return (
    <div className={styles.prompt}>
      <p className={styles.note}>{message}</p>
      <a href="/auth/google/health" className={`${styles.button} ${styles.primary}`}>
        {cta}
      </a>
    </div>
  )
}
