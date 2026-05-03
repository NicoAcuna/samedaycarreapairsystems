import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText } from '@/lib/evolution'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params
  const body = await req.json().catch(() => null)
  if (!body?.conversation_id || !body?.day || !body?.time) {
    return NextResponse.json({ error: 'Missing conversation_id, day or time' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { data: conv, error: convErr } = await supabase
    .from('bot_conversations')
    .select('*')
    .eq('id', body.conversation_id)
    .eq('lead_id', leadId)
    .single()

  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const scheduledLabel = `${body.day} a las ${body.time}`
  const lang = conv.language || 'es'

  const clientMsg = lang === 'en'
    ? `All set! Nico will be there ${scheduledLabel} 🔧 See you then!`
    : `Perfecto! Nico va a estar el ${scheduledLabel} 🔧 nos vemos!`

  try {
    await sendText(conv.contact_phone, clientMsg)
  } catch (e: any) {
    console.error('[confirm-schedule] WA send failed:', e.message)
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
  }

  await supabase.from('bot_conversations').update({
    status: 'scheduled',
    scheduled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conv.id)

  await supabase.from('leads').update({ lifecycle_stage: 'activation' }).eq('id', leadId)

  return NextResponse.json({ ok: true, scheduledLabel })
}
