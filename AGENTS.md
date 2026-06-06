<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KyaReFitting aa — agent guide

A Next.js 16 + Supabase fitness app on the Google Health API. See `README.md` for the
full architecture, data model, and env vars. Key conventions to follow:

## Framework / Next.js 16
- Middleware lives in `src/proxy.js` and exports `proxy` (NOT `middleware`), with a
  `config.matcher`.
- `cookies()`, `searchParams`, and route `params` are **async** — `await` them.
- The `@` alias maps to `src/`.

## Auth & Google
- **Google-only auth** (Supabase SSR). Never add email/password or other providers.
- Sign-in and **Google Health** use **two separate OAuth tokens** — the Health API rejects
  a token that also carries the People/sign-in scopes. Health is a second incremental
  consent (`/auth/google/health`). Tokens live on the `profiles` row; refresh via
  `src/lib/google-auth.js`.
- Google Health (`src/lib/google-health.js`) is restricted-scope and only returns data a
  device wrote to Health Connect. **Verify field shapes by probing real responses** — do
  not guess. Rollup windows are capped (steps/weight 90d; heart-rate/total-calories 14d),
  so use the chunked helpers.

## Dates
- Everything is **IST (UTC+5:30)**; the server runs UTC. Use `src/lib/date-utils.js`
  (`isoDate`, `dkey`, `civil`, `addDays`, `civilKey`, `istMonthStart`) and pass
  `timeZone: 'Asia/Kolkata'` to any `toLocaleString`/`toLocaleDateString`.

## UI
- Tailwind v4 + **shadcn `base-nova`** (Base UI based). The `Button` has **no `asChild`** —
  style an `<a>` with `buttonVariants({ ... })` or use the Base UI `render` prop. Sidebar
  primitives also use `render`, not `asChild`.
- Font is IBM Plex Sans; charts use recharts via `src/components/ui/chart.jsx`.
- **Dark mode is the default** (`next-themes`; toggle on `/profile`). Use the `--brand`
  yellow token and the `--chart-1..5` palette (`globals.css`) — don't hardcode hex.
- Small screens get a **bottom nav** (`src/components/bottom-nav.jsx`); the header
  hamburger is `md`-only. The leaderboard **share images** come from
  `/api/og/leaderboard` (`?period=`, `?format=story|post|square|wide`) and the picker is
  `src/components/leaderboard-share-button.jsx` (dropdown on desktop, bottom-sheet drawer
  on mobile).

## Database
- Supabase Postgres with **own-row RLS**; the service-role client
  (`src/lib/supabase/service.js`) bypasses RLS for cron/admin/cross-user reads only.
- Apply schema changes with the **Supabase MCP** `apply_migration` (there is no tracked
  `supabase/` folder). **Confirm before applying production migrations.**
- Cross-user ranking is **two** security-definer SQL functions: `leaderboard_between(since,
  until)` (the `/leaderboard` page + `/api/og/leaderboard`) and `leaderboard_since(date)`
  (push deltas in `notify-leaderboard.js` + the MCP `get_leaderboard` tool).
- Raw step samples land in `steps_raw`, rolled into `steps_hourly`. MCP bearer tokens are
  stored hashed in `api_tokens` (never store the raw token).

## Sync & push
- All sync goes through `syncUserMetrics` (`src/lib/sync-metrics.js`), called by the cron,
  manual `/api/sync` (streaming), and the webhook. Full history backfills once per user
  (`profiles.health_data_backfilled_at`).
- Web Push: `src/lib/push.js` (`sendPushToAll`) + `notifyTopMovers`
  (`src/lib/notify-leaderboard.js`). Opt-in only, from the Profile toggle.
- Admin is gated by `ADMIN_EMAIL` (`src/lib/constants.js`).
- Sync also writes `steps_raw` + `steps_hourly`; `src/lib/heatmap.js` (`buildHeatmap`)
  aggregates the hourly rows into the weekday×hour activity grid.

## AI / MCP / public API
- A remote **MCP server** lives at `src/app/api/mcp/[transport]/route.js` (endpoint
  `/api/mcp/mcp`, built on `mcp-handler`). Users mint per-user API tokens on `/ai`
  (`src/lib/api-tokens.js` hashes them into `api_tokens`).
- The **public REST API** is under `src/app/api/v1/*` (Bearer token via
  `src/lib/api-auth.js` → `authenticateApiRequest`, JSON envelope/CORS in
  `src/lib/api-response.js`, docs page `/developers`, spec `/api/v1/openapi.json`).
- **Both surfaces share one source of truth: `src/lib/fitness-data.js`** (getProfileSummary,
  getDailyMetrics, getStepStats, getStreaks, getHeatmap, getHourlySteps, getWorkouts,
  getLeaderboard, getFullExport). Add data accessors there, not inline, so MCP + REST stay
  in sync.
- Everything authenticates with the user's Bearer token and reads **only that user's** rows
  via the service client. Tokens carry **scopes** (`api_tokens.scopes`, default `{read}`);
  reads need `read`, the single write (`PATCH /api/v1/me` → daily step goal) needs `write`.
  Keep the surface read-mostly — don't expose other users' private rows or admin actions.
- **OAuth2** (`src/lib/oauth.js`, routes `/oauth/authorize` + `/api/oauth/token` +
  `/.well-known/oauth-authorization-server`, UI `/developers/apps`): authorization-code flow
  with **PKCE S256 required**; access tokens are `kref_at_…`, refresh tokens rotate. Clients,
  codes, and tokens live in the `oauth_*` tables (no RLS policies — service client only, always
  filtered by `owner_user_id`/`user_id`). `authenticateApiRequest` (and MCP `verifyToken`)
  **dispatch by prefix**: `kref_at_` → `resolveAccessToken`, else `resolveToken` — so both
  surfaces accept either token type. Add OAuth tokens here, never bypass this seam.
- **Rate limiting** (`src/lib/rate-limit.js` + `check_rate_limit` SQL fn): per-token fixed
  window (`API_RATE_LIMIT`/`API_RATE_WINDOW` in constants), enforced inside
  `authenticateApiRequest`; **fails open** on DB error. Stale `api_rate_limits` rows + expired
  auth codes are pruned by the daily cron.

## Working agreements
- Commit/push only when asked; end commit messages with the `Co-Authored-By` trailer.
- Don't dump raw OAuth tokens (or MCP API tokens) to the transcript.
- Tests run via `npm test` (vitest, node env); CI (`.github/workflows/ci.yml`, Node 22)
  runs install → test → build. Lint is **not** wired into CI — keep `npm test` green.
