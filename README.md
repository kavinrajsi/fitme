# KyaReFitting aa

A Google-Health–powered fitness tracker: sign in with Google, sync your steps and
health metrics, climb a leaderboard, and get a push notification when a top mover pulls
ahead. You can also hand your own data to an AI assistant over an MCP server. Built with
Next.js 16 + Supabase.

## Stack

- **Next.js 16** (App Router, JavaScript) — note: middleware is `src/proxy.js` (exports
  `proxy`), and `cookies()` / `searchParams` / `params` are async.
- **Supabase** — Google-only auth (SSR via `@supabase/ssr`), Postgres with row-level
  security, a service-role client for cross-user/admin reads.
- **Google Health API** (`health.googleapis.com/v4`) for metrics + **People API** for
  gender/birthday. Restricted scopes; sign-in and Health use **separate** OAuth tokens.
- **Tailwind v4** + **shadcn/ui** (style `base-nova`, which is **Base UI** based — the
  `Button` has no `asChild`), **IBM Plex Sans**, **recharts** for charts. Dark mode is the
  default (`next-themes`), with a `--brand` yellow token + a 5-colour chart palette.
- **web-push** for Web Push notifications (VAPID), with a service worker + PWA manifest.
- **MCP server** (`mcp-handler`) at `/api/mcp/mcp` — read-only tools an AI can call with a
  per-user token; **vaul** drawers, **@tanstack/react-table**, and **zod** round out the UI.
- **Vercel** — hosting + a daily cron.

## Features

- Google-only sign-in; a separate "Connect Google Health" consent for health data.
- **Dashboard** — goal ring, stat cards (steps, active/total calories, distance, resting/
  avg/min/max HR, VO₂, SpO₂, HRV, active minutes, hydration), steps area chart, intraday
  hourly chart, HR/sleep trend charts, streaks + achievements.
- **Steps** (`/data`) with 90D / 1Y / All ranges, **Workouts**, **Leaderboard**
  (Today / Yesterday / 7D / This month), **Profile** (details, goal, notifications, theme,
  reconnect). Dark/light theme toggle (dark default); a mobile bottom nav on small screens.
- **Share** — a branded top-5 leaderboard image (`/api/og/leaderboard`) in four sizes:
  Instagram Story 1080×1920, Instagram Post 1080×1350, WhatsApp square 1080×1080, and a
  1200×630 link preview. The Share control is a dropdown on desktop and a bottom sheet on
  mobile.
- **AI access (MCP)** — the `/ai` page mints per-user API tokens; the remote MCP server at
  `/api/mcp/mcp` then exposes **7 read-only tools** (`get_profile`, `get_daily_metrics`,
  `get_step_stats`, `get_streaks_and_achievements`, `get_activity_heatmap`, `get_workouts`,
  `get_leaderboard`) so Claude can read **only that user's** data.
- **Developer REST API (`/api/v1`)** — the same data over plain HTTP for building apps.
  Tokens carry **scopes** (`read` / `write`); a read-only token is safe to hand to another
  developer. Bearer auth, open CORS, an OpenAPI spec at `/api/v1/openapi.json`, and human
  docs at **`/developers`**. Writes are limited to the user's own `dailyStepGoal`.
- **Admin** (`/admin`, gated to `ADMIN_EMAIL`, `noindex`) — all users, per-user drill-down,
  device list, and a push **notification log**.
- **Sync** three ways: a daily cron, an on-demand streaming Sync button, and a Google
  Health webhook. Full multi-year history is backfilled once per user, then incrementally.
- **Web Push** — opt-in from Profile; everyone is alerted when a current top-4 (7-day)
  person gains steps. Every broadcast + recipient + device is logged for admins.

## Data model (Postgres / Supabase)

| Table | What it holds |
|---|---|
| `profiles` | user, Google + Google-Health tokens, height/weight/age/gender/birthday, `daily_step_goal`, `google_health_user_id` (webhook mapping), and sync flags (`health_data_backfilled_at`, `details_synced_at`) |
| `daily_metrics` | one row per user per day: steps, calories, total_calories, distance, sleep, resting/avg/min/max HR, VO₂, SpO₂, HRV, active minutes, hydration |
| `steps_raw` | raw intraday step samples (started_at/ended_at/count) — the source for the hourly buckets and heatmap |
| `steps_hourly` | intraday hourly step buckets aggregated from `steps_raw` |
| `workouts` | exercise sessions: type, start/end, duration, calories, distance, steps, active-zone minutes, elevation, pace |
| `leaderboard_snapshot` | last-seen 7-day totals (drives push deltas) |
| `push_subscriptions` | Web Push subscriptions + device label/user-agent |
| `notification_log` / `notification_recipients` | push audit log (what was sent, to whom, status, device) |
| `api_tokens` | per-user MCP bearer tokens, stored hashed (`token_hash`) with `last_four`, `name`, `last_used_at`, `revoked_at` |

