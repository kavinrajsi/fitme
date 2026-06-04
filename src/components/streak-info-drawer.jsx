'use client'

import { useState } from 'react'
import { STREAK_THRESHOLD, STEP_GOAL } from '@/lib/constants'
import { Icon } from '@/components/icon'

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor">
      <path d="M440-280h80v-240h-80v240Zm68.5-331.5Q520-623 520-640t-11.5-28.5Q497-680 480-680t-28.5 11.5Q440-657 440-640t11.5 28.5Q463-600 480-600t28.5-11.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
    </svg>
  )
}

export function StreakInfoDrawer() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Streak info"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <InfoIcon />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon name="local_fire_department" size={20} className="text-orange-500" />
            <span className="font-semibold">About Streaks</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">

          <Section icon="local_fire_department" iconClass="text-orange-500" title="What is a streak?">
            A streak counts how many consecutive days you've hit your step target. Every active day in a row adds one to your streak.
          </Section>

          <Section icon="directions_walk" iconClass="text-blue-500" title={`Active day threshold`}>
            A day counts as active when you reach <strong>{STREAK_THRESHOLD.toLocaleString()} steps</strong>. Your full step goal is {STEP_GOAL.toLocaleString()} steps — the streak threshold is set slightly lower to reward consistent movement.
          </Section>

          <Section icon="calendar_today" iconClass="text-purple-500" title="How today is handled">
            <ul className="flex flex-col gap-2 mt-1">
              <li className="flex gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>If you've already hit {STREAK_THRESHOLD.toLocaleString()} steps today, today counts and the streak looks back from today.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground mt-0.5">–</span>
                <span>If you haven't hit the target yet today, the streak counts back from yesterday so you don't lose your streak mid-day.</span>
              </li>
            </ul>
          </Section>

          <Section icon="cancel" iconClass="text-red-400" title="Breaking a streak">
            Missing a day (below {STREAK_THRESHOLD.toLocaleString()} steps) resets your streak to 0. The streak only counts consecutive days — a gap of even one day breaks the chain.
          </Section>

          <Section icon="emoji_events" iconClass="text-yellow-500" title="Streak badges">
            <ul className="flex flex-col gap-2 mt-1">
              <li className="flex items-center gap-2">
                <Icon name="bolt" size={16} className="text-blue-500 flex-shrink-0" />
                <span><strong>On a Roll</strong> — 3-day streak</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="local_fire_department" size={16} className="text-orange-500 flex-shrink-0" />
                <span><strong>Week Warrior</strong> — 7-day streak</span>
              </li>
            </ul>
          </Section>

          <Section icon="info" iconClass="text-muted-foreground" title="Data source">
            Streak data is pulled from your synced Google Health history. Days before you connected Google Health won't have step data and won't count toward a streak.
          </Section>

        </div>
      </div>
    </>
  )
}

function Section({ icon, iconClass, title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={16} className={iconClass} />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  )
}
