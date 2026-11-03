// DB-driven lead criteria for the WhatsApp bot — mirrors lib/leadCriteria.ts so
// keywords edited in /settings (channel: whatsapp) actually take effect here.
// Falls back to the caller's hardcoded triggers when no criteria are configured,
// so enabling this can never silently stop live lead capture.

function normalizeForMatch(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function containsTerm(text, term) {
  const t = normalizeForMatch(term).trim().replace(/\s+/g, ' ')
  if (!t) return false
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(normalizeForMatch(text))
}

const matchTerms = (text, terms) => terms.some(t => containsTerm(text, t))

// Load active criteria for a channel from the lead_criteria table.
// Returns null on error / no rows so the caller can fall back.
async function loadCriteria(supabase, companyId, channel) {
  try {
    const { data, error } = await supabase
      .from('lead_criteria')
      .select('term, kind, channels')
      .eq('company_id', companyId)
      .eq('active', true)
    if (error || !data || !data.length) return null
    const crit = { trigger: [], exclude: [], high_priority: [], medium_priority: [] }
    for (const row of data) {
      if (Array.isArray(row.channels) && !row.channels.includes(channel)) continue
      if (crit[row.kind]) crit[row.kind].push((row.term || '').toLowerCase())
    }
    return crit.trigger.length ? crit : null
  } catch {
    return null
  }
}

function shouldTriggerWith(text, crit) {
  if (!text || text.length < 3) return false
  if (matchTerms(text, crit.exclude)) return false
  return matchTerms(text, crit.trigger)
}

function detectPriorityWith(text, crit) {
  if (matchTerms(text, crit.high_priority)) return 'high'
  if (matchTerms(text, crit.medium_priority)) return 'medium'
  return 'normal'
}

module.exports = { loadCriteria, shouldTriggerWith, detectPriorityWith }
