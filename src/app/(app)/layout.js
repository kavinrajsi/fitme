/**
 * Authenticated dashboard shell — wraps /dashboard, /data, /profile with a shared
 * top nav (Dashboard / Data / Profile) and sign-out. Redirects to /signin when the
 * visitor isn't authenticated (the proxy also guards these paths).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavLinks } from '@/components/nav-links'
import { SyncButton } from '@/components/sync-button'
import { signOut } from '../actions/auth'
import styles from './app.module.css'

export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_health_refresh_token')
    .eq('id', user.id)
    .maybeSingle()
  const healthConnected = !!profile?.google_health_refresh_token

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>KyaReFitting aa</span>
        <NavLinks />
        <div className={styles.headerActions}>
          {healthConnected && <SyncButton />}
          <form action={signOut}>
            <button type="submit" className={styles.signout}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
