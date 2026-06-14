// Shared lead-detection criteria matching, backed by the lead_criteria table
// (managed from /settings). Self-contained so any route can use it.
import { createClient } from '@supabase/supabase-js'

export type Criteria = {
  trigger: string[]
  exclude: string[]
  high_priority: string[]
  medium_priority: string[]
}

const SUPABASE_COMPANY_ID = process.env.SUPABASE_COMPANY_ID!

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Load active criteria for a channel. Returns null on error (caller falls back).
export async function loadCriteria(channel: string): Promise<Criteria | null> {
  try {
    const { data, error } = await sb()
      .from('lead_criteria')
      .select('term, kind, channels')
      .eq('company_id', SUPABASE_COMPANY_ID)
      .eq('active', true)
    if (error || !data) return null
    const crit: Criteria = { trigger: [], exclude: [], high_priority: [], medium_priority: [] }
    for (const row of data as Array<{ term: string; kind: keyof Criteria; channels: string[] }>) {
      if (Array.isArray(row.channels) && !row.channels.includes(channel)) continue
      if (crit[row.kind]) crit[row.kind].push((row.term || '').toLowerCase())
    }
    return crit
  } catch {
    return null
  }
}

export function normalizeForMatch(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Word-ish, accent-insensitive match of a plain-text term inside the text.
export function containsTerm(text: string, term: string) {
  const t = normalizeForMatch(term).trim()
  if (!t) return false
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(normalizeForMatch(text))
}

export const matchTerms = (text: string, terms: string[]) => terms.some(t => containsTerm(text, t))

export function shouldTriggerWith(text: string, crit: Criteria): boolean {
  if (!text || text.length < 3) return false
  if (matchTerms(text, crit.exclude)) return false
  return matchTerms(text, crit.trigger)
}

export function detectPriorityWith(text: string, crit: Criteria): 'high' | 'medium' | 'normal' {
  if (matchTerms(text, crit.high_priority)) return 'high'
  if (matchTerms(text, crit.medium_priority)) return 'medium'
  return 'normal'
}
