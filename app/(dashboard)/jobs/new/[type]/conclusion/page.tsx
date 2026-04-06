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
  const draftId   = searchParams.get('draft')   || (typeof window !== 'undefined' ? localStorage.getItem(`job_draft_id_${type}`) : null) || ''
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const label = TYPE_LABELS[type] || 'Job'

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('job_flow_data') : null
      const flowData = raw ? JSON.parse(raw) : {}

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single()

      const [{ data: clientSnap }, { data: vehicleSnap }] = await Promise.all([
        clientId  ? supabase.from('clients').select('first_name, last_name, phone, email').eq('id', clientId).single()  : Promise.resolve({ data: null }),
        vehicleId ? supabase.from('vehicles').select('make, model, year, plate, odometer_km').eq('id', vehicleId).single() : Promise.resolve({ data: null }),
      ])

      const checklist_data = { ...flowData, _client: clientSnap, _vehicle: vehicleSnap }
      const jobPayload = {
        type,
        status: 'pending',
        client_id:    clientId  || null,
        vehicle_id:   vehicleId || null,
        odometer_km:  flowData.currentKm ? Number(flowData.currentKm) : null,
        checklist_data,
      }

      let jobId: string | null = null

      if (draftId) {
        const { error: updateErr } = await supabase
          .from('jobs')
          .update(jobPayload)
          .eq('id', draftId)
          .eq('user_id', user.id)
        if (!updateErr) jobId = draftId
      }

      if (!jobId) {
        const { data, error: insertErr } = await supabase.from('jobs').insert([{
          ...jobPayload,
          user_id:    user.id,
          company_id: userData?.company_id,
        }]).select('id').single()
        if (insertErr) throw new Error(insertErr.message)
        jobId = data?.id || null
      }

      if (!jobId) throw new Error('Failed to save job')

      // Insert v1 snapshot into job_reports
      await supabase.from('job_reports').insert([{
        job_id:     jobId,
        version:    1,
        snapshot:   checklist_data,
        type,
        company_id: userData?.company_id,
        user_id:    user.id,
      }])

      localStorage.removeItem(`job_draft_id_${type}`)
      localStorage.removeItem(`job_new_draft_${type}_state`)

      router.push(`/jobs/${jobId}/report?type=${type}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
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
