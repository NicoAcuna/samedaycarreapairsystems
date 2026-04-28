'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import { NSW_SUBURB_SUGGESTIONS, getPostcodeForSuburb, normalizeNswState, normalizeOptionalPostcode } from '../../lib/reference-data/locations'

type LeadStatus = 'new' | 'contacted' | 'quoted' | 'converted' | 'lost'
type LeadSource = 'whatsapp_group' | 'facebook_group' | 'airtasker' | 'google' | 'reddit' | 'recommendation' | 'other'

type Lead = {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  source: LeadSource
  source_detail: string | null
  message: string | null
  suburb: string | null
  status: LeadStatus
  notes: string | null
  created_at: string
}

function fullName(l: Lead) {
  return [l.first_name, l.last_name].filter(Boolean).join(' ')
}

const LEAD_SOURCES: { value: LeadSource; label: string; icon: string }[] = [
  { value: 'whatsapp_group', label: 'WhatsApp group',  icon: '💬' },
  { value: 'facebook_group', label: 'Facebook group',  icon: '👥' },
  { value: 'airtasker',      label: 'Airtasker',       icon: '🔨' },
  { value: 'google',         label: 'Google',          icon: '🔍' },
  { value: 'reddit',         label: 'Reddit',          icon: '🤖' },
  { value: 'recommendation', label: 'Recommendation',  icon: '⭐' },
  { value: 'other',          label: 'Other',           icon: '📌' },
]

