/**
 * Dashboard layout — sticky top nav shared by /dashboard, /data, /leaderboard, /profile.
 *
 * NavLinks is extracted as a client component so it can use usePathname()
 * to apply active styles, while keeping this layout as a Server Component
 * (required for the `signOut` server action form to work correctly).
 */
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { NavLinks } from '@/components/nav-links'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 h-15 border-b border-border bg-background">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight">
          FitMe
        </Link>
        <div className="flex items-center gap-6">
          <NavLinks />
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </nav>
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
