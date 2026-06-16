import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { name, phone, address } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    // Get the current authenticated user
    const serverClient = await createServerClient()
    const { data: { user }, error: authErr } = await serverClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is super_admin
    const { data: userData } = await serverClient.from('users').select('role').eq('id', user.id).single()
    if (userData?.role === 'mechanic') {
      return NextResponse.json({ error: 'Only admins can create new bases' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    // Create the company
    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert([{ name: name.trim(), phone: phone?.trim() || null, address: address?.trim() || null }])
      .select()
      .single()

    if (companyErr) {
      return NextResponse.json({ error: companyErr.message }, { status: 500 })
    }

    // Link user to the new company as owner
    const { error: ucErr } = await supabase
      .from('user_companies')
      .insert([{ user_id: user.id, company_id: company.id, role: 'owner' }])

    if (ucErr && ucErr.code !== '23505') {
      return NextResponse.json({ error: ucErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, company })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
