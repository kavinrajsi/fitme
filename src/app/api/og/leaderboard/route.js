/**
 * GET /api/og/leaderboard?period=today|7d|month&format=wide|story
 *   - wide  → 1200×630 (link-preview / OG size)
 *   - story → 1080×1920 (Instagram Story / 9:16, used by the Share button)
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
  today: { label: 'Today', since: () => dkey(0) },
  '7d': { label: 'Last 7 days', since: () => dkey(6) },
  month: { label: 'This month', since: () => istMonthStart() },
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const period = PERIODS[params.get('period')] ?? PERIODS.month
  const portrait = params.get('format') === 'story'

  const service = createServiceClient()
  const { data: rows } = await service.rpc('leaderboard_since', { since_date: period.since() })
  const top = (rows ?? []).filter((r) => Number(r.total_steps) > 0).slice(0, 5)

  // Layout constants per format.
  const s = portrait
    ? { w: 1080, h: 1920, pad: 90, logo: 120, brand: 56, title: 96, period: 40, rank: 64, name: 56, steps: 52, rowPad: '34px 40px', radius: 28, gap: 28, foot: 32 }
    : { w: 1200, h: 630, pad: 64, logo: 64, brand: 44, title: 0, period: 30, rank: 44, name: 40, steps: 40, rowPad: '20px 28px', radius: 18, gap: 22, foot: 24 }

  const Header = portrait ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <svg width={s.logo} height={s.logo} viewBox="0 0 100 100">
        <path d={LOGO_PATH} fill={BRAND} />
      </svg>
      <div style={{ display: 'flex', marginTop: 28, fontSize: s.brand, color: '#aaa' }}>KyaReFitting</div>
      <div style={{ display: 'flex', fontSize: s.title, fontWeight: 800, lineHeight: 1.05 }}>Leaderboard</div>
      <div style={{ display: 'flex', marginTop: 8, fontSize: s.period, color: BRAND }}>{period.label}</div>
    </div>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <svg width={s.logo} height={s.logo} viewBox="0 0 100 100" style={{ marginRight: 20 }}>
        <path d={LOGO_PATH} fill={BRAND} />
      </svg>
      <div style={{ display: 'flex', fontSize: s.brand, fontWeight: 700 }}>KyaReFitting</div>
      <div style={{ display: 'flex', marginLeft: 'auto', fontSize: s.period, color: BRAND }}>
        Leaderboard · {period.label}
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
            marginTop: portrait ? 80 : 56,
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
    { width: s.w, height: s.h }
  )
}
