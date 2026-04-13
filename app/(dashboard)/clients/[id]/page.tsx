'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import { NSW_SUBURB_SUGGESTIONS, NSW_STATE, formatClientLocation, getPostcodeForSuburb, normalizeNswState } from '../../../lib/reference-data/locations'
import { VEHICLE_CATALOG, getModelsForMake } from '../../../lib/reference-data/vehicles'

type Client = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  notes: string
  created_at: string
}

type Vehicle = {
  id: string
  make: string
  model: string
  year: string
  colour: string
  plate: string
  odometer_km: number
  vin: string
  engine: string
}

type Job = {
  id: string
  type: string
  status: string
  scheduled_at: string
  completed_at: string
  odometer_km: number
}

type ClientInteraction = {
  id: string
  mood: 'happy' | 'neutral' | 'angry'
  comment: string | null
  created_at: string
  nps_score: number | null
}

const GOOGLE_REVIEW_LINK = 'https://g.page/r/CcCsiVCVHtVCEBM/review'

function fullName(c: Client) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

function getClientStatus(npsScore: number | null) {
  if (npsScore == null) {
    return {
      label: 'Unrated',
      tone: 'bg-neutral-100 text-neutral-600',
      summary: 'No promoter score recorded yet.',
    }
  }

  if (npsScore >= 9) {
    return {
      label: 'Advocate',
      tone: 'bg-emerald-50 text-emerald-700',
      summary: 'Strong promoter. Good moment to ask for a review or referral.',
    }
  }

  if (npsScore >= 7) {
    return {
      label: 'Neutral',
      tone: 'bg-amber-50 text-amber-700',
      summary: 'Satisfied, but not a strong promoter yet.',
    }
  }

  return {
    label: 'At Risk',
    tone: 'bg-red-50 text-red-700',
    summary: 'Needs follow-up. This client may have friction after the job.',
  }
}

function normaliseWhatsAppPhone(phone?: string | null) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('61')) return digits
  if (digits.startsWith('0')) return `61${digits.slice(1)}`
  return digits
}

function openWhatsApp(phone: string, message?: string) {
  const normalizedPhone = normaliseWhatsAppPhone(phone)
  if (!normalizedPhone) throw new Error('This client does not have a valid phone number yet.')

  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  const popup = window.open(`https://api.whatsapp.com/send?phone=${normalizedPhone}${query}`, '_blank', 'noopener,noreferrer')

  if (!popup) {
    throw new Error('Could not open WhatsApp. Please allow pop-ups and try again.')
  }
}

const JOB_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  pre_purchase: { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  service:      { bg: 'bg-green-50',  text: 'text-green-700'  },
  diagnosis:    { bg: 'bg-purple-50', text: 'text-purple-700' },
  repair:       { bg: 'bg-orange-50', text: 'text-orange-700' },
}
const JOB_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' },
  in_progress: { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
  completed:   { bg: 'bg-green-50',    text: 'text-green-700',   dot: 'bg-green-500'   },
}

