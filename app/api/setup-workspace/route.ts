import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, email, workspaceName, phone, address } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[setup-workspace] SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json({ error: 'Server misconfiguration: missing service role key' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    // If no workspace name, just ensure user row exists
    if (!workspaceName?.trim()) {
      const { error: uErr } = await supabase
        .from('users')
        .upsert({ id: userId, email, role: 'super_admin' }, { onConflict: 'id' })
      if (uErr) {
        console.error('[setup-workspace] user upsert (no workspace):', uErr)
        return NextResponse.json({ error: `User row error: ${uErr.message}` }, { status: 500 })
      }
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
      console.error('[setup-workspace] company insert:', companyErr)
      return NextResponse.json({ error: `Company error: ${companyErr.message}` }, { status: 500 })
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
      console.error('[setup-workspace] user upsert:', userErr)
      return NextResponse.json({ error: `User error: ${userErr.message}` }, { status: 500 })
    }

    // Insert user_companies — ignore duplicate errors
    const { error: ucErr } = await supabase
      .from('user_companies')
      .insert([{ user_id: userId, company_id: company.id, role: 'owner' }])

    if (ucErr && ucErr.code !== '23505') {
      console.error('[setup-workspace] user_companies insert:', ucErr)
      // Non-fatal — log but don't block
    }

    return NextResponse.json({ success: true, companyId: company.id })
  } catch (e) {
    console.error('[setup-workspace] unexpected error:', e)
    return NextResponse.json({ error: `Unexpected error: ${String(e)}` }, { status: 500 })
  }
}
