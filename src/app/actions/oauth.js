'use server'

/**
 * Server action backing the OAuth consent screen (`/oauth/authorize`). On Approve it
 * mints a single-use authorization code for the signed-in user and redirects back to
 * the app's redirect_uri with `?code=&state=`; on Deny it returns `?error=access_denied`.
 * Re-validates the client + redirect_uri server-side (never trusts the posted form).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateClient, createAuthorizationCode } from '@/lib/oauth'

export async function approveAuthorization(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const clientId = formData.get('client_id')?.toString()
  const redirectUri = formData.get('redirect_uri')?.toString()
  const state = formData.get('state')?.toString()
  const decision = formData.get('decision')?.toString()
  const codeChallenge = formData.get('code_challenge')?.toString() || null
  const codeChallengeMethod = formData.get('code_challenge_method')?.toString() || null

  const service = createServiceClient()
  const client = await validateClient(service, clientId, redirectUri)
  if (!client) redirect('/developers') // bad client/redirect — don't bounce to an unverified URL

  // write implies read; ignore anything outside the known scopes.
  const requested = (formData.get('scope')?.toString() || 'read').split(/\s+/).filter(Boolean)
  const granted = requested.filter((s) => s === 'read' || s === 'write')
  const scopes = granted.includes('write') ? ['read', 'write'] : ['read']

  const back = new URL(redirectUri)
  if (state) back.searchParams.set('state', state)

  if (decision !== 'approve') {
    back.searchParams.set('error', 'access_denied')
    redirect(back.toString())
  }

  const code = await createAuthorizationCode(service, {
    clientId,
    userId: user.id,
    redirectUri,
    scopes,
    codeChallenge,
    codeChallengeMethod,
  })
  if (!code) {
    back.searchParams.set('error', 'server_error')
    redirect(back.toString())
  }

  back.searchParams.set('code', code)
  redirect(back.toString())
}
