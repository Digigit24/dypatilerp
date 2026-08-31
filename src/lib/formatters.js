import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd MMM yyyy')
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd MMM yyyy, hh:mm a')
}

export const timeAgo = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true })
}

// Display name for a scholar OR applicant — always "Dr. " prefixed, since
// everyone in this fellowship's pipeline already holds a doctorate. Strips
// any Dr/Dr. someone re-types directly into first_name so it never doubles
// up ("Dr. Dr Shuchi") — the underlying scholar data was cleaned once (see
// backend/src/db/strip-dr-prefix.js) but this guards against it recurring,
// and applicant data was never cleaned, so the guard does real work there.
// Named `scholarName` from when it only covered scholars — kept as-is
// rather than touching every import once applicants were folded in too.
// Staff/admin/coordinator/guide/mentor users are NOT part of this — never
// call this for them, use their first_name/last_name directly instead.
const stripDrPrefix = (name) => String(name || '').replace(/^dr\.?\s*/i, '').trim()

export const scholarName = (person) => {
  if (!person) return ''
  const parts = [
    stripDrPrefix(person.first_name),
    String(person.middle_name || '').trim(),
    String(person.last_name || '').trim(),
  ].filter(Boolean)
  return parts.length ? `Dr. ${parts.join(' ')}` : ''
}

// Same "Dr. " treatment, for applicants — their name arrives as one
// pre-composed `personal.full_name` string rather than separate
// first/middle/last fields, so it can't go through scholarName() above.
export const withDrPrefix = (fullName) => {
  const stripped = stripDrPrefix(fullName)
  return stripped ? `Dr. ${stripped}` : ''
}
