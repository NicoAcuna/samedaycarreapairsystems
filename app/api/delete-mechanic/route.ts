import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  const { mechanic_id, user_id } = await req.json()

  if (!mechanic_id) {
    return NextResponse.json({ error: 'mechanic_id is required' }, { status: 400 })
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can delete mechanics' }, { status: 403 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Look up the mechanic first so we can resolve its auth user by email even
  // for pending invites, where mechanics.user_id is still null but generateLink
  // already created an auth.users row. Without deleting that, re-inviting the
  // same email fails with "user already registered".
  const { data: mech } = await admin
    .from('mechanics')
    .select('email, user_id')
    .eq('id', mechanic_id)
    .single()

  const email = mech?.email?.toLowerCase()
  let authUserId: string | null = user_id || mech?.user_id || null

  // Fall back to resolving the auth user by email (pending invites have no
  // mechanics.user_id yet but generateLink already created the auth.users row).
  if (!authUserId && email) {
    const perPage = 1000
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error || !data?.users?.length) break
      const found = data.users.find(u => u.email?.toLowerCase() === email)
      if (found) { authUserId = found.id; break }
      if (data.users.length < perPage) break
    }
  }

  await admin.from('mechanics').delete().eq('id', mechanic_id)

  if (authUserId) {
    await admin.from('user_companies').delete().eq('user_id', authUserId)
    await admin.from('users').delete().eq('id', authUserId)
    await admin.auth.admin.deleteUser(authUserId).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
