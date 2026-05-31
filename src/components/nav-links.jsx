'use client'

/**
 * Navigation links — renders two layouts from one component:
 * - Desktop (md+): horizontal text links in the top nav bar.
 * - Mobile (<md): fixed bottom tab bar with icon + label, native-app style.
 *
 * Extracted as a Client Component so usePathname() can be called without making
 * the entire dashboard layout a Client Component (which would break the server
 * action form used for sign-out).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icon'

const links = [
  { href: '/dashboard',   label: 'Dashboard',   icon: 'home' },
  { href: '/data',        label: 'Data',         icon: 'bar_chart' },
  { href: '/leaderboard', label: 'Leaderboard',  icon: 'emoji_events' },
  { href: '/profile',     label: 'Profile',      icon: 'person' },
  { href: '/help',        label: 'Help',         icon: 'help' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop — horizontal text links inside the top nav */}
      <div className="hidden md:flex items-center gap-6">
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                active
                  ? 'text-foreground border-b-2 border-primary pb-0.5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Mobile — fixed bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-background border-t border-border safe-bottom"
      >
        {links.map(({ href, label, icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon name={icon} size={22} />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
