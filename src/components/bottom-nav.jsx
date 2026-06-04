'use client'

/**
 * Mobile-app bottom tab bar — fixed to the bottom with icon + label tabs and an
 * active-route highlight. Client component so it can read the pathname.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './bottom-nav.module.css'

const TABS = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/data', label: 'Steps', icon: ChartIcon },
  { href: '/leaderboard', label: 'Ranks', icon: TrophyIcon },
  { href: '/profile', label: 'Profile', icon: PersonIcon },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className={styles.nav} aria-label="Primary">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={active ? `${styles.tab} ${styles.active}` : styles.tab}
          >
            <Icon />
            <span className={styles.label}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M10 14.5V18h4v-3.5" />
      <path d="M8 21h8" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}
