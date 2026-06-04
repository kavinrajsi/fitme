/**
 * Root — send everyone to the dashboard. The (app) layout + proxy handle auth
 * (redirecting signed-out visitors to /signin).
 */
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
