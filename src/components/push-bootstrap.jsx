'use client'

/**
 * Registers the service worker and, by default, auto-asks for notification permission
 * once (then subscribes). The browser still shows its own permission prompt; if the user
 * dismisses it we don't ask again (the Profile toggle stays available).
 */
import { useEffect } from 'react'
import { subscribeAndSave } from '@/lib/push-client'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function PushBootstrap() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})

    async function ensure() {
      try {
        const registration = await navigator.serviceWorker.ready
        const existing = await registration.pushManager.getSubscription()

        if (Notification.permission === 'granted') {
          if (!existing) await subscribeAndSave(VAPID)
          return
        }
        if (Notification.permission === 'default' && !localStorage.getItem('push-auto-asked')) {
          localStorage.setItem('push-auto-asked', '1')
          const permission = await Notification.requestPermission()
          if (permission === 'granted') await subscribeAndSave(VAPID)
        }
      } catch {
        /* best-effort */
      }
    }
    ensure()
  }, [])

  return null
}
