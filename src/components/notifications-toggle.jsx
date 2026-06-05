'use client'

/**
 * Enable/disable Web Push for the signed-in user. Requests permission, subscribes via
 * the browser PushManager with the public VAPID key, and persists the subscription.
 */
import { useEffect, useState } from 'react'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { subscribeAndSave } from '@/lib/push-client'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function NotificationsToggle() {
  const [status, setStatus] = useState('loading') // loading | unsupported | denied | off | on
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? 'on' : 'off'))
      .catch(() => setStatus('off'))
  }, [])

  async function enable() {
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const ok = await subscribeAndSave(VAPID)
      setStatus(ok ? 'on' : 'off')
    } catch {
      setStatus('off')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setStatus('off')
    } catch {
      setStatus('on')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'loading') return null
  if (status === 'unsupported')
    return (
      <p className="text-muted-foreground text-sm">
        Notifications aren&apos;t supported on this browser.
      </p>
    )
  if (status === 'denied')
    return (
      <p className="text-muted-foreground text-sm">
        Notifications are blocked — enable them in your browser settings.
      </p>
    )

  return status === 'on' ? (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">Leaderboard alerts are on.</span>
      <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
        {busy ? 'Turning off…' : 'Turn off'}
      </Button>
    </div>
  ) : (
    <Button onClick={enable} disabled={busy}>
      <BellIcon /> {busy ? 'Enabling…' : 'Enable notifications'}
    </Button>
  )
}
