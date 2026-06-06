/**
 * /workouts — the user's exercise sessions from Google Health (workouts table).
 *
 * force-dynamic, own-row RLS; a simple newest-first table capped at 100 rows.
 */
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Workouts — KyaReFitting aa' }

// "Mon D" for a session's start timestamp, or an em dash when missing.
function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
}

// Fetches the 100 most recent workout sessions for the signed-in user.
export default async function WorkoutsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: workouts } = await supabase
    .from('workouts')
    .select('source_id, started_at, type, duration_min, calories, distance_km, steps')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100)

  const list = workouts ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workouts</CardTitle>
        <CardDescription>Your recent exercise sessions from Google Health</CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No workouts yet — they&apos;ll appear here after a sync (and once Google Health has
            exercise sessions for your account).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Steps</TableHead>
                <TableHead className="text-right">Calories</TableHead>
                <TableHead className="text-right">Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((workout) => (
                <TableRow key={workout.source_id}>
                  <TableCell className="font-medium">{workout.type ?? 'Workout'}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(workout.started_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {workout.duration_min != null ? `${workout.duration_min} min` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {workout.steps != null ? workout.steps.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {workout.calories != null ? workout.calories : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {workout.distance_km != null ? `${workout.distance_km} km` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
