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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            <div className="font-semibold text-neutral-900">New vehicle</div>
            <div className="text-xs text-neutral-400 mt-0.5">Add a vehicle to your database</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-2xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* Make + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Make <span className="text-red-400">*</span></label>
              <input value={form.make} onChange={e => set('make', e.target.value)} placeholder="Toyota"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Model <span className="text-red-400">*</span></label>
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="RAV4"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>

          {/* Year + Colour */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Year</label>
              <input value={form.year} onChange={e => set('year', e.target.value)} placeholder="2015"
                inputMode="numeric"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Colour</label>
              <input value={form.colour} onChange={e => set('colour', e.target.value)} placeholder="White"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>

          {/* Plate + Odometer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Plate</label>
              <input value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="ABC123"
                autoCapitalize="characters"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50 uppercase" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Odometer (km)</label>
              <input type="number" inputMode="numeric" value={form.odometer_km} onChange={e => set('odometer_km', e.target.value)} placeholder="85000"
                className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">Owner <span className="text-neutral-300">(optional)</span></label>
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50">
              <option value="">No owner assigned</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          {/* VIN (optional, collapsed) */}
          <div>
            <label className="text-xs font-medium text-neutral-500 mb-1.5 block">VIN <span className="text-neutral-300">(optional)</span></label>
            <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="Optional"
              className="w-full text-base border border-neutral-200 rounded-xl px-3 py-3 focus:outline-none focus:border-neutral-400 bg-neutral-50" />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5 pt-3 border-t border-neutral-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 text-sm py-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-sm py-3 bg-neutral-900 text-white rounded-xl hover:bg-neutral-700 disabled:opacity-50 font-medium">
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
    <div className="p-4 md:p-6">
      {showNew && <NewVehicleModal onClose={() => setShowNew(false)} onSaved={v => { setVehicles(prev => [v, ...prev]); setShowNew(false) }} />}

      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Vehicles</h1>
          <p className="text-sm text-neutral-500 mt-1">{loading ? '…' : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-700 transition-colors">
          + New vehicle
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search make, model, plate, owner…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-400"
        />
        <span className="absolute left-3 top-2.5 text-neutral-400 text-sm">🔍</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Vehicle</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Plate</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Owner</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3">Odometer</th>
              <th className="text-left text-xs font-medium text-neutral-500 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">
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
                <td className="px-4 py-3">
                  <button onClick={e => { e.stopPropagation(); router.push(`/vehicles/${v.id}`) }}
                    className="text-xs px-3 py-1 border border-neutral-200 rounded-lg hover:bg-neutral-50">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-400">
            {search ? 'No vehicles match your search' : 'No vehicles yet — add your first one'}
          </div>
        ) : filtered.map(v => (
          <div key={v.id} onClick={() => router.push(`/vehicles/${v.id}`)}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 last:border-0 cursor-pointer active:bg-neutral-50">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-neutral-900 text-sm">{v.make} {v.model} {v.year}</div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {v.plate && <span className="font-mono text-xs px-1.5 py-0.5 bg-neutral-100 rounded">{v.plate}</span>}
                {v.clients && <span className="text-xs text-neutral-500">{v.clients.first_name} {v.clients.last_name}</span>}
                {!v.clients && <span className="text-xs text-neutral-400">No owner</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {v.odometer_km ? <span className="text-xs text-neutral-500">{v.odometer_km.toLocaleString()} km</span> : null}
              <span className="text-neutral-300 text-sm">›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
