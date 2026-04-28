import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, price } = await req.json()
  if (!conversationId || !price) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: conv } = await admin
    .from('bot_conversations')
    .select('id, lead_id, status')
    .eq('id', conversationId)
    .single()

  if (!conv || conv.status !== 'awaiting_quote_approval') {
    return NextResponse.json({ error: 'Not found or not pending approval' }, { status: 400 })
  }

  // Set status to 'quoted' — bot picks this up via Supabase realtime and sends the WhatsApp message
  await admin.from('bot_conversations').update({
    status:          'quoted',
    suggested_price: price,
    updated_at:      new Date().toISOString(),
  }).eq('id', conversationId)

  if (conv.lead_id) {
    await admin.from('leads').update({ status: 'quoted' }).eq('id', conv.lead_id)
  }

  return NextResponse.json({ ok: true })
}
