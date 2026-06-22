import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, company_id: bodyCompanyId } = body

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role, active_company_id, company_id')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can invite mechanics' }, { status: 403 })
  }

  // Allow overriding company_id if the user belongs to that company
  let companyId = userData.active_company_id || userData.company_id
  if (bodyCompanyId && bodyCompanyId !== companyId) {
    const { data: membership } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', bodyCompanyId)
      .single()
    if (!membership) return NextResponse.json({ error: 'Access denied to that base' }, { status: 403 })
    companyId = bodyCompanyId
  }
  if (!companyId) return NextResponse.json({ error: 'No active company' }, { status: 400 })

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const cleanEmail = email.trim().toLowerCase()
  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  // 1. Create the auth account up front (Supabase sends NO email here). We own
  //    the whole accept flow with our own token, so we never rely on Supabase
  //    magic-links / OTP — those break inside in-app browsers (Gmail, etc.) and
  //    get pre-consumed by email security scanners, which was causing the invite
  //    link to spin forever and never show the password screen.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (createErr || !created?.user) {
    const already = /already|registered|exists/i.test(createErr?.message || '')
    return NextResponse.json(
      { error: already ? 'This email already has an account. Delete it first to re-invite.' : (createErr?.message || 'Could not create the account') },
      { status: already ? 409 : 500 },
    )
  }

  const authUserId = created.user.id
  const inviteToken = randomBytes(32).toString('hex')
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // valid 1 day

  // 2. Insert the mechanic, firmly linked to the auth user and carrying the
  //    invite token + expiry.
  const { data: mechanic, error: mechanicErr } = await admin
    .from('mechanics')
    .insert([{
      company_id: companyId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || null,
      status: 'pending',
      user_id: authUserId,
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
    }])
    .select()
    .single()

  if (mechanicErr) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
    const dup = mechanicErr.code === '23505'
    return NextResponse.json(
      { error: dup ? 'This email has already been invited to this base.' : mechanicErr.message },
      { status: dup ? 409 : 500 },
    )
  }

  // 3. Send our branded invite email pointing at /join?token=... (a normal page,
  //    no OTP). Valid for 1 day.
  const inviteUrl = `${appUrl}/join?token=${inviteToken}`

  const sendErr = await sendInviteEmail(cleanEmail, name.trim(), inviteUrl)
  if (sendErr) {
    await admin.from('mechanics').delete().eq('id', mechanic.id)
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
    return NextResponse.json({ error: sendErr }, { status: 500 })
  }

  return NextResponse.json({ success: true, mechanic })
}

async function sendInviteEmail(to: string, name: string, inviteUrl: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return 'RESEND_API_KEY not configured'

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #171717; padding: 24px; border-radius: 12px 12px 0 0;">
        <div style="color: #4ade80; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;">SAME DAY CAR REPAIR</div>
        <div style="color: white; font-size: 20px; font-weight: 700;">You've been invited to join the team</div>
        <div style="color: #a3a3a3; font-size: 12px; margin-top: 4px;">Mobile Mechanic · 0439 269 598</div>
      </div>
      <div style="border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        <p style="color: #404040; font-size: 15px; margin: 0 0 16px;">Hi ${name},</p>
        <p style="color: #737373; font-size: 14px; margin: 0 0 24px;">You've been invited to join Same Day Car Repair. Click the button below to set your password and get started. This link is valid for 24 hours.</p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Accept Invite →
        </a>
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #a3a3a3; font-size: 12px; margin: 0;">
          Same Day Car Repair · Mobile Mechanic Service · Sydney, NSW<br/>
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Same Day Car Repair <noreply@samedaycarrepair.com.au>',
        reply_to: 'samedaycarrepair@gmail.com',
        to: [to],
        subject: "You've been invited to Same Day Car Repair",
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[invite-mechanic] Resend error:', JSON.stringify(err))
      return err?.message || 'Failed to send invite email'
    }
    return null
  } catch (e) {
    return String(e)
  }
}
