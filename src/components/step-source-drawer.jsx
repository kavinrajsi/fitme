'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'

function fmt(ms) {
  return new Date(ms).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function StepSourceDrawer({ steps }) {
  const [open, setOpen] = useState(false)
  const total = steps.reduce((s, p) => s + p.steps, 0)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
      >
        See source data
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[92vw] bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold">Source data — today</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {steps.length} segment{steps.length !== 1 ? 's' : ''} · {total.toLocaleString()} steps total
            </p>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No step data recorded yet today.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b border-border">
                <tr>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Time</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Steps</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((pt, i) => (
                  <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                    <td className="px-5 py-2.5 text-muted-foreground tabular-nums">
                      {fmt(pt.startMs)}
                      {pt.endMs - pt.startMs > 60000 && (
                        <span className="text-xs ml-1">– {fmt(pt.endMs)}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                      {pt.steps.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
