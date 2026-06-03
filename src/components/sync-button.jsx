'use client'

import { useState } from 'react'
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

function fmtDate(isoDate, today) {
  const label = new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return isoDate === today ? `${label} · today` : label
}

export function SyncButton() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState('idle') // 'idle' | 'running' | 'success' | 'error'
  const [stepStatus, setStepStatus] = useState({})
  const [stepDebug, setStepDebug] = useState({})
  const [errorMsg, setErrorMsg] = useState(null)
  const router = useRouter()

  const doneCount = STEPS.filter(s => stepStatus[s.key] === 'done').length
  const resolvedSteps = stepDebug.saving?.dailySteps ?? []
  const todayIso = stepDebug.saving?.today

  async function handleSync() {
    if (phase === 'running') return
    setOpen(true)
    setPhase('running')
    setStepStatus({})
    setStepDebug({})
    setErrorMsg(null)

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
              setStepDebug(prev => ({ ...prev, [data.step]: data.debug }))
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

  const drawerTitle =
    phase === 'running' ? 'Syncing…' :
    phase === 'success' ? 'Synced' :
    phase === 'error'   ? 'Sync failed' : 'Sync'

  return (
    <>
      <button
        onClick={handleSync}
        disabled={phase === 'running'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Sync with Google"
      >
        <Icon
          name="sync"
          size={16}
          className={phase === 'running' ? '[animation:spin_1s_linear_infinite]' : ''}
        />
        <span className="hidden sm:inline">
          {phase === 'running' ? 'Syncing…' : 'Sync'}
        </span>
      </button>

      {/* Backdrop */}
      <div
        onClick={() => phase !== 'running' && setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon
              name="sync"
              size={18}
              className={
                phase === 'running' ? '[animation:spin_1s_linear_infinite] text-primary' :
                phase === 'success' ? 'text-green-500' :
                phase === 'error'   ? 'text-destructive' :
                'text-muted-foreground'
              }
            />
            <span className="font-semibold">{drawerTitle}</span>
          </div>
          <button
            onClick={() => phase !== 'running' && setOpen(false)}
            disabled={phase === 'running'}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${phase === 'error' ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Step list */}
          <ul className="space-y-3">
            {STEPS.map(s => {
              const status = stepStatus[s.key]
              return (
                <li key={s.key} className="flex items-center gap-2.5">
                  {status === 'done' ? (
                    <Icon name="check_circle" size={16} className="text-green-500 shrink-0" />
                  ) : status === 'active' ? (
                    <Icon name="sync" size={16} className="[animation:spin_1s_linear_infinite] text-primary shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-muted-foreground/25 shrink-0 inline-block" />
                  )}
                  <span className={`text-sm ${
                    status === 'done'   ? 'text-foreground' :
                    status === 'active' ? 'text-foreground font-medium' :
                    'text-muted-foreground/40'
                  }`}>
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Daily steps breakdown — appears after saving completes */}
          {resolvedSteps.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Daily steps
              </p>
              <ul className="space-y-2.5">
                {[...resolvedSteps].reverse().map(({ date, steps }) => (
                  <li key={date} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{fmtDate(date, todayIso)}</span>
                    <span className={`text-sm tabular-nums ${steps > 0 ? 'font-semibold' : 'text-muted-foreground/40'}`}>
                      {steps.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error message */}
          {phase === 'error' && errorMsg && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <Icon name="error" size={16} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{errorMsg}</p>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
