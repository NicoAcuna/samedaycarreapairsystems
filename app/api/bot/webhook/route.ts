import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendText, getGroupSubject } from '@/lib/evolution'

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_USER_ID    = process.env.SUPABASE_USER_ID!
const SUPABASE_COMPANY_ID = process.env.SUPABASE_COMPANY_ID!
const NOTIFY_SECRET       = process.env.NOTIFY_SECRET!
const RESEND_API_KEY      = process.env.RESEND_API_KEY
const NOTIFY_EMAIL        = process.env.NOTIFY_EMAIL
const NOTIFY_WA_NUMBER    = process.env.NOTIFY_WA_NUMBER
const APP_URL             = process.env.APP_URL || 'https://samedaycarreapairsystems.vercel.app'
const WEBHOOK_SECRET      = process.env.EVOLUTION_WEBHOOK_SECRET
const OPENAI_API_KEY      = process.env.OPENAI_API_KEY
const BOT_CONVERSATION_ENABLED = process.env.BOT_CONVERSATION_ENABLED === 'true'
const REPLY_DELAY_MS = 5000

// Lazy to avoid build-time crash when env vars aren't present
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const SYSTEM_PROMPT = `Sos Nico, mecánico móvil en Sydney. Escribís como cualquier persona escribiría en WhatsApp — corto, directo, sin formalismos.

TONO:
- Si el cliente escribe en español: chileno relajado. "hola hola", "cómo va?", "dale po", "al tiro", "perfecto"
- Si escribe en inglés: casual y amigable, como un texto entre conocidos
- NUNCA uses saludos corporativos tipo "Estimado cliente" ni firmas
- Máximo 2-3 líneas por mensaje. Como un texto de WhatsApp, no un email
- Nada de emojis exagerados. Uno a lo mucho si viene al caso

TU OBJETIVO: conseguir 3 datos para armar la cotización:
1. Qué le pasa al auto
2. Año, marca y modelo
3. En qué suburb está

Pedílos de forma natural en la conversación, no como un formulario.

REGLAS CLAVE:
- Nunca confirmes precio ni fecha — eso lo decide el mecánico
- Si el cliente dice qué parte es ("es el alternador"): decile que puede ser, pero que conviene revisar primero antes de cambiar piezas
- No hacemos logbook service
- Si pide algo que no hacemos, decíselo simple y directo

TIPOS DE TRABAJO (solo para clasificar, no lo mencionés):
- "diagnosis": no sabe qué es — "no prende", "hace ruido", "luz de check engine"
- "direct_job": sabe qué quiere — "cambio de aceite", "frenos", "batería"
- "client_dx": dice qué parte es — tratalo como diagnosis igual

CUANDO TENGAS los 3 datos → usá action "request_quote" y decile que ya le mandás la cotización.

Ejemplo de primer mensaje en español:
"hola hola, soy nico el mecánico 🔧 cómo va? qué le pasó al auto?"

Ejemplo en inglés:
"hey! Nico here, mobile mechanic 🔧 what's going on with the car?"

FORMATO DE RESPUESTA — SIEMPRE JSON puro, sin markdown, sin texto extra:
{
  "message": "texto para el cliente",
  "action": null,
  "data": {}
}

Cuando tenés los 3 datos:
{
  "message": "texto para el cliente confirmando que viene la cotización",
  "action": "request_quote",
  "data": {
    "vehicle": {"year": "2018", "make": "Toyota", "model": "Camry"},
    "suburb": "Parramatta",
    "job_type": "diagnosis",
    "job_description": "El auto no prende y hace click al girar la llave",
    "language": "es"
  }
}`

