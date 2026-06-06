/**
 * GET /oauth/authorize — the OAuth2 consent screen.
 *
 * Validates the authorization request (client, exact redirect_uri, response_type=code,
 * PKCE S256), requires a signed-in user (else bounces through sign-in and back), and
 * renders an Approve/Deny form that posts to the `approveAuthorization` server action.
 * PKCE is mandatory so we never issue a code without proof-of-possession.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateClient } from '@/lib/oauth'
import { approveAuthorization } from '@/app/actions/oauth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Authorize app — KyaReFitting aa' }

// A simple centered notice for invalid/blocked authorization requests.
function Notice({ children }) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorization error</CardTitle>
          <CardDescription>{children}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default async function AuthorizePage({ searchParams }) {
  const sp = await searchParams
  const { client_id, redirect_uri, response_type, scope, state, code_challenge, code_challenge_method } = sp

  // Require a signed-in user; return them here after login.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const next = `/oauth/authorize?${new URLSearchParams(sp).toString()}`
    redirect(`/signin?next=${encodeURIComponent(next)}`)
  }

  if (response_type !== 'code' || !client_id || !redirect_uri) {
    return <Notice>The authorization request is missing required parameters.</Notice>
  }
  // PKCE is required — protects public clients against code interception.
  if (!code_challenge || code_challenge_method !== 'S256') {
    return <Notice>This app must use PKCE with S256.</Notice>
  }

  const client = await validateClient(createServiceClient(), client_id, redirect_uri)
  if (!client) {
    return <Notice>Unknown app, or the redirect URL isn’t registered for it.</Notice>
  }

  const scopes = (scope || 'read').split(/\s+/).filter(Boolean)
  const wantsWrite = scopes.includes('write')

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authorize {client.name}</CardTitle>
          <CardDescription>
            <strong>{client.name}</strong> wants to access your KyaReFitting data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">This will allow the app to:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Read your fitness data (profile, steps, workouts, leaderboard)</li>
            {wantsWrite && <li>Update your daily step goal</li>}
          </ul>
          <p className="text-xs text-muted-foreground">
            Signed in as {user.email}. You can revoke access anytime under Developer apps.
          </p>
        </CardContent>
        <CardFooter>
          {/* Single form; the clicked button's name/value carries the decision. */}
          <form action={approveAuthorization} className="flex w-full gap-2">
            <input type="hidden" name="client_id" value={client_id} />
            <input type="hidden" name="redirect_uri" value={redirect_uri} />
            <input type="hidden" name="scope" value={scopes.join(' ')} />
            {state && <input type="hidden" name="state" value={state} />}
            <input type="hidden" name="code_challenge" value={code_challenge} />
            <input type="hidden" name="code_challenge_method" value={code_challenge_method} />
            <Button type="submit" name="decision" value="deny" variant="outline" className="flex-1">
              Deny
            </Button>
            <Button type="submit" name="decision" value="approve" className="flex-1">
              Approve
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
