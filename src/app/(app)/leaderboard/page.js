/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / 7D / 30D, ?period=, default 7D) switch which window loads.
 *
 * daily_metrics + profiles are RLS "own-row only", so the ranking is built with the
 * service-role client server-side. Only leaderboard-safe fields are surfaced
 * (display name, avatar, step total) — never emails or tokens.
 */
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

const PERIODS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
]

export default async function LeaderboardPage({ searchParams }) {
  const { period: periodParam } = await searchParams
  const period = PERIODS.find((p) => p.key === periodParam) ?? PERIODS[1] // default 7D

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createServiceClient()
  const istNow = Date.now() + 5.5 * 3600 * 1000
  const since = new Date(istNow - (period.days - 1) * 86400000).toISOString().slice(0, 10)

  const [{ data: metrics }, { data: profiles }] = await Promise.all([
    service.from('daily_metrics').select('user_id, steps').gte('date', since),
    service.from('profiles').select('id, full_name, avatar_url'),
  ])

  const stepsByUser = {}
  for (const m of metrics ?? []) {
    stepsByUser[m.user_id] = (stepsByUser[m.user_id] ?? 0) + (m.steps ?? 0)
  }

  const ranked = (profiles ?? [])
    .map((p) => ({
      id: p.id,
      name: p.full_name ?? 'Anonymous',
      avatar: p.avatar_url,
      steps: stepsByUser[p.id] ?? 0,
    }))
    .sort((a, b) => b.steps - a.steps)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  const shown = ranked.filter((r) => r.steps > 0 || r.id === user.id)
  const anySteps = ranked.some((r) => r.steps > 0)

  return (
    <div>
      <div>
        <h1>Leaderboard</h1>
        <p>Total steps · {period.label}</p>
      </div>

      <div>
        {PERIODS.map((p) => (
          <a
            key={p.key}
            href={`/leaderboard?period=${p.key}`}
           
          >
            {p.label}
          </a>
        ))}
      </div>

      {!anySteps ? (
        <p>No steps on the leaderboard yet — sync to get on the board.</p>
      ) : (
        <ul>
            {shown.map((r) => (
              <li
                key={r.id}
               
              >
                <span>{r.rank}</span>
                {r.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                   
                    src={r.avatar}
                    alt=""
                    width={32}
                    height={32}
                  />
                ) : (
                  <span aria-hidden="true">
                    {(r.name?.[0] ?? '?').toUpperCase()}
                  </span>
                )}
                <span>
                  {r.name}
                  {r.id === user.id && <span> (you)</span>}
                </span>
                <span>{r.steps.toLocaleString()}</span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
