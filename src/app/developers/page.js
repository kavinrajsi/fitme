/**
 * Developer docs — static, public reference for the REST API (`/api/v1`). No auth,
 * no data fetching. Explains token auth + scopes, lists every endpoint, and shows
 * copy-paste curl examples. The endpoint list below is the single place to edit.
 */

export const metadata = { title: 'Developer API — KyaReFitting aa' }

// Each endpoint: method, path (relative to /api/v1), required scope, and a blurb.
const ENDPOINTS = [
  { method: 'GET', path: '/me', scope: 'read', desc: 'Your profile summary (name, body metrics, BMI, goal).' },
  { method: 'PATCH', path: '/me', scope: 'write', desc: 'Update writable fields — body { "dailyStepGoal": 12000 }.' },
  { method: 'GET', path: '/daily-metrics?days=30', scope: 'read', desc: 'Daily metrics, newest first. Or ?from=&to= (YYYY-MM-DD).' },
  { method: 'GET', path: '/steps/stats', scope: 'read', desc: 'Today, yesterday, 7-day total/avg, trend, 30-day avg.' },
  { method: 'GET', path: '/steps/hourly?days=30', scope: 'read', desc: 'Hourly step buckets. Or ?from=&to=.' },
  { method: 'GET', path: '/heatmap', scope: 'read', desc: 'Weekday×hour activity grid + peak-time insight.' },
  { method: 'GET', path: '/streaks', scope: 'read', desc: 'Streaks, totals, and the 9 achievement badges.' },
  { method: 'GET', path: '/workouts?limit=20', scope: 'read', desc: 'Recent workout sessions, newest first.' },
  { method: 'GET', path: '/leaderboard?period=7d', scope: 'read', desc: 'Cross-user ranking (today/yesterday/7d/month).' },
  { method: 'GET', path: '/export', scope: 'read', desc: 'Everything you own in one JSON download.' },
  { method: 'GET', path: '/openapi.json', scope: 'none', desc: 'Machine-readable OpenAPI 3 spec (no auth).' },
]

export default function DevelopersPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </a>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Developer API</h1>
      <p className="mt-1 text-muted-foreground">
        Build an app on your KyaReFitting data with a simple REST API.
      </p>

      <article className="mt-8 space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Authentication</h2>
          <p className="mb-3 leading-7 text-muted-foreground">
            Mint a personal token on the <a href="/ai" className="font-medium text-foreground underline">AI &amp; API page</a>{' '}
            and send it on every request:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
{`Authorization: Bearer kref_xxxxxxxxxxxxxxxxxxxxxxxx`}
          </pre>
          <p className="mt-3 leading-7 text-muted-foreground">
            A token returns <strong className="text-foreground">only your own data</strong> (plus
            the leaderboard-safe ranking everyone shares). Treat it like a password.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Scopes</h2>
          <p className="leading-7 text-muted-foreground">
            <strong className="text-foreground">read</strong> — call every <code>GET</code> endpoint.
            Hand a read-only token to a developer building on your data.
            <br />
            <strong className="text-foreground">write</strong> — additionally allows{' '}
            <code>PATCH /me</code>. Pick the access level when you mint the token.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Endpoints</h2>
          <p className="mb-3 leading-7 text-muted-foreground">
            Base URL: <code>/api/v1</code>. All responses are JSON; errors are{' '}
            <code>{'{ "error": { "code", "message" } }'}</code>. CORS is open (Bearer-token auth, no
            cookies), so browser apps can call it directly.
          </p>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Scope</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {ENDPOINTS.map((e) => (
                  <tr key={`${e.method} ${e.path}`} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{e.method}</td>
                    <td className="px-3 py-2 font-mono text-xs">{e.path}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{e.scope}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Examples</h2>
          <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs leading-6">
{`# Your last 7 days of metrics
curl -H "Authorization: Bearer $KREF_TOKEN" \\
  https://kyarefitting.app/api/v1/daily-metrics?days=7

# Update your daily step goal (needs a write-scoped token)
curl -X PATCH -H "Authorization: Bearer $KREF_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"dailyStepGoal": 12000}' \\
  https://kyarefitting.app/api/v1/me`}
          </pre>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">OpenAPI</h2>
          <p className="leading-7 text-muted-foreground">
            A machine-readable schema is at{' '}
            <a href="/api/v1/openapi.json" className="font-medium text-foreground underline">
              /api/v1/openapi.json
            </a>{' '}
            — import it into Postman, an SDK generator, or your tooling.
          </p>
        </section>
      </article>
    </main>
  )
}
