/**
 * /profile — account details (from Google sign-in + Google Health + People), manual
 * height/weight entry, and Connect Google Health.
 */
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { signOut } from '../../actions/auth'
import { saveStepGoal } from '../../actions/goal'

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

  const d = await getUserDetails()
  const name = d?.name ?? 'there'
  const initial = (name?.[0] ?? d?.email?.[0] ?? '?').toUpperCase()

  return (
    <>
      <div>
        {d?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.avatar} alt="" width={56} height={56} />
        ) : (
          <div aria-hidden="true">
            {initial}
          </div>
        )}
        <div>
          <h1>{name}</h1>
          {d?.email && <p>{d.email}</p>}
        </div>
      </div>

      <div>
        <div>
          <h2>Details</h2>
          <p>From Google Health and your account</p>
        </div>
        <Detail label="Height" value={d?.heightCm != null ? `${d.heightCm} cm` : null} />
        <Detail label="Weight" value={d?.weightKg != null ? `${d.weightKg} kg` : null} />
        <Detail label="BMI" value={d?.bmi != null ? `${d.bmi} (${d.bmiCategory})` : null} />
        <Detail label="Age" value={d?.age != null ? `${d.age}` : null} />
        <Detail label="Gender" value={d?.gender} />
        <Detail label="Birthday" value={d?.birthday} />
      </div>

      <div>
        <div>
          <h2>Google Health</h2>
          <p>Sync steps, heart rate, sleep and more</p>
        </div>
        {health === 'connected' && <p>Google Health connected.</p>}
        {health === 'connect_failed' && (
          <p>Couldn&apos;t connect Google Health — please try again.</p>
        )}
        <a
          href="/auth/google/health"
         
        >
          {d?.healthConnected ? 'Reconnect Google Health' : 'Connect Google Health'}
        </a>
      </div>

      <div>
        <div>
          <h2>Daily step goal</h2>
          <p>Your target for the dashboard goal ring</p>
        </div>
        <form action={saveStepGoal}>
          <div>
            <label>
              <span>Goal (steps/day)</span>
              <input
               
                type="number"
                name="daily_step_goal"
                step="500"
                min="1000"
                max="100000"
                defaultValue={goal}
              />
            </label>
          </div>
          <button
            type="submit"
           
          >
            Save goal
          </button>
        </form>
      </div>

      <form action={signOut}>
        <button type="submit">
          Sign out
        </button>
      </form>

      <nav>
        <a href="/help">Help</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
    </>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <span>{value ?? '—'}</span>
    </div>
  )
}
