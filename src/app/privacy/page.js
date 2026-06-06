/**
 * Privacy Policy — static, read-only legal page (no auth, no data fetching).
 * Documents what Google account / Google Health data is collected, how it is
 * used and shared, the Google API Limited Use commitment, and how to delete data.
 */

export const metadata = { title: 'Privacy Policy — KyaReFitting aa' }

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </a>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mt-1 text-muted-foreground">Last updated: 5 June 2026</p>

      <article className="mt-8">
        <p className="text-muted-foreground leading-7 mb-4">
          KyaReFitting aa (&quot;we&quot;, &quot;us&quot;, the &quot;App&quot;) is a personal
          fitness dashboard that shows you your own Google Health activity. This policy
          explains what we collect, how we use it, and the choices you have. By using the
          App you agree to this policy.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Information we collect</h2>
        <p className="text-muted-foreground leading-7 mb-4">We only collect what is needed to provide the App, and only after you sign in:</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-4">
          <li>
            <strong className="text-foreground font-medium">Google account basics</strong> (via Google Sign-In): your name, email
            address, and profile photo.
          </li>
          <li>
            <strong className="text-foreground font-medium">Google Health data</strong> (only after you tap &quot;Connect Google
            Health&quot;): daily steps, active energy/calories, distance, heart rate, sleep
            duration, height, weight, and your age. Access is read-only.
          </li>
          <li>
            <strong className="text-foreground font-medium">Basic profile details</strong> (via the Google People API): your birthday
            and gender, when available, to display on your profile.
          </li>
          <li>
            <strong className="text-foreground font-medium">Settings you create in the App</strong>, such as your daily step goal.
          </li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">How we use your information</h2>
        <p className="text-muted-foreground leading-7 mb-4">Your data is used solely to provide the App&apos;s features to you:</p>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-4">
          <li>Show your steps, calories, distance, heart rate, sleep, and body metrics (and a calculated BMI).</li>
          <li>Power your daily step-goal ring, streaks, and achievement badges.</li>
          <li>Display a steps leaderboard among other members.</li>
        </ul>
        <p className="text-muted-foreground leading-7 mb-4">
          We do <strong className="text-foreground font-medium">not</strong> use your health data for advertising, and we do{' '}
          <strong className="text-foreground font-medium">not</strong> sell it.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Google API Limited Use</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          KyaReFitting aa&apos;s use and transfer of information received from Google APIs to any
          other app will adhere to the{' '}
          <a
            className="underline"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google user data is used only to provide
          and improve user-facing features that are prominent in the App, is not transferred to
          others except as necessary to provide those features or as required by law, is not
          used for advertising, and is not read by humans unless you give consent, it is needed
          for security, or it is required by law.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">How your information is shared</h2>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-4">
          <li>
            <strong className="text-foreground font-medium">Leaderboard:</strong> your display name, profile photo, and step totals are
            visible to other signed-in members on the in-app leaderboard. No other health data
            is shown to other members.
          </li>
          <li>
            <strong className="text-foreground font-medium">Service providers:</strong> we use Google (sign-in and Google Health/People
            APIs) and Supabase (authentication and database hosting) to operate the App. They
            process data on our behalf under their own terms.
          </li>
          <li>We do not otherwise share, rent, or sell your personal information.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Storage and security</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          Data is stored in our Supabase database and protected with row-level security so that
          each member can access only their own records. Data is encrypted in transit (HTTPS).
          We retain Google OAuth tokens only to keep your Google Health data in sync and refresh
          access on your behalf.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Data retention and deletion</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          We keep your data while your account is active. You can disconnect Google Health or
          delete your account at any time. To request deletion of your account and all
          associated health data, contact us at the address below; we will delete it promptly.
          You can also revoke the App&apos;s access from your{' '}
          <a
            className="underline"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account permissions
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Children</h2>
        <p className="text-muted-foreground leading-7 mb-4">The App is not intended for children under 13 (or the minimum age in your country).</p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Changes to this policy</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          We may update this policy from time to time. Material changes will be reflected by the
          &quot;Last updated&quot; date above.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-2 text-foreground">Contact</h2>
        <p className="text-muted-foreground leading-7 mb-4">
          Questions or deletion requests: <strong className="text-foreground font-medium">kavin@madarth.com</strong> (or
          devatmadarth@gmail.com).
        </p>
      </article>
    </main>
  )
}
