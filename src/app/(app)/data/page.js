/**
 * /data — daily steps (last 90 days) read from public.daily_metrics, which a daily
 * cron syncs from the Google Health API. Prompts to connect Google Health when the
 * user hasn't, or explains the sync hasn't run yet when there are no rows.
 */
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Steps data — KyaReFitting aa' }

const DAYS = 90

export default async function DataPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from('profiles').select('google_health_refresh_token').eq('id', user.id).maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('date, steps')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(DAYS),
  ])

  const connected = !!profile?.google_health_refresh_token
  const days = rows ?? []
  const total = days.reduce((s, r) => s + (r.steps ?? 0), 0)
  const max = days.reduce((m, r) => Math.max(m, r.steps ?? 0), 0)
  const average = days.length ? Math.round(total / days.length) : 0

  return (
    <div>
      <div>
        <h1>Steps</h1>
        <p>Last {DAYS} days · Google Health</p>
      </div>

      {days.length === 0 ? (
        <div>
          <p>
            {connected
              ? 'No steps synced yet — the daily sync will populate this shortly.'
              : 'Connect Google Health to start syncing your steps.'}
          </p>
          {!connected && (
            <a
              href="/auth/google/health"
             
            >
              Connect Google Health
            </a>
          )}
        </div>
      ) : (
        <>
          <div>
            <Stat label="Total" value={total.toLocaleString()} />
            <Stat label="Daily avg" value={average.toLocaleString()} />
          </div>

          <ul>
            {days.map((r) => (
              <li key={r.date}>
                <span>{formatDate(r.date)}</span>
                <span>
                  <span
                   
                    style={{ width: max ? `${((r.steps ?? 0) / max) * 100}%` : '0%' }}
                  />
                </span>
                <span>{(r.steps ?? 0).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ label, value }) {
  return (
    <div>
      <span>{value}</span>
      <span>{label}</span>
    </div>
  )
}
