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

export function StepSourceDrawer({ steps, dateLabel }) {
  const [open, setOpen] = useState(false)
  const total = steps.reduce((s, p) => s + p.steps, 0)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-primary hover:opacity-80 transition-opacity font-medium"
      >
        See source data
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40" />
      )}

      <div className={`fixed top-0 right-0 z-50 h-full w-96 max-w-[96vw] bg-background flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="font-medium">{dateLabel}</p>
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Total */}
        <div className="px-5 pt-6 pb-4 border-b border-border">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary tabular-nums">{total.toLocaleString()}</span>
            <span className="text-base text-primary font-medium">steps</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Steps · {steps.length} {steps.length === 1 ? 'entry' : 'entries'}</p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground px-5 py-6">No step data recorded yet today.</p>
          ) : (
            steps.map((pt, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-border last:border-0">
                <p className="text-sm text-muted-foreground mb-0.5">{fmt(pt.startMs)}</p>
                <p className="font-bold text-base">{pt.steps.toLocaleString()} {pt.steps === 1 ? 'step' : 'steps'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
