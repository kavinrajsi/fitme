/**
 * Assembles the signed-in user's "basic details" for the home page.
 *
 * Sources:
 * - name / email / avatar → Google OIDC sign-in (user_metadata), read straight from the session.
 * - height / weight       → Google Health API (manual self-entry overrides when present).
 * - age                   → Google Health profile.
 * - gender / birthday     → Google People API.
 *
 * Google data is fetched lazily and cached on the profile row; it only re-syncs
 * when the cache is older than STALE_MS. Every network call is wrapped so a single
 * failing/forbidden API (e.g. non-Fitbit account → 403) never blocks the others or
 * the page render.
 */
import { createClient } from '@/lib/supabase/server'
import { getValidAccessToken, getValidHealthAccessToken } from '@/lib/google-auth'
import { getBodyMetrics, getHealthProfile } from '@/lib/google-health'
import { getPeopleDetails } from '@/lib/google-people'

const STALE_MS = 12 * 60 * 60 * 1000 // 12 hours

export async function getUserDetails() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Read (and defensively create) the profile row.
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id' })
    const reread = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    profile = reread.data ?? { id: user.id }
  }

  // Refresh Google-sourced fields if the cache is stale.
  const stale =
    !profile.details_synced_at ||
    Date.now() - new Date(profile.details_synced_at).getTime() > STALE_MS

  if (stale) {
    try {
      // People (gender/birthday) use the sign-in token; Google Health (age/height/
      // weight) uses the separate health token from /auth/google/health. They can't
      // share a token, so each is fetched independently and failures are isolated.
      const [signinToken, healthToken] = await Promise.all([
        getValidAccessToken(profile),
        getValidHealthAccessToken(profile),
      ])

      const [people, body, health] = await Promise.all([
        signinToken ? getPeopleDetails(signinToken).catch(() => null) : null,
        healthToken ? getBodyMetrics(healthToken).catch(() => null) : null,
        healthToken ? getHealthProfile(healthToken).catch(() => null) : null,
      ])

      const update = { details_synced_at: new Date().toISOString() }
      if (body?.heightCm != null) update.height_cm = body.heightCm
      if (body?.weightKg != null) update.weight_kg = body.weightKg
      if (health?.age != null) update.age = health.age
      if (people?.gender) update.gender = people.gender
      if (people?.birthday) update.birthday = people.birthday

      await supabase.from('profiles').update(update).eq('id', user.id)
      profile = { ...profile, ...update }
    } catch {
      // Network/Google failure — fall through and render cached values.
    }
  }

  // Manual self-entry overrides win over Google-sourced values.
  const heightCm = profile.manual_height_cm ?? profile.height_cm ?? null
  const weightKg = profile.manual_weight_kg ?? profile.weight_kg ?? null

  return {
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    email: user.email ?? null,
    avatar: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
    heightCm,
    weightKg,
    age: profile.age ?? null,
    gender: profile.gender ?? null,
    birthday: profile.birthday ?? null,
    // Whether the user has connected the separate Google Health consent.
    healthConnected:
      profile.google_health_access_token != null ||
      profile.google_health_refresh_token != null,
    // True when Google Health had no body metrics, so the UI can nudge manual entry.
    noGoogleBody: profile.height_cm == null && profile.weight_kg == null,
  }
}
