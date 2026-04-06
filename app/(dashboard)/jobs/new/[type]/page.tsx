'use client'

import { use, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { JobFlow } from '../../../../../components/job-flow/JobFlow'

function NewJobFlowPageInner({ params }: { params: Promise<{ type: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { type } = use(params)
  const clientId = searchParams.get('client') || ''
  const vehicleId = searchParams.get('vehicle') || ''
  const subtype = searchParams.get('subtype') || ''

  return (
    <JobFlow
      type={type}
      initialServiceSubtype={subtype}
      onComplete={() =>
        router.push(`/jobs/new/${type}/conclusion?client=${clientId}&vehicle=${vehicleId}`)
      }
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
