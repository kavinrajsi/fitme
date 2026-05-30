/**
 * Root page — smart redirect only, renders nothing.
 * Sends authenticated users to /dashboard and guests to /signin.
 * The proxy middleware also handles this redirect, but having it here
 * avoids a flash on the root URL for direct navigation.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  redirect(user ? '/dashboard' : '/signin')
}
