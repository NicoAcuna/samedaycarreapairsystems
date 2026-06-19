import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

  const { data: mechanic, error: mechanicErr } = await admin
    .from('mechanics')
    .insert([{
      company_id: companyId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      status: 'pending',
    }])
    .select()
    .single()

  if (mechanicErr) {
    return NextResponse.json({ error: mechanicErr.message }, { status: 500 })
  }

  const host = req.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

  // Generate the invite link without sending Supabase's default email, so we can
  // deliver a branded message from our own domain via Resend (same as reports).
  const { data: linkData, error: inviteErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/join`,
      data: { full_name: name.trim(), mechanic_id: mechanic.id, company_id: companyId },
    },
  })

  if (inviteErr || !linkData?.properties?.action_link) {
    await admin.from('mechanics').delete().eq('id', mechanic.id)
    return NextResponse.json({ error: inviteErr?.message || 'Could not generate invite link' }, { status: 500 })
  }

  const sendErr = await sendInviteEmail(email.trim().toLowerCase(), name.trim(), linkData.properties.action_link)
  if (sendErr) {
    await admin.from('mechanics').delete().eq('id', mechanic.id)
    await admin.auth.admin.deleteUser(linkData.user.id).catch(() => {})
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
        <p style="color: #737373; font-size: 14px; margin: 0 0 24px;">You've been invited to join Same Day Car Repair. Click the button below to set up your account and get started.</p>
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
