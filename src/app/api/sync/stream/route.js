import { createClient } from '@/lib/supabase/server'
import { refreshGoogleToken } from '@/lib/google-auth'
import {
  getHealthSummary,
  getDailySteps,
  getBodyMetrics,
  getSleepWeek,
  getActivitySessions,
  getHeartRateWeek,
} from '@/lib/google-data'
import { istIsoDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function emit(data) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }

      try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          emit({ error: 'Not authenticated' })
          controller.close()
          return
        }

        emit({ step: 'credentials', done: false })

        const { data: profile } = await supabase
          .from('profiles')
          .select('google_access_token, google_refresh_token, google_token_expires_at')
          .eq('id', user.id)
          .single()

        if (!profile?.google_access_token) {
          await supabase.from('sync_logs').insert({
            user_id: user.id, triggered_by: 'manual', status: 'error',
            error: 'No Google account connected',
          })
          emit({ error: 'No Google account connected' })
          controller.close()
          return
        }

        let accessToken = profile.google_access_token
        const tokenValid =
          profile.google_token_expires_at &&
          new Date(profile.google_token_expires_at) > new Date()

        if (!tokenValid) {
          if (!profile.google_refresh_token) {
            await supabase.from('sync_logs').insert({
              user_id: user.id, triggered_by: 'manual', status: 'error',
              error: 'No refresh token — user must reconnect Google',
            })
            emit({ error: 'Session expired — please reconnect Google' })
            controller.close()
            return
          }
          const refreshed = await refreshGoogleToken(profile.google_refresh_token)
          if (!refreshed) {
            await supabase.from('sync_logs').insert({
              user_id: user.id, triggered_by: 'manual', status: 'error',
              error: 'Token refresh failed — refresh token may be revoked',
            })
            emit({ error: 'Failed to refresh token — please reconnect Google' })
            controller.close()
            return
          }
          accessToken = refreshed.access_token
          const expiresAt = new Date(
            Date.now() + (refreshed.expires_in ?? 3600) * 1000
          ).toISOString()
          await supabase.from('profiles').update({
            google_access_token: accessToken,
            google_token_expires_at: expiresAt,
          }).eq('id', user.id)
        }

        emit({ step: 'credentials', done: true })

        emit({ step: 'health', done: false })
        const health = await getHealthSummary(accessToken)
        emit({ step: 'health', done: true, debug: health })

        emit({ step: 'steps', done: false })
        const dailySteps = await getDailySteps(accessToken)
        emit({ step: 'steps', done: true, debug: { count: dailySteps.length, raw: dailySteps.map(d => ({ date: d.isoDate, steps: d.steps })) } })

        emit({ step: 'body', done: false })
        const body = await getBodyMetrics(accessToken)
        emit({ step: 'body', done: true, debug: body })

        emit({ step: 'sleep', done: false })
        const sleepWeek = await getSleepWeek(accessToken)
        emit({ step: 'sleep', done: true, debug: sleepWeek })

        emit({ step: 'activities', done: false })
        const activitiesRaw = await getActivitySessions(accessToken, 7)

        // Deduplicate: same source can return the same workout twice with different IDs.
        // Keep one entry per (startMs, endMs) window — prefer the one with more steps.
        const activityMap = new Map()
        for (const a of activitiesRaw ?? []) {
          const key = `${a.startMs}-${a.endMs}`
          const existing = activityMap.get(key)
          if (!existing || a.steps > existing.steps) activityMap.set(key, a)
        }
        const activities = Array.from(activityMap.values())

        emit({ step: 'activities', done: true, debug: activities.map(a => ({ date: a.date, name: a.name, steps: a.steps })) })

        emit({ step: 'heartrate', done: false })
        const heartRateWeek = await getHeartRateWeek(accessToken)
        emit({ step: 'heartrate', done: true, debug: heartRateWeek })

        emit({ step: 'saving', done: false })

        const today = istIsoDate(0)

        // Sum activity steps per IST date as fallback for days where the API returned 0
        const IST_MS = 5.5 * 60 * 60 * 1000
        const actStepsByDate = {}
        for (const a of activities) {
          if (!a.startMs || !a.steps) continue
          const date = new Date(a.startMs + IST_MS).toISOString().slice(0, 10)
          actStepsByDate[date] = (actStepsByDate[date] ?? 0) + a.steps
        }

        const historicalRows = (dailySteps ?? [])
          .filter(d => d.isoDate && d.isoDate !== today)
          .map(d => ({
            user_id: user.id,
            date: d.isoDate,
            steps: d.steps > 0 ? d.steps : (actStepsByDate[d.isoDate] ?? 0),
            calories: d.calories ?? 0,
            active_minutes: d.activeMinutes ?? null,
            distance_km: d.distanceKm ?? null,
            sleep_minutes: sleepWeek[d.isoDate]?.minutes ?? null,
            avg_heart_rate: heartRateWeek[d.isoDate] ?? null,
            synced_at: new Date().toISOString(),
          }))

        if (historicalRows.length > 0) {
          await supabase.from('health_daily').upsert(historicalRows, { onConflict: 'user_id,date' })
        }

        const todaySteps = (health?.stepsToday ?? 0) > 0
          ? health.stepsToday
          : (actStepsByDate[today] ?? 0)

        await supabase.from('health_daily').upsert({
          user_id: user.id,
          date: today,
          steps: todaySteps,
          calories: health?.caloriesToday ?? 0,
          active_minutes: health?.activeMinutesToday ?? null,
          distance_km: health?.distanceKm ?? null,
          sleep_minutes: sleepWeek[today]?.minutes ?? null,
          avg_heart_rate: heartRateWeek[today] ?? null,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,date' })

        if (activities?.length > 0) {
          const sessionRows = activities.map(a => ({
            id: a.id,
            user_id: user.id,
            name: a.name,
            icon: a.icon,
            activity_type: a.activityType,
            start_time: new Date(a.startMs).toISOString(),
            end_time: new Date(a.endMs).toISOString(),
            duration_min: a.durationMin,
            steps: a.steps,
            synced_at: new Date().toISOString(),
          }))
          await supabase.from('activity_sessions').upsert(sessionRows, { onConflict: 'id,user_id' })
        }

        const bodyUpdate = {}
        if (body?.weightKg != null) bodyUpdate.weight_kg = body.weightKg
        if (body?.heightCm != null) bodyUpdate.height_cm = body.heightCm
        if (Object.keys(bodyUpdate).length > 0) {
          await supabase.from('profiles').update(bodyUpdate).eq('id', user.id)
        }

        await supabase.from('sync_logs').insert({
          user_id: user.id,
          triggered_by: 'manual',
          status: 'success',
          steps_today: health?.stepsToday ?? 0,
          days_written: historicalRows.length + 1,
        })

        const resolvedDailySteps = [
          ...historicalRows.map(r => ({ date: r.date, steps: r.steps })),
          { date: today, steps: todaySteps },
        ].sort((a, b) => a.date.localeCompare(b.date))

        emit({ step: 'saving', done: true, debug: { today, dailySteps: resolvedDailySteps } })
        emit({
          complete: true,
          data: { health, dailySteps, body, sleepWeek, activities, heartRateWeek },
        })

      } catch (err) {
        emit({ error: err?.message ?? 'Sync failed — please try again' })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
