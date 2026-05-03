import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText } from '@/lib/evolution'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const FOLLOW_UP_ES = 'Hola! soy Nico el mecánico 🔧 te escribí ayer — ¿seguís necesitando ayuda con el auto?'
const FOLLOW_UP_EN = 'Hey! Nico the mechanic here 🔧 I reached out yesterday — do you still need help with your car?'

export async function GET(req: NextRequest) {
  // Protect cron endpoint
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  // Find stuck conversations: bot sent first message >24h ago, no follow-up sent yet, no user reply since
  const { data: stuck } = await supabase
    .from('bot_conversations')
    .select('id, lead_id, contact_phone, language, messages, follow_up_sent_at, created_at, updated_at')
    .in('status', ['qualifying'])
    .lt('updated_at', oneDayAgo)
    .is('follow_up_sent_at', null)

  let followed = 0
  let lost = 0

  for (const conv of stuck || []) {
    const msgs: Array<{ role: string }> = conv.messages || []
    const lastMsg = msgs[msgs.length - 1]

    // Only follow up if the last message is from the bot (user never replied)
    if (lastMsg?.role !== 'assistant') continue

    const text = conv.language === 'en' ? FOLLOW_UP_EN : FOLLOW_UP_ES
    try {
      await sendText(conv.contact_phone, text)
      await supabase
        .from('bot_conversations')
        .update({ follow_up_sent_at: now.toISOString() })
        .eq('id', conv.id)
      followed++
      console.log(`[cron/follow-up] Sent follow-up to conv ${conv.id}`)
    } catch (e: any) {
      console.error(`[cron/follow-up] Failed to send follow-up for conv ${conv.id}:`, e.message)
    }
  }

  // Mark as lost: follow-up was sent >24h ago and still no reply
  const { data: toLose } = await supabase
    .from('bot_conversations')
    .select('id, lead_id')
    .in('status', ['qualifying'])
    .lt('follow_up_sent_at', oneDayAgo)
    .lt('updated_at', oneDayAgo)

  for (const conv of toLose || []) {
    const msgs: Array<{ role: string }> = (await supabase
      .from('bot_conversations')
      .select('messages')
      .eq('id', conv.id)
      .single()).data?.messages || []

    const lastMsg = msgs[msgs.length - 1]
    if (lastMsg?.role !== 'assistant') continue // user replied, don't mark lost

    await supabase.from('bot_conversations').update({ status: 'closed' }).eq('id', conv.id)
    if (conv.lead_id) {
      await supabase.from('leads').update({ lifecycle_stage: 'lost' }).eq('id', conv.lead_id)
    }
    lost++
    console.log(`[cron/follow-up] Marked conv ${conv.id} as lost`)
  }

  return NextResponse.json({ ok: true, followed, lost })
}
