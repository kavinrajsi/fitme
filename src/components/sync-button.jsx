'use client'

/**
 * Header "Sync" button. Opens a panel that streams live progress from POST /api/sync
 * and then shows the synced results (totals + the most recent days).
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SyncButton() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [reconnect, setReconnect] = useState(false)

  // Lock background page scroll while the sheet is open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  async function runSync() {
    setOpen(true)
    setRunning(true)
    setSteps([])
    setResult(null)
    setError(null)
    setReconnect(false)

    try {
      const response = await fetch('/api/sync', { method: 'POST' })
      if (!response.ok || !response.body) throw new Error()
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line)
          if (event.step) setSteps((previousSteps) => [...previousSteps, event.step])
          if (event.error) setError(event.error)
          if (event.reconnect) setReconnect(true)
          if (event.done) setResult(event)
        }
      }
    } catch {
      setError('Sync failed — please try again.')
    } finally {
      setRunning(false)
    }
  }

  function close() {
    if (!running) setOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={runSync} disabled={running}>
        {running ? 'Syncing…' : 'Sync'}
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={close}
          >
          <div
            className="bg-background flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b p-4">
              <strong className="text-base font-semibold">Sync Google Health</strong>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={close}
                disabled={running}
                aria-label="Close"
              >
                <XIcon />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <ul className="flex flex-col gap-2 text-sm">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1
                  const inProgress = running && isLast && !result && !error
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-4 text-center">
                        {inProgress ? '⋯' : '✓'}
                      </span>
                      {step}
                    </li>
                  )
                })}
              </ul>

              {error && (
                <div className="bg-destructive/10 text-destructive mt-4 rounded-md p-3 text-sm">
                  <p>{error}</p>
                  {reconnect && (
                    <a
                      href="/auth/google/health"
                      className="mt-2 inline-block font-medium underline underline-offset-4"
                    >
                      Reconnect Google Health →
                    </a>
                  )}
                </div>
              )}

              {result && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-muted-foreground text-sm">
                    Synced <strong className="text-foreground">{result.summary.days}</strong> days ·{' '}
                    {result.summary.withSteps} with steps
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <strong className="text-foreground">
                      {result.summary.totalSteps.toLocaleString()}
                    </strong>{' '}
                    total steps · {result.summary.avgSteps.toLocaleString()}/day avg
                  </p>

                  <table className="mt-3 w-full text-sm tabular-nums">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th className="py-1 font-medium">Date</th>
                        <th className="py-1 text-right font-medium">Steps</th>
                        <th className="py-1 text-right font-medium">Cal</th>
                        <th className="py-1 text-right font-medium">Km</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recent.map((day) => (
                        <tr key={day.date} className="border-b last:border-0">
                          <td className="py-1">{day.date}</td>
                          <td className="py-1 text-right">{(day.steps ?? 0).toLocaleString()}</td>
                          <td className="py-1 text-right">{day.calories ?? 0}</td>
                          <td className="py-1 text-right">{day.distance_km ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <a
                    href="/data"
                    className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline"
                    onClick={() => setOpen(false)}
                  >
                    View all steps →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  )
}
