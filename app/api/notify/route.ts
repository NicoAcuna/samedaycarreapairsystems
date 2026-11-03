import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'crypto'
import { sendPushToCompany, type PushPayload } from '@/lib/push.server'

// Constant-time string compare that won't throw on length mismatch.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export type NotifyBody = {
  companyId?: string
  type?: string
  payload: PushPayload
}

// Called by:
//   - Web app (authenticated session) after creating a lead
//   - WhatsApp bot (x-notify-secret header) for all lead events
export async function POST(req: NextRequest) {
  const body = await req.json() as NotifyBody
  let companyId = body.companyId

  const secret = req.headers.get('x-notify-secret')
  if (secret) {
    // Bot auth path — the trusted server-side caller may target any company.
    if (!process.env.NOTIFY_SECRET || !safeEqual(secret, process.env.NOTIFY_SECRET)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  } else {
    // Web app auth path — ALWAYS derive companyId from the session, never trust
    // the body (a user could otherwise push notifications into another tenant).
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('active_company_id, company_id')
      .eq('id', user.id)
      .single()
    companyId = userData?.active_company_id || userData?.company_id
  }

  if (!companyId) return NextResponse.json({ error: 'No companyId' }, { status: 400 })

  // Service role client — bypasses RLS to write the notification row
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Save to notification center (always, regardless of push subscriptions)
  await admin.from('notifications').insert({
    company_id: companyId,
    type: body.type || 'notification',
    title: body.payload.title,
    body: body.payload.body ?? null,
    url: body.payload.url ?? null,
  })

  // Send push to subscribed devices (best-effort)
  const result = await sendPushToCompany(companyId, body.payload)
  console.log('[notify] push result', { companyId, ...result })
  return NextResponse.json(result)
}
