'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import { LOCATION_OPTIONS, formatClientLocation, getStateForCity, getSuburbsForCity } from '../../../lib/reference-data/locations'
import { VEHICLE_CATALOG, getModelsForMake } from '../../../lib/reference-data/vehicles'

type Client = {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  address: string
  suburb?: string | null
  city?: string | null
  state?: string | null
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
    city:       client.city       || '',
    state:      client.state      || '',
    notes:      client.notes      || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const suburbOptions = getSuburbsForCity(form.city)

  function set(field: string, val: string) { setForm(prev => ({ ...prev, [field]: val })) }
  function setCity(city: string) { setForm(prev => ({ ...prev, city, state: getStateForCity(city), suburb: '' })) }

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
        city: form.city || null,
        state: form.state || null,
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
              <label className="text-xs font-medium text-neutral-500 mb-1 block">City</label>
              <select value={form.city} onChange={e => setCity(e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white">
                <option value="">Select city</option>
                {LOCATION_OPTIONS.map(option => (
                  <option key={option.city} value={option.city}>{option.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Suburb</label>
              <select value={form.suburb} onChange={e => set('suburb', e.target.value)} disabled={!form.city}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white disabled:opacity-50">
                <option value="">{form.city ? 'Select suburb' : 'Choose city first'}</option>
                {suburbOptions.map(suburb => (
                  <option key={suburb} value={suburb}>{suburb}</option>
                ))}
              </select>
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

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!client) return <div className="p-6 text-sm text-neutral-400">Client not found.</div>

  const clientStatus = getClientStatus(latestNps?.nps_score ?? null)

  return (
    <div className="p-6 max-w-3xl">
      {showEdit       && <EditModal client={client} onClose={() => setShowEdit(false)} onSaved={c => { setClient(c); setShowEdit(false) }} />}
      {showAddVehicle && <AddVehicleModal clientId={id} onClose={() => setShowAddVehicle(false)} onSaved={v => { setVehicles(prev => [v, ...prev]); setShowAddVehicle(false) }} />}
      {showNewJob     && <NewJobModal clientId={id} vehicles={vehicles} onClose={() => setShowNewJob(false)} onSaved={j => { setJobs(prev => [j, ...prev]); setShowNewJob(false) }} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/clients')} className="text-sm text-neutral-500 hover:text-neutral-700">← Back to clients</button>
        <button onClick={() => setShowEdit(true)} className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Edit</button>
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
            {[{ label: 'Phone', value: client.phone }, { label: 'Email', value: client.email }, { label: 'Address', value: client.address }, { label: 'Location', value: formatClientLocation(client.city, client.suburb, client.state) }].map(row => (
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
          <div className="px-5 py-3 border-b border-neutral-100">
            <div className="text-sm font-semibold text-neutral-900">Customer sentiment</div>
            <div className="text-xs text-neutral-400 mt-0.5">{clientStatus.summary}</div>
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
    </div>
  )
}
