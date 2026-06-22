import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Public: checks an invite token so /join can decide whether to show the
// password form. No session required — the mechanic has no account session yet.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: mechanic } = await admin
    .from('mechanics')
    .select('name, email, status, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!mechanic) return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 404 })
  if (mechanic.status === 'active') return NextResponse.json({ valid: false, reason: 'used' }, { status: 410 })
  if (mechanic.invite_expires_at && new Date(mechanic.invite_expires_at) < new Date()) {
    return NextResponse.json({ valid: false, reason: 'expired' }, { status: 410 })
  }

  return NextResponse.json({ valid: true, name: mechanic.name, email: mechanic.email })
}
