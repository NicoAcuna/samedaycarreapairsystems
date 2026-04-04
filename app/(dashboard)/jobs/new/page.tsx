'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock data — después vendrá de Supabase
const CLIENTS = [
  { id: '1', name: 'Jesus Nunez',   phone: '+61 413 852 877', email: 'jesus@email.com' },
  { id: '2', name: 'Octa Juarez',   phone: '+549 351 5590680', email: 'octa@email.com' },
  { id: '3', name: 'Luis Pérez',    phone: '+61 400 555 666', email: 'luis@email.com' },
  { id: '4', name: 'Carlos Méndez', phone: '+61 400 111 222', email: 'carlos@email.com' },
]

const VEHICLES: Record<string, { id: string; make: string; model: string; year: number; plate: string; odometer: string }[]> = {
  '1': [{ id: 'v1', make: 'Toyota', model: 'RAV4',  year: 2015, plate: 'ABC-123', odometer: '259,865 km' }],
  '2': [{ id: 'v2', make: 'Honda',  model: 'CRV',   year: 2008, plate: 'BFW34T',  odometer: '268,172 km' }],
  '3': [{ id: 'v3', make: 'Ford',   model: 'Ranger', year: 2020, plate: 'QWE-789', odometer: '88,450 km'  }],
  '4': [{ id: 'v4', make: 'Toyota', model: 'Camry',  year: 2019, plate: 'XYZ-321', odometer: '74,200 km'  }],
}

