/**
 * Home / post-login landing page.
 *
 * A light welcome for the signed-in user with a link to the full Profile page
 * (where details live). Signed-out visitors get a link to /signin.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { signOut } from './actions/auth'
import styles from './home.module.css'

// Reads cookies — never statically rendered.
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>You&apos;re signed out</h1>
          <p className={styles.subtitle}>Sign in to continue.</p>
          <a className={`${styles.button} ${styles.primary}`} href="/signin">
            Go to sign in
          </a>
        </div>
      </main>
    )
  }

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
          <h1 className={styles.greeting}>Welcome, {name}</h1>
          {d?.email && <p className={styles.email}>{d.email}</p>}
        </div>

        <a href="/profile" className={`${styles.button} ${styles.primary}`}>
          View profile
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
