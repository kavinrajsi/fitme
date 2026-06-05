
export const metadata = { title: 'Privacy Policy — KyaReFitting' }

export default function PrivacyPage() {
  return (
    <main>
      <a href="/">
        ← Back
      </a>
      <h1>Privacy Policy</h1>
      <p>Last updated: 5 June 2026</p>

      <article>
        <p>
          KyaReFitting (&quot;we&quot;, &quot;us&quot;, the &quot;App&quot;) is a personal
          fitness dashboard that shows you your own Google Health activity. This policy
          explains what we collect, how we use it, and the choices you have. By using the
          App you agree to this policy.
        </p>

        <h2>Information we collect</h2>
        <p>We only collect what is needed to provide the App, and only after you sign in:</p>
        <ul>
          <li>
            <strong>Google account basics</strong> (via Google Sign-In): your name, email
            address, and profile photo.
          </li>
          <li>
            <strong>Google Health data</strong> (only after you tap &quot;Connect Google
            Health&quot;): daily steps, active energy/calories, distance, heart rate, sleep
            duration, height, weight, and your age. Access is read-only.
          </li>
          <li>
            <strong>Basic profile details</strong> (via the Google People API): your birthday
            and gender, when available, to display on your profile.
          </li>
          <li>
            <strong>Settings you create in the App</strong>, such as your daily step goal.
          </li>
        </ul>

        <h2>How we use your information</h2>
        <p>Your data is used solely to provide the App&apos;s features to you:</p>
        <ul>
          <li>Show your steps, calories, distance, heart rate, sleep, and body metrics (and a calculated BMI).</li>
          <li>Power your daily step-goal ring, streaks, and achievement badges.</li>
          <li>Display a steps leaderboard among other members.</li>
        </ul>
        <p>
          We do <strong>not</strong> use your health data for advertising, and we do{' '}
          <strong>not</strong> sell it.
        </p>

        <h2>Google API Limited Use</h2>
        <p>
          KyaReFitting&apos;s use and transfer of information received from Google APIs to any
          other app will adhere to the{' '}
          <a
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

        <h2>How your information is shared</h2>
        <ul>
          <li>
            <strong>Leaderboard:</strong> your display name, profile photo, and step totals are
            visible to other signed-in members on the in-app leaderboard. No other health data
            is shown to other members.
          </li>
          <li>
            <strong>Service providers:</strong> we use Google (sign-in and Google Health/People
            APIs) and Supabase (authentication and database hosting) to operate the App. They
            process data on our behalf under their own terms.
          </li>
          <li>We do not otherwise share, rent, or sell your personal information.</li>
        </ul>

        <h2>Storage and security</h2>
        <p>
          Data is stored in our Supabase database and protected with row-level security so that
          each member can access only their own records. Data is encrypted in transit (HTTPS).
          We retain Google OAuth tokens only to keep your Google Health data in sync and refresh
          access on your behalf.
        </p>

        <h2>Data retention and deletion</h2>
        <p>
          We keep your data while your account is active. You can disconnect Google Health or
          delete your account at any time. To request deletion of your account and all
          associated health data, contact us at the address below; we will delete it promptly.
          You can also revoke the App&apos;s access from your{' '}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account permissions
          </a>
          .
        </p>

        <h2>Children</h2>
        <p>The App is not intended for children under 13 (or the minimum age in your country).</p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be reflected by the
          &quot;Last updated&quot; date above.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or deletion requests: <strong>kavin@madarth.com</strong> (or
          devatmadarth@gmail.com).
        </p>
      </article>
    </main>
  )
}
