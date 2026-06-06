/**
 * GET /api/og/leaderboard?period=today|7d|month — a branded 1200×630 image of the top 5
 * for the window, for the leaderboard Share button. Public, returns only the
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
  const periodKey = new URL(request.url).searchParams.get('period')
  const period = PERIODS[periodKey] ?? PERIODS.month

  const service = createServiceClient()
  const { data: rows } = await service.rpc('leaderboard_since', { since_date: period.since() })
  const top = (rows ?? []).filter((r) => Number(r.total_steps) > 0).slice(0, 5)

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
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 100 100" style={{ marginRight: 20 }}>
            <path d={LOGO_PATH} fill={BRAND} />
          </svg>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700 }}>KyaReFitting</div>
          <div style={{ display: 'flex', marginLeft: 'auto', fontSize: 30, color: BRAND }}>
            Leaderboard · {period.label}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56, gap: 22 }}>
          {top.length === 0 ? (
            <div style={{ display: 'flex', fontSize: 36, color: '#888' }}>No steps yet.</div>
          ) : (
            top.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: i === 0 ? 'rgba(253,217,65,0.12)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 18,
                  padding: '20px 28px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: 64,
                    fontSize: 44,
                    fontWeight: 800,
                    color: i === 0 ? BRAND : '#777',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: 'flex', flex: 1, fontSize: 40, fontWeight: 600 }}>
                  {row.full_name ?? 'Anonymous'}
                </div>
                <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: BRAND }}>
                  {Number(row.total_steps).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: '#666' }}>
          Total steps · kyarefitting
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
