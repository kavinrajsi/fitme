'use client'

/**
 * Header "Sync" button. Opens a panel that streams live progress from POST /api/sync
 * and then shows the synced results (totals + the most recent days).
 */
import { useState } from 'react'

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
      <button onClick={runSync} disabled={running}>
        {running ? 'Syncing…' : 'Sync'}
      </button>

      {open && (
        <div onClick={close}>
          <div onClick={(e) => e.stopPropagation()}>
            <div>
              <strong>Sync Google Health</strong>
              <button
               
                onClick={close}
                disabled={running}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <ul>
              {steps.map((s, i) => {
                const isLast = i === steps.length - 1
                const inProgress = running && isLast && !result && !error
                return (
                  <li key={i}>
                    <span>{inProgress ? '⋯' : '✓'}</span>
                    {s}
                  </li>
                )
              })}
            </ul>

            {error && <p>{error}</p>}

            {result && (
              <div>
                <p>
                  Synced <strong>{result.summary.days}</strong> days ·{' '}
                  {result.summary.withSteps} with steps
                </p>
                <p>
                  <strong>{result.summary.totalSteps.toLocaleString()}</strong> total steps ·{' '}
                  {result.summary.avgSteps.toLocaleString()}/day avg
                </p>

                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Steps</th>
                      <th>Cal</th>
                      <th>Km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.recent.map((r) => (
                      <tr key={r.date}>
                        <td>{r.date}</td>
                        <td>{(r.steps ?? 0).toLocaleString()}</td>
                        <td>{r.calories ?? 0}</td>
                        <td>{r.distance_km ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <a
                  href="/data"
                 
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
