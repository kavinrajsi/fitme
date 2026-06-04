'use client'

/**
 * Desktop sidebar navigation (shown ≥1024px; hidden on mobile, where BottomNav is
 * used instead). Brand, vertical nav with active highlight, Sync, and Sign out.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { SyncButton } from './sync-button'
import styles from './sidebar.module.css'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/data', label: 'Steps' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
]

export function Sidebar({ healthConnected }) {
  const pathname = usePathname()
  return (
    <aside className={styles.sidebar}>
      <div className={styles['sidebar__brand']}>KyaReFitting</div>

      <nav className={styles['sidebar__nav']}>
        {LINKS.map((l) => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? `${styles['sidebar__link']} ${styles['sidebar__link--active']}`
                  : styles['sidebar__link']
              }
            >
              {l.label}
            </Link>
          )
        })}
      </nav>

      <div className={styles['sidebar__foot']}>
        {healthConnected && <SyncButton />}
        <form action={signOut}>
          <button type="submit" className={styles['sidebar__signout']}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
