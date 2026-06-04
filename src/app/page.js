/**
 * Public home — an "about the brand" page that also explains the features. Signed-in
 * users are sent to the dashboard (also enforced by the proxy); everyone else sees the
 * brand story, feature overview, sign-in CTA, and links to Help, Privacy, and Terms.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import styles from './landing.module.css'

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
    <main className={styles.landing}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>KyaReFitting</p>
        <h1 className={styles.title}>Fitness, made quietly beautiful.</h1>
        <p className={styles.subtitle}>
          A calmer way to see your movement. No noise, no ads, no judgement — just your steps,
          your goals, and your progress, presented with care and powered by Google Health.
        </p>
        <a href="/signin" className={styles.cta}>
          Sign in with Google
        </a>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What you get</h2>
        <div className={styles.features}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.feature}>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What we believe</h2>
        <div className={styles.features}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} className={styles.feature}>
              <h3 className={styles.featureTitle}>{p.title}</h3>
              <p className={styles.featureBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className={styles.note}>
        KyaReFitting is an independent project — a small, considered tool for people who just want
        to move a little more, every day.
      </p>

      <footer className={styles.footer}>
        <a href="/help">Help</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy">Privacy Policy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms">Terms of Service</a>
      </footer>
    </main>
  )
}