Migrations are applied directly via the **Supabase MCP** (`apply_migration`); there is no
tracked `supabase/` migrations folder. Cross-user ranking is computed in SQL by two
security-definer functions: `leaderboard_between(since, until)` (the leaderboard page and
the share images) and `leaderboard_since(date)` (push deltas and the MCP leaderboard tool).

## Environment variables

Create `.env.local` (and set the same in Vercel → Production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (sign-in + Google Health)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Health webhook (must match the registered subscriber secret)
GOOGLE_HEALTH_WEBHOOK_SECRET=

# Cron auth (Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically)
CRON_SECRET=

# Web Push (VAPID) — generate with `npx web-push generate-vapid-keys`
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # same value as VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:you@example.com

# Optional: override the admin account (defaults to sikavinraj@gmail.com)
ADMIN_EMAIL=
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts:

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run test       # vitest (run once)
```

### Testing & CI

`npm test` runs the **vitest** suite (`vitest.config.js`, node env): six files under
`src/lib/` covering `date-utils`, `gamification`, `google-health` (fetch-mocked),
`google-people`, `heatmap`, and `push-client`. GitHub Actions (`.github/workflows/ci.yml`,
Node 22) runs `npm ci` → `npm test` → `npm run build` on every push to `main` and PR. Lint
is available via `npm run lint` but is **not** enforced in CI.

## Sync pipeline

All three entry points share `syncUserMetrics` (`src/lib/sync-metrics.js`):

- **Cron** — `GET /api/cron/sync-metrics` (Vercel cron, daily `0 2 * * *` UTC; requires
  `CRON_SECRET`). Backfills full history once per user, then incremental.
- **Manual** — `POST /api/sync` streams live progress (NDJSON) to the Sync button.
- **Webhook** — `POST /api/webhooks/health` re-syncs a user on new Google Health data.

Each run upserts `daily_metrics` and `workouts`, plus raw step samples into `steps_raw`
and the rolled-up `steps_hourly` buckets that feed the activity heatmap (365 days on the
one-time backfill, 14 days incrementally). After a sync, `notifyTopMovers()` checks the
7-day leaderboard and pushes alerts.

### API routes

| Route | Purpose |
|---|---|
| `POST /api/sync` | on-demand sync, streams NDJSON progress to the Sync button |
| `GET /api/cron/sync-metrics` | daily Vercel cron (`CRON_SECRET`); backfill-once then incremental |
| `POST /api/webhooks/health` | Google Health change webhook (`GOOGLE_HEALTH_WEBHOOK_SECRET`) |
| `GET /api/og/leaderboard` | branded top-5 image (`?period=`, `?format=story\|post\|square\|wide`) |
| `POST/GET /api/mcp/mcp` | remote MCP server, per-user Bearer token, read-only tools |
| `GET/PATCH /api/v1/*` | developer REST API (Bearer token + scopes): `me`, `daily-metrics`, `steps/stats`, `steps/hourly`, `heatmap`, `streaks`, `workouts`, `leaderboard`, `export`, `openapi.json` |
| `POST /api/push/{subscribe,unsubscribe,test}` | Web Push subscription + admin test broadcast |

## Deployment

Hosted on Vercel. Set all env vars in **Production**, then deploy. The cron is configured
in `vercel.json`. Web Push needs the VAPID vars; on iPhone, users must **Add to Home
Screen** (install the PWA) before notifications can be delivered.

## Notes

- **Dates are IST (UTC+5:30).** The server runs UTC — always go through
  `src/lib/date-utils.js` or format with `timeZone: 'Asia/Kolkata'`.
- **Google Health is restricted-scope** and only returns data a device actually wrote to
  Health Connect. Rollup query windows are capped (steps/weight 90 days; heart-rate/
  total-calories 14 days), so those are paginated.
- **Auth is Google-only** by design — do not add email/password or other providers.
