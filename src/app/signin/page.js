/**
 * Sign-in — styled with the shadcn login-03 block, adapted to Google-only auth
 * (no email/password or Apple, per the app's constraint).
 *
 * The Google button is a plain <a> styled with `buttonVariants()` (the Button
 * has no `asChild`) so navigating to /auth/google hits the Route Handler as a
 * full document request rather than a client navigation.
 * Errors are surfaced via the `?error=` search param set by the callback route
 * (see ERROR_MESSAGES for the user-facing copy).
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FieldDescription } from '@/components/ui/field'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Sign in — KyaReFitting aa' }

const ERROR_MESSAGES = {
  google_oauth_failed: 'Could not connect to Google. Please try again.',
  missing_code: 'Sign-in was cancelled or timed out. Please try again.',
  auth_callback_failed: 'We could not complete sign-in. Please try again.',
}

export default async function SignInPage({ searchParams }) {
  // Already signed in? Skip the login page and go straight in.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Login with your Google account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-md p-3 text-center text-sm">
                  {ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'}
                </div>
              )}
              <a
                href="/auth/google"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}
              >
                <GoogleIcon />
                Login with Google
              </a>
            </div>
          </CardContent>
        </Card>
        <FieldDescription className="px-6 text-center">
          By clicking continue, you agree to our{' '}
          <a href="/terms" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </FieldDescription>
      </div>
    </div>
  )
}

// Inline Google "G" mark; uses currentColor so it inherits the button's text color.
function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  )
}
