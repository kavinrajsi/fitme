'use client'

/**
 * Registers the service worker so Web Push can be delivered. Subscribing is opt-in —
 * the user enables it from the Profile "Notifications" toggle (no auto-prompt).
 */
import { useEffect } from 'react'

export function PushBootstrap() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
