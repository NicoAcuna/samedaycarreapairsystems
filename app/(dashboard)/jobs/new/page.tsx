'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/client'
import { NSW_STATE, NSW_SUBURB_SUGGESTIONS, getPostcodeForSuburb, normalizeNswState } from '../../../lib/reference-data/locations'
import { VEHICLE_CATALOG, getModelsForMake } from '../../../lib/reference-data/vehicles'

type Client = { id: string; first_name: string; last_name: string; phone: string; email: string }
type Vehicle = { id: string; make: string; model: string; year: string; plate: string; odometer_km: number | null; client_id: string | null; clients?: { first_name: string; last_name: string } | null }

const JOB_TYPES = [
  { key: 'pre_purchase', label: 'Pre-Purchase', desc: 'Full vehicle inspection' },
  { key: 'service',      label: 'Service',      desc: 'Oil change & maintenance' },
  { key: 'diagnosis',    label: 'Diagnosis',    desc: 'Find & report the issue' },
  { key: 'repair',       label: 'Repair',       desc: 'Fix a known issue' },
]

const SERVICE_SUBTYPES = [
  { key: 'Minor Service',     desc: 'Oil + oil filter' },
  { key: 'Major Service',     desc: 'Oil + filters + extras' },
  { key: 'Brake fluid flush', desc: 'Full system flush' },
  { key: 'Coolant flush',     desc: 'Coolant replacement' },
  { key: 'Spark plugs',       desc: 'Plugs replacement' },
  { key: 'Custom',            desc: 'Define manually' },
]

function fullName(c: Client) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ')
}

function NewJobPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedType = searchParams.get('type') || ''

  const [step, setStep] = useState(1)

  // Clients
  const [allClients, setAllClients] = useState<Client[]>([])
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [loadingVehicles, setLoadingVehicles] = useState(false)

  // Job type
  const [selectedType, setSelectedType] = useState(preselectedType)
  const [selectedServiceSubtype, setSelectedServiceSubtype] = useState('')

  // Modals
  const [showNewClient, setShowNewClient] = useState(false)
  const [showNewVehicle, setShowNewVehicle] = useState(false)

  // New client form
  const [newClientForm, setNewClientForm] = useState({ first_name: '', last_name: '', phone: '', email: '', address: '', suburb: '', postcode: '', state: NSW_STATE })
  const [savingClient, setSavingClient] = useState(false)
  const [clientError, setClientError] = useState('')

  // New vehicle form
  const [newVehicleForm, setNewVehicleForm] = useState({ make: '', model: '', year: '', plate: '', odometer_km: '', colour: '', vin: '' })
  const [savingVehicle, setSavingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const modelOptions = getModelsForMake(newVehicleForm.make)

  // Load all clients on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.from('clients').select('id, first_name, last_name, phone, email').order('first_name')
      .then(({ data }) => setAllClients((data as Client[]) || []))
  }, [])

  // Load ALL vehicles when client is selected (not just their own)
  useEffect(() => {
    if (!selectedClient) return
    const supabase = createClient()
    supabase.from('vehicles')
      .select('id, make, model, year, plate, odometer_km, client_id, clients(first_name, last_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVehicles((data as unknown as Vehicle[]) || [])
        setLoadingVehicles(false)
      })
  }, [selectedClient])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredClients = clientQuery.length >= 2
    ? allClients.filter(c =>
        fullName(c).toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.phone?.includes(clientQuery) ||
        c.email?.toLowerCase().includes(clientQuery.toLowerCase())
      )
    : []

  const filteredVehicles = vehicleQuery.length >= 1
    ? vehicles.filter(v =>
        v.plate?.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        v.make?.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        v.model?.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        String(v.year || '').includes(vehicleQuery) ||
        `${v.make} ${v.model}`.toLowerCase().includes(vehicleQuery.toLowerCase())
      )
    : vehicles

  function selectClient(client: Client) {
    setLoadingVehicles(true)
    setSelectedClient(client)
    setClientQuery(fullName(client))
    setShowClientDropdown(false)
    setVehicles([])
    setSelectedVehicle(null)
    setVehicleQuery('')
    setStep(2)
  }

  async function selectVehicle(vehicle: Vehicle) {
    setSelectedVehicle(vehicle)
    setStep(3)
    // If vehicle isn't linked to this client yet, associate it now
    if (selectedClient && vehicle.client_id !== selectedClient.id) {
      const supabase = createClient()
      await supabase.from('vehicles').update({ client_id: selectedClient.id }).eq('id', vehicle.id)
      // Update local state to reflect new owner
      setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, client_id: selectedClient.id } : v))
    }
  }

  async function handleSaveNewClient() {
    if (!newClientForm.first_name.trim()) { setClientError('First name is required'); return }
    setSavingClient(true); setClientError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase.from('clients').insert([{
      user_id: user!.id,
      company_id: userData?.active_company_id || userData?.company_id,
      first_name: newClientForm.first_name.trim(),
      last_name: newClientForm.last_name.trim(),
      phone: newClientForm.phone.trim(),
      email: newClientForm.email.trim(),
      address: newClientForm.address.trim(),
      suburb: newClientForm.suburb.trim() || null,
      postcode: newClientForm.postcode.trim() || null,
      state: normalizeNswState(),
    }]).select('id, first_name, last_name, phone, email').single()
    setSavingClient(false)
    if (err) { setClientError(err.message); return }
    const newClient = data as Client
    setAllClients(prev => [newClient, ...prev])
    selectClient(newClient)
    setShowNewClient(false)
    setNewClientForm({ first_name: '', last_name: '', phone: '', email: '', address: '', suburb: '', postcode: '', state: NSW_STATE })
  }

  async function handleSaveNewVehicle() {
    if (!newVehicleForm.make.trim() || !newVehicleForm.model.trim()) { setVehicleError('Make and model are required'); return }
    if (!selectedClient) return
    setSavingVehicle(true); setVehicleError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('active_company_id, company_id').eq('id', user!.id).single()
    const { data, error: err } = await supabase.from('vehicles').insert([{
      user_id: user!.id,
      company_id: userData?.active_company_id || userData?.company_id,
      client_id: selectedClient.id,
      make: newVehicleForm.make.trim(),
      model: newVehicleForm.model.trim(),
      year: newVehicleForm.year.trim(),
      plate: newVehicleForm.plate.trim().toUpperCase(),
      odometer_km: newVehicleForm.odometer_km ? Number(newVehicleForm.odometer_km) : null,
      colour: newVehicleForm.colour.trim(),
      vin: newVehicleForm.vin.trim(),
    }]).select('id, make, model, year, plate, odometer_km').single()
    setSavingVehicle(false)
    if (err) { setVehicleError(err.message); return }
    const newVehicle = data as Vehicle
    setVehicles(prev => [newVehicle, ...prev])
    setSelectedVehicle(newVehicle)
    setShowNewVehicle(false)
    setNewVehicleForm({ make: '', model: '', year: '', plate: '', odometer_km: '', colour: '', vin: '' })
    setStep(3)
  }

  function handleStartJob() {
    if (!selectedClient || !selectedVehicle || !selectedType) return
    const subtype = selectedType === 'service' && selectedServiceSubtype
      ? `&subtype=${encodeURIComponent(selectedServiceSubtype)}`
      : ''
    router.push(`/jobs/new/${selectedType}?client=${selectedClient.id}&vehicle=${selectedVehicle.id}${subtype}&fresh=1`)
  }

  function setNcf(field: string, val: string) { setNewClientForm(prev => ({ ...prev, [field]: val })) }
  function setNvf(field: string, val: string) { setNewVehicleForm(prev => ({ ...prev, [field]: val })) }
  function setVehicleMake(make: string) { setNewVehicleForm(prev => ({ ...prev, make, model: '' })) }
  function setClientSuburb(suburb: string) {
    const postcode = getPostcodeForSuburb(suburb)
    setNewClientForm(prev => ({
      ...prev,
      suburb,
      postcode: postcode || prev.postcode,
    }))
  }

  return (
    <div className="p-6 max-w-xl">
      <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-700 mb-6 flex items-center gap-1">
        ← Back
      </button>

      <h1 className="text-xl font-semibold text-neutral-900 mb-1">New job</h1>
      <p className="text-sm text-neutral-500 mb-6">Select a client, vehicle and job type</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['Client', 'Vehicle', 'Job type'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-neutral-900 text-white' :
                'bg-neutral-100 text-neutral-400'
              }`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${step === i + 1 ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>{label}</span>
            </div>
            {i < 2 && <div className="w-8 h-px bg-neutral-200" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Client */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Client</div>

        {selectedClient ? (
          <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
            <div>
              <div className="text-sm font-medium text-neutral-900">{fullName(selectedClient)}</div>
              <div className="text-xs text-neutral-500">{selectedClient.phone}</div>
            </div>
	            <button
	              onClick={() => { setSelectedClient(null); setClientQuery(''); setVehicles([]); setLoadingVehicles(false); setSelectedVehicle(null); setStep(1) }}
	              className="text-xs text-neutral-400 hover:text-neutral-600 underline"
	            >
              Change
            </button>
          </div>
        ) : (
          <div ref={clientRef} className="relative">
            <input
              type="text"
              value={clientQuery}
              onChange={(e) => { setClientQuery(e.target.value); setShowClientDropdown(true) }}
              onFocus={() => setShowClientDropdown(true)}
              placeholder="Search by name, phone or email..."
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 focus:bg-white"
            />
            {clientQuery.length > 0 && clientQuery.length < 2 && (
              <div className="mt-1 text-xs text-neutral-400">Type 1 more character to search…</div>
            )}
            {showClientDropdown && clientQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {filteredClients.length > 0 ? (
                  <>
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => selectClient(client)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 text-left"
                      >
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{fullName(client)}</div>
                          <div className="text-xs text-neutral-500">{client.phone} · {client.email}</div>
                        </div>
                        <span className="text-xs text-blue-600 font-medium">Select</span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setShowClientDropdown(false); setShowNewClient(true) }}
                      className="w-full px-4 py-3 text-left text-xs text-blue-600 font-medium hover:bg-blue-50 border-t border-neutral-100"
                    >
                      + Create new client
                    </button>
                  </>
	                ) : (
	                  <div className="px-4 py-4">
	                    <div className="text-sm text-neutral-500 mb-3">No clients found for &ldquo;{clientQuery}&rdquo;</div>
	                    <button
	                      onClick={() => { setShowClientDropdown(false); setShowNewClient(true) }}
	                      className="w-full py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700"
                    >
                      + Create new client
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2 — Vehicle */}
      {step >= 2 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Vehicle</div>

          {selectedVehicle ? (
            <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-medium text-neutral-900">{selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</div>
                <div className="text-xs text-neutral-500">
                  {selectedVehicle.plate}
                  {selectedVehicle.odometer_km ? ` · ${selectedVehicle.odometer_km.toLocaleString()} km` : ''}
                </div>
              </div>
              <button onClick={() => { setSelectedVehicle(null); setStep(2) }} className="text-xs text-neutral-400 hover:text-neutral-600 underline">Change</button>
            </div>
          ) : loadingVehicles ? (
            <div className="text-sm text-neutral-400 py-2">Loading vehicles…</div>
          ) : vehicles.length > 0 ? (
            <div className="space-y-2">
	              <input
	                type="text"
	                value={vehicleQuery}
                onChange={(e) => setVehicleQuery(e.target.value)}
                placeholder="Search by plate, make, model or year..."
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 focus:bg-white mb-2"
              />
	              {filteredVehicles.length === 0 && vehicleQuery.length > 0 ? (
	                <div className="text-sm text-neutral-500 text-center py-3">No vehicles found for &ldquo;{vehicleQuery}&rdquo;</div>
	              ) : null}
              {filteredVehicles.map((v) => {
                const isOwn = v.client_id === selectedClient?.id
                const ownerName = v.clients ? `${v.clients.first_name} ${v.clients.last_name}` : null
                return (
                  <button
                    key={v.id}
                    onClick={() => selectVehicle(v)}
                    className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg hover:border-neutral-400 hover:bg-neutral-50 text-left transition-colors ${isOwn ? 'border-neutral-200' : 'border-dashed border-neutral-300'}`}
                  >
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{v.make} {v.model} {v.year}</div>
                      <div className="text-xs text-neutral-500">
                        {v.plate || '—'}
                        {v.odometer_km ? ` · ${v.odometer_km.toLocaleString()} km` : ''}
                        {!isOwn && ownerName && <span className="ml-2 text-amber-600">· owner: {ownerName}</span>}
                        {!isOwn && !ownerName && <span className="ml-2 text-neutral-400">· unassigned</span>}
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium flex-shrink-0">{isOwn ? 'Select' : 'Select & link'}</span>
                  </button>
                )
              })}
              <button
                onClick={() => setShowNewVehicle(true)}
                className="w-full px-4 py-3 text-sm text-blue-600 font-medium border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 text-center"
              >
                + Add new vehicle
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-neutral-500 mb-3">No vehicles found. Select one or add a new one.</div>
              <button
                onClick={() => setShowNewVehicle(true)}
                className="px-5 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700"
              >
                + Add new vehicle
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Job type */}
      {step >= 3 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Job type</div>
          <div className="grid grid-cols-2 gap-3">
            {JOB_TYPES.map((jt) => (
              <button
                key={jt.key}
                onClick={() => { setSelectedType(jt.key); setSelectedServiceSubtype('') }}
                className={`p-4 border rounded-xl text-left transition-colors ${
                  selectedType === jt.key
                    ? 'border-neutral-900 bg-neutral-900'
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${selectedType === jt.key ? 'text-white' : 'text-neutral-900'}`}>{jt.label}</div>
                <div className={`text-xs ${selectedType === jt.key ? 'text-neutral-400' : 'text-neutral-500'}`}>{jt.desc}</div>
              </button>
            ))}
          </div>

          {selectedType === 'service' && (
            <div className="mt-4">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Service type</div>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_SUBTYPES.map(st => (
                  <button key={st.key}
                    onClick={() => setSelectedServiceSubtype(selectedServiceSubtype === st.key ? '' : st.key)}
                    className={`p-3 border rounded-xl text-left transition-colors ${selectedServiceSubtype === st.key ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                    <div className="text-sm font-medium text-neutral-900">{st.key}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start button */}
      {step >= 3 && selectedType && (
        <button
          onClick={handleStartJob}
          className="w-full py-3 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 transition-colors"
        >
          Start {JOB_TYPES.find(j => j.key === selectedType)?.label} job →
        </button>
      )}

      {/* New Client Modal */}
      {showNewClient && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4" onClick={() => setShowNewClient(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">New client</h2>
              <button onClick={() => setShowNewClient(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">First name <span className="text-red-400">*</span></label>
                  <input value={newClientForm.first_name} onChange={e => setNcf('first_name', e.target.value)} autoFocus placeholder="John"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Last name</label>
                  <input value={newClientForm.last_name} onChange={e => setNcf('last_name', e.target.value)} placeholder="Smith"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Phone</label>
                  <input value={newClientForm.phone} onChange={e => setNcf('phone', e.target.value)} placeholder="+61 400 000 000"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Email</label>
                  <input value={newClientForm.email} onChange={e => setNcf('email', e.target.value)} placeholder="john@email.com"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
              </div>
	              <div>
	                <label className="text-xs text-neutral-500 mb-1 block">Address (optional)</label>
	                <input value={newClientForm.address} onChange={e => setNcf('address', e.target.value)} placeholder="Street address"
	                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
	              </div>
                <div className="grid grid-cols-2 gap-3">
	                  <div>
	                    <label className="text-xs text-neutral-500 mb-1 block">Suburb</label>
	                    <input list="nsw-suburbs-job-client" value={newClientForm.suburb} onChange={e => setClientSuburb(e.target.value)} placeholder="e.g. Croydon Park"
	                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                    <datalist id="nsw-suburbs-job-client">
                      {NSW_SUBURB_SUGGESTIONS.map(suburb => (
                        <option key={suburb} value={suburb} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Postcode</label>
                    <input value={newClientForm.postcode} onChange={e => setNcf('postcode', e.target.value)} inputMode="numeric" placeholder="2133"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">State</label>
                  <input value={newClientForm.state} readOnly
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-100 text-neutral-500 focus:outline-none" />
                </div>
	              {clientError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{clientError}</div>}
	            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowNewClient(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button onClick={handleSaveNewClient} disabled={savingClient} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
                {savingClient ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Vehicle Modal */}
      {showNewVehicle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4" onClick={() => setShowNewVehicle(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">New vehicle</h2>
              <button onClick={() => setShowNewVehicle(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
            </div>
	            <div className="space-y-3">
	              <div className="grid grid-cols-2 gap-3">
	                <div>
	                  <label className="text-xs text-neutral-500 mb-1 block">Make <span className="text-red-400">*</span></label>
	                  <select value={newVehicleForm.make} onChange={e => setVehicleMake(e.target.value)} autoFocus
	                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white">
                      <option value="">Select make</option>
                      {VEHICLE_CATALOG.map(option => (
                        <option key={option.make} value={option.make}>{option.make}</option>
                      ))}
                    </select>
	                </div>
	                <div>
	                  <label className="text-xs text-neutral-500 mb-1 block">Model <span className="text-red-400">*</span></label>
	                  <select value={newVehicleForm.model} onChange={e => setNvf('model', e.target.value)} disabled={!newVehicleForm.make}
	                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 bg-white disabled:opacity-50">
                      <option value="">{newVehicleForm.make ? 'Select model' : 'Choose make first'}</option>
                      {modelOptions.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
	                </div>
	              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Year</label>
                  <input value={newVehicleForm.year} onChange={e => setNvf('year', e.target.value)} placeholder="2015"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Plate</label>
                  <input value={newVehicleForm.plate} onChange={e => setNvf('plate', e.target.value)} placeholder="ABC-123"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Odometer</label>
                  <input type="number" value={newVehicleForm.odometer_km} onChange={e => setNvf('odometer_km', e.target.value)} placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Colour</label>
                  <input value={newVehicleForm.colour} onChange={e => setNvf('colour', e.target.value)} placeholder="White"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">VIN (optional)</label>
                  <input value={newVehicleForm.vin} onChange={e => setNvf('vin', e.target.value)} placeholder="1HGBH41J…"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400" />
                </div>
              </div>
              {vehicleError && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{vehicleError}</div>}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowNewVehicle(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button onClick={handleSaveNewVehicle} disabled={savingVehicle} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 disabled:opacity-50">
                {savingVehicle ? 'Saving…' : 'Save & continue →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewJobPage() {
  return (
    <Suspense>
      <NewJobPageInner />
    </Suspense>
  )
}
