/**
 * Mobile-app shell for the authenticated area: a slim sticky top bar (brand + Sync),
 * a scrollable content column, and a fixed bottom tab bar. Sign out lives on the
 * Profile screen (mobile convention). Redirects to /signin when not authenticated.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'
import { Sidebar } from '@/components/sidebar'
import { SyncButton } from '@/components/sync-button'

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

  return (
    <div>
      <Sidebar healthConnected={healthConnected} />

      <header>
        <span>KyaReFitting</span>
        {healthConnected && <SyncButton />}
      </header>

      <main>{children}</main>

      <BottomNav />
    </div>
  )
}