type BotReply = {
  message: string
  action: null | 'request_quote'
  data: {
    vehicle?: { year?: string; make?: string; model?: string }
    suburb?: string
    job_type?: string
    job_description?: string
    language?: string
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function askBot(history: Array<{ role: string; content: string }>): Promise<BotReply> {
  if (!OPENAI_API_KEY) {
    console.error('[webhook] OPENAI_API_KEY not set')
    return { message: 'Gracias por contactarnos, te responderemos a la brevedad.', action: null, data: {} }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
      ],
    }),
  })

  if (!res.ok) {
    console.error('[webhook] OpenAI API error:', res.status, await res.text())
    return { message: 'Gracias por contactarnos, te responderemos a la brevedad.', action: null, data: {} }
  }

  const json = await res.json()
  const text = json.choices?.[0]?.message?.content || ''

  try {
    return JSON.parse(text) as BotReply
  } catch {
    return { message: text, action: null, data: {} }
  }
}

async function getActiveConversation(contactJid: string) {
  const { data, error } = await getSupabase()
    .from('bot_conversations')
    .select('*')
    .eq('company_id', SUPABASE_COMPANY_ID)
    .eq('contact_jid', contactJid)
    .not('status', 'in', '(closed,scheduled)')
    .maybeSingle()

  if (error) console.error('[webhook] getActiveConversation error:', error.message)
  return data
}

