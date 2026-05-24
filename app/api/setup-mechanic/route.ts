import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
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

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: mechanic } = await admin
    .from('mechanics')
    .select('*')
    .eq('email', user.email!.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!mechanic) {
    return NextResponse.json({ error: 'No mechanic invitation found for this email' }, { status: 404 })
  }

  await admin.from('users').upsert({
    id: user.id,
    email: user.email,
    role: 'mechanic',
    company_id: mechanic.company_id,
    active_company_id: mechanic.company_id,
  }, { onConflict: 'id' })

  const { error: ucErr } = await admin
    .from('user_companies')
    .insert([{ user_id: user.id, company_id: mechanic.company_id, role: 'mechanic' }])
  if (ucErr && ucErr.code !== '23505') {
    console.error('[setup-mechanic] user_companies insert:', ucErr)
  }

  await admin
    .from('mechanics')
    .update({ user_id: user.id, status: 'active' })
    .eq('id', mechanic.id)

  return NextResponse.json({ success: true })
}
