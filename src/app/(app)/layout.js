/**
 * Authenticated shell — shadcn sidebar layout (AppSidebar + SidebarInset) with a
 * sticky header (sidebar trigger + Sync). Redirects to /signin when not signed in.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/constants'
import { AppSidebar } from '@/components/app-sidebar'
import { SyncButton } from '@/components/sync-button'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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
      <AppSidebar
        user={sidebarUser}
        isAdmin={user.email === ADMIN_EMAIL}
        variant="inset"
      />
      <SidebarInset>
        <header className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <span className="text-sm font-medium">KyaReFitting</span>
          {healthConnected && (
            <div className="ml-auto">
              <SyncButton />
            </div>
          )}
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
