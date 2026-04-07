import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { userId, email, workspaceName, phone, address } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // If no workspace name, just ensure user row exists
  if (!workspaceName?.trim()) {
    await supabase.from('users').upsert({ id: userId, email, role: 'super_admin' }, { onConflict: 'id' })
    return NextResponse.json({ success: true })
  }

  // Create company
  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .insert([{
      name: workspaceName.trim(),
      phone: phone?.trim() || null,
      address: address?.trim() || null,
    }])
    .select()
    .single()

  if (companyErr) {
    return NextResponse.json({ error: companyErr.message }, { status: 500 })
  }

  // Upsert user row (service role bypasses RLS)
  const { error: userErr } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email,
      company_id: company.id,
      active_company_id: company.id,
      role: 'super_admin',
    }, { onConflict: 'id' })

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 })
  }

  // Insert user_companies — ignore if already exists
  const { error: ucErr } = await supabase
    .from('user_companies')
    .insert([{ user_id: userId, company_id: company.id, role: 'owner' }])
  // Ignore duplicate errors (code 23505 = unique violation)
  if (ucErr && !ucErr.code?.includes('23505')) {
    console.error('[setup-workspace] user_companies insert:', ucErr.message)
  }

  return NextResponse.json({ success: true, companyId: company.id })
}
