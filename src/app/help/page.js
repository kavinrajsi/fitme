/**
 * Help & FAQ — static, read-only support page (no auth, no data fetching).
 * Renders the FAQ list below: connecting Google Health, troubleshooting empty
 * steps/sleep, changing the step goal, syncing, leaderboard visibility, and
 * account deletion.
 */

export const metadata = { title: 'Help — KyaReFitting aa' }

// Question/answer pairs rendered as the page body; edit here to update the FAQ.
const FAQ = [
  {
    q: 'What is KyaReFitting aa?',
    a: 'A personal fitness dashboard that shows your own Google Health activity — steps, calories, distance, heart rate, sleep, and body metrics — with daily goals, streaks, achievements, and a steps leaderboard.',
  },
  {
    q: 'How do I connect Google Health?',
    a: 'Sign in with Google, then go to Profile and tap “Connect Google Health.” Approve the permissions on the Google screen. Your data starts syncing right after.',
  },
  {
    q: 'Why are my steps showing 0?',
    a: 'Steps come from Google Health. Make sure (1) the Google Health app on your phone is signed in with the same Google account and syncing from Health Connect, and (2) you have connected Google Health in Profile. New data can take a little time to appear — tap Sync in the top bar to refresh now.',
  },
  {
    q: 'Why is my sleep empty?',
    a: 'Sleep needs an extra permission. Open Profile and tap “Reconnect Google Health,” then approve the Sleep permission on the Google screen.',
  },
  {
    q: 'How do I change my daily step goal?',
    a: 'Go to Profile → Daily step goal, enter a value, and tap Save. Your goal ring, streaks, and achievements update to the new target.',
  },
  {
    q: 'How do I sync my data manually?',
    a: 'Tap the Sync button in the top bar. A panel shows the sync progress and your latest numbers. Your data also syncs automatically every day.',
  },
  {
    q: 'Who can see my data on the leaderboard?',
    a: 'The leaderboard shows your display name, profile photo, and step totals to other members. No other health data (weight, sleep, heart rate, etc.) is ever shown to other people.',
  },
  {
    q: 'How do I disconnect or delete my account?',
    a: 'You can revoke access anytime from your Google Account permissions (myaccount.google.com/permissions). To delete your account and all stored health data, email us at the address below.',
  },
]

export default function HelpPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </a>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Help &amp; FAQ</h1>
      <p className="mt-1 text-muted-foreground">Answers to common questions</p>

      <article className="mt-8">
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">{item.q}</h2>
            <p className="text-muted-foreground leading-7 mb-4">{item.a}</p>
          </div>
        ))}

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Still need help?</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          Email us at <strong className="text-foreground font-medium">kavin@madarth.com</strong> (or
          devatmadarth@gmail.com) and we&apos;ll get back to you.
        </p>
      </article>
    </main>
  )
}
