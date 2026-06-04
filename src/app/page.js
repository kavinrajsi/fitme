import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Icon } from '@/components/icon'

export const metadata = {
  title: 'KyaReFitting aa — Your Personal Fitness Companion',
  description: 'Track your steps, calories, workouts, and sleep. Sync with Google Health and compete on the leaderboard.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <FitMeLogo size={24} />
          KyaReFitting aa
        </div>
        <a
          href="/auth/google"
          className={buttonVariants({ size: 'sm' })}
        >
          Sign in
        </a>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-2xl mx-auto w-full gap-8">
        <FitMeLogo size={80} />

        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight">Your Personal Fitness Companion</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sync with Google Health to track your daily steps, calories, workouts, and sleep.
            Compete with friends on the leaderboard and stay on top of your health goals.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {[
            { icon: 'directions_walk', label: 'Steps' },
            { icon: 'local_fire_department', label: 'Calories' },
            { icon: 'timer', label: 'Active Minutes' },
            { icon: 'bedtime', label: 'Sleep' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border">
              <Icon name={icon} size={28} className="text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <a
            href="/auth/google"
            className={buttonVariants({ size: 'lg', className: 'gap-2.5 px-8' })}
          >
            <GoogleIcon />
            Get started with Google
          </a>
          <p className="text-xs text-muted-foreground">
            Free to use. Connects to your existing Google Health data.
          </p>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}

function FitMeLogo({ size = 100 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M55.8333 91.25L50 85.4167L64.7917 70.625L29.375 35.2083L14.5833 50L8.75 44.1667L14.5833 38.125L8.75 32.2917L17.5 23.5417L11.6667 17.5L17.5 11.6667L23.5417 17.5L32.2917 8.75L38.125 14.5833L44.1667 8.75L50 14.5833L35.2083 29.375L70.625 64.7917L85.4167 50L91.25 55.8333L85.4167 61.875L91.25 67.7083L82.5 76.4583L88.3333 82.5L82.5 88.3333L76.4583 82.5L67.7083 91.25L61.875 85.4167L55.8333 91.25Z" fill="#FDD941"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  )
}
