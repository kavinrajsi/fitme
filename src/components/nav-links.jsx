'use client'

/**
 * Dashboard navigation — highlights the active route. Client component so it can
 * read the current pathname.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './nav-links.module.css'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/data', label: 'Data' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
]

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav className={styles.nav}>
      {LINKS.map((l) => {
        const active = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={active ? `${styles.link} ${styles.active}` : styles.link}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