async function handleRequestQuote(conv: any, data: BotReply['data'], contactName: string) {
  const updates = {
    status: 'awaiting_quote_approval',
    language: data.language || 'es',
    vehicle: data.vehicle || null,
    suburb: data.suburb || null,
    job_type: data.job_type || null,
    job_description: data.job_description || null,
    updated_at: new Date().toISOString(),
  }

  await getSupabase().from('bot_conversations').update(updates).eq('id', conv.id)

  if (data.suburb && conv.lead_id) {
    await getSupabase().from('leads').update({ suburb: data.suburb }).eq('id', conv.lead_id)
  }

  if (!NOTIFY_SECRET) return

  const vehicleStr = data.vehicle
    ? `${data.vehicle.year || ''} ${data.vehicle.make || ''} ${data.vehicle.model || ''}`.trim()
    : 'Auto sin identificar'

  try {
    await fetch(`${APP_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
      body: JSON.stringify({
        companyId: SUPABASE_COMPANY_ID,
        type: 'lead_ready_to_quote',
        payload: {
          title: `💰 Listo para cotizar — ${contactName}`,
          body: `${data.suburb || '?'} · ${vehicleStr} · ${(data.job_description || '').slice(0, 60)}`,
          url: conv.lead_id ? `/leads/${conv.lead_id}` : '/leads',
        },
      }),
    })
    console.log('[webhook] 🔔 Quote approval notification sent')
  } catch (e: any) {
    console.error('[webhook] Quote notification failed:', e.message)
  }
}

async function startConversation(args: {
  lead: { id: string }
  contactJid: string
  contactPhone: string
  senderName: string
  originalMessage: string
}) {
  const history = [{ role: 'user', content: args.originalMessage }]
  const response = await askBot(history)

  const { data: conv, error } = await getSupabase()
    .from('bot_conversations')
    .insert({
      lead_id: args.lead.id,
      company_id: SUPABASE_COMPANY_ID,
      contact_jid: args.contactJid,
      contact_name: args.senderName,
      contact_phone: args.contactPhone,
      status: 'qualifying',
      messages: [...history, { role: 'assistant', content: response.message }],
    })
    .select()
    .single()

  if (error) {
    console.error('[webhook] startConversation error:', error.message)
    return
  }

  await sleep(REPLY_DELAY_MS)
  try {
    await sendText(args.contactPhone, response.message)
    console.log(`[webhook] 💬 Bot replied to ${args.senderName}: "${response.message.slice(0, 60)}..."`)
  } catch (e: any) {
    console.error('[webhook] Bot send failed (startConversation):', e.message)
  }

  if (response.action === 'request_quote' && conv) {
    await handleRequestQuote(conv, response.data, args.senderName)
  }
}

async function handleConversationMessage(args: {
  conv: any
  contactPhone: string
  text: string
}) {
  const userMsg = { role: 'user', content: args.text }
  const allMessages = [...(args.conv.messages || []), userMsg]
  const historySlice = allMessages.slice(-20)
  const response = await askBot(historySlice)
  const updatedMessages = [...allMessages, { role: 'assistant', content: response.message }]

  await getSupabase()
    .from('bot_conversations')
    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
    .eq('id', args.conv.id)

  await sleep(REPLY_DELAY_MS)
  try {
    await sendText(args.contactPhone, response.message)
    console.log(`[webhook] 💬 Bot replied to ${args.conv.contact_name}: "${response.message.slice(0, 60)}..."`)
  } catch (e: any) {
    console.error('[webhook] Bot send failed (handleConversationMessage):', e.message)
  }

  if (response.action === 'request_quote') {
    await handleRequestQuote(args.conv, response.data, args.conv.contact_name || 'Cliente')
  }
}

// ── KEYWORD DETECTION ─────────────────────────────────────────────────────────
const TRIGGERS = [
  /mec[aá]nico/i,
  /\bmechanic\b/i,
  /\bcar\s+repair\b/i,
  /\bauto\s+repair\b/i,
  /\bcar\s+service\b/i,
  /\bpink\s*slip\b/i,
  /\binspection\b/i,
  /\binspecci[oó]n\b/i,
  /\bpre.?purchase\s+inspection\b/i,
  /inspecci[oó]n\s+(pre|antes|de\s+compra)/i,
  /taller\s+mec[aá]nico/i,
  /arreglar\s+(el\s+)?auto/i,
  /reparar\s+(el\s+)?auto/i,
  /falla\s+(el\s+)?auto/i,
  /problem[a]?\s+(con\s+(el\s+|mi\s+)?auto|con\s+(el\s+|mi\s+)?carro)/i,
  /reparaci[oó]n\s+(urgente\s+)?(de\s+)?auto/i,
  /servicio\s+(express\s+)?automotriz/i,
  /\bfrenos?\b/i,
  /diagn[oó]stico/i,
  /neum[aá]ticos?\s+pinchados?/i,
]

const HIGH_PRIORITY = [
  /reparaci[oó]n\s+urgente\s+(de\s+)?auto/i,
  /servicio\s+express\s+automotriz/i,
  /frenos?\s+fallando(\s+reparar)?/i,
]

const MEDIUM_PRIORITY = [
  /diagn[oó]stico\s+de\s+motor/i,
  /neum[aá]ticos?\s+pinchados?\s+(reparar|arreglar)/i,
]

const FALSE_POSITIVES = [
  /\bcaja\s+mec[aá]nica\b/i,
  /\btransmisi[oó]n\s+mec[aá]nica\b/i,
  /\bmarcha\s+mec[aá]nica\b/i,
  /\breloj\s+mec[aá]nico\b/i,
  // Property/rental inspection false positives
  /\bopen\s+(for\s+)?inspection\b/i,
  /\barrange\s+(an?\s+)?inspection\b/i,
  /\b(property|house|home|apartment|unit|room|flat)\s+(inspection|for\s+rent|for\s+lease)\b/i,
  /\bshort.term\s+stay\b/i,
  /\b(for\s+rent|for\s+lease|available\s+for\s+rent)\b/i,
]

function isCarListing(text: string) {
  return /\$\s*[\d.,]+/.test(text) && (/\d[\d.,]*\s*km\b/i.test(text) || /\brego\b/i.test(text))
}

function shouldTrigger(text: string) {
  if (!text || text.length < 3) return false
  if (!TRIGGERS.some(r => r.test(text))) return false
  if (isCarListing(text)) return false
  if (FALSE_POSITIVES.some(r => r.test(text))) return false
  return true
}

function detectPriority(text: string): 'high' | 'medium' | 'normal' {
  if (HIGH_PRIORITY.some(r => r.test(text))) return 'high'
  if (MEDIUM_PRIORITY.some(r => r.test(text))) return 'medium'
  return 'normal'
}

const PRIORITY_LABEL = { high: '🔴 Alta', medium: '🟡 Media', normal: '⚪ Normal' }

function normalizeEventName(value: string | null | undefined) {
  if (!value) return null
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase()
}

// ── LEAD CREATION ─────────────────────────────────────────────────────────────
async function createLead(args: {
  senderName: string; senderPhone: string | null; message: string
  groupName: string | null; priority: string; source: string
}) {
  const parts      = (args.senderName || '').trim().split(/\s+/)
  const first_name = parts[0] || 'Unknown'
  const last_name  = parts.slice(1).join(' ') || null

  const { data, error } = await getSupabase()
    .from('leads')
    .insert([{
      user_id:       SUPABASE_USER_ID,
      company_id:    SUPABASE_COMPANY_ID,
      first_name,
      last_name,
      phone:         args.senderPhone || null,
      source:        args.source,
      source_detail: args.groupName || null,
      message:       args.message || null,
      status:        'new',
      notes:         `Prioridad: ${PRIORITY_LABEL[args.priority as keyof typeof PRIORITY_LABEL] || PRIORITY_LABEL.normal}`,
    }])
    .select()
    .single()

  if (error) { console.error('[webhook] create lead error:', error.message); return null }
  console.log(`[webhook] ✅ Lead created [${args.priority}]: ${first_name} (${data.id})`)
  return data
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function sendEmailNotification(args: {
  senderName: string; message: string; groupName: string | null; leadId: string; priority: string
}) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return
  const label = PRIORITY_LABEL[args.priority as keyof typeof PRIORITY_LABEL] || PRIORITY_LABEL.normal
  const color = args.priority === 'high' ? '#dc2626' : args.priority === 'medium' ? '#d97706' : '#6b7280'
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'SDCR Leads <leads@samedaycarrepair.com.au>',
      to:      [NOTIFY_EMAIL],
      subject: `${label} Nuevo lead — ${args.senderName}`,
      html: `<div style="font-family:sans-serif;max-width:480px">
        <h2>Nuevo lead detectado 🔧</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="color:#666;font-size:14px;padding:8px 0">Prioridad</td><td style="font-weight:700;color:${color};font-size:14px;padding:8px 0">${label}</td></tr>
          <tr><td style="color:#666;font-size:14px;padding:8px 0">Nombre</td><td style="font-weight:600;font-size:14px;padding:8px 0">${args.senderName}</td></tr>
          <tr><td style="color:#666;font-size:14px;padding:8px 0">Grupo</td><td style="font-size:14px;padding:8px 0">${args.groupName || '—'}</td></tr>
          <tr><td style="color:#666;font-size:14px;padding:8px 0;vertical-align:top">Mensaje</td><td style="font-size:14px;padding:8px 0">${args.message}</td></tr>
        </table>
        <a href="${APP_URL}/leads/${args.leadId}" style="display:inline-block;margin-top:20px;background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">Ver lead →</a>
      </div>`,
    }),
  }).catch(e => console.error('[webhook] email error:', e.message))
}

async function sendWANotification(args: {
  senderName: string; message: string; groupName: string | null; leadId: string; priority: string
}) {
  if (!NOTIFY_WA_NUMBER) return
  const label = PRIORITY_LABEL[args.priority as keyof typeof PRIORITY_LABEL] || PRIORITY_LABEL.normal
  const text =
    `🔔 *Nuevo lead detectado*\n\n` +
    `⚡ *Prioridad:* ${label}\n` +
    `👤 *Nombre:* ${args.senderName}\n` +
    `💬 *Grupo:* ${args.groupName || '—'}\n` +
    `📝 *Mensaje:*\n${args.message}\n\n` +
    `→ ${APP_URL}/leads/${args.leadId}`
  try {
    await sendText(NOTIFY_WA_NUMBER, text)
    console.log('[webhook] 📱 WA notification sent')
  } catch (e: any) {
    console.error('[webhook] WA notification error:', e.message)
  }
}

async function sendPushNotification(args: {
  senderName: string; message: string; groupName: string | null; leadId: string; priority: string
}) {
  const emoji = args.priority === 'high' ? '🔴' : args.priority === 'medium' ? '🟡' : '🔔'
  const body  = [args.groupName, args.message?.slice(0, 80)].filter(Boolean).join(' · ')
  const res   = await fetch(`${APP_URL}/api/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
    body: JSON.stringify({
      companyId: SUPABASE_COMPANY_ID,
      payload: {
        title: `${emoji} Nuevo lead — ${args.senderName}`,
        body,
        url: `/leads/${args.leadId}`,
      },
    }),
  })
  if (res.ok) console.log('[webhook] 🔔 Push sent')
  else console.error('[webhook] Push error:', await res.text())
}

