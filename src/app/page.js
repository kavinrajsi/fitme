/**
 * Public home — an "about the brand" page that also explains the features. Signed-in
 * users are sent to the dashboard (also enforced by the proxy); everyone else sees the
 * brand story, feature overview, sign-in CTA, and links to Help, Privacy, and Terms.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const PRINCIPLES = [
  {
    title: 'Clarity',
    body: 'Your day at a glance — one goal ring, a streak, the numbers that matter. Nothing you don’t need.',
  },
  {
    title: 'Privacy',
    body: 'Your health data is yours. Read-only access, never sold, never used for ads. Disconnect or delete anytime.',
  },
  {
    title: 'Craft',
    body: 'Every detail considered — monochrome, generous space, and motion that feels just right.',
  },
]

const FEATURES = [
  {
    title: 'Daily goal & streaks',
    body: 'Set a daily step goal and watch the ring fill. Keep your streak alive and unlock achievement badges as you go.',
  },
  {
    title: 'Your health in one place',
    body: 'Steps, calories, distance, heart rate, sleep, and body metrics — synced automatically from Google Health, with a 90-day history.',
  },
  {
    title: 'Steps leaderboard',
    body: 'See how you rank against friends over today, the last 7 days, or 30 days. Only names, avatars, and step totals are shared.',
  },
  {
    title: 'One-tap sync',
    body: 'Tap Sync any time to pull your latest numbers, or let the daily background sync keep everything fresh on its own.',
  },
]

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main>
      <section>
        <p>KyaReFitting</p>
        <h1>Fitness, made quietly beautiful.</h1>
        <p>
          A calmer way to see your movement. No noise, no ads, no judgement — just your steps,
          your goals, and your progress, presented with care and powered by Google Health.
        </p>
        <a href="/signin">
          Sign in with Google
        </a>
      </section>

      <section>
        <h2>What you get</h2>
        <div>
          {FEATURES.map((f) => (
            <div key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>What we believe</h2>
        <div>
          {PRINCIPLES.map((p) => (
            <div key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p>
        KyaReFitting is an independent project — a small, considered tool for people who just want
        to move a little more, every day.
      </p>

      <footer>
        <a href="/help">Help</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy">Privacy Policy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms of Service</a>
      </footer>
    </main>
  )
}
