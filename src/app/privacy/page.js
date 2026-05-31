export const metadata = { title: 'Privacy Policy — FitMe' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-4xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Effective date: 31 May 2026</p>

        <p className="text-foreground/80 leading-relaxed text-[0.95rem] mb-8">
          FitMe takes your privacy seriously, especially because we handle
          personal health data. This policy explains what we collect, how we use
          it, and your rights.
        </p>

        <Section title="1. What we collect">
          <p>When you sign in with Google we receive and store:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Your name and email address</li>
            <li>Your Google profile photo URL</li>
            <li>
              A Google OAuth access token and refresh token, used to read your
              Google Fit data on your behalf
            </li>
          </ul>
          <p className="mt-3">From Google Fit we read and <strong>store in our database</strong>:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Daily step count (up to 7 days of history)</li>
            <li>Calories burned (today only)</li>
            <li>Body weight and height (stored on your profile)</li>
          </ul>
          <p className="mt-3">From Google Fit we read <strong>but do not store</strong>:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Sleep duration (fetched live, shown on dashboard only)</li>
            <li>Active minutes and distance (fetched live, shown on dashboard only)</li>
          </ul>
        </Section>

        <Section title="2. How we use your data">
          <ul className="list-disc pl-6 space-y-1">
            <li>To authenticate you and maintain your session</li>
            <li>To display your fitness summary on the dashboard</li>
            <li>To calculate your ranking on the company step-count leaderboard</li>
            <li>To refresh your Google Fit access when your token expires</li>
          </ul>
          <p className="mt-3">
            We do not sell, rent, or share your data with third parties for
            advertising or marketing.
          </p>
        </Section>

        <Section title="3. Google API data policy">
          <p>
            FitMe&apos;s use of data received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-foreground"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Specifically:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>
              We only request the Google Fit scopes necessary to show your
              fitness summary
            </li>
            <li>We do not use your Google data to serve ads</li>
            <li>
              We do not allow humans to read your Google data unless required
              by law or with your explicit consent
            </li>
            <li>We do not transfer your Google data to third parties</li>
          </ul>
        </Section>

        <Section title="4. Data storage and security">
          <p>
            Your account data is stored in a Supabase database hosted in the
            Asia Pacific (Singapore) region. Access tokens are stored encrypted
            at rest. We use HTTPS for all data in transit.
          </p>
        </Section>

        <Section title="5. Data retention">
          <p>
            We retain your account data for as long as your account is active.
            You can request deletion at any time by emailing us. We will delete
            your profile and tokens within 30 days.
          </p>
          <p className="mt-2">
            You can also revoke FitMe&apos;s access to your Google account at any
            time via{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-foreground"
            >
              Google Account Permissions
            </a>
            .
          </p>
        </Section>

        <Section title="6. Cookies and sessions">
          <p>
            FitMe uses cookies solely to maintain your login session. We do not
            use tracking or advertising cookies.
          </p>
        </Section>

        <Section title="7. Children&apos;s privacy">
          <p>
            FitMe is not directed at children under 13. We do not knowingly
            collect data from children under 13.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this policy. If we make material changes we will
            update the effective date above. Continued use of FitMe after
            changes are posted constitutes acceptance.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy questions or data deletion requests, contact us at{' '}
            <a href="mailto:devatmadarth@gmail.com" className="font-medium underline hover:text-foreground">devatmadarth@gmail.com</a>
            {' '}or{' '}
            <a href="mailto:kavin@madarth.com" className="font-medium underline hover:text-foreground">kavin@madarth.com</a>
            .
          </p>
        </Section>
      </div>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold mb-2.5">{title}</h2>
      <div className="text-foreground/70 leading-relaxed text-[0.95rem] space-y-2">
        {children}
      </div>
    </section>
  )
}
