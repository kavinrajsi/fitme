'use server'

/**
 * Server Actions for per-user MCP API tokens. createApiToken returns the raw
 * token ONCE (it is never stored or recoverable afterwards — only its hash is
 * persisted). revokeApiToken marks a token revoked so it can no longer auth.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateToken, hashToken, lastFour } from '@/lib/api-tokens'

/**
 * useActionState-compatible: (prevState, formData) => state.
 * On success returns { ok: true, token } where `token` is the raw value to copy.
 */
export async function createApiToken(_prevState, formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const name = (formData.get('name') || '').toString().trim().slice(0, 60) || null
  const raw = generateToken()

  const { error } = await supabase.from('api_tokens').insert({
    user_id: user.id,
    token_hash: hashToken(raw),
    name,
    last_four: lastFour(raw),
  })
  if (error) return { ok: false, error: 'Could not create token.' }

  revalidatePath('/profile')
  return { ok: true, token: raw }
}

/** Revoke one of the current user's tokens (own-row only). */
export async function revokeApiToken(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const id = formData.get('id')
  if (!id) return

  await supabase
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/profile')
}
