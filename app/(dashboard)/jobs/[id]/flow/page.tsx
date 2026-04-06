'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/client'
import { JobFlow } from '../../../../../components/job-flow/JobFlow'

type JobData = {
  type: string
  client_id: string | null
  vehicle_id: string | null
  checklist_data: Record<string, unknown> | null
  vehicles?: { make: string; model: string; year: string; plate: string } | null
}

export default function JobFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)

  const [job, setJob] = useState<JobData | null>(null)
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Restore done sections from sessionStorage, then seed checklist_data into sessionStorage
  // so JobFlow can pick it up on mount
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('jobs')
      .select('type, client_id, vehicle_id, checklist_data, vehicles(make, model, year, plate)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setJob(data as unknown as JobData)

          // Restore done sections
          const savedDone = sessionStorage.getItem(`job_flow_${id}_done`)
          if (savedDone) {
            try { setDoneSections(new Set(JSON.parse(savedDone))) } catch { /* ignore */ }
          }

          // If sessionStorage has no state but Supabase has checklist_data, seed it
          const hasSession = !!sessionStorage.getItem(`job_flow_${id}_state`)
          if (!hasSession && data.checklist_data) {
            sessionStorage.setItem(`job_flow_${id}_state`, JSON.stringify(data.checklist_data))
          }
        }
        setLoading(false)
      })
  }, [id])

  const handleAutoSave = useCallback(async (flowData: object) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('jobs')
        .update({ checklist_data: flowData })
        .eq('id', id)
        .eq('user_id', user.id)
    } catch (e) {
      console.error('Auto-save failed:', e)
    }
  }, [id])

  if (loading) return <div className="p-6 text-sm text-neutral-400">Loading…</div>
  if (!job) return <div className="p-6 text-sm text-neutral-400">Job not found.</div>

  const v = job.vehicles
  const vehicleLabel = v ? `${v.make} ${v.model} ${v.year}` : undefined
  const plateLabel = v?.plate || undefined

  return (
    <JobFlow
      type={job.type}
      jobId={id}
      vehicle={vehicleLabel}
      plate={plateLabel}
      initialDone={doneSections}
      onAutoSave={handleAutoSave}
      onComplete={() => router.push(`/jobs/${id}/report`)}
    />
  )
}
