import styles from '../legal.module.css'

export const metadata = { title: 'Help — KyaReFitting' }

const FAQ = [
  {
    q: 'What is KyaReFitting?',
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
    <main className={styles.page}>
      <a href="/" className={styles.back}>
        ← Back
      </a>
      <h1 className={styles.title}>Help &amp; FAQ</h1>
      <p className={styles.updated}>Answers to common questions</p>

      <article className={styles.article}>
        {FAQ.map((item) => (
          <div key={item.q}>
            <h2>{item.q}</h2>
            <p>{item.a}</p>
          </div>
        ))}

        <h2>Still need help?</h2>
        <p>
          Email us at <strong>kavin@madarth.com</strong> (or devatmadarth@gmail.com) and
          we&apos;ll get back to you.
        </p>
      </article>
    </main>
  )
}
