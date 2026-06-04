/**
 * /profile — account details (from Google sign-in + Google Health + People), manual
 * height/weight entry, and Connect Google Health.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { saveManualBody } from '../../actions/profile'
import styles from '../app.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile — KyaReFitting aa' }

export default async function ProfilePage({ searchParams }) {
  const { health } = await searchParams
  const d = await getUserDetails()
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
          <h1 className={styles.userName}>{name}</h1>
          {d?.email && <p className={styles.userEmail}>{d.email}</p>}
        </div>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Details</h2>
        <Detail label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : null} />
        <Detail label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : null} />
        <Detail label="Age" value={d?.age != null ? `${d.age}` : null} />
        <Detail label="Gender" value={d?.gender} />
        <Detail label="Birthday" value={d?.birthday} />
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Google Health</h2>
        {health === 'connected' && <p className={styles.hint}>Google Health connected.</p>}
        {health === 'connect_failed' && (
          <p className={styles.hint}>Couldn&apos;t connect Google Health — please try again.</p>
        )}
        <a href="/auth/google/health" className={`${styles.button} ${styles.fullWidth}`}>
          {d?.healthConnected ? 'Reconnect Google Health' : 'Connect Google Health'}
        </a>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Manual height &amp; weight</h2>
        <form action={saveManualBody} className={styles.form}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Height (cm)</span>
              <input
                className={styles.input}
                type="number"
                name="height_cm"
                step="0.1"
                min="0"
                defaultValue={d?.heightCm ?? ''}
                placeholder="175"
              />
            </label>
            <label className={styles.field}>
              <span>Weight (kg)</span>
              <input
                className={styles.input}
                type="number"
                name="weight_kg"
                step="0.1"
                min="0"
                defaultValue={d?.weightKg ?? ''}
                placeholder="70"
              />
            </label>
          </div>
          <button type="submit" className={`${styles.button} ${styles.primary} ${styles.fullWidth}`}>
            Save height &amp; weight
          </button>
        </form>
      </div>
    </>
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
