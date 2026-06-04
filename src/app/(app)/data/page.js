/**
 * /data — daily step counts (last 90 days) from the Google Health API (not Google
 * Fit). Uses the separate health token; prompts connect/reconnect when the token is
 * missing or lacks the activity_and_fitness scope.
 */
import { createClient } from '@/lib/supabase/server'
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailySteps } from '@/lib/google-health'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Steps data — KyaReFitting aa' }

const DAYS = 90

export default async function DataPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const token = await getValidHealthAccessToken(profile)
  const steps = token ? await getDailySteps(token, DAYS) : null

  return (
    <>
      <h1 className={styles.pageTitle}>Steps</h1>
      <p className={styles.pageSub}>Last {DAYS} days · Google Health</p>

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
              No step data for this account yet.
            </p>
          )}

          <div className={styles.card}>
            <ul className={styles.rows}>
              {steps.days.map((day) => (
                <li key={day.isoDate} className={styles.row}>
                  <span className={styles.rowDate}>{day.label}</span>
                  <span className={styles.barTrack}>
                    <span
                      className={styles.bar}
                      style={{ width: steps.max ? `${(day.steps / steps.max) * 100}%` : '0%' }}
                    />
                  </span>
                  <span className={styles.rowCount}>{day.steps.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
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
