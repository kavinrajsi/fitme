'use server'

/**
 * Server actions for authentication and profile management.
 *
 * `signOut` — signs out from Supabase and redirects to /signin.
 *
 * `updateProfile` — updates the user's display name in the profiles table.
 *   Called from the profile page form via FormData. The bio field was removed
 *   from the UI but the column remains in the DB if needed later.
 *   Returns { error } or { success } for the client to display as feedback.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/signin')
}

export async function updateProfile(formData) {
  const fullName = formData.get('full_name')?.trim()
  if (!fullName) return { error: 'Name cannot be empty.' }
  if (fullName.length > 100) return { error: 'Name must be 100 characters or fewer.' }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  return { success: 'Profile updated successfully.' }
}
