import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
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
  if (!body?.conversation_id || !body?.when) {
    return NextResponse.json({ error: 'Missing conversation_id or when' }, { status: 400 })
  }

  // Require an authenticated session — this route sends WhatsApp messages from
  // the business number, so it must never be callable anonymously.
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: caller } = await authClient
    .from('users').select('active_company_id, company_id').eq('id', user.id).single()
  const callerCompanyId = caller?.active_company_id || caller?.company_id

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

  // The conversation must belong to the caller's company.
  if (!callerCompanyId || conv.company_id !== callerCompanyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lang = conv.language || 'es'
  const clientMsg = lang === 'en'
    ? `Hey! I'm free ${body.when} — does that work for you?`
    : `Hola! puedo ${body.when}, te viene bien?`

  try {
    await sendText(conv.contact_phone, clientMsg)
  } catch (e: any) {
    console.error('[confirm-schedule] WA send failed:', e.message)
    return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
  }

  // Keep conversation active so the bot can handle the client's reply
  const proposalMsg = { role: 'assistant', content: clientMsg }
  const updatedMessages = [...(conv.messages || []), proposalMsg]

  // Keep the conversation in schedule-confirm mode so the UI card stays visible
  // while the client responds and the bot can continue the scheduling negotiation.
  await supabase.from('bot_conversations').update({
    status: 'awaiting_schedule_confirmation',
    messages: updatedMessages,
    updated_at: new Date().toISOString(),
  }).eq('id', conv.id)

  return NextResponse.json({ ok: true })
}
