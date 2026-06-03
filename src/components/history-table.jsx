'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'
import { Card, CardContent } from '@/components/ui/card'

function Metric({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <Icon name={icon} size={20} className="text-muted-foreground flex-shrink-0" />
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function DayDrawer({ row, sessions, onClose }) {
  const label = new Date(row.date + 'T12:00:00+05:30').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const sleepDisplay = row.sleep_minutes > 0
    ? `${Math.floor(row.sleep_minutes / 60)}h ${row.sleep_minutes % 60}m`
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40"
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-80 max-w-[92vw] bg-background border-l border-border shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-base">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Day summary</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

          {/* Metrics */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity</p>
            <Card>
              <CardContent className="px-4 py-0">
                <Metric icon="directions_walk" label="Steps" value={row.steps > 0 ? row.steps.toLocaleString() : null} />
                <Metric icon="local_fire_department" label="Calories" value={row.calories > 0 ? `${row.calories.toLocaleString()} kcal` : null} />
                <Metric icon="timer" label="Active minutes" value={row.active_minutes > 0 ? `${row.active_minutes} min` : null} />
                <Metric icon="route" label="Distance" value={row.distance_km > 0 ? `${row.distance_km} km` : null} />
                <Metric icon="bedtime" label="Sleep" value={sleepDisplay} />
              </CardContent>
            </Card>
            {!row.steps && !row.calories && !row.sleep_minutes && (
              <p className="text-sm text-muted-foreground mt-2">No activity data recorded for this day.</p>
            )}
          </section>

          {/* Sessions */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Workouts {sessions.length > 0 ? `(${sessions.length})` : ''}
            </p>
            {sessions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sessions.map((s, i) => (
                  <Card key={i}>
                    <CardContent className="px-4 py-3 flex items-center gap-3">
                      <Icon name={s.icon} size={20} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.durationMin >= 60
                            ? `${Math.floor(s.durationMin / 60)}h ${s.durationMin % 60}m`
                            : `${s.durationMin} min`}
                          {s.steps > 0 ? ` · ${s.steps.toLocaleString()} steps` : ''}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No workouts logged for this day.</p>
            )}
          </section>

        </div>
      </div>
    </>
  )
}

export function HistoryTable({ history, sessionsByDate }) {
  const [selected, setSelected] = useState(null)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Steps</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Calories</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Active min</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Distance</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sleep</th>
              <th className="px-2 py-3 w-6"></th>
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => (
              <tr
                key={row.date}
                onClick={() => setSelected(row)}
                className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/30'}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {row.steps > 0 ? row.steps.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {row.calories > 0 ? `${row.calories.toLocaleString()} kcal` : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                  {row.active_minutes > 0 ? `${row.active_minutes} min` : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                  {row.distance_km > 0 ? `${row.distance_km} km` : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                  {row.sleep_minutes > 0
                    ? `${Math.floor(row.sleep_minutes / 60)}h ${row.sleep_minutes % 60}m`
                    : '—'}
                </td>
                <td className="px-2 py-3 text-muted-foreground">
                  <Icon name="chevron_right" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <DayDrawer
          row={selected}
          sessions={sessionsByDate[selected.date] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
