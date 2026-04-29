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

// Lazy to avoid build-time crash when env vars aren't present
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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
export async function POST(req: NextRequest) {
  // Validate webhook secret (Evolution API sends apikey header)
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('apikey') ?? req.headers.get('x-webhook-secret')
    if (incoming !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })

  // Evolution API v2 event format
  if (body.event !== 'MESSAGES_UPSERT') return NextResponse.json({ ok: true })

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

  if (isDirect) {
    senderPhone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
  } else {
    const senderJid = msg.key?.participant || ''
    if (senderJid.endsWith('@s.whatsapp.net')) {
      senderPhone = senderJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
    }
    groupName = await getGroupSubject(remoteJid)
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

  return NextResponse.json({ ok: true })
}
