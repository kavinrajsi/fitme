/**
 * Authenticated shell — shadcn sidebar layout (AppSidebar + SidebarInset) with a
 * sticky header (sidebar trigger + Sync). Redirects to /signin when not signed in.
 *
 * force-dynamic by virtue of the per-request auth read; wraps every page under
 * (app)/. Also mounts PushBootstrap (registers the service worker / push) and the
 * mobile BottomNav.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import { AppSidebar } from '@/components/app-sidebar'
import { SyncButton } from '@/components/sync-button'
import { PushBootstrap } from '@/components/push-bootstrap'
import { BottomNav } from '@/components/bottom-nav'
import { Logo } from '@/components/logo'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

// Gates the whole authenticated area: resolves the signed-in user, builds the
// sidebar identity, and decides whether the Sync button can be shown.
export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  // Sync is only meaningful once Google Health is connected (refresh token present).
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_health_refresh_token')
    .eq('id', user.id)
    .maybeSingle()
  const healthConnected = !!profile?.google_health_refresh_token

  const userMetadata = user.user_metadata ?? {}
  const name = userMetadata.full_name ?? userMetadata.name ?? 'Account'
  const sidebarUser = {
    name,
    email: user.email,
    avatar: userMetadata.avatar_url ?? userMetadata.picture ?? null,
    initial: (name?.[0] ?? user.email?.[0] ?? '?').toUpperCase(),
  }

  return (
    <SidebarProvider>
      <PushBootstrap />
      <AppSidebar
        user={sidebarUser}
        isAdmin={user.email === ADMIN_EMAIL}
        variant="inset"
      />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 md:block" />
          <Logo className="size-5" />
          <span className="text-sm font-medium">KyaReFitting aa</span>
          {/* Sync button only when Google Health is connected — nothing to sync otherwise */}
          {healthConnected && (
            <div className="ml-auto">
              <SyncButton />
            </div>
          )}
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 md:p-6 md:pb-6">
          {children}
        </div>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  )
}