// ── Edit Client Modal ─────────────────────────────────────────────────────────
function EditModal({ client, onClose, onSaved }: { client: Client; onClose: () => void; onSaved: (c: Client) => void }) {
  const [form, setForm] = useState({
    first_name: client.first_name || '',
    last_name:  client.last_name  || '',
    phone:      client.phone      || '',
    email:      client.email      || '',
    address:    client.address    || '',
    suburb:     client.suburb     || '',
    postcode:   client.postcode   || '',
    state:      client.state      || NSW_STATE,
    notes:      client.notes      || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) { setForm(prev => ({ ...prev, [field]: val })) }
  function setSuburb(suburb: string) {
    const postcode = getPostcodeForSuburb(suburb)
    setForm(prev => ({
      ...prev,
      suburb,
      postcode: postcode || prev.postcode,
    }))
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.from('clients')
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        suburb: form.suburb || null,
        state: normalizeNswState(),
        postcode: form.postcode.trim() || null,
        notes: form.notes.trim(),
      })
      .eq('id', client.id).select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Client)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="font-semibold text-neutral-900">Edit client</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">First name <span className="text-red-400">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} autoFocus
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Last name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
	            <div>
	              <label className="text-xs font-medium text-neutral-500 mb-1 block">Suburb</label>
	              <input list="nsw-suburbs-edit-client" value={form.suburb} onChange={e => setSuburb(e.target.value)} placeholder="e.g. Croydon Park"
	                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
              <datalist id="nsw-suburbs-edit-client">
                {NSW_SUBURB_SUGGESTIONS.map(suburb => (
                  <option key={suburb} value={suburb} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Postcode</label>
              <input value={form.postcode} onChange={e => set('postcode', e.target.value)} inputMode="numeric" placeholder="2133"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">State</label>
            <input value={form.state} readOnly
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 bg-neutral-100 text-neutral-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 resize-none" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 text-sm py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Vehicle Modal ─────────────────────────────────────────────────────────
function AddVehicleModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: (v: Vehicle) => void }) {
  const [form, setForm] = useState({ make: '', model: '', year: '', colour: '', plate: '', odometer_km: '', vin: '', engine: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const modelOptions = getModelsForMake(form.make)

  function set(field: string, val: string) { setForm(prev => ({ ...prev, [field]: val })) }
  function setMake(make: string) { setForm(prev => ({ ...prev, make, model: '' })) }

  async function handleSave() {
    if (!form.make.trim() || !form.model.trim()) { setError('Make and model are required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase.from('vehicles')
      .insert([{
        client_id: clientId,
        user_id: user!.id,
        company_id: userData?.active_company_id || userData?.company_id,
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year.trim(),
        colour: form.colour.trim(),
        plate: form.plate.trim().toUpperCase(),
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        vin: form.vin.trim(),
        engine: form.engine.trim(),
      }])
      .select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Vehicle)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="font-semibold text-neutral-900">Add vehicle</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>
	        <div className="px-6 py-5 space-y-4">
	          <div className="grid grid-cols-2 gap-3">
	            <div>
	              <label className="text-xs font-medium text-neutral-500 mb-1 block">Make <span className="text-red-400">*</span></label>
	              <select value={form.make} onChange={e => setMake(e.target.value)} autoFocus
	                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white">
                  <option value="">Select make</option>
                  {VEHICLE_CATALOG.map(option => (
                    <option key={option.make} value={option.make}>{option.make}</option>
                  ))}
                </select>
	            </div>
	            <div>
	              <label className="text-xs font-medium text-neutral-500 mb-1 block">Model <span className="text-red-400">*</span></label>
	              <select value={form.model} onChange={e => set('model', e.target.value)} disabled={!form.make}
	                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white disabled:opacity-50">
                  <option value="">{form.make ? 'Select model' : 'Choose make first'}</option>
                  {modelOptions.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
	            </div>
	          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Year</label>
              <input value={form.year} onChange={e => set('year', e.target.value)} placeholder="2015"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Colour</label>
              <input value={form.colour} onChange={e => set('colour', e.target.value)} placeholder="White"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Plate</label>
              <input value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="ABC123"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Odometer (km)</label>
              <input type="number" value={form.odometer_km} onChange={e => set('odometer_km', e.target.value)} placeholder="85000"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Engine</label>
              <input value={form.engine} onChange={e => set('engine', e.target.value)} placeholder="2.5L Petrol"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">VIN</label>
            <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="Optional"
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 text-sm py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Add vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Job Modal ─────────────────────────────────────────────────────────────
function NewJobModal({ clientId, vehicles, onClose, onSaved }: { clientId: string; vehicles: Vehicle[]; onClose: () => void; onSaved: (j: Job) => void }) {
  const [form, setForm] = useState({ type: '', vehicle_id: '', scheduled_at: '', odometer_km: '', location: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, val: string) { setForm(prev => ({ ...prev, [field]: val })) }

  const JOB_TYPES = [
    { key: 'pre_purchase', label: 'Pre-Purchase Inspection' },
    { key: 'service',      label: 'Service' },
    { key: 'diagnosis',    label: 'Diagnosis' },
    { key: 'repair',       label: 'Repair' },
  ]

  async function handleSave() {
    if (!form.type) { setError('Select a job type'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase.from('jobs')
      .insert([{
        client_id: clientId,
        user_id: user!.id,
        company_id: userData?.active_company_id || userData?.company_id,
        type: form.type,
        status: 'pending',
        vehicle_id: form.vehicle_id || null,
        scheduled_at: form.scheduled_at || null,
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        location: form.location.trim() || null,
      }])
      .select().single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Job)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="font-semibold text-neutral-900">New job</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-2 block">Job type <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPES.map(t => (
                <button key={t.key} onClick={() => set('type', t.key)}
                  className={`py-2.5 px-3 text-sm rounded-xl border text-left transition-colors ${form.type === t.key ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {vehicles.length > 0 && (
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Vehicle</label>
              <select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white">
                <option value="">— Select vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} {v.year} · {v.plate}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Scheduled date</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Odometer (km)</label>
              <input type="number" value={form.odometer_km} onChange={e => set('odometer_km', e.target.value)} placeholder="85000"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Bondi, NSW"
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        </div>
        <div className="flex gap-2 px-6 pb-5">
          <button onClick={onClose} className="flex-1 text-sm py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-2.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Create job'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── NPS Modal ─────────────────────────────────────────────────────────────────
function NpsModal({ clientId, current, onClose, onSaved }: {
  clientId: string
  current: ClientInteraction | null
  onClose: () => void
  onSaved: (interaction: ClientInteraction) => void
}) {
  const [score, setScore] = useState<number | null>(current?.nps_score ?? null)
  const [comment, setComment] = useState(current?.comment || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (score === null) { setError('Select a score'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase
      .from('client_interactions')
      .insert([{
        client_id: clientId,
        user_id: user?.id,
        company_id: userData?.active_company_id || userData?.company_id,
        interaction_type: 'nps',
        nps_score: score,
        comment: comment.trim() || null,
        mood: score >= 9 ? 'happy' : score >= 7 ? 'neutral' : 'angry',
      }])
      .select('id, mood, comment, created_at, nps_score')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as ClientInteraction)
  }

  const preview = getClientStatus(score)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <div className="font-semibold text-neutral-900">Update NPS</div>
            <div className="text-xs text-neutral-400 mt-0.5">How likely is this client to recommend you?</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div>
            <div className="flex justify-between text-xs text-neutral-400 mb-2">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => {
                const active = score === i
                const color = i >= 9 ? 'bg-emerald-500 text-white border-emerald-500'
                  : i >= 7 ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-red-500 text-white border-red-500'
                return (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className={`h-9 rounded-lg text-sm font-semibold border transition-colors ${active ? color : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'}`}
                  >
                    {i}
                  </button>
                )
              })}
            </div>
            {score !== null && (
              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${preview.tone}`}>
                  {preview.label}
                </span>
                <span className="text-xs text-neutral-400">{preview.summary}</span>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Feedback (optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Any comments from the client…"
              rows={3}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-neutral-400 resize-none"
            />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
        </div>
        <div className="flex gap-3 px-5 pb-5 border-t border-neutral-100 pt-3">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving || score === null}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
            {saving ? 'Saving…' : 'Save NPS'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [client, setClient]     = useState<Client | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [jobs, setJobs]         = useState<Job[]>([])
  const [latestNps, setLatestNps] = useState<ClientInteraction | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showEdit, setShowEdit]         = useState(false)
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showNewJob, setShowNewJob]     = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showNps, setShowNps] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showWhatsAppMenu, setShowWhatsAppMenu] = useState(false)
  const [whatsAppError, setWhatsAppError] = useState('')
  const whatsAppMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('vehicles').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('jobs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase
        .from('client_interactions')
        .select('id, mood, comment, created_at, nps_score')
        .eq('client_id', id)
        .eq('interaction_type', 'nps')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([{ data: c }, { data: v }, { data: j }, { data: nps }]) => {
      setClient(c as Client)
      setVehicles((v as Vehicle[]) || [])
      setJobs((j as Job[]) || [])
      setLatestNps((nps as ClientInteraction | null) || null)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (whatsAppMenuRef.current && !whatsAppMenuRef.current.contains(event.target as Node)) {
        setShowWhatsAppMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!client) return <div className="p-6 text-sm text-neutral-400">Client not found.</div>

  const currentClient = client
  const clientStatus = getClientStatus(latestNps?.nps_score ?? null)
  const cannotDeleteClient = vehicles.length > 0 || jobs.length > 0

  async function handleDelete() {
    if (cannotDeleteClient) {
      setDeleteError('Remove this client\'s vehicles and jobs before deleting the client.')
      return
    }

    setDeleting(true)
    setDeleteError('')
    const supabase = createClient()

    const { error: interactionError } = await supabase
      .from('client_interactions')
      .delete()
      .eq('client_id', id)

    if (interactionError) {
      setDeleteError(interactionError.message)
      setDeleting(false)
      return
    }

    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
      setDeleteError(error.message)
      setDeleting(false)
      return
    }

    router.push('/clients')
  }

  function handleRequestGoogleReview() {
    try {
      const message = `Hi ${currentClient.first_name}, if you have a minute, we’d really appreciate a quick Google review: ${GOOGLE_REVIEW_LINK}`
      openWhatsApp(currentClient.phone, message)
      setWhatsAppError('')
      setShowWhatsAppMenu(false)
    } catch (error) {
      setWhatsAppError(error instanceof Error ? error.message : 'Could not open WhatsApp.')
    }
  }

  function handleOpenFreeWhatsApp() {
    try {
      openWhatsApp(currentClient.phone)
      setWhatsAppError('')
      setShowWhatsAppMenu(false)
    } catch (error) {
      setWhatsAppError(error instanceof Error ? error.message : 'Could not open WhatsApp.')
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      {showEdit       && <EditModal client={client} onClose={() => setShowEdit(false)} onSaved={c => { setClient(c); setShowEdit(false) }} />}
      {showAddVehicle && <AddVehicleModal clientId={id} onClose={() => setShowAddVehicle(false)} onSaved={v => { setVehicles(prev => [v, ...prev]); setShowAddVehicle(false) }} />}
      {showNewJob     && <NewJobModal clientId={id} vehicles={vehicles} onClose={() => setShowNewJob(false)} onSaved={j => { setJobs(prev => [j, ...prev]); setShowNewJob(false) }} />}
      {showNps        && <NpsModal clientId={id} current={latestNps} onClose={() => setShowNps(false)} onSaved={nps => { setLatestNps(nps); setShowNps(false) }} />}

	      {/* Header */}
	      <div className="flex items-center justify-between mb-6">
	        <button onClick={() => router.push('/clients')} className="text-sm text-neutral-500 hover:text-neutral-700">← Back to clients</button>
          <div className="flex items-center gap-2">
	        <button onClick={() => setShowEdit(true)} className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Edit</button>
            <button onClick={() => { setDeleteError(''); setShowDelete(true) }} className="text-sm px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600">Delete</button>
          </div>
	      </div>

      {/* Client card */}
	      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
	        <div className="bg-neutral-900 px-6 py-5 flex items-center justify-between">
	          <div>
	            <div className="text-xl font-bold text-white">{fullName(client)}</div>
	            <div className="text-xs text-neutral-400 mt-1">
	              Client since {new Date(client.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
	            </div>
              <div className="mt-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${clientStatus.tone}`}>
                  {clientStatus.label}
                </span>
              </div>
	          </div>
	          <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-white text-lg font-semibold">
	            {client.first_name?.[0]}{client.last_name?.[0]}
	          </div>
	        </div>
        <div className="grid grid-cols-2 divide-x divide-neutral-100">
          <div className="p-5 space-y-3">
            <div>
              <div className="text-xs text-neutral-400 mb-0.5">Phone</div>
              <div className="relative inline-flex items-center gap-2" ref={whatsAppMenuRef}>
                <div className="text-sm font-medium text-neutral-900">{client.phone || '—'}</div>
                <button
                  onClick={() => {
                    setWhatsAppError('')
                    setShowWhatsAppMenu(prev => !prev)
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                  aria-label="Open WhatsApp options"
                  title="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M12.04 2C6.55 2 2.1 6.45 2.1 11.94c0 1.76.46 3.48 1.33 4.99L2 22l5.22-1.37a9.9 9.9 0 0 0 4.82 1.23h.01c5.49 0 9.95-4.45 9.95-9.94A9.95 9.95 0 0 0 12.04 2Zm5.79 14.08c-.24.68-1.42 1.3-1.95 1.39-.5.08-1.12.11-1.81-.12-.42-.14-.96-.31-1.66-.61-2.91-1.26-4.8-4.2-4.94-4.4-.14-.2-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36s.38 0 .55.01c.18.01.42-.07.65.49.24.59.81 2.04.88 2.18.07.14.12.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.35-.42.47-.14.14-.28.29-.12.57.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.23.64-.14.26.09 1.66.78 1.94.92.28.14.47.21.54.33.07.12.07.69-.17 1.37Z" />
                  </svg>
                </button>
                {showWhatsAppMenu && (
                  <div className="absolute left-full top-1/2 z-20 ml-2 w-64 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden">
                    <button
                      onClick={handleRequestGoogleReview}
                      className="w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                    >
                      Request Google review
                    </button>
                    <button
                      onClick={handleOpenFreeWhatsApp}
                      className="w-full px-4 py-3 text-left text-sm text-neutral-700 hover:bg-neutral-50 border-t border-neutral-100"
                    >
                      Open free WhatsApp chat
                    </button>
                  </div>
                )}
              </div>
              {whatsAppError && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-w-md">
                  {whatsAppError}
                </div>
              )}
            </div>
            {[{ label: 'Email', value: client.email }, { label: 'Address', value: client.address }, { label: 'Location', value: formatClientLocation(client.suburb, client.state, client.postcode) }].map(row => (
              <div key={row.label}>
                <div className="text-xs text-neutral-400 mb-0.5">{row.label}</div>
                <div className="text-sm font-medium text-neutral-900">{row.value || '—'}</div>
              </div>
            ))}
          </div>
          <div className="p-5">
            <div className="text-xs text-neutral-400 mb-0.5">Notes</div>
            <div className="text-sm text-neutral-700 leading-relaxed">{client.notes || '—'}</div>
          </div>
        </div>
	      </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Customer sentiment</div>
              <div className="text-xs text-neutral-400 mt-0.5">{clientStatus.summary}</div>
            </div>
            <button onClick={() => setShowNps(true)} className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">
              Update NPS
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
            <div className="p-5">
              <div className="text-xs text-neutral-400 mb-1">Latest NPS</div>
              <div className="text-2xl font-semibold text-neutral-900">{latestNps?.nps_score ?? '—'}</div>
            </div>
            <div className="p-5">
              <div className="text-xs text-neutral-400 mb-1">Status</div>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${clientStatus.tone}`}>
                {clientStatus.label}
              </span>
            </div>
            <div className="p-5">
              <div className="text-xs text-neutral-400 mb-1">Updated</div>
              <div className="text-sm text-neutral-700">
                {latestNps?.created_at
                  ? new Date(latestNps.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-neutral-100">
            <div className="text-xs text-neutral-400 mb-1">Latest feedback</div>
            <div className="text-sm text-neutral-700 leading-relaxed">{latestNps?.comment || 'No feedback recorded yet.'}</div>
          </div>
        </div>

	      {/* Vehicles */}
	      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-900">Vehicles ({vehicles.length})</span>
          <button onClick={() => setShowAddVehicle(true)} className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">+ Add vehicle</button>
        </div>
        {vehicles.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-neutral-400">No vehicles yet</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-neutral-900">{v.make} {v.model} {v.year}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {[v.plate, v.colour, v.engine].filter(Boolean).join(' · ')}
                    {v.odometer_km ? ` · ${v.odometer_km.toLocaleString()} km` : ''}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-neutral-100 text-neutral-600 rounded font-mono">{v.plate || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

	      {/* Jobs */}
	      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-900">Job history ({jobs.length})</span>
          <button onClick={() => setShowNewJob(true)} className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">+ New job</button>
        </div>
        {jobs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-neutral-400">No jobs yet</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {jobs.map(j => {
              const ts = JOB_TYPE_STYLES[j.type]  || { bg: 'bg-neutral-100', text: 'text-neutral-600' }
              const ss = JOB_STATUS_STYLES[j.status] || { bg: 'bg-neutral-100', text: 'text-neutral-500', dot: 'bg-neutral-400' }
              return (
                <div key={j.id} onClick={() => router.push(`/jobs/${j.id}`)}
                  className="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ts.bg} ${ts.text}`}>
                      {j.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {j.scheduled_at ? new Date(j.scheduled_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${ss.bg} ${ss.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                    {j.status.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        )}
	      </div>

        {showDelete && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lg">⚠️</div>
              <h2 className="text-base font-semibold text-neutral-900 mb-2">Delete this client?</h2>
              <p className="text-sm text-neutral-500 mb-4">
                {cannotDeleteClient
                  ? 'This client still has vehicles or jobs linked to it.'
                  : 'This action cannot be undone.'}
              </p>
              {deleteError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 text-left">{deleteError}</div>}
              {cannotDeleteClient && (
                <div className="text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 mb-4 text-left">
                  Vehicles: {vehicles.length} · Jobs: {jobs.length}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowDelete(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Cancel</button>
                <button onClick={handleDelete} disabled={deleting || cannotDeleteClient} className="flex-1 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )}
	    </div>
  )
}
