# KyaReFitting API

Read (and lightly write) your KyaReFitting fitness data over HTTP. Same data the app and
the MCP server use.

- **Base URL:** `https://<your-host>` (e.g. `http://localhost:3000` in dev). Examples below
  use `$BASE`.
- **Format:** JSON. Success returns the payload directly; errors return
  `{ "error": { "code", "message" } }`.
- **CORS:** open (`Access-Control-Allow-Origin: *`) — auth is by Bearer token, not cookies,
  so browser apps can call it directly.
- **Machine-readable spec:** `GET $BASE/api/v1/openapi.json`.

---

## Authentication

Every data request needs a Bearer token:

```
Authorization: Bearer <token>
```

Two kinds of token work everywhere:

1. **Personal token** — mint on `/ai` (format `kref_…`). Pick **Read only** or **Read & write**.
   A read-only token is safe to hand to another developer.
2. **OAuth access token** — `kref_at_…`, obtained via the OAuth flow (see below) when your app
   acts on a user's behalf without them pasting a token.

### Scopes
- `read` — every `GET` endpoint.
- `write` — additionally `PATCH /api/v1/me`.

### Rate limits
120 requests/minute per token. Every response carries:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1717689600
```

Over the limit → `429`:

```json
{ "error": { "code": "rate_limited", "message": "Too many requests — slow down." } }
```
(plus a `Retry-After` header.)

### Error codes
| Status | code | When |
|---|---|---|
| 401 | `unauthorized` | no Bearer token |
| 401 | `invalid_token` | token invalid/revoked/expired |
| 403 | `insufficient_scope` | token lacks the required scope |
| 404 | `not_found` | resource missing |
| 422 | `invalid_field` | bad request body |
| 429 | `rate_limited` | over the rate limit |

---

## REST endpoints (`/api/v1`)

### GET /api/v1/me
```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/v1/me
```
```json
{
  "name": "Sujith Kumaar",
  "email": "sujith@example.com",
  "heightCm": 178,
  "weightKg": 72.5,
  "bmi": 22.9,
  "age": 29,
  "gender": "male",
  "birthday": "1996-08-14",
  "dailyStepGoal": 10000,
  "healthConnected": true
}
```

### PATCH /api/v1/me  *(scope: write)*
```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dailyStepGoal": 12000}' \
  $BASE/api/v1/me
```
Returns the updated profile (same shape as `GET /me`). Validation: integer 1000–100000.

### GET /api/v1/daily-metrics
`?days=30` (default 30, max 365) **or** `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/daily-metrics?days=3"
```
```json
{
  "days": 3,
  "from": null,
  "to": null,
  "rows": [
    {
      "date": "2026-06-06",
      "steps": 8421,
      "calories": 412,
      "total_calories": 2210,
      "distance_km": 6.1,
      "hr_avg": 78,
      "hr_min": 52,
      "hr_max": 141,
      "resting_hr": 58,
      "vo2_max": 41.2,
      "spo2": 97,
      "hrv_ms": 48,
      "sleep_min": 412,
      "active_min": 64,
      "hydration_ml": 1800
    },
    { "date": "2026-06-05", "steps": 11034, "calories": 503, "total_calories": 2380, "distance_km": 7.9, "hr_avg": 81, "hr_min": 54, "hr_max": 156, "resting_hr": 57, "vo2_max": 41.2, "spo2": 98, "hrv_ms": 51, "sleep_min": 433, "active_min": 78, "hydration_ml": 2100 },
    { "date": "2026-06-04", "steps": 6190, "calories": 305, "total_calories": 2090, "distance_km": 4.4, "hr_avg": 76, "hr_min": 53, "hr_max": 132, "resting_hr": 59, "vo2_max": 41.0, "spo2": 97, "hrv_ms": 45, "sleep_min": 388, "active_min": 41, "hydration_ml": 1500 }
  ]
}
```

### GET /api/v1/steps/stats
```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/v1/steps/stats
```
```json
{
  "today": 8421,
  "yesterday": 11034,
  "last7Total": 61240,
  "last7Avg": 8749,
  "prev7Total": 54980,
  "last30Avg": 8120
}
```

### GET /api/v1/steps/hourly
`?days=30` **or** `?from=&to=`.
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/steps/hourly?days=1"
```
```json
{
  "rows": [
    { "day": "2026-06-06", "hour": 7, "steps": 820 },
    { "day": "2026-06-06", "hour": 8, "steps": 1430 },
    { "day": "2026-06-06", "hour": 18, "steps": 2110 }
  ]
}
```

### GET /api/v1/heatmap
```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/v1/heatmap
```
```json
{
  "grid": [
    [0,0,0,0,0,0,120,540,310,200,180,260,300,210,190,220,260,640,820,410,180,60,0,0],
    "... 7 rows (Sun→Sat) × 24 hours ..."
  ],
  "max": 820,
  "has": true,
  "insight": "Most active around 6 PM · busiest on Saturday"
}
```

