'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'

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
  clients?: { first_name: string; last_name: string }
}

function NewVehicleModal({ onClose, onSaved }: { onClose: () => void; onSaved: (v: Vehicle) => void }) {
  const [form, setForm] = useState({ make: '', model: '', year: '', colour: '', plate: '', odometer_km: '', vin: '', engine: '', client_id: '' })
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
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase.from('vehicles')
      .insert([{
        user_id: user!.id,
        company_id: userData?.company_id,
        client_id: form.client_id || null,
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year.trim(),
        colour: form.colour.trim(),
        plate: form.plate.trim().toUpperCase(),
        odometer_km: form.odometer_km ? Number(form.odometer_km) : null,
        vin: form.vin.trim(),
        engine: form.engine.trim(),
      }])
      .select('*, clients(first_name, last_name)')
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Vehicle)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <div className="font-semibold text-neutral-900">New vehicle</div>
            <div className="text-xs text-neutral-400 mt-0.5">Add a vehicle to your database</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Make <span className="text-red-400">*</span></label>
              <input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Toyota" autoFocus
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1 block">Model <span className="text-red-400">*</span></label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="RAV4"
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-neutral-400" />
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
            {saving ? 'Saving…' : 'Add vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('vehicles').select('*, clients(first_name, last_name)').order('created_at', { ascending: false })
      .then(({ data }) => { setVehicles((data as Vehicle[]) || []); setLoading(false) })
  }, [])

  const filtered = vehicles.filter(v =>
    [v.make, v.model, v.year, v.plate, v.clients?.first_name, v.clients?.last_name]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6">
      {showNew && <NewVehicleModal onClose={() => setShowNew(false)} onSaved={v => { setVehicles(prev => [v, ...prev]); setShowNew(false) }} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Vehicles</h1>
          <p className="text-sm text-neutral-500 mt-1">{loading ? '…' : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New vehicle
        </button>
      </div>

      <div className="relative mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by make, model, plate or owner..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Vehicle</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Plate</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Owner</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Odometer</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Engine</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">
                {search ? 'No vehicles match your search' : 'No vehicles yet — add your first one'}
              </td></tr>
            ) : filtered.map(v => (
              <tr key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{v.make} {v.model}</div>
                  <div className="text-xs text-neutral-400">{[v.year, v.colour].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs px-2 py-1 bg-neutral-100 rounded">{v.plate || '—'}</span>
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {v.clients ? `${v.clients.first_name} ${v.clients.last_name}` : '—'}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {v.odometer_km ? `${v.odometer_km.toLocaleString()} km` : '—'}
                </td>
                <td className="px-4 py-3 text-neutral-500">{v.engine || '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); router.push(`/vehicles/${v.id}`) }}
                    className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
