/**
 * Profile / account page.
 *
 * Shows the signed-in user's basic details (name, email, avatar from Google
 * sign-in; height/weight/age/gender/birthday from the Google Health + People APIs,
 * cached on the profile), lets them manually enter height/weight, connect Google
 * Health, and sign out. Redirects to /signin when not authenticated.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { signOut } from '../actions/auth'
import { saveManualBody } from '../actions/profile'
import styles from '../home.module.css'

// Reads cookies and writes cached details to the DB — never statically rendered.
export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile — KyaReFitting aa' }

export default async function ProfilePage({ searchParams }) {
  const { health } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const d = await getUserDetails()
  const name = d?.name ?? 'there'
  const initial = (name?.[0] ?? d?.email?.[0] ?? '?').toUpperCase()

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.user}>
          {d?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatar} src={d.avatar} alt="" width={64} height={64} />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {initial}
            </div>
          )}
          <h1 className={styles.greeting}>{name}</h1>
          {d?.email && <p className={styles.email}>{d.email}</p>}
        </div>

        <dl className={styles.details}>
          <Detail label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : null} />
          <Detail label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : null} />
          <Detail label="Age" value={d?.age != null ? `${d.age}` : null} />
          <Detail label="Gender" value={d?.gender} />
          <Detail label="Birthday" value={d?.birthday} />
        </dl>

        {health === 'connected' && (
          <p className={styles.hint}>Google Health connected.</p>
        )}
        {health === 'connect_failed' && (
          <p className={styles.hint}>Couldn&apos;t connect Google Health — please try again.</p>
        )}

        {!d?.healthConnected ? (
          <a href="/auth/google/health" className={`${styles.button} ${styles.connect}`}>
            <GoogleIcon />
            Connect Google Health
          </a>
        ) : (
          d?.noGoogleBody && (
            <p className={styles.hint}>
              Google Health has no height/weight for this account — enter them below.
            </p>
          )
        )}

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
          <button type="submit" className={`${styles.button} ${styles.primary}`}>
            Save height &amp; weight
          </button>
        </form>

        <a href="/data" className={`${styles.button} ${styles.primary}`}>
          View steps data
        </a>

        <a href="/" className={styles.link}>
          ← Back to home
        </a>

        <form action={signOut}>
          <button type="submit" className={styles.button}>
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}

function Detail({ label, value }) {
  return (
    <div className={styles.detailRow}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value ?? '—'}</dd>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  )
}
