# Google Health API usage

This project reads all health data from the **Google Health API**:

- Base URL: `https://health.googleapis.com/v4/users/me/dataTypes`
- Client: `src/lib/google-health.js`
- Scopes: `googlehealth.*` (requested at sign-in)

> Google Fit (`fitness/v1`) was removed. The Google Health API is now the sole source.

Every page/route imports the wrapper `src/lib/google-data.js`, which re-exports the
Google Health client. Keeping this single import surface means the provider can change
in one place without touching consumers.

```
   page/route ──▶ google-data.js ──▶ google-health.js  (health.googleapis.com/v4)
```

## Functions (`google-health.js`)

| Function | Health API request(s) |
|---|---|
| `getHealthSummary` | `POST steps\|active-energy-burned\|distance /dataPoints:dailyRollUp` (3) |
| `getDailySteps` | `POST .../dailyRollUp` ×7 days ×3 types (21) |
| `getBodyMetrics` | `POST weight\|height /dailyRollUp` (2) |
| `getSleepData` | `GET sleep/dataPoints?filter=` (1) |
| `getSleepWeek` | `GET sleep/dataPoints?filter=` (1) |
| `getActivitySessions` | `GET exercise/dataPoints?filter=` (1) |
| `getHeartRateWeek` | `POST heart-rate/dailyRollUp` ×7 |

## Call sites: page/route → functions used

| Page name | Route / file | Functions |
|---|---|---|
| Dashboard | `(dashboard)/dashboard/page.js` | `getHealthSummary`, `getDailySteps`, `getBodyMetrics`, `getSleepData`, `getActivitySessions` |
| Sync drawer (SSE) | `api/sync/stream/route.js` | + `getSleepWeek`, `getHeartRateWeek` |
| Cron sync (all users) | `api/sync/route.js` | `getHealthSummary`, `getDailySteps`, `getBodyMetrics`, `getSleepWeek`, `getActivitySessions` |
| Sync action | `actions/sync.js` | same as cron |
| Data | `(dashboard)/data/page.js` | `getDailySteps` (selected-day total + sessions come from the DB) |
| Sign-in (OAuth) | `auth/google/route.js` | requests `googlehealth.*` scopes |

## Request patterns

| Pattern | Method | Used for |
|---|---|---|
| `/{dataType}/dataPoints:dailyRollUp` | POST | Numeric daily aggregates — `steps`, `active-energy-burned`, `distance`, `heart-rate`, `weight`, `height` |
| `/{dataType}/dataPoints?filter=` | GET | Record lists — `exercise` (sessions), `sleep` |

## Notes

- The Health API's `dailyRollUp` only accepts **single-day** ranges, so `getDailySteps`
  fires **21** requests (7 days × 3 types) and `getHeartRateWeek` fires **7** (one per day).
- Google Health has **no intra-day granularity**. The old Fit-only Data-page features —
  the 30-minute intra-day step chart and the raw step-source drawer — were removed when
  Google Fit was dropped. The Data page now shows the selected-day step total (from the
  DB), the 7-day bar chart, and the day's activity sessions (from the DB).
