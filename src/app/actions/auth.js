'use server'

/**
 * Server Actions for auth. signOut clears the Supabase session cookies (allowed
 * here because Server Actions can write cookies) and redirects to /signin.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/signin')
}
