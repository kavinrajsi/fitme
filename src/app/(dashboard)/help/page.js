import { Card, CardContent } from '@/components/ui/card'
import { Icon } from '@/components/icon'
import Link from 'next/link'

export const metadata = { title: 'Help — KyaReFitting aa' }

function Section({ icon, title, children }) {
  return (
    <Card className="mb-5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Icon name={icon} size={22} className="text-primary flex-shrink-0" />
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="text-sm text-foreground/80 leading-relaxed space-y-3">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

function Q({ q, children }) {
  return (
    <div>
      <p className="font-medium text-foreground mb-1">{q}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}

function Badge({ icon, label, color, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border flex-shrink-0">
        <Icon name={icon} size={15} className={color} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed pt-1">{description}</p>
    </div>
  )
}

export default function HelpPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Help</h1>
        <p className="text-muted-foreground text-sm">Everything you need to know about KyaReFitting aa</p>
      </div>

      <div>

        <Section icon="rocket_launch" title="Getting started">
          <p>
            KyaReFitting aa connects to your Google Fit account to automatically sync your daily activity.
            Here&apos;s how to get set up:
          </p>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>Sign in with your Google account on the sign-in page.</li>
            <li>Grant KyaReFitting aa access to your Google Fit data when prompted — you&apos;ll see a list of permissions requested.</li>
            <li>You&apos;ll be taken to your Dashboard where your steps, calories, and other metrics will load automatically.</li>
            <li>Data syncs each time you visit the Dashboard, so your stats are always up to date.</li>
          </ol>
          <p className="text-muted-foreground">
            Make sure your Google Fit app is recording activity on your phone or connected wearable before signing in.
          </p>
        </Section>

        <Section icon="dashboard" title="Dashboard">
          <p>The Dashboard is your daily fitness overview. Here&apos;s what each section shows:</p>
          <ul className="space-y-2.5">
            <li><span className="font-medium">Steps today</span> — total steps recorded by Google Fit since midnight.</li>
            <li><span className="font-medium">Calories burned</span> — active calories burned today according to Google Fit.</li>
            <li><span className="font-medium">Weight / Height</span> — your body metrics synced from Google Fit. Update these in your fitness app to keep them current.</li>
            <li><span className="font-medium">Daily goal bar</span> — shows your progress toward the 10,000-step daily target.</li>
            <li><span className="font-medium">Your streak</span> — a 7-day calendar showing which days you were active. See the Streak section below for details.</li>
            <li><span className="font-medium">Steps — last 7 days</span> — a bar chart of your daily step counts over the past week.</li>
            <li><span className="font-medium">Top 5 today</span> — a preview of today&apos;s leaderboard. Tap &quot;Full leaderboard&quot; to see everyone.</li>
          </ul>
        </Section>

        <Section icon="local_fire_department" title="Your streak">
          <p>
            A streak counts how many consecutive days you have hit <span className="font-medium">8,000 or more steps</span>.
          </p>
          <ul className="space-y-2">
            <li><span className="font-medium">How it starts</span> — walk 8,000+ steps on any day and your streak begins at 1.</li>
            <li><span className="font-medium">How it grows</span> — each consecutive day you hit 8,000+ steps adds 1 to your streak.</li>
            <li><span className="font-medium">How it breaks</span> — missing a full day (fewer than 8,000 steps) resets your streak to 0.</li>
            <li><span className="font-medium">Mid-day grace</span> — if you haven&apos;t hit 8,000 steps yet today, your streak is held at yesterday&apos;s value rather than resetting. Once you cross 8,000, your streak extends on the next sync.</li>
          </ul>
          <p className="text-muted-foreground">
            The streak card on the Dashboard shows the last 7 days. The Profile page shows the full month calendar.
          </p>
        </Section>

        <Section icon="warning" title="Edge case — why your streak won't break mid-day">
          <p>
            Imagine you had a 5-day streak going. It&apos;s 7am on Day 6 — you haven&apos;t walked yet.
            Your Google Fit data for today shows 0 steps.
          </p>

          <div>
            <p className="font-medium mb-2">Without the edge case, the algorithm would:</p>
            <pre className="bg-muted rounded-lg px-3 py-2.5 text-xs leading-relaxed overflow-x-auto text-foreground/80">{`Day 6 (today) → 0 steps ✗ → STOP immediately → streak = 0`}</pre>
            <p className="mt-2 text-muted-foreground">Your 5-day streak is wiped out just because you woke up and haven&apos;t walked yet. That&apos;s wrong and frustrating.</p>
          </div>

          <div>
            <p className="font-medium mb-2">What the edge case does</p>
            <p className="text-muted-foreground mb-2">Before starting the loop, it checks today&apos;s steps:</p>
            <ul className="space-y-1.5 mb-3">
              <li>• <span className="font-medium">Today ≥ 8,000 steps</span> → start counting from <span className="font-medium">today</span> → today can extend the streak</li>
              <li>• <span className="font-medium">Today &lt; 8,000 steps</span> → start counting from <span className="font-medium">yesterday</span> → today is ignored, yesterday&apos;s streak is preserved</li>
            </ul>
            <p className="text-muted-foreground mb-2">So the same scenario becomes:</p>
            <pre className="bg-muted rounded-lg px-3 py-2.5 text-xs leading-relaxed overflow-x-auto text-foreground/80">{`Day 6 (today) → 0 steps   → skip today, start from yesterday
Day 5         → 11,000 ✓  streak: 1
Day 4         →  9,500 ✓  streak: 2
Day 3         →  8,200 ✓  streak: 3
Day 2         → 10,000 ✓  streak: 4
Day 1         →  9,000 ✓  streak: 5
Day 0         →  6,000 ✗  stop
→ streak = 5 ✓ preserved`}</pre>
          </div>

          <div>
            <p className="text-muted-foreground mb-2">Once you actually walk 8,000+ steps today, the algorithm switches to counting from today:</p>
            <pre className="bg-muted rounded-lg px-3 py-2.5 text-xs leading-relaxed overflow-x-auto text-foreground/80">{`Day 6 (today) →  8,500 ✓  streak: 1
Day 5         → 11,000 ✓  streak: 2
Day 4         →  9,500 ✓  streak: 3
Day 3         →  8,200 ✓  streak: 4
Day 2         → 10,000 ✓  streak: 5
Day 1         →  9,000 ✓  streak: 6
Day 0         →  6,000 ✗  stop
→ streak = 6 ✓ extended`}</pre>
          </div>

          <div>
            <p className="font-medium mb-2">One limitation</p>
            <p className="text-muted-foreground mb-2">If you genuinely missed yesterday (0 steps), the skip still happens:</p>
            <pre className="bg-muted rounded-lg px-3 py-2.5 text-xs leading-relaxed overflow-x-auto text-foreground/80">{`Today     → 0 steps → skip to yesterday
Yesterday → 0 steps ✗ → stop
→ streak = 0`}</pre>
            <p className="mt-2 text-muted-foreground">That&apos;s correct — the streak should break if you actually missed a day.</p>
          </div>
        </Section>

        <Section icon="emoji_events" title="Achievements">
          <p>Badges are earned automatically based on your activity. They appear on your Dashboard.</p>
          <div className="space-y-4 mt-2">
            <Badge
              icon="emoji_events"
              label="10K Club"
              color="text-yellow-500"
              description="Earned when you hit 10,000 steps in a single day at least once. Stays permanently once unlocked."
            />
            <Badge
              icon="local_fire_department"
              label="Week Warrior"
              color="text-orange-500"
              description="Active when your current streak is 7 or more consecutive days with 8,000+ steps."
            />
            <Badge
              icon="bolt"
              label="On a Roll"
              color="text-blue-500"
              description="Active when your current streak is 3–6 consecutive days. Upgrades to Week Warrior at 7 days."
            />
            <Badge
              icon="star"
              label="Century Club"
              color="text-purple-500"
              description="Earned when your total steps over the last 30 days reach 100,000 or more."
            />
          </div>
        </Section>

        <Section icon="leaderboard" title="Leaderboard">
          <p>The Leaderboard ranks all KyaReFitting aa users by total step count. Use the tabs to switch between time periods:</p>
          <ul className="space-y-2">
            <li><span className="font-medium">Today</span> — steps recorded since midnight today.</li>
            <li><span className="font-medium">Last 7 days</span> — total steps over the past 7 days.</li>
            <li><span className="font-medium">This month</span> — total steps since the 1st of the current month.</li>
          </ul>
          <p>
            The <span className="font-medium">rank change arrow</span> (↑ ↓ —) next to your rank shows whether you moved up,
            down, or stayed the same compared to the previous equivalent period.
          </p>
          <p className="text-muted-foreground">
            Only users who have synced data appear on the leaderboard. Visit your Dashboard to trigger a sync.
          </p>
        </Section>

        <Section icon="calendar_month" title="Profile & activity calendar">
          <p>Your Profile page shows:</p>
          <ul className="space-y-2">
            <li><span className="font-medium">Monthly calendar</span> — a full calendar of the current month. Days where you hit 8,000+ steps show a filled circle with a walk icon. Today shows as an outlined circle.</li>
            <li><span className="font-medium">Weekly streak column</span> — the orange circles on the right show which weeks had any active day. The flame at the bottom shows your current streak count.</li>
            <li><span className="font-medium">Your Streak / Active Days</span> — summary stats above the calendar.</li>
            <li><span className="font-medium">Appearance</span> — switch between System, Light, and Dark mode.</li>
            <li><span className="font-medium">Account</span> — update your display name shown on the leaderboard.</li>
          </ul>
        </Section>

        <Section icon="help" title="Frequently asked questions">
          <div className="space-y-5">
            <Q q="Why is my data not showing on the Dashboard?">
              Your Google Fit token may have expired. You&apos;ll see a &quot;Reconnect Google Fit&quot; banner — tap it to re-authenticate. If you just signed in for the first time, make sure Google Fit has recorded some activity on your device.
            </Q>
            <Q q="Why is my streak showing 0?">
              Your streak resets if you miss a day (fewer than 8,000 steps). It also shows 0 if you haven&apos;t synced recently. Visit the Dashboard to trigger a sync and update your streak.
            </Q>
            <Q q="Why are calories missing for older days in my history?">
              Calories for past days are now synced automatically. If you see missing values, visit the Dashboard once — it will backfill the correct calorie data for the past 7 days.
            </Q>
            <Q q="How do I appear on the leaderboard?">
              Visit the Dashboard at least once to sync your steps. You&apos;ll appear automatically after the first successful sync.
            </Q>
            <Q q="Can I hide myself from the leaderboard?">
              The leaderboard currently shows all synced users. A privacy toggle is planned for a future update.
            </Q>
            <Q q="Why does my rank change arrow show — instead of ↑ or ↓?">
              The arrow shows — when there is no data from the previous period to compare against. This is common on the first day of a new month or when you have no data from the previous period.
            </Q>
            <Q q="How do I update my weight or height?">
              Update these values in your Google Fit or Google Health app on your phone. KyaReFitting aa reads them automatically on the next Dashboard sync.
            </Q>
            <Q q="How do I revoke KyaReFitting aa's access to my Google account?">
              Go to{' '}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-foreground transition-colors">
                myaccount.google.com/permissions
              </a>
              {' '}and remove KyaReFitting aa from the connected apps list.
            </Q>
          </div>
        </Section>

        <Section icon="mail" title="Contact & support">
          <p>
            For questions, feedback, or data deletion requests, reach us at:
          </p>
          <div className="flex flex-col gap-1.5">
            <a href="mailto:kavin@madarth.com" className="font-medium underline hover:text-foreground transition-colors">
              kavin@madarth.com
            </a>
            <a href="mailto:devatmadarth@gmail.com" className="font-medium underline hover:text-foreground transition-colors">
              devatmadarth@gmail.com
            </a>
          </div>
          <p className="text-muted-foreground">
            Also see our{' '}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
            {' '}and{' '}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>.
          </p>
        </Section>

      </div>
    </>
  )
}
