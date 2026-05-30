export const metadata = { title: 'Terms of Service — FitMe' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-4xl font-bold mb-1">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Effective date: 30 May 2025</p>

        <p className="text-foreground/80 leading-relaxed text-[0.95rem] mb-8">
          Welcome to FitMe. By creating an account or using the app you agree to
          these terms. Please read them carefully.
        </p>

        <Section title="1. About FitMe">
          <p>
            FitMe is a personal fitness tracking application that connects to your
            Google account to display health and activity data from Google Fit. It
            is provided for personal, non-commercial use.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You sign in using your Google account. You are responsible for
            maintaining access to that account. We do not store your Google
            password. You must be at least 13 years old to use FitMe.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use FitMe for any unlawful purpose</li>
            <li>Attempt to access another user&apos;s data</li>
            <li>Reverse-engineer, scrape, or abuse the service</li>
            <li>Use the service in a way that could harm or overload it</li>
          </ul>
        </Section>

        <Section title="4. Health data disclaimer">
          <p>
            FitMe displays data from Google Fit for informational purposes only.
            It is <strong>not</strong> a medical device and does not provide
            medical advice, diagnosis, or treatment. Do not rely on FitMe data
            for medical decisions. Always consult a qualified healthcare
            professional.
          </p>
        </Section>

        <Section title="5. Availability">
          <p>
            We aim to keep FitMe available but make no guarantees of uptime.
            We may change, suspend, or discontinue the service at any time
            without notice.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            All content and code in FitMe (excluding your personal data) belongs
            to the FitMe team. You may not copy or redistribute it without
            permission.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            To the maximum extent permitted by law, FitMe is provided &quot;as
            is&quot; without warranty. We are not liable for any indirect,
            incidental, or consequential damages arising from your use of the
            service.
          </p>
        </Section>

        <Section title="8. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of FitMe
            after changes are posted means you accept the new terms.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions? Email us at{' '}
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
