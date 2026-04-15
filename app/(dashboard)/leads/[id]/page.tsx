'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import { NSW_SUBURB_SUGGESTIONS, NSW_STATE, getPostcodeForSuburb, normalizeNswState, normalizeOptionalPostcode } from '../../../lib/reference-data/locations'
import { CLIENT_LEAD_SOURCES } from '../../../lib/reference-data/client-sources'

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
  { value: 'new',       label: 'New',       tone: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', tone: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500' },
  { value: 'quoted',    label: 'Quoted',    tone: 'bg-purple-50 text-purple-700',   dot: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', tone: 'bg-green-50 text-green-700',     dot: 'bg-green-500' },
  { value: 'lost',      label: 'Lost',      tone: 'bg-neutral-100 text-neutral-500', dot: 'bg-neutral-400' },
]

function getStatus(status: LeadStatus) {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

function getSource(source: LeadSource) {
  return LEAD_SOURCES.find(s => s.value === source) || LEAD_SOURCES[LEAD_SOURCES.length - 1]
}

function fullName(l: Lead) {
  return [l.first_name, l.last_name].filter(Boolean).join(' ')
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

// ── CONVERT TO CLIENT MODAL ───────────────────────────────────────────────────
function ConvertToClientModal({ lead, onClose, onConverted }: {
  lead: Lead
  onClose: () => void
  onConverted: () => void
}) {
  const [form, setForm] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name || '',
    phone: lead.phone || '',
    email: lead.email || '',
    address: '',
    suburb: lead.suburb || '',
    postcode: lead.suburb ? (getPostcodeForSuburb(lead.suburb) || '') : '',
    state: NSW_STATE,
    lead_source: mapLeadSource(lead.source),
    lead_source_other: lead.source === 'other' ? (lead.source_detail || '') : '',
    notes: [lead.message, lead.notes].filter(Boolean).join('\n') || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  function setSuburb(suburb: string) {
    const postcode = getPostcodeForSuburb(suburb)
    setForm(prev => ({ ...prev, suburb, postcode: postcode || prev.postcode }))
  }

  async function handleConvert() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    if (!form.lead_source) { setError('Lead source is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const companyId = userData?.active_company_id || userData?.company_id

    const { error: clientErr } = await supabase.from('clients').insert([{
      user_id: user?.id,
      company_id: companyId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      suburb: form.suburb || null,
      state: normalizeNswState(),
      postcode: normalizeOptionalPostcode(form.postcode),
      lead_source: form.lead_source,
      lead_source_other: form.lead_source === 'other' ? form.lead_source_other.trim() : null,
      notes: form.notes.trim(),
    }])

    if (clientErr) { setSaving(false); setError(clientErr.message); return }

    await supabase.from('leads').update({ status: 'converted' }).eq('id', lead.id)
    setSaving(false)
    onConverted()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <div className="font-semibold text-neutral-900">Convert to client</div>
            <div className="text-xs text-neutral-400 mt-0.5">Review and confirm — data pre-filled from lead</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">First name <span className="text-red-400">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Last name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
            <input type="tel" inputMode="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
            <input type="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 12 Main St"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Suburb</label>
              <input list="nsw-suburbs-convert" value={form.suburb} onChange={e => setSuburb(e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
              <datalist id="nsw-suburbs-convert">
                {NSW_SUBURB_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Postcode</label>
              <input value={form.postcode} onChange={e => set('postcode', e.target.value)} inputMode="numeric"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Lead source <span className="text-red-400">*</span></label>
            <select value={form.lead_source} onChange={e => set('lead_source', e.target.value)}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50">
              <option value="">Select source</option>
              {CLIENT_LEAD_SOURCES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {form.lead_source === 'other' && (
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Other source</label>
              <input value={form.lead_source_other} onChange={e => set('lead_source_other', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleConvert} disabled={saving}
            className="flex-1 text-sm py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium">
            {saving ? 'Converting…' : 'Convert to client ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LEAD DETAIL PAGE ──────────────────────────────────────────────────────────
export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  // Editable fields
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    source: '' as LeadSource, source_detail: '',
    message: '', suburb: '', notes: '', status: '' as LeadStatus,
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('leads').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setLead(data as Lead)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          email: data.email || '',
          source: data.source,
          source_detail: data.source_detail || '',
          message: data.message || '',
          suburb: data.suburb || '',
          notes: data.notes || '',
          status: data.status,
        })
      }
      setLoading(false)
    })
  }, [id])

  function setF(field: string, val: string) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('leads')
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        source: form.source,
        source_detail: form.source_detail.trim() || null,
        message: form.message.trim() || null,
        suburb: form.suburb.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      })
      .eq('id', id)
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    setLead(data as Lead)
    setEditing(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('leads').delete().eq('id', id)
    router.push('/leads')
  }

  async function updateStatus(status: LeadStatus) {
    setLead(prev => prev ? { ...prev, status } : prev)
    const supabase = createClient()
    await supabase.from('leads').update({ status }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-neutral-400">Loading…</div>
    )
  }

  if (!lead) {
    return (
      <div className="p-6">
        <div className="text-sm text-neutral-500">Lead not found.</div>
        <button onClick={() => router.push('/leads')} className="mt-3 text-sm text-neutral-900 underline">← Back to leads</button>
      </div>
    )
  }

  const src = getSource(lead.source)
  const st = getStatus(lead.status)

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      {showConvert && (
        <ConvertToClientModal
          lead={lead}
          onClose={() => setShowConvert(false)}
          onConverted={() => router.push('/clients')}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-base font-semibold text-neutral-900 mb-1">Delete lead?</div>
            <div className="text-sm text-neutral-500 mb-5">This will permanently remove <span className="font-medium text-neutral-900">{fullName(lead)}</span> from your leads. This can&apos;t be undone.</div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-neutral-200 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 font-medium">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leads')} className="text-neutral-400 hover:text-neutral-700 text-sm">←</button>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">{fullName(lead)}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.tone}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
              <span className="text-xs text-neutral-400">{src.icon} {src.label}{lead.source_detail ? ` · ${lead.source_detail}` : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-sm px-3 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">
              Edit
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)}
            className="text-sm px-3 py-2 border border-red-100 rounded-lg hover:bg-red-50 text-red-500">
            Delete
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 mb-4">
        {editing ? (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">First name <span className="text-red-400">*</span></label>
                <input value={form.first_name} onChange={e => setF('first_name', e.target.value)}
                  className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Last name</label>
                <input value={form.last_name} onChange={e => setF('last_name', e.target.value)}
                  className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Phone</label>
              <input type="tel" inputMode="tel" value={form.phone} onChange={e => setF('phone', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Email</label>
              <input type="email" inputMode="email" value={form.email} onChange={e => setF('email', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50">
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Source</label>
              <select value={form.source} onChange={e => setF('source', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50">
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            {(form.source === 'whatsapp_group' || form.source === 'facebook_group' || form.source === 'reddit') && (
              <div>
                <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Group name</label>
                <input value={form.source_detail} onChange={e => setF('source_detail', e.target.value)}
                  className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Suburb</label>
              <input list="nsw-suburbs-edit" value={form.suburb} onChange={e => setF('suburb', e.target.value)}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
              <datalist id="nsw-suburbs-edit">
                {NSW_SUBURB_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">What do they need?</label>
              <textarea value={form.message} onChange={e => setF('message', e.target.value)} rows={3}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Notes</label>
              <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 resize-none" />
            </div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setEditing(false); setError('') }}
                className="flex-1 py-3 border border-neutral-200 rounded-xl text-sm text-neutral-600 hover:bg-neutral-50 font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 bg-neutral-900 text-white rounded-xl text-sm hover:bg-neutral-700 disabled:opacity-50 font-medium">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {lead.phone && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-neutral-500">Phone</span>
                <a href={`tel:${lead.phone}`} className="text-sm font-medium text-blue-600">{lead.phone}</a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-neutral-500">Email</span>
                <a href={`mailto:${lead.email}`} className="text-sm font-medium text-blue-600">{lead.email}</a>
              </div>
            )}
            {lead.suburb && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-neutral-500">Suburb</span>
                <span className="text-sm text-neutral-900">{lead.suburb}</span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500">Source</span>
              <span className="text-sm text-neutral-900">{src.icon} {src.label}{lead.source_detail ? ` · ${lead.source_detail}` : ''}</span>
            </div>
            <div className="flex items-start justify-between px-4 py-3">
              <span className="text-xs text-neutral-500 mt-0.5">Status</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {STATUSES.map(s => (
                  <button key={s.value} onClick={() => updateStatus(s.value)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                      lead.status === s.value ? s.tone + ' border-transparent' : 'border-neutral-200 text-neutral-400 hover:border-neutral-300'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {lead.message && (
              <div className="px-4 py-3">
                <div className="text-xs text-neutral-500 mb-1.5">What they need</div>
                <div className="text-sm text-neutral-700 whitespace-pre-wrap">{lead.message}</div>
              </div>
            )}
            {lead.notes && (
              <div className="px-4 py-3">
                <div className="text-xs text-neutral-500 mb-1.5">Notes</div>
                <div className="text-sm text-neutral-700 whitespace-pre-wrap">{lead.notes}</div>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-neutral-500">Added</span>
              <span className="text-xs text-neutral-400">{new Date(lead.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </>
        )}
      </div>

      {/* Convert action */}
      {!editing && lead.status !== 'converted' && lead.status !== 'lost' && (
        <button
          onClick={() => setShowConvert(true)}
          className="w-full py-3.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Convert to client →
        </button>
      )}
      {!editing && lead.status === 'converted' && (
        <div className="w-full py-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium text-center">
          ✓ Converted to client
        </div>
      )}
    </div>
  )
}
