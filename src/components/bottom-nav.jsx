'use client'

/**
 * Mobile bottom tab bar for the main destinations. Hidden on >= md (the sidebar takes
 * over there). The active route's icon picks up the brand color.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Footprints, Dumbbell, Trophy, User } from 'lucide-react'
import { cn } from '@/lib/utils'

// The five tabs, left to right. (No conditional Admin tab here — that lives in the sidebar.)
const NAV = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/data', label: 'Steps', icon: Footprints },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
]

// `profileLabel` overrides the Profile tab's text with the signed-in user's (first) name.
export function BottomNav({ profileLabel }) {
  const pathname = usePathname()
  return (
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map((item) => {
        const Icon = item.icon
        // Highlight on exact match or any nested route (e.g. /leaderboard/123 keeps Ranks active).
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
        const label = item.href === '/profile' && profileLabel ? profileLabel : item.label
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex min-w-0 flex-col items-center justify-center gap-0.5 py-2 text-[0.65rem] font-medium',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className={cn('size-5', active && 'text-brand')} />
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