const JOB_TYPES = [
  { key: 'pre_purchase', label: 'Pre-Purchase', desc: 'Full vehicle inspection' },
  { key: 'service',      label: 'Service',      desc: 'Oil change & maintenance' },
  { key: 'diagnosis',    label: 'Diagnosis',    desc: 'Find & report the issue' },
  { key: 'repair',       label: 'Repair',       desc: 'Fix a known issue' },
]

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedType = searchParams.get('type') || ''

  const [step, setStep] = useState(1) // 1=client, 2=vehicle, 3=job type

  // Client search
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<typeof CLIENTS[0] | null>(null)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showNewClient, setShowNewClient] = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  // Vehicle
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; make: string; model: string; year: number; plate: string; odometer: string } | null>(null)
  const [showNewVehicle, setShowNewVehicle] = useState(false)
  const [vehicleQuery, setVehicleQuery] = useState('')

  // Job type
  const [selectedType, setSelectedType] = useState(preselectedType)

  // Filter clients
  const filteredClients = clientQuery.length >= 3
    ? CLIENTS.filter(c =>
        c.name.toLowerCase().includes(clientQuery.toLowerCase()) ||
        c.phone.includes(clientQuery) ||
        c.email.toLowerCase().includes(clientQuery.toLowerCase())
      )
    : []

  const clientVehicles = selectedClient ? (VEHICLES[selectedClient.id] || []) : []
  const filteredVehicles = vehicleQuery.length >= 1
    ? clientVehicles.filter(v =>
        v.plate.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        v.make.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        v.model.toLowerCase().includes(vehicleQuery.toLowerCase()) ||
        String(v.year).includes(vehicleQuery) ||
        `${v.make} ${v.model}`.toLowerCase().includes(vehicleQuery.toLowerCase())
      )
    : clientVehicles

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

  function selectClient(client: typeof CLIENTS[0]) {
    setSelectedClient(client)
    setClientQuery(client.name)
    setShowClientDropdown(false)
    setSelectedVehicle(null)
    setStep(2)
  }

  function handleStartJob() {
    if (!selectedClient || !selectedVehicle || !selectedType) return
    router.push(`/jobs/new/${selectedType}?client=${selectedClient.id}&vehicle=${selectedVehicle.id}`)
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
            <div className={`flex items-center gap-1.5`}>
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
              <div className="text-sm font-medium text-neutral-900">{selectedClient.name}</div>
              <div className="text-xs text-neutral-500">{selectedClient.phone}</div>
            </div>
            <button
              onClick={() => { setSelectedClient(null); setClientQuery(''); setSelectedVehicle(null); setStep(1) }}
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
              onFocus={() => clientQuery.length >= 3 && setShowClientDropdown(true)}
              placeholder="Search by name, phone or email..."
              className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 focus:bg-white"
            />
            {clientQuery.length > 0 && clientQuery.length < 3 && (
              <div className="mt-1 text-xs text-neutral-400">Type {3 - clientQuery.length} more character{3 - clientQuery.length !== 1 ? 's' : ''} to search...</div>
            )}
            {showClientDropdown && clientQuery.length >= 3 && (
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
                          <div className="text-sm font-medium text-neutral-900">{client.name}</div>
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
                    <div className="text-sm text-neutral-500 mb-3">No clients found for "{clientQuery}"</div>
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
                <div className="text-xs text-neutral-500">{selectedVehicle.plate} · {selectedVehicle.odometer}</div>
              </div>
              <button
                onClick={() => { setSelectedVehicle(null); setStep(2) }}
                className="text-xs text-neutral-400 hover:text-neutral-600 underline"
              >
                Change
              </button>
            </div>
          ) : clientVehicles.length > 0 ? (
            <div className="space-y-2">
              <input
                type="text"
                value={vehicleQuery}
                onChange={(e) => setVehicleQuery(e.target.value)}
                placeholder="Search by plate, make, model or year..."
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400 focus:bg-white mb-2"
              />
              {filteredVehicles.length === 0 && vehicleQuery.length > 0 ? (
                <div className="text-sm text-neutral-500 text-center py-3">No vehicles found for "{vehicleQuery}"</div>
              ) : null}
              {filteredVehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVehicle(v); setStep(3) }}
                  className="w-full flex items-center justify-between px-4 py-3 border border-neutral-200 rounded-lg hover:border-neutral-400 hover:bg-neutral-50 text-left transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{v.make} {v.model} {v.year}</div>
                    <div className="text-xs text-neutral-500">{v.plate} · {v.odometer}</div>
                  </div>
                  <span className="text-xs text-blue-600 font-medium">Select</span>
                </button>
              ))}
              <button
                onClick={() => setShowNewVehicle(true)}
                className="w-full px-4 py-3 text-sm text-blue-600 font-medium border border-dashed border-blue-200 rounded-lg hover:bg-blue-50 text-center"
              >
                + Add new vehicle
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-neutral-500 mb-3">{selectedClient?.name} has no vehicles yet.</div>
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
                onClick={() => setSelectedType(jt.key)}
                className={`p-4 border rounded-xl text-left transition-colors ${
                  selectedType === jt.key
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 hover:border-neutral-400'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${selectedType === jt.key ? 'text-white' : 'text-neutral-900'}`}>{jt.label}</div>
                <div className={`text-xs ${selectedType === jt.key ? 'text-neutral-400' : 'text-neutral-500'}`}>{jt.desc}</div>
              </button>
            ))}
          </div>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">New client</h2>
              <button onClick={() => setShowNewClient(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">First name</label>
                <input placeholder="John" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Last name</label>
                <input placeholder="Smith" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Phone</label>
                <input placeholder="+61 400 000 000" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Email</label>
                <input placeholder="john@email.com" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-neutral-500 mb-1 block">Address (optional)</label>
              <input placeholder="Street, suburb, state" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNewClient(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button onClick={() => { setShowNewClient(false); setStep(2) }} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">Save & continue →</button>
            </div>
          </div>
        </div>
      )}

      {/* New Vehicle Modal */}
      {showNewVehicle && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">New vehicle</h2>
              <button onClick={() => setShowNewVehicle(false)} className="text-neutral-400 hover:text-neutral-600 text-xl">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Make</label>
                <input placeholder="Toyota" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Model</label>
                <input placeholder="RAV4" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Year</label>
                <input placeholder="2015" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Plate</label>
                <input placeholder="ABC-123" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Odometer</label>
                <input placeholder="0 km" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Colour</label>
                <input placeholder="Silver" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">VIN (optional)</label>
                <input placeholder="1HGBH41J..." className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-neutral-400" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowNewVehicle(false)} className="flex-1 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50">Cancel</button>
              <button onClick={() => { setShowNewVehicle(false); setStep(3) }} className="flex-1 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700">Save & continue →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
