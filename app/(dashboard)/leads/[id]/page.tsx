'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import { NSW_SUBURB_SUGGESTIONS, NSW_STATE, getPostcodeForSuburb, normalizeNswState, normalizeOptionalPostcode } from '../../../lib/reference-data/locations'
import BotConversationPanel from '@/components/BotConversationPanel'

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

        {/* Lead info summary */}
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

// ── SCHEDULE CONFIRM CARD ─────────────────────────────────────────────────────
function ScheduleConfirmCard({ leadId, conv, onConfirmed }: {
  leadId: string
  conv: { id: string; client_availability: string | null; contact_name: string | null; vehicle: { year?: string; make?: string; model?: string } | null }
  onConfirmed: () => void
}) {
  const [when, setWhen] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [err, setErr] = useState('')

  const vehicleStr = conv.vehicle
    ? `${conv.vehicle.year || ''} ${conv.vehicle.make || ''} ${conv.vehicle.model || ''}`.trim()
    : null

  async function handlePropose() {
    if (!when.trim()) { setErr('Ingresá cuándo podés ir'); return }
    setConfirming(true); setErr('')
    const res = await fetch(`/api/leads/${leadId}/confirm-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conv.id, when: when.trim() }),
    })
    if (!res.ok) { setErr('Error al enviar, intenta de nuevo'); setConfirming(false); return }
    onConfirmed()
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📅</span>
        <span className="text-sm font-semibold text-amber-900">Coordinar horario</span>
        <span className="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">Pendiente</span>
      </div>

      {vehicleStr && (
        <div className="text-xs text-amber-700 mb-1">🚗 {vehicleStr}</div>
      )}

      {conv.client_availability && (
        <div className="bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm text-neutral-700 mb-3">
          <span className="text-xs text-neutral-400 block mb-0.5">Disponibilidad del cliente</span>
          {conv.client_availability}
        </div>
      )}

      <div className="mb-3">
        <label className="text-xs text-amber-800 font-medium mb-1 block">Cuándo podés ir</label>
        <input
          value={when}
          onChange={e => setWhen(e.target.value)}
          placeholder="ej. viernes después de las 3pm"
          className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-amber-400"
        />
      </div>

      {err && <div className="text-xs text-red-600 mb-2">{err}</div>}

      <button
        onClick={handlePropose}
        disabled={confirming}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
      >
        {confirming ? 'Enviando…' : 'Matchear con el cliente →'}
      </button>
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
  const [scheduleConv, setScheduleConv] = useState<any>(null)

  // Editable fields
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    source: '' as LeadSource, source_detail: '',
    message: '', suburb: '', notes: '', status: '' as LeadStatus,
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('bot_conversations')
        .select('id, status, language, vehicle, suburb, job_type, job_description, client_availability, contact_name, contact_phone')
        .eq('lead_id', id)
        .eq('status', 'awaiting_schedule_confirmation')
        .maybeSingle(),
    ]).then(([{ data }, { data: conv }]) => {
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
      if (conv) setScheduleConv(conv)
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
    await supabase.from('notifications').delete().eq('url', `/leads/${id}`)
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
          onConverted={(clientId) => router.push(`/jobs/new?client=${clientId}`)}
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
                <div className="flex items-center gap-3">
                  <a href={`tel:+${lead.phone.replace(/\D/g, '')}`} className="text-sm font-medium text-blue-600">
                    +{lead.phone.replace(/\D/g, '').replace(/^61(\d{3})(\d{3})(\d{3})$/, '61 $1 $2 $3')}
                  </a>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-green-500 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg font-medium"
                  >
                    WhatsApp
                  </a>
                </div>
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

      {/* Schedule confirm card */}
      {!editing && scheduleConv && (
        <ScheduleConfirmCard
          leadId={id}
          conv={scheduleConv}
          onConfirmed={() => setScheduleConv(null)}
        />
      )}

      {/* Bot conversation panel */}
      {!editing && <BotConversationPanel leadId={id} />}

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
