/**
 * Dashboard layout — sticky top nav shared by /dashboard, /data, /leaderboard, /profile.
 *
 * Responsive behaviour:
 * - Mobile: slim header (logo + logout icon only). Navigation lives in the
 *   fixed bottom tab bar rendered inside NavLinks.
 * - Desktop (md+): full header with horizontal text links + sign-out button.
 *
 * NavLinks is a Client Component so it can call usePathname() for active states
 * while this layout stays a Server Component (required for the signOut action form).
 *
 * pb-safe-tab adds bottom padding on mobile so content isn't hidden behind the
 * 64px tab bar + iOS home indicator safe area.
 */
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { NavLinks } from '@/components/nav-links'
import { SyncButton } from '@/components/sync-button'
import { Icon } from '@/components/icon'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-background">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          KyaReFitting aa
        </Link>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop: text nav links */}
          <NavLinks />

          <SyncButton />

          {/* Sign out — icon on mobile, button on desktop */}
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="hidden md:flex"
            >
              Sign out
            </Button>
            <button
              type="submit"
              aria-label="Sign out"
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="logout" size={20} />
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-8 pb-safe-tab md:pb-8">
        {children}
      </main>
    </div>
  )
}
