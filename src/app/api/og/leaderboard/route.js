/**
 * GET /api/og/leaderboard?period=today|7d|month&format=story|post|square|wide
 *   - story  → 1080×1920 (Instagram Story / WhatsApp Status, 9:16 — default)
 *   - post   → 1080×1350 (Instagram Post, 4:5)
 *   - square → 1080×1080 (WhatsApp Message, 1:1)
 *   - wide   → 1200×630  (link-preview / OG size)
 * A branded image of the top 5 for the window. Public; returns only the
 * leaderboard-safe top 5 (display name + step total).
 */
import { ImageResponse } from 'next/og'
import { createServiceClient } from '@/lib/supabase/service'
import { dkey, istMonthStart } from '@/lib/date-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BRAND = '#FDD941'
const LOGO_PATH =
  'M55.8333 91.25L50 85.4167L64.7917 70.625L29.375 35.2083L14.5833 50L8.75 44.1667L14.5833 38.125L8.75 32.2917L17.5 23.5417L11.6667 17.5L17.5 11.6667L23.5417 17.5L32.2917 8.75L38.125 14.5833L44.1667 8.75L50 14.5833L35.2083 29.375L70.625 64.7917L85.4167 50L91.25 55.8333L85.4167 61.875L91.25 67.7083L82.5 76.4583L88.3333 82.5L82.5 88.3333L76.4583 82.5L67.7083 91.25L61.875 85.4167L55.8333 91.25Z'

const PERIODS = {
  today: { label: 'Today', since: () => dkey(0), until: () => dkey(0) },
  yesterday: { label: 'Yesterday', since: () => dkey(1), until: () => dkey(1) },
  '7d': { label: 'Last 7 days', since: () => dkey(6), until: () => dkey(0) },
  month: { label: 'This month', since: () => istMonthStart(), until: () => dkey(0) },
}

// Output dimensions + layout sizing per share target. The tall ones share the
// 'portrait' layout (logo/title stacked, rows centered); 'wide' is the link-preview
// banner. Font/spacing scale down with the canvas so the top-5 + header + footer fit.
const FORMATS = {
  story: { w: 1080, h: 1920, kind: 'portrait', s: { pad: 90, logo: 120, brand: 56, title: 96, period: 40, rank: 64, name: 56, steps: 52, rowPad: '34px 40px', radius: 28, gap: 28, marginTop: 80, foot: 32 } },
  post: { w: 1080, h: 1350, kind: 'portrait', s: { pad: 72, logo: 88, brand: 40, title: 68, period: 32, rank: 48, name: 44, steps: 42, rowPad: '24px 32px', radius: 22, gap: 20, marginTop: 48, foot: 28 } },
  square: { w: 1080, h: 1080, kind: 'portrait', s: { pad: 56, logo: 64, brand: 30, title: 52, period: 28, rank: 40, name: 36, steps: 34, rowPad: '16px 28px', radius: 18, gap: 16, marginTop: 32, foot: 24 } },
  wide: { w: 1200, h: 630, kind: 'wide', s: { pad: 64, logo: 64, brand: 44, title: 0, period: 30, rank: 44, name: 40, steps: 40, rowPad: '20px 28px', radius: 18, gap: 22, marginTop: 56, foot: 24 } },
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const period = PERIODS[params.get('period')] ?? PERIODS.month
  const format = FORMATS[params.get('format')] ?? FORMATS.story
  const portrait = format.kind === 'portrait'
  const s = format.s

  const since = period.since()
  const until = period.until()

  const service = createServiceClient()
  const { data: rows } = await service.rpc('leaderboard_between', {
    since_date: since,
    until_date: until,
  })
  const top = (rows ?? []).filter((r) => Number(r.total_steps) > 0).slice(0, 5)

  // Period label with its date(s), e.g. "Today · Jun 6" or "Last 7 days · May 31 – Jun 6".
  const fmtDay = (d) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dateLabel = since === until ? fmtDay(since) : `${fmtDay(since)} – ${fmtDay(until)}`
  const subtitle = `${period.label} · ${dateLabel}`

  const Header = portrait ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <svg width={s.logo} height={s.logo} viewBox="0 0 100 100">
        <path d={LOGO_PATH} fill={BRAND} />
      </svg>
      <div style={{ display: 'flex', marginTop: 28, fontSize: s.brand, color: '#aaa' }}>KyaReFitting</div>
      <div style={{ display: 'flex', fontSize: s.title, fontWeight: 800, lineHeight: 1.05 }}>Leaderboard</div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: s.period, color: BRAND }}>{subtitle}</div>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <svg width={s.logo} height={s.logo} viewBox="0 0 100 100" style={{ marginRight: 20 }}>
        <path d={LOGO_PATH} fill={BRAND} />
      </svg>
      <div style={{ display: 'flex', fontSize: s.brand, fontWeight: 700 }}>KyaReFitting</div>
      <div style={{ display: 'flex', marginLeft: 'auto', fontSize: s.period, color: BRAND }}>
        Leaderboard · {subtitle}
      </div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          color: '#ffffff',
          padding: s.pad,
          fontFamily: 'sans-serif',
        }}
      >
        {Header}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: s.marginTop,
            gap: s.gap,
            flex: portrait ? 1 : 0,
            justifyContent: portrait ? 'center' : 'flex-start',
          }}
        >
          {top.length === 0 ? (
            <div style={{ display: 'flex', fontSize: s.name, color: '#888' }}>No steps yet.</div>
          ) : (
            top.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: i === 0 ? 'rgba(253,217,65,0.14)' : 'rgba(255,255,255,0.04)',
                  borderRadius: s.radius,
                  padding: s.rowPad,
                }}
              >
                <div style={{ display: 'flex', width: portrait ? 90 : 64, fontSize: s.rank, fontWeight: 800, color: i === 0 ? BRAND : '#777' }}>
                  {i + 1}
                </div>
                <div style={{ display: 'flex', flex: 1, fontSize: s.name, fontWeight: 600 }}>
                  {row.full_name ?? 'Anonymous'}
                </div>
                <div style={{ display: 'flex', fontSize: s.steps, fontWeight: 700, color: BRAND }}>
                  {Number(row.total_steps).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', marginTop: portrait ? 0 : 'auto', fontSize: s.foot, color: '#666' }}>
          Total steps · kyarefitting
        </div>
      </div>
    ),
    { width: format.w, height: format.h }
  )
}
