'use client'

/**
 * Desktop sidebar navigation (shown ≥1024px; hidden on mobile, where BottomNav is
 * used instead). Brand, vertical nav with active highlight, Sync, and Sign out.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { SyncButton } from './sync-button'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/data', label: 'Steps' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
]

export function Sidebar({ healthConnected }) {
  const pathname = usePathname()
  return (
    <aside>
      <div>KyaReFitting</div>

      <nav>
        {LINKS.map((l) => {
          const active = pathname === l.href
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
             
            >
              {l.label}
            </Link>
          )
        })}
      </nav>

      <div>
        {healthConnected && <SyncButton />}
        <form action={signOut}>
          <button type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
