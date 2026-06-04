/**
 * Google People API — gender + birthday, which the Google Health API does not
 * provide. GET https://people.googleapis.com/v1/people/me with the sensitive
 * scopes `user.birthday.read` and `user.gender.read`.
 *
 * Both fields are frequently empty (users rarely set a birthday/gender), so this
 * always resolves to a shape with null fallbacks rather than throwing.
 */
export async function getPeopleDetails(token) {
  const res = await fetch(
    'https://people.googleapis.com/v1/people/me?personFields=birthdays,genders',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!res.ok) return { birthday: null, gender: null }
  const data = await res.json()

  // Prefer an entry with a concrete date; date = { year?, month, day }.
  const bEntry = (data.birthdays || []).find((b) => b.date) || (data.birthdays || [])[0]
  const d = bEntry?.date
  const birthday =
    d && d.month && d.day
      ? `${d.year ?? '1900'}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
      : null

  const gEntry = (data.genders || []).find((g) => g.value) || (data.genders || [])[0]
  const gender = gEntry?.formattedValue ?? gEntry?.value ?? null

  return { birthday, gender }
}