const STATUSES: { value: LeadStatus; label: string; tone: string; dot: string }[] = [
  { value: 'new',       label: 'New',       tone: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', tone: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500' },
  { value: 'quoted',    label: 'Quoted',    tone: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', tone: 'bg-green-50 text-green-700',  dot: 'bg-green-500' },
  { value: 'lost',      label: 'Lost',      tone: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-400' },
]

const STATUS_TABS = [
  { value: '' as LeadStatus | '', label: 'All' },
  ...STATUSES.map(s => ({ value: s.value, label: s.label })),
]

function getStatus(status: LeadStatus) {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

function getSource(source: LeadSource) {
  return LEAD_SOURCES.find(s => s.value === source) || LEAD_SOURCES[LEAD_SOURCES.length - 1]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── NEW LEAD MODAL ────────────────────────────────────────────────────────────
function NewLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: (lead: Lead) => void }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', source: '' as LeadSource | '',
    source_detail: '', message: '', suburb: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    if (!form.source) { setError('Source is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const companyId = userData?.active_company_id || userData?.company_id

    const { data, error: err } = await supabase
      .from('leads')
      .insert([{
        user_id: user?.id,
        company_id: companyId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        source: form.source,
        source_detail: form.source_detail.trim() || null,
        message: form.message.trim() || null,
        suburb: form.suburb.trim() || null,
        notes: form.notes.trim() || null,
        status: 'new',
      }])
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    const lead = data as Lead

    // Fire push — don't await so the modal closes immediately
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: {
          title: '🔔 Nuevo lead',
          body: `${fullName(lead)}${lead.suburb ? ` · ${lead.suburb}` : ''}${lead.message ? ` — ${lead.message.slice(0, 60)}` : ''}`,
          url: `/leads/${lead.id}`,
        },
      }),
    }).catch(() => {})

    onSaved(lead)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <div className="font-semibold text-neutral-900">New lead</div>
            <div className="text-xs text-neutral-400 mt-0.5">Quick-add a potential customer</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">First name <span className="text-red-400">*</span></label>
              <input
                value={form.first_name} onChange={e => set('first_name', e.target.value)}
                placeholder="John"
                autoFocus
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Last name</label>
              <input
                value={form.last_name} onChange={e => set('last_name', e.target.value)}
                placeholder="Smith"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input
              type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+61 400 000 000"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Source <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {LEAD_SOURCES.map(src => (
                <button
                  key={src.value}
                  type="button"
                  onClick={() => set('source', src.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors text-left ${
                    form.source === src.value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-neutral-50'
                  }`}
                >
                  <span>{src.icon}</span>
                  <span className="truncate">{src.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Source detail */}
          {(form.source === 'whatsapp_group' || form.source === 'facebook_group' || form.source === 'reddit') && (
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Group name</label>
              <input
                value={form.source_detail} onChange={e => set('source_detail', e.target.value)}
                placeholder={form.source === 'reddit' ? 'e.g. r/sydney' : 'e.g. Sydney Mechanics Help'}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
              />
            </div>
          )}

          {/* What they need */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">What do they need?</label>
            <textarea
              value={form.message} onChange={e => set('message', e.target.value)}
              placeholder="e.g. Needs oil change, car won't start..."
              rows={3}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none"
            />
          </div>

          {/* Suburb */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Suburb</label>
            <input
              list="nsw-suburbs-lead"
              value={form.suburb} onChange={e => set('suburb', e.target.value)}
              placeholder="e.g. Parramatta"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50"
            />
            <datalist id="nsw-suburbs-lead">
              {NSW_SUBURB_SUGGESTIONS.map(suburb => (
                <option key={suburb} value={suburb} />
              ))}
            </datalist>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Notes</label>
            <textarea
              value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any extra details..."
              rows={2}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none"
            />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving…' : 'Save lead'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CONVERT CONFIRM MODAL ─────────────────────────────────────────────────────
function ConvertToClientModal({ lead, onClose, onConverted }: {
  lead: Lead
  onClose: () => void
  onConverted: (clientId: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleConvert() {
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const companyId = userData?.active_company_id || userData?.company_id

    const postcode = lead.suburb ? getPostcodeForSuburb(lead.suburb) : ''
    const { data: clientData, error: clientErr } = await supabase.from('clients').insert([{
      user_id: user?.id,
      company_id: companyId,
      first_name: lead.first_name.trim(),
      last_name: (lead.last_name || '').trim(),
      phone: (lead.phone || '').trim(),
      email: (lead.email || '').trim(),
      suburb: lead.suburb || null,
      state: normalizeNswState(),
      postcode: normalizeOptionalPostcode(postcode || ''),
      lead_source: mapLeadSource(lead.source),
      lead_source_other: lead.source === 'other' ? (lead.source_detail || '') : null,
      notes: [lead.message, lead.notes].filter(Boolean).join('\n') || null,
    }]).select('id').single()

    if (clientErr) { setSaving(false); setError(clientErr.message); return }

    await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id)
    setSaving(false)
    onConverted(clientData.id)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="text-base font-semibold text-neutral-900 mb-1">Convert to client?</div>
        <div className="text-sm text-neutral-500 mb-4">
          A new client will be created with the following info and you&apos;ll be taken to create a job.
        </div>

        <div className="bg-neutral-50 border border-neutral-100 rounded-xl divide-y divide-neutral-100 mb-4 text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-neutral-500">Name</span>
            <span className="font-medium text-neutral-900">{[lead.first_name, lead.last_name].filter(Boolean).join(' ')}</span>
          </div>
          {lead.phone && (
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-neutral-500">Phone</span>
              <span className="text-neutral-900">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-neutral-500">Email</span>
              <span className="text-neutral-900 truncate ml-4">{lead.email}</span>
            </div>
          )}
          {lead.suburb && (
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-neutral-500">Suburb</span>
              <span className="text-neutral-900">{lead.suburb}</span>
            </div>
          )}
        </div>

        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 mb-4">{error}</div>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-neutral-200 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 font-medium">
            Cancel
          </button>
          <button onClick={handleConvert} disabled={saving}
            className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving ? 'Converting…' : 'Yes, convert →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function mapLeadSource(source: LeadSource): string {
  const map: Record<LeadSource, string> = {
    whatsapp_group: 'other',
    facebook_group: 'other',
    airtasker:      'airtasker',
    google:         'google',
    reddit:         'other',
    recommendation: 'recommendation',
    other:          'other',
  }
  return map[source] || 'other'
}

// ── STATUS CHANGE DROPDOWN ────────────────────────────────────────────────────
function StatusBadge({ lead, onChange }: { lead: Lead; onChange: (status: LeadStatus) => void }) {
  const [open, setOpen] = useState(false)
  const s = getStatus(lead.status)

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.tone}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
        <span className="text-[10px] opacity-60">▾</span>
      </button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 min-w-[130px]"
          onClick={e => e.stopPropagation()}
        >
          {STATUSES.map(st => (
            <button
              key={st.value}
              onClick={() => { onChange(st.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-neutral-50 ${lead.status === st.value ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}
            >
              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
              {st.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── LEADS PAGE ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [showNew, setShowNew] = useState(false)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setLeads((data as Lead[]) || [])
        setLoading(false)
      })
  }, [])

  async function updateStatus(lead: Lead, status: LeadStatus) {
    if (status === 'converted') {
      setConvertLead(lead)
      return
    }
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l))
    const supabase = createClient()
    await supabase.from('leads').update({ status }).eq('id', lead.id)
  }

  const filtered = leads.filter(l => {
    const matchesStatus = !statusFilter || l.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch = !q || [l.first_name, l.last_name, l.phone, l.suburb, l.message].some(f => f?.toLowerCase().includes(q))
    return matchesStatus && matchesSearch
  })

  // Stats
  const newCount       = leads.filter(l => l.status === 'new').length
  const convertedCount = leads.filter(l => l.status === 'converted').length
  const conversionRate = leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0

  return (
    <div className="p-4 md:p-6">
      {showNew && (
        <NewLeadModal
          onClose={() => setShowNew(false)}
          onSaved={lead => { setLeads(prev => [lead, ...prev]); setShowNew(false) }}
        />
      )}
      {convertLead && (
        <ConvertToClientModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onConverted={(clientId) => {
            setLeads(prev => prev.map(l => l.id === convertLead.id ? { ...l, status: 'converted' } : l))
            setConvertLead(null)
            router.push(`/jobs/new?client=${clientId}`)
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500 mt-1">{loading ? '…' : `${leads.length} lead${leads.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          + New lead
        </button>
      </div>

      {/* Stats */}
      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-neutral-900">{leads.length}</div>
            <div className="text-xs text-neutral-500 mt-1">Total leads</div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-700">{newCount}</div>
            <div className="text-xs text-blue-600 mt-1">New</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-700">{conversionRate}%</div>
            <div className="text-xs text-green-600 mt-1">Converted</div>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value as LeadStatus | '')}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === tab.value
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
            }`}
          >
            {tab.label}
            {tab.value !== '' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {leads.filter(l => l.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or suburb…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-400"
        />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Source</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">What they need</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Suburb</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Added</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                {search || statusFilter ? 'No leads match your filters' : 'No leads yet — add your first one'}
              </td></tr>
            ) : filtered.map(lead => {
              const src = getSource(lead.source)
              return (
                <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{fullName(lead)}</div>
                    {lead.phone && <div className="text-xs text-neutral-400 mt-0.5">{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge lead={lead} onChange={status => updateStatus(lead, status)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600">
                      <span>{src.icon}</span>
                      <span>{src.label}</span>
                    </span>
                    {lead.source_detail && (
                      <div className="text-xs text-neutral-400 mt-0.5">{lead.source_detail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="text-xs text-neutral-600 line-clamp-2">{lead.message || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{lead.suburb || '—'}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  <td className="px-4 py-3">
                    {lead.status !== 'converted' && lead.status !== 'lost' && (
                      <button
                        onClick={e => { e.stopPropagation(); setConvertLead(lead) }}
                        className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50 whitespace-nowrap"
                      >
                        Convert →
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            {search || statusFilter ? 'No leads match your filters' : 'No leads yet — add your first one'}
          </div>
        ) : filtered.map(lead => {
          const src = getSource(lead.source)
          return (
            <div key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="px-4 py-3.5 border-b border-neutral-100 last:border-0 cursor-pointer active:bg-neutral-50">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="font-medium text-neutral-900 text-sm">{fullName(lead)}</div>
                <StatusBadge lead={lead} onChange={status => updateStatus(lead, status)} />
              </div>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()}
                  className="text-xs text-blue-600 block mb-1">{lead.phone}</a>
              )}
              <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
                <span>{src.icon}</span>
                <span>{src.label}{lead.source_detail ? ` · ${lead.source_detail}` : ''}</span>
                {lead.suburb && <span>· {lead.suburb}</span>}
              </div>
              {lead.message && (
                <div className="text-xs text-neutral-500 line-clamp-2 mt-1">{lead.message}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="text-[11px] text-neutral-300">{formatDate(lead.created_at)}</div>
                {lead.status !== 'converted' && lead.status !== 'lost' && (
                  <button
                    onClick={e => { e.stopPropagation(); setConvertLead(lead) }}
                    className="text-xs px-3 py-1.5 border border-green-200 text-green-700 rounded-lg hover:bg-green-50"
                  >
                    Convert →
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
