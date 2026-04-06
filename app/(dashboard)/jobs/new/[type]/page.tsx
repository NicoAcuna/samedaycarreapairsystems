'use client'

import { use, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { JobFlow } from '../../../../../components/job-flow/JobFlow'
import { createClient } from '../../../../../lib/supabase/client'

function NewJobFlowPageInner({ params }: { params: Promise<{ type: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { type } = use(params)
  const clientId = searchParams.get('client') || ''
  const vehicleId = searchParams.get('vehicle') || ''
  const subtype = searchParams.get('subtype') || ''

  // Track draft job ID so we update instead of inserting on each step
  const draftIdRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(`job_draft_id_${type}`) : null
  )

  const handleAutoSave = useCallback(async (flowData: object) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const existingId = draftIdRef.current

      if (existingId) {
        await supabase.from('jobs').update({
          checklist_data: flowData,
          client_id: clientId || null,
          vehicle_id: vehicleId || null,
        }).eq('id', existingId).eq('user_id', user.id)
      } else {
        const { data: userData } = await supabase
          .from('users').select('company_id').eq('id', user.id).single()
        const { data } = await supabase.from('jobs').insert([{
          type,
          status: 'pending',
          client_id: clientId || null,
          vehicle_id: vehicleId || null,
          user_id: user.id,
          company_id: userData?.company_id,
          checklist_data: flowData,
        }]).select('id').single()

        if (data?.id) {
          draftIdRef.current = data.id
          localStorage.setItem(`job_draft_id_${type}`, data.id)
        }
      }
    } catch (e) {
      console.error('Auto-save failed:', e)
    }
  }, [type, clientId, vehicleId])

  return (
    <JobFlow
      type={type}
      clientId={clientId}
      vehicleId={vehicleId}
      initialServiceSubtype={subtype}
      onAutoSave={handleAutoSave}
      onComplete={() => {
        const draftId = draftIdRef.current
        router.push(
          `/jobs/new/${type}/conclusion?client=${clientId}&vehicle=${vehicleId}${draftId ? `&draft=${draftId}` : ''}`
        )
      }}
    />
  )
}

export default function NewJobFlowPage({ params }: { params: Promise<{ type: string }> }) {
  return (
    <Suspense>
      <NewJobFlowPageInner params={params} />
    </Suspense>
  )
}
