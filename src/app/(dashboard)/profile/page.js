'use client'

/**
 * Profile page — account settings. Client component (needs browser Supabase for
 * reading the session without a server round-trip).
 *
 * On mount, loads `full_name` from the profiles table. If `full_name` is null
 * (user has never edited their profile), it falls back to the Google display name
 * stored in Supabase user_metadata and immediately backfills it into the DB so
 * future loads don't need the fallback.
 *
 * Sections:
 * - Privacy: informational — all users appear on the leaderboard.
 * - Appearance: System / Light / Dark theme switcher (persisted to localStorage).
 * - Account form: editable name, read-only email, save button.
 *
 * Form submission calls the `updateProfile` server action with FormData.
 * The server action returns { error } or { success } which is shown as an Alert.
 */
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Icon } from '@/components/icon'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, bio')
          .eq('id', user.id)
          .single()

        const googleName =
          user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
        const fullName = data?.full_name || googleName

        // Backfill Google name into profiles if not set yet
        if (!data?.full_name && googleName) {
          await supabase
            .from('profiles')
            .update({ full_name: googleName })
            .eq('id', user.id)
        }

        setProfile({ full_name: fullName })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const result = await updateProfile(new FormData(e.target))
    setMessage(result?.error ? { type: 'error', text: result.error } : { type: 'success', text: result.success })
    setSaving(false)
  }

  if (loading) return <p className="text-muted-foreground">Loading…</p>

  const initials = (profile.full_name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account details</p>
      </div>

      <Card className="max-w-[540px] mb-6">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold mb-1">Privacy</h2>
          <p className="text-muted-foreground text-sm mb-3">
            Your steps appear on the leaderboard.
          </p>
          <p className="text-sm font-medium flex items-center gap-2">
            <Icon name="emoji_events" size={18} className="text-muted-foreground" /> Show me on the leaderboard
          </p>
        </CardContent>
      </Card>

      <Card className="max-w-[540px] mb-6">
        <CardContent className="pt-6">
          <h2 className="text-base font-semibold mb-1">Appearance</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Choose your preferred color mode. <span className="font-medium">System</span> follows your browser setting.
          </p>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <Card className="max-w-[540px]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-7">
            <Avatar className="h-14 w-14 text-base font-bold">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{profile.full_name || 'No name set'}</p>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
            </div>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-5">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Full name
              <input
                name="full_name"
                type="text"
                defaultValue={profile.full_name}
                placeholder="Your full name"
                className="px-3.5 py-2.5 rounded-lg border border-input bg-background text-base outline-none focus:ring-2 focus:ring-ring font-[inherit]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium opacity-60">
              Email (cannot be changed here)
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="px-3.5 py-2.5 rounded-lg border border-input bg-muted text-base cursor-not-allowed font-[inherit]"
              />
            </label>

            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