### GET /api/v1/streaks
```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/v1/streaks
```
```json
{
  "today": 8421,
  "goal": 10000,
  "pct": 0.842,
  "total": 1284300,
  "bestDay": 23110,
  "goalDays": 96,
  "currentStreak": 3,
  "bestStreak": 14,
  "bestWeek": 88210,
  "achievements": [
    { "id": "first", "name": "First Steps", "icon": "👟", "earned": true },
    { "id": "10k", "name": "10k Day", "icon": "⚡", "earned": true },
    { "id": "15k", "name": "15k Day", "icon": "🚀", "earned": true },
    { "id": "goal", "name": "Goal Hit", "icon": "🎯", "earned": true },
    { "id": "streak7", "name": "7-Day Streak", "icon": "🔥", "earned": true },
    { "id": "streak30", "name": "30-Day Streak", "icon": "🏆", "earned": false },
    { "id": "week100k", "name": "100k Week", "icon": "📅", "earned": false },
    { "id": "half", "name": "500k Club", "icon": "🥈", "earned": true },
    { "id": "million", "name": "Million Steps", "icon": "🥇", "earned": true }
  ]
}
```

### GET /api/v1/workouts
`?limit=20` (max 100).
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/workouts?limit=2"
```
```json
{
  "workouts": [
    {
      "started_at": "2026-06-06T01:10:00Z",
      "ended_at": "2026-06-06T01:48:00Z",
      "type": "running",
      "duration_min": 38,
      "calories": 410,
      "distance_km": 6.2,
      "steps": 6800,
      "active_zone_minutes": 31,
      "elevation_m": 24
    },
    { "started_at": "2026-06-04T13:30:00Z", "ended_at": "2026-06-04T14:05:00Z", "type": "walking", "duration_min": 35, "calories": 180, "distance_km": 3.1, "steps": 4200, "active_zone_minutes": 8, "elevation_m": 6 }
  ]
}
```

### GET /api/v1/leaderboard
`?period=today|yesterday|7d|month` (default `7d`). Returns only leaderboard-safe fields.
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/leaderboard?period=7d"
```
```json
{
  "period": "7d",
  "since": "2026-05-31",
  "until": "2026-06-06",
  "ranking": [
    { "rank": 1, "name": "Sanjay Manivannan", "totalSteps": 78210, "isYou": false },
    { "rank": 2, "name": "Sujith Kumaar", "totalSteps": 61240, "isYou": true },
    { "rank": 3, "name": "Aalapana Kumar", "totalSteps": 59030, "isYou": false }
  ]
}
```

### GET /api/v1/export
Everything you own, as a JSON download (`Content-Disposition: attachment`).
```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/v1/export -o export.json
```
```json
{
  "exportedAt": "2026-06-06T10:30:00Z",
  "profile":  { "...": "same shape as GET /me" },
  "dailyMetrics": { "days": 365, "rows": ["...daily rows..."] },
  "workouts": { "workouts": ["...workouts..."] },
  "hourlySteps": { "rows": ["...hourly buckets..."] },
  "streaks": { "...": "same shape as GET /streaks" }
}
```

---

## OAuth2 (third-party apps)

For apps acting on a user's behalf without a pasted token. **Authorization Code + PKCE
(S256, required).** Register a client at `/developers/apps` (you get a `client_id`, and a
`client_secret` once for confidential clients).

### 1. Send the user to authorize
```
$BASE/oauth/authorize
  ?response_type=code
  &client_id=kref_client_abc
  &redirect_uri=https://yourapp.com/callback
  &scope=read
  &state=xyz
  &code_challenge=<base64url(sha256(verifier))>
  &code_challenge_method=S256
```
After they approve, they're sent to:
```
https://yourapp.com/callback?code=kref_code_…&state=xyz
```

### 2. Exchange the code for tokens
```bash
curl -X POST $BASE/api/oauth/token \
  -d grant_type=authorization_code \
  -d client_id=kref_client_abc \
  -d redirect_uri=https://yourapp.com/callback \
  -d code=kref_code_… \
  -d code_verifier=<the original verifier>
```
```json
{
  "access_token": "kref_at_…",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "kref_rt_…",
  "scope": "read"
}
```
Use `access_token` exactly like a personal token on any `/api/v1` endpoint (and MCP).

### 3. Refresh (tokens rotate — the old refresh token is revoked)
```bash
curl -X POST $BASE/api/oauth/token \
  -d grant_type=refresh_token \
  -d client_id=kref_client_abc \
  -d refresh_token=kref_rt_…
```
Returns a new `{ access_token, refresh_token, … }`.

Failures use OAuth's `{ "error": "...", "error_description": "..." }` (e.g. `invalid_grant`,
`invalid_client`, `unsupported_grant_type`).

### Discovery
```bash
curl $BASE/.well-known/oauth-authorization-server
```
```json
{
  "issuer": "https://<your-host>",
  "authorization_endpoint": "https://<your-host>/oauth/authorize",
  "token_endpoint": "https://<your-host>/api/oauth/token",
  "scopes_supported": ["read", "write"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_post"]
}
```

Users can revoke any app's access anytime at `/developers/apps`.

---

## AI access (MCP)

The same data is exposed to AI tools (Claude Desktop/Code) over the Model Context Protocol
at `$BASE/api/mcp/mcp`, authenticated with the same Bearer tokens. See `/ai` for setup.
