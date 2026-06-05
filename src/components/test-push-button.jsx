'use client'

/** Admin button to send a test Web Push to all subscribers. */
import { useState } from 'react'
import { BellIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TestPushButton() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/push/test', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      setStatus(response.ok ? `Sent to ${data.sent ?? 0} device(s)` : 'Failed to send')
    } catch {
      setStatus('Failed to send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={send} disabled={busy}>
        <BellIcon /> {busy ? 'Sending…' : 'Send test push'}
      </Button>
      {status && <span className="text-muted-foreground text-sm">{status}</span>}
    </div>
  )
}
