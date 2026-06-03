'use client'

import { useState, useRef, useEffect } from 'react'
import { Icon } from '@/components/icon'
import { useRouter } from 'next/navigation'

const STEPS = [
  { key: 'credentials', label: 'Credentials' },
  { key: 'health',      label: "Today's health" },
  { key: 'steps',       label: 'Step history' },
  { key: 'body',        label: 'Body metrics' },
  { key: 'sleep',       label: 'Sleep data' },
  { key: 'activities',  label: 'Activities' },
  { key: 'heartrate',   label: 'Heart rate' },
  { key: 'saving',      label: 'Saving' },
]

export function SyncButton() {
  const [phase, setPhase] = useState('idle') // 'idle' | 'running' | 'success' | 'error'
  const [stepStatus, setStepStatus] = useState({})
  const [errorMsg, setErrorMsg] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const wrapperRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    if (!showPanel) return
    function onMouseDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPanel(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showPanel])

  const doneCount = STEPS.filter(s => stepStatus[s.key] === 'done').length

  async function handleSync() {
    if (phase === 'running') return
    setPhase('running')
    setStepStatus({})
    setErrorMsg(null)
    setShowPanel(true)

    try {
      const response = await fetch('/api/sync/stream')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let completed = false

      outer: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          let data
          try { data = JSON.parse(line.slice(6)) } catch { continue }

          if (data.error) {
            completed = true
            setPhase('error')
            setErrorMsg(data.error)
            break outer
          }
          if (data.complete) {
            completed = true
            const d = data.data
            console.group('[Sync] completed')
            console.table([d.health])
            console.table(d.dailySteps)
            console.table([d.body])
            console.log('[Sync] sleepWeek:', d.sleepWeek)
            console.table(d.activities)
            console.log('[Sync] heartRateWeek:', d.heartRateWeek)
            console.groupEnd()
            setPhase('success')
            router.refresh()
            break outer
          }
          if (data.step) {
            setStepStatus(prev => ({ ...prev, [data.step]: data.done ? 'done' : 'active' }))
            if (data.done && data.debug !== undefined) {
              Array.isArray(data.debug)
                ? console.table(data.debug)
                : console.log(`[Sync] ${data.step}:`, data.debug)
            }
          }
        }
      }

      if (!completed) {
        setPhase('error')
        setErrorMsg('Connection lost — please try again')
      }
    } catch (err) {
      setPhase('error')
      setErrorMsg(err?.message ?? 'Sync failed')
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={handleSync}
        disabled={phase === 'running'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Sync with Google"
        title={phase === 'error' ? errorMsg : 'Sync with Google'}
      >
        <Icon
          name="sync"
          size={16}
          className={phase === 'running' ? '[animation:spin_1s_linear_infinite]' : ''}
        />
        <span className="hidden sm:inline">
          {phase === 'running' ? 'Syncing…' : phase === 'success' ? 'Synced' : 'Sync'}
        </span>
      </button>

      {showPanel && (
        <div className="absolute top-full right-0 mt-2 w-52 rounded-xl border border-border bg-background shadow-lg p-3 z-50">
          <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
            />
          </div>

          <ul className="space-y-1.5">
            {STEPS.map(s => {
              const status = stepStatus[s.key]
              return (
                <li key={s.key} className="flex items-center gap-2 text-xs">
                  {status === 'done' ? (
                    <Icon name="check_circle" size={14} className="text-green-500 shrink-0" />
                  ) : status === 'active' ? (
                    <Icon name="sync" size={14} className="[animation:spin_1s_linear_infinite] text-primary shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/25 shrink-0 inline-block" />
                  )}
                  <span className={
                    status === 'done'   ? 'text-foreground' :
                    status === 'active' ? 'text-foreground font-medium' :
                    'text-muted-foreground/50'
                  }>
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ul>

          {phase === 'error' && errorMsg && (
            <p className="mt-2 text-xs text-destructive border-t border-border pt-2">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  )
}
