/**
 * Dashboard overview — greeting + at-a-glance stats (today's steps, weight, height,
 * age) and demographics, with the full step history on /data and editing on /profile.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { getValidHealthAccessToken } from '@/lib/google-auth'
import { getDailySteps } from '@/lib/google-health'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting aa' }

export default async function DashboardPage() {
  const d = await getUserDetails()

  // Today's steps (one-day window) when Google Health is connected.
  let stepsToday = null
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
  if (token) {
    const s = await getDailySteps(token, 1)
    stepsToday = s?.days?.[0]?.steps ?? null
  }

  const name = d?.name ?? 'there'
  const initial = (name?.[0] ?? d?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      <div className={styles.user}>
        {d?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.avatar} src={d.avatar} alt="" width={56} height={56} />
        ) : (
          <div className={styles.avatarFallback} aria-hidden="true">
            {initial}
          </div>
        )}
        <div>
          <h1 className={styles.userName}>Welcome, {name}</h1>
          {d?.email && <p className={styles.userEmail}>{d.email}</p>}
        </div>
      </div>

      <div className={styles.stats}>
        <Stat label="Steps today" value={stepsToday != null ? stepsToday.toLocaleString() : '—'} />
        <Stat label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : '—'} />
        <Stat label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : '—'} />
        <Stat label="Age" value={d?.age != null ? `${d.age}` : '—'} />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Details</h2>
        <Detail label="Gender" value={d?.gender} />
        <Detail label="Birthday" value={d?.birthday} />
      </div>

      {!d?.healthConnected && (
        <a href="/auth/google/health" className={`${styles.button} ${styles.primary} ${styles.fullWidth}`}>
          Connect Google Health
        </a>
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

function Detail({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value ?? '—'}</span>
    </div>
  )
}
