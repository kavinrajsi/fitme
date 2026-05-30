/**
 * Sign-in page — the only entry point for authentication.
 * Google OAuth is the sole sign-in method; email/password is not supported.
 *
 * The Google button is a <Link> (not <Button asChild>) because Base UI's Button
 * doesn't support the asChild prop. `buttonVariants()` applies the same visual
 * styles to any element.
 *
 * `prefetch={false}` on the /auth/google link prevents Next.js from treating the
 * Route Handler as an RSC page and triggering an "RSC payload" console warning.
 *
 * Error messages are surfaced via `?error=` search param set by the callback route.
 * searchParams must be awaited in Next.js 16 before accessing properties.
 */
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Sign in — FitMe' }

export default async function SignInPage({ searchParams }) {
  const { error } = await searchParams

  return (
    <>
      <div className="flex justify-center mb-4">
        <Icon name="fitness_center" size={48} className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-1">Welcome to FitMe</h1>
      <p className="text-muted-foreground text-sm text-center mb-8">
        Sign in or create an account to get started
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {error === 'google_oauth_failed'
              ? 'Could not connect to Google. Please try again.'
              : 'Something went wrong. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      <a
        href="/auth/google"
        className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full gap-2.5' })}
      >
        <GoogleIcon />
        Continue with Google
      </a>

      <p className="mt-6 text-[0.775rem] text-muted-foreground text-center leading-relaxed">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
      </p>
    </>
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
