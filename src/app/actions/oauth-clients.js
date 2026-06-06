'use server'

/**
 * Server Actions for managing OAuth clients (third-party apps) and the grants a user
 * has handed out. Registering an app returns its `client_id` always and a
 * `client_secret` ONCE (only for confidential clients — the secret is stored hashed).
 * All actions are scoped to the signed-in user; OAuth tables have no RLS policies, so
 * reads/writes use the service client with explicit owner/user filters.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hashToken } from '@/lib/api-tokens'
import { generateClientId, generateClientSecret } from '@/lib/oauth'

/** useActionState-compatible. On success: { ok, clientId, secret? } (secret shown once). */
export async function createOAuthClient(_prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const name = (formData.get('name') || '').toString().trim().slice(0, 80)
  if (!name) return { ok: false, error: 'Name is required.' }

  // One redirect URI per line; must be absolute http(s) URLs.
  const redirectUris = (formData.get('redirect_uris') || '')
    .toString()
    .split(/\s+/)
    .map((u) => u.trim())
    .filter(Boolean)
  if (redirectUris.length === 0) return { ok: false, error: 'At least one redirect URI is required.' }
  for (const u of redirectUris) {
    try {
      const parsed = new URL(u)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
    } catch {
      return { ok: false, error: `Invalid redirect URI: ${u}` }
    }
  }

  const confidential = formData.get('confidential') === 'on'
  const clientId = generateClientId()
  const secret = confidential ? generateClientSecret() : null

  const service = createServiceClient()
  const { error } = await service.from('oauth_clients').insert({
    client_id: clientId,
    client_secret_hash: secret ? hashToken(secret) : null,
    name,
    redirect_uris: redirectUris,
    owner_user_id: user.id,
  })
  if (error) return { ok: false, error: 'Could not register the app.' }

  revalidatePath('/developers/apps')
  return { ok: true, clientId, secret }
}

/** Disable one of the current user's registered apps (own-row only). */
export async function deleteOAuthClient(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const clientId = formData.get('client_id')?.toString()
  if (!clientId) return

  const service = createServiceClient()
  await service
    .from('oauth_clients')
    .update({ disabled_at: new Date().toISOString() })
    .eq('client_id', clientId)
    .eq('owner_user_id', user.id)

  revalidatePath('/developers/apps')
}

/** Revoke all of an app's tokens for the current user (the "disconnect app" action). */
export async function revokeOAuthApp(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const clientId = formData.get('client_id')?.toString()
  if (!clientId) return

  const service = createServiceClient()
  const now = new Date().toISOString()
  for (const table of ['oauth_access_tokens', 'oauth_refresh_tokens']) {
    await service
      .from(table)
      .update({ revoked_at: now })
      .eq('user_id', user.id)
      .eq('client_id', clientId)
      .is('revoked_at', null)
  }

  revalidatePath('/developers/apps')
}
