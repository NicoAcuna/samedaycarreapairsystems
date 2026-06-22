import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Public: the mechanic accepts their invite by setting a password. We validate
// our own token (with 1-day expiry) and do everything with the service role —
// no Supabase OTP/magic-link session is involved, so it works in any browser.
export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!token) return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 400 })
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: mechanic } = await admin
    .from('mechanics')
    .select('id, email, company_id, user_id, status, invite_expires_at')
    .eq('invite_token', token)
    .maybeSingle()

  if (!mechanic) return NextResponse.json({ error: 'This invite link is invalid.' }, { status: 404 })
  if (mechanic.status === 'active') {
    return NextResponse.json({ error: 'This invite was already used. Try signing in instead.' }, { status: 410 })
  }
  if (mechanic.invite_expires_at && new Date(mechanic.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired. Ask your admin to re-send it.' }, { status: 410 })
  }
  if (!mechanic.user_id) {
    return NextResponse.json({ error: 'This invite is missing its account. Ask your admin to re-send it.' }, { status: 409 })
  }

  // 1. Set the password on the auth account.
  const { error: pwErr } = await admin.auth.admin.updateUserById(mechanic.user_id, {
    password,
    email_confirm: true,
  })
  if (pwErr) return NextResponse.json({ error: pwErr.message }, { status: 500 })

  // 2. Create/refresh the app profile, scoped to the mechanic's base with the
  //    restricted 'mechanic' role.
  await admin.from('users').upsert({
    id: mechanic.user_id,
    email: mechanic.email,
    role: 'mechanic',
    company_id: mechanic.company_id,
    active_company_id: mechanic.company_id,
  }, { onConflict: 'id' })

  const { error: ucErr } = await admin
    .from('user_companies')
    .insert([{ user_id: mechanic.user_id, company_id: mechanic.company_id, role: 'mechanic' }])
  if (ucErr && ucErr.code !== '23505') {
    console.error('[accept-invite] user_companies insert:', ucErr)
  }

  // 3. Activate the mechanic and burn the token so the link can't be reused.
  await admin
    .from('mechanics')
    .update({ status: 'active', invite_token: null, invite_expires_at: null })
    .eq('id', mechanic.id)

  return NextResponse.json({ success: true, email: mechanic.email })
}
