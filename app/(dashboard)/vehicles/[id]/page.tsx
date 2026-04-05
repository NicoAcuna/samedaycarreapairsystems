'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'

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
  client_id: string
  created_at: string
  clients?: { id: string; first_name: string; last_name: string }
}

type Job = {
  id: string
  type: string
  status: string
  scheduled_at: string
  odometer_km: number
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

function EditModal({ vehicle, onClose, onSaved }: { vehicle: Vehicle; onClose: () => void; onSaved: (v: Vehicle) => void }) {
  const [form, setForm] = useState({
    make:        vehicle.make        ? String(vehicle.make)        : '',
    model:       vehicle.model       ? String(vehicle.model)       : '',
    year:        vehicle.year        ? String(vehicle.year)        : '',
    colour:      vehicle.colour      ? String(vehicle.colour)      : '',
    plate:       vehicle.plate       ? String(vehicle.plate)       : '',
    odometer_km: vehicle.odometer_km ? String(vehicle.odometer_km) : '',
    engine:      vehicle.engine      ? String(vehicle.engine)      : '',
    vin:         vehicle.vin         ? String(vehicle.vin)         : '',
    client_id:   vehicle.client_id   ? String(vehicle.client_id)   : '',
  })
  const [clients, setClients] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('id, first_name, last_name').order('first_name')
      .then(({ data }) => setClients(data || []))
  }, [])

  function set(field: string, val: string) { setForm(prev => ({ ...prev, [field]: val })) }

  async function handleSave() {
    if (!form.make.trim() || !form.model.trim()) { setError('Make and model are required'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.from('vehicles')
      .update({
        make:        form.make.trim(),
        model:       form.model.trim(),
        year:        form.year.trim(),
        colour:      form.colour.trim(),
        plate:       form.plate.trim().toUpperCase(),
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        engine:      form.engine.trim(),
        vin:         form.vin.trim(),
        client_id:   form.client_id || null,
      })
      .eq('id', vehicle.id)
      .select('*, clients(id, first_name, last_name)')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Vehicle)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div className="font-semibold text-neutral-900">Edit vehicle</div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Make <span className="text-red-400">*</span></label>
              <input value={form.make} onChange={e => set('make', e.target.value)} autoFocus
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Model <span className="text-red-400">*</span></label>
              <input value={form.model} onChange={e => set('model', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Year</label>
              <input value={form.year} onChange={e => set('year', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Colour</label>
              <input value={form.colour} onChange={e => set('colour', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Plate</label>
              <input value={form.plate} onChange={e => set('plate', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Odometer (km)</label>
              <input type="number" value={form.odometer_km} onChange={e => set('odometer_km', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Engine</label>
              <input value={form.engine} onChange={e => set('engine', e.target.value)}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">VIN</label>
            <input value={form.vin} onChange={e => set('vin', e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1 block">Owner (client)</label>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400 bg-white">
              <option value="">— No client assigned —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
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

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [jobs, setJobs]       = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('vehicles').select('*, clients(id, first_name, last_name)').eq('id', id).single(),
      supabase.from('jobs').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: v }, { data: j }]) => {
      setVehicle(v as Vehicle)
      setJobs((j as Job[]) || [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!vehicle) return <div className="p-6 text-sm text-neutral-400">Vehicle not found.</div>

  const details = [
    { label: 'Make',       value: vehicle.make },
    { label: 'Model',      value: vehicle.model },
    { label: 'Year',       value: vehicle.year },
    { label: 'Colour',     value: vehicle.colour },
    { label: 'Plate',      value: vehicle.plate },
    { label: 'Engine',     value: vehicle.engine },
    { label: 'Odometer',   value: vehicle.odometer_km ? `${vehicle.odometer_km.toLocaleString()} km` : null },
    { label: 'VIN',        value: vehicle.vin },
  ]

  return (
    <div className="p-6 max-w-3xl">
      {showEdit && <EditModal vehicle={vehicle} onClose={() => setShowEdit(false)} onSaved={v => { setVehicle(v); setShowEdit(false) }} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/vehicles')} className="text-sm text-neutral-500 hover:text-neutral-700">← Back to vehicles</button>
        <button onClick={() => setShowEdit(true)} className="text-sm px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600">Edit</button>
      </div>

      {/* Vehicle card */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
        <div className="bg-neutral-900 px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-white">{vehicle.make} {vehicle.model} {vehicle.year}</div>
            <div className="text-xs text-neutral-400 mt-1 flex items-center gap-3">
              {vehicle.plate && <span className="font-mono bg-neutral-800 px-2 py-0.5 rounded">{vehicle.plate}</span>}
              {vehicle.colour && <span>{vehicle.colour}</span>}
            </div>
          </div>
          {vehicle.clients && (
            <button onClick={() => router.push(`/clients/${vehicle.clients!.id}`)}
              className="text-right hover:opacity-80">
              <div className="text-xs text-neutral-400 mb-1">Owner</div>
              <div className="text-sm font-medium text-white">{vehicle.clients.first_name} {vehicle.clients.last_name}</div>
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 divide-x divide-neutral-100 border-t border-neutral-100">
          {details.filter(d => d.value).map(d => (
            <div key={d.label} className="p-4">
              <div className="text-xs text-neutral-400 mb-0.5">{d.label}</div>
              <div className="text-sm font-medium text-neutral-900">{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Job history */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <span className="text-sm font-semibold text-neutral-900">Job history ({jobs.length})</span>
        </div>
        {jobs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-neutral-400">No jobs for this vehicle yet</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {jobs.map(j => {
              const ts = JOB_TYPE_STYLES[j.type]    || { bg: 'bg-neutral-100', text: 'text-neutral-600' }
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
                    {j.odometer_km && <span className="text-xs text-neutral-400">{j.odometer_km.toLocaleString()} km</span>}
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
