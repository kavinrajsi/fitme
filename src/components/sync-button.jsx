'use client'

import { useState, useTransition } from 'react'
import { syncGoogleData } from '@/app/actions/sync'
import { Icon } from '@/components/icon'

export function SyncButton() {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(null) // null | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)

  function handleSync() {
    setStatus(null)
    startTransition(async () => {
      const result = await syncGoogleData()
      if (result?.error) {
        setStatus('error')
        setErrorMsg(result.error)
        setTimeout(() => setStatus(null), 4000)
      } else {
        setStatus('success')
        setTimeout(() => setStatus(null), 3000)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Sync with Google"
        title={status === 'error' ? errorMsg : 'Sync with Google'}
      >
        <Icon
          name="sync"
          size={16}
          className={isPending ? '[animation:spin_1s_linear_infinite]' : ''}
        />
        <span className="hidden sm:inline">{isPending ? 'Syncing…' : 'Sync'}</span>
      </button>

      {status === 'success' && (
        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <Icon name="check_circle" size={14} />
          <span className="hidden sm:inline">Synced</span>
        </span>
      )}

      {status === 'error' && (
        <span className="text-xs text-destructive flex items-center gap-1" title={errorMsg}>
          <Icon name="error" size={14} />
          <span className="hidden sm:inline">Failed</span>
        </span>
      )}
    </div>
  )
}
