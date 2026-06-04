'use server'

/**
 * Manual self-entry of height/weight — the fallback for users whose Google Health
 * account has no readings (e.g. non-Fitbit users). Stored in the manual_* columns,
 * which take precedence over Google-sourced values in getUserDetails().
 */
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveManualBody(formData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const h = parseFloat(formData.get('height_cm'))
  const w = parseFloat(formData.get('weight_kg'))

  const update = {}
  if (!Number.isNaN(h) && h > 0) update.manual_height_cm = h
  if (!Number.isNaN(w) && w > 0) update.manual_weight_kg = w

  if (Object.keys(update).length) {
    await supabase.from('profiles').update(update).eq('id', user.id)
    revalidatePath('/')
  }
}
