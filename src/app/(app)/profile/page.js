/**
 * /profile — account details (from Google sign-in + Google Health + People), manual
 * height/weight entry, and Connect Google Health.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { signOut } from '../../actions/auth'
import { saveStepGoal } from '../../actions/goal'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NotificationsToggle } from '@/components/notifications-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Profile — KyaReFitting aa' }

export default async function ProfilePage({ searchParams }) {
  const { health } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_step_goal')
    .eq('id', user.id)
    .maybeSingle()
  const goal = profile?.daily_step_goal ?? 10000

  const details = await getUserDetails()
  const name = details?.name ?? 'there'
  const initial = (name?.[0] ?? details?.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Avatar size="lg">
          {details?.avatar ? <AvatarImage src={details.avatar} alt="" /> : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{name}</h1>
          {details?.email && (
            <p className="truncate text-sm text-muted-foreground">{details.email}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>From Google Health and your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-0">
          <Detail label="Height" value={details?.heightCm != null ? `${details.heightCm} cm` : null} />
          <Detail label="Weight" value={details?.weightKg != null ? `${details.weightKg} kg` : null} />
          <Detail
            label="BMI"
            value={details?.bmi != null ? `${details.bmi} (${details.bmiCategory})` : null}
          />
          <Detail label="Age" value={details?.age != null ? `${details.age}` : null} />
          <Detail label="Gender" value={details?.gender} />
          <Detail label="Birthday" value={details?.birthday} last />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Health</CardTitle>
          <CardDescription>Sync steps, heart rate, sleep and more</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {health === 'connected' && (
            <p className="text-sm text-muted-foreground">Google Health connected.</p>
          )}
          {health === 'connect_failed' && (
            <p className="text-sm text-destructive">
              Couldn&apos;t connect Google Health — please try again.
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            render={<a href="/auth/google/health" />}
          >
            {details?.healthConnected ? 'Reconnect Google Health' : 'Connect Google Health'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily step goal</CardTitle>
          <CardDescription>Your target for the dashboard goal ring</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveStepGoal} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="daily_step_goal">Goal (steps/day)</Label>
              <Input
                id="daily_step_goal"
                type="number"
                name="daily_step_goal"
                step="500"
                min="1000"
                max="100000"
                defaultValue={goal}
              />
            </div>
            <Button type="submit" className="w-full">
              Save goal
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your theme</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Get a push when a top mover gains steps</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationsToggle />
        </CardContent>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sign out
        </Button>
      </form>

      <nav className="flex justify-center gap-4 text-sm text-muted-foreground">
        <a href="/help" className="underline underline-offset-4 hover:text-foreground">
          Help
        </a>
        <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          Privacy
        </a>
        <a href="/terms" className="underline underline-offset-4 hover:text-foreground">
          Terms
        </a>
      </nav>
    </div>
  )
}

function Detail({ label, value, last }) {
  return (
    <div
      className={`flex items-center justify-between py-3 ${
        last ? '' : 'border-b border-border'
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  )
}
