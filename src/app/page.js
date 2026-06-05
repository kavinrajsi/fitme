/**
 * Public home — an "about the brand" page that also explains the features. Signed-in
 * users are sent to the dashboard (also enforced by the proxy); everyone else sees the
 * brand story, feature overview, sign-in CTA, and links to Help, Privacy, and Terms.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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
    <main className="max-w-5xl mx-auto px-6 py-16">
      <section className="space-y-6">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          KyaReFitting
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Fitness, made quietly beautiful.
        </h1>
        <p className="max-w-prose text-muted-foreground leading-7">
          A calmer way to see your movement. No noise, no ads, no judgement — just your steps,
          your goals, and your progress, presented with care and powered by Google Health.
        </p>
        <div>
          <a href="/signin" className={buttonVariants({ size: 'lg' })}>
            Sign in with Google
          </a>
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">What you get</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle>{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-7">{f.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-16 space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">What we believe</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <CardTitle>{p.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground leading-7">{p.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="mt-16 max-w-prose text-muted-foreground leading-7">
        KyaReFitting is an independent project — a small, considered tool for people who just want
        to move a little more, every day.
      </p>

      <footer className="mt-12 flex flex-wrap items-center gap-3 border-t pt-8 text-sm text-muted-foreground">
        <a href="/help" className="underline hover:text-foreground">Help</a>
        <span aria-hidden="true">·</span>
        <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
        <span aria-hidden="true">·</span>
        <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>
      </footer>
    </main>
  )
}