// ── WEBHOOK HANDLER ───────────────────────────────────────────────────────────
export async function handleWebhookPost(req: NextRequest, routeEvent?: string | null) {
  // Validate webhook secret (Evolution API sends apikey header)
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('apikey') ?? req.headers.get('x-webhook-secret')
    if (incoming !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })

  // Evolution can send the event name in the payload or in the URL suffix.
  const eventName = normalizeEventName(body.event) ?? normalizeEventName(routeEvent)
  if (eventName !== 'MESSAGES_UPSERT') {
    console.log(`[webhook] Ignored event: ${eventName || 'unknown'} via ${routeEvent || 'root'}`)
    return NextResponse.json({ ok: true })
  }

  const msg = body.data
  if (!msg || msg.key?.fromMe) return NextResponse.json({ ok: true })

  const remoteJid = msg.key?.remoteJid || ''
  const isGroup   = remoteJid.endsWith('@g.us')
  const isDirect  = remoteJid.endsWith('@s.whatsapp.net')
  if (!isGroup && !isDirect) return NextResponse.json({ ok: true })

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ''
  if (!text) return NextResponse.json({ ok: true })

  const senderName = msg.pushName || ''
  let senderPhone: string | null = null
  let groupName: string | null = null
  let contactJid: string | null = null

  if (isDirect) {
    senderPhone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
    contactJid = remoteJid.replace(/:\d+$/, '')
  } else {
    const senderJid = msg.key?.participant || msg.participant || ''
    if (senderJid.endsWith('@s.whatsapp.net')) {
      senderPhone = senderJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
      contactJid = `${senderPhone}@s.whatsapp.net`
    }
    groupName = await getGroupSubject(remoteJid)
  }

  if (BOT_CONVERSATION_ENABLED && isDirect && senderPhone && contactJid) {
    const conv = await getActiveConversation(contactJid)
    if (conv) {
      await handleConversationMessage({ conv, contactPhone: senderPhone, text })
      return NextResponse.json({ ok: true, conversation: 'continued' })
    }
  }

  if (!shouldTrigger(text)) return NextResponse.json({ ok: true })

  const source   = isGroup ? 'whatsapp_group' : 'whatsapp_direct'
  const priority = detectPriority(text)
  console.log(`[webhook] 🎯 Trigger [${priority}] ${isGroup ? `"${groupName}"` : '(direct)'}: ${senderName} — "${text.slice(0, 80)}"`)

  const lead = await createLead({ senderName, senderPhone, message: text, groupName, priority, source })
  if (!lead) return NextResponse.json({ ok: true })

  await Promise.all([
    sendEmailNotification({ senderName, message: text, groupName, leadId: lead.id, priority }),
    sendWANotification({ senderName, message: text, groupName, leadId: lead.id, priority }),
    sendPushNotification({ senderName, message: text, groupName, leadId: lead.id, priority }),
  ])

  if (BOT_CONVERSATION_ENABLED && senderPhone && contactJid) {
    await startConversation({
      lead,
      contactJid,
      contactPhone: senderPhone,
      senderName,
      originalMessage: text,
    })
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  return handleWebhookPost(req)
}
