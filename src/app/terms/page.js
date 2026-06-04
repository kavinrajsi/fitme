import Link from 'next/link'

export const metadata = { title: 'Terms of Service — KyaReFitting aa' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-[720px] mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          ← Back to KyaReFitting aa
        </Link>
        <h1 className="text-4xl font-bold mb-1">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Effective date: 31 May 2026</p>

        <p className="text-foreground/80 leading-relaxed text-[0.95rem] mb-8">
          Welcome to KyaReFitting aa. By creating an account or using the app you agree to
          these terms. Please read them carefully.
        </p>

        <Section title="1. About KyaReFitting aa">
          <p>
            KyaReFitting aa is a personal fitness tracking application that connects to your
            Google account to display health and activity data from Google Health. It
            is provided for personal, non-commercial use.
          </p>
        </Section>

        <Section title="2. Your account">
          <p>
            You sign in using your Google account. You are responsible for
            maintaining access to that account. We do not store your Google
            password. You must be at least 13 years old to use KyaReFitting aa.
          </p>
        </Section>

        <Section title="3. Acceptable use">
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use KyaReFitting aa for any unlawful purpose</li>
            <li>Attempt to access another user&apos;s data</li>
            <li>Reverse-engineer, scrape, or abuse the service</li>
            <li>Use the service in a way that could harm or overload it</li>
          </ul>
        </Section>

        <Section title="4. Health data disclaimer">
          <p>
            KyaReFitting aa displays data from Google Health for informational purposes only.
            It is <strong>not</strong> a medical device and does not provide
            medical advice, diagnosis, or treatment. Do not rely on KyaReFitting aa data
            for medical decisions. Always consult a qualified healthcare
            professional.
          </p>
        </Section>

        <Section title="5. Availability">
          <p>
            We aim to keep KyaReFitting aa available but make no guarantees of uptime.
            We may change, suspend, or discontinue the service at any time
            without notice.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            All content and code in KyaReFitting aa (excluding your personal data) belongs
            to the KyaReFitting aa team. You may not copy or redistribute it without
            permission.
          </p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>
            To the maximum extent permitted by law, KyaReFitting aa is provided &quot;as
            is&quot; without warranty. We are not liable for any indirect,
            incidental, or consequential damages arising from your use of the
            service.
          </p>
        </Section>

        <Section title="8. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of KyaReFitting aa
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
