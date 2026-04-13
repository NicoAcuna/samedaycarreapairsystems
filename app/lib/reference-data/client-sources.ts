export const CLIENT_LEAD_SOURCES = [
  { value: 'airtasker', label: 'Air Tasker' },
  { value: 'google', label: 'Google' },
  { value: 'recommendation', label: 'Recommendation' },
  { value: 'other', label: 'Other source' },
] as const

export type ClientLeadSource = (typeof CLIENT_LEAD_SOURCES)[number]['value']

export function formatClientLeadSource(source?: string | null, otherSource?: string | null) {
  if (!source) return '—'

  if (source === 'other') {
    return otherSource?.trim() || 'Other source'
  }

  return CLIENT_LEAD_SOURCES.find(option => option.value === source)?.label || source
}
