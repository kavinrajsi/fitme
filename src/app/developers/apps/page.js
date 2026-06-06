/**
 * /developers/apps — manage OAuth: register your own apps (clients) and review/revoke
 * the apps you've authorized to access your data. Signed-in only; OAuth tables have no
 * RLS policies, so reads use the service client with explicit owner/user filters.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { deleteOAuthClient, revokeOAuthApp } from '@/app/actions/oauth-clients'
import { OAuthClientForm } from '@/components/oauth-client-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Developer apps — KyaReFitting aa' }

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

export default async function DeveloperAppsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin?next=/developers/apps')

  const service = createServiceClient()

  // Apps this user has registered (active only).
  const { data: myClients } = await service
    .from('oauth_clients')
    .select('client_id, name, redirect_uris, client_secret_hash, created_at')
    .eq('owner_user_id', user.id)
    .is('disabled_at', null)
    .order('created_at', { ascending: false })

  // Apps this user has authorized (distinct clients with a live refresh token).
  const { data: grants } = await service
    .from('oauth_refresh_tokens')
    .select('client_id, created_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const grantedIds = [...new Set((grants ?? []).map((g) => g.client_id))]
  let authorizedApps = []
  if (grantedIds.length) {
    const { data: clients } = await service
      .from('oauth_clients')
      .select('client_id, name')
      .in('client_id', grantedIds)
    const nameById = Object.fromEntries((clients ?? []).map((c) => [c.client_id, c.name]))
    authorizedApps = grantedIds.map((id) => ({ clientId: id, name: nameById[id] ?? id }))
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12">
      <div>
        <a href="/developers" className="text-sm text-muted-foreground hover:text-foreground">
          ← Developer docs
        </a>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Developer apps</h1>
        <p className="text-muted-foreground">
          Register an OAuth app, or manage apps you&apos;ve granted access to.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register an app</CardTitle>
          <CardDescription>
            Create an OAuth client to let users authorize your app via{' '}
            <code>/oauth/authorize</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthClientForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your apps</CardTitle>
          <CardDescription>OAuth clients you&apos;ve registered</CardDescription>
        </CardHeader>
        <CardContent>
          {myClients?.length ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {myClients.map((c) => (
                <li key={c.client_id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.name}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({c.client_secret_hash ? 'confidential' : 'public / PKCE'})
                      </span>
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{c.client_id}</p>
                    <p className="text-xs text-muted-foreground">Added {fmtDate(c.created_at)}</p>
                  </div>
                  <form action={deleteOAuthClient}>
                    <input type="hidden" name="client_id" value={c.client_id} />
                    <Button type="submit" variant="outline" size="sm">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No apps registered yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apps you&apos;ve authorized</CardTitle>
          <CardDescription>Revoke an app&apos;s access to your data anytime</CardDescription>
        </CardHeader>
        <CardContent>
          {authorizedApps.length ? (
            <ul className="divide-y divide-border rounded-md border border-border">
              {authorizedApps.map((a) => (
                <li key={a.clientId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <form action={revokeOAuthApp}>
                    <input type="hidden" name="client_id" value={a.clientId} />
                    <Button type="submit" variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">You haven&apos;t authorized any apps.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
