'use client'

/**
 * Header "Sync" button. Opens a panel that streams live progress from POST /api/sync
 * and then shows the synced results (totals + the most recent days).
 */
import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SyncButton() {
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function runSync() {
    setOpen(true)
    setRunning(true)
    setSteps([])
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.trim()) continue
          const evt = JSON.parse(line)
          if (evt.step) setSteps((s) => [...s, evt.step])
          if (evt.error) setError(evt.error)
          if (evt.done) setResult(evt)
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

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="bg-background w-full max-w-md rounded-t-2xl border p-6 shadow-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
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

            <ul className="flex flex-col gap-2 text-sm">
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1
                const inProgress = running && isLast && !result && !error
                return (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4 text-center">
                      {inProgress ? '⋯' : '✓'}
                    </span>
                    {s}
                  </li>
                )
              })}
            </ul>

            {error && (
              <p className="bg-destructive/10 text-destructive mt-4 rounded-md p-3 text-sm">
                {error}
              </p>
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
                    {result.recent.map((r) => (
                      <tr key={r.date} className="border-b last:border-0">
                        <td className="py-1">{r.date}</td>
                        <td className="py-1 text-right">{(r.steps ?? 0).toLocaleString()}</td>
                        <td className="py-1 text-right">{r.calories ?? 0}</td>
                        <td className="py-1 text-right">{r.distance_km ?? 0}</td>
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
      )}
    </>
  )
}
