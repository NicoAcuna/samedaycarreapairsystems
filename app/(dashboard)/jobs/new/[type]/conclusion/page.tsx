'use client'

import { use, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../../../../../lib/supabase/client'

const TYPE_LABELS: Record<string, string> = {
  pre_purchase: 'Pre-Purchase Inspection',
  service:      'Service',
  diagnosis:    'Diagnosis',
  repair:       'Repair',
}

function ConclusionPageInner({ params }: { params: Promise<{ type: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { type } = use(params)
  const clientId  = searchParams.get('client')  || ''
  const vehicleId = searchParams.get('vehicle') || ''
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const label = TYPE_LABELS[type] || 'Job'

  async function handleSave() {
    setSaving(true)
    setError('')

    // Read flow data saved by JobFlow
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem('job_flow_data') : null
    const flowData = raw ? JSON.parse(raw) : {}

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase.from('users').select('company_id').eq('id', user!.id).single()

    // Fetch client + vehicle snapshots to embed in report (so public report doesn't need RLS)
    const [{ data: clientSnap }, { data: vehicleSnap }] = await Promise.all([
      clientId  ? supabase.from('clients').select('first_name, last_name, phone, email').eq('id', clientId).single()  : Promise.resolve({ data: null }),
      vehicleId ? supabase.from('vehicles').select('make, model, year, plate, odometer_km').eq('id', vehicleId).single() : Promise.resolve({ data: null }),
    ])

    const { data, error: err } = await supabase.from('jobs').insert([{
      type,
      status: 'pending',
      client_id:    clientId  || null,
      vehicle_id:   vehicleId || null,
      user_id:      user!.id,
      company_id:   userData?.company_id,
      odometer_km:  flowData.currentKm ? Number(flowData.currentKm) : null,
      checklist_data: { ...flowData, _client: clientSnap, _vehicle: vehicleSnap },
    }]).select('id').single()

    setSaving(false)

    if (err) { setError(err.message); return }

    // Keep flow data in sessionStorage so report page can read it
    router.push(`/jobs/${data.id}/report?type=${type}`)
  }

  return (
    <div className="p-6 max-w-xl flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mb-5">
        ✓
      </div>
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">
        {label} completed
      </h1>
      <p className="text-sm text-neutral-500 mb-8">
        All sections have been filled in. Save the job to generate the report.
      </p>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 w-full max-w-sm">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"
        >
          ← Review
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & generate report →'}
        </button>
      </div>
    </div>
  )
}

export default function ConclusionPage({ params }: { params: Promise<{ type: string }> }) {
  return (
    <Suspense>
      <ConclusionPageInner params={params} />
    </Suspense>
  )
}
