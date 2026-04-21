import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Check versioned snapshots first
  const { data: reportVersion } = await supabase
    .from('job_reports')
    .select('snapshot, type, created_at, version, job_id')
    .eq('token', token)
    .single()

  if (reportVersion) {
    const snap = reportVersion.snapshot as Record<string, unknown>
    return NextResponse.json({
      id:            reportVersion.job_id,
      type:          reportVersion.type,
      created_at:    reportVersion.created_at,
      status:        'completed',
      odometer_km:   null,
      checklist_data: snap,
      version:       reportVersion.version,
      clients:       snap._client  ?? null,
      vehicles:      snap._vehicle ?? null,
    })
  }

  // Fallback: legacy jobs.public_token
  const { data, error } = await supabase
    .from('jobs')
    .select('*, clients(first_name, last_name, phone, email), vehicles(make, model, year, plate, rego_state, odometer_km)')
    .eq('public_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
