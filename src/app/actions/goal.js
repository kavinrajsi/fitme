'use server'

/**
 * Save the user's daily step goal (gamification). Stored on profiles.daily_step_goal.
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Validate the submitted goal (1,000–100,000 steps) and persist it to the signed-in
// user's own profile row, then revalidate the views that render the goal ring.
export async function saveStepGoal(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const goal = parseInt(formData.get('daily_step_goal'), 10)
  if (!Number.isNaN(goal) && goal >= 1000 && goal <= 100000) {
    await supabase.from('profiles').update({ daily_step_goal: goal }).eq('id', user.id)
    revalidatePath('/dashboard')
    revalidatePath('/profile')
  }
}
