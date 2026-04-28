const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { createClient } = require('@supabase/supabase-js')
const { askClaude } = require('./claude')
const pino = require('pino')
const http = require('http')
const qrcode = require('qrcode')

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SUPABASE_URL          = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const NOTIFY_WA_NUMBER      = process.env.NOTIFY_WA_NUMBER   // e.g. '61439269598' (your personal)
const NOTIFY_EMAIL          = process.env.NOTIFY_EMAIL        // e.g. 'nicolas@...'
const RESEND_API_KEY        = process.env.RESEND_API_KEY
const BOT_WA_NUMBER         = process.env.BOT_WA_NUMBER       // e.g. '61412345678' (business number)
const SUPABASE_USER_ID      = process.env.SUPABASE_USER_ID
const SUPABASE_COMPANY_ID   = process.env.SUPABASE_COMPANY_ID
const APP_URL               = process.env.APP_URL || 'https://samedaycarreapairsystems.vercel.app'
const AUTH_DIR              = process.env.AUTH_DIR || './auth_info'
const NOTIFY_SECRET         = process.env.NOTIFY_SECRET

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── KEYWORD DETECTION ─────────────────────────────────────────────────────────
const TRIGGERS = [
  // Any mention of mecanico/mecánico
  /mec[aá]nico/i,
  // English
  /\bmechanic\b/i,
  /\bcar\s+repair\b/i,
  /\bauto\s+repair\b/i,
  /\bcar\s+service\b/i,
  /\bpink\s*slip\b/i,
  /\binspection\b/i,
  /\binspecci[oó]n\b/i,
  /\bpre.?purchase\s+inspection\b/i,
  /inspecci[oó]n\s+(pre|antes|de\s+compra)/i,
  // Spanish variations
  /taller\s+mec[aá]nico/i,
  /arreglar\s+(el\s+)?auto/i,
  /reparar\s+(el\s+)?auto/i,
  /falla\s+(el\s+)?auto/i,
  /problem[a]?\s+(con\s+(el\s+|mi\s+)?auto|con\s+(el\s+|mi\s+)?carro)/i,
  // New Spanish keywords
  /reparaci[oó]n\s+(urgente\s+)?(de\s+)?auto/i,
  /servicio\s+(express\s+)?automotriz/i,
  /\bfrenos?\b/i,
  /diagn[oó]stico/i,
  /neum[aá]ticos?\s+pinchados?/i,
]

// ── PRIORITY DETECTION ────────────────────────────────────────────────────────
const HIGH_PRIORITY_TRIGGERS = [
  /reparaci[oó]n\s+urgente\s+(de\s+)?auto/i,
  /servicio\s+express\s+automotriz/i,
  /frenos?\s+fallando(\s+reparar)?/i,
]

const MEDIUM_PRIORITY_TRIGGERS = [
  /diagn[oó]stico\s+de\s+motor/i,
  /neum[aá]ticos?\s+pinchados?\s+(reparar|arreglar)/i,
]

function detectPriority(text) {
  if (HIGH_PRIORITY_TRIGGERS.some(r => r.test(text))) return 'high'
  if (MEDIUM_PRIORITY_TRIGGERS.some(r => r.test(text))) return 'medium'
  return 'normal'
}

// Patterns that indicate "mecanico" is used as adjective (not a person)
const FALSE_POSITIVES = [
  /\bcaja\s+mec[aá]nica\b/i,
  /\btransmisi[oó]n\s+mec[aá]nica\b/i,
  /\bmarcha\s+mec[aá]nica\b/i,
  /\breloj\s+mec[aá]nico\b/i,
]

// Car listing: has a price + (odometer reading OR rego mention)
function isCarListing(text) {
  const hasPrice = /\$\s*[\d.,]+/.test(text)
  const hasOdo   = /\d[\d.,]*\s*km\b/i.test(text)
  const hasRego  = /\brego\b/i.test(text)
  return hasPrice && (hasOdo || hasRego)
}

function shouldTrigger(text) {
  if (!text || text.length < 3) return false
  if (!TRIGGERS.some(r => r.test(text))) return false
  if (isCarListing(text)) return false
  if (FALSE_POSITIVES.some(r => r.test(text))) return false
  return true
}

const PRIORITY_LABEL = { high: '🔴 Alta', medium: '🟡 Media', normal: '⚪ Normal' }

// ── LEAD CREATION ─────────────────────────────────────────────────────────────
async function createLead({ senderName, senderPhone, message, groupName, priority, source = 'whatsapp_group' }) {
  const nameParts  = (senderName || '').trim().split(/\s+/)
  const first_name = nameParts[0] || 'Unknown'
  const last_name  = nameParts.slice(1).join(' ') || null

  const { data, error } = await supabase
    .from('leads')
    .insert([{
      user_id:       SUPABASE_USER_ID,
      company_id:    SUPABASE_COMPANY_ID,
      first_name,
      last_name,
      phone:         senderPhone || null,
      source,
      source_detail: groupName || null,
      message:       message || null,
      status:        'new',
      notes:         `Prioridad: ${PRIORITY_LABEL[priority] || PRIORITY_LABEL.normal}`,
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create lead:', error.message)
    return null
  }

  console.log(`✅ Lead created [${priority}]: ${first_name} ${last_name || ''} (${data.id})`)
  return data
}

// ── EMAIL NOTIFICATION ────────────────────────────────────────────────────────
async function sendEmailNotification({ senderName, message, groupName, leadId, priority }) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return

  const priorityLabel = PRIORITY_LABEL[priority] || PRIORITY_LABEL.normal
  const priorityColor = priority === 'high' ? '#dc2626' : priority === 'medium' ? '#d97706' : '#6b7280'

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'SDCR Leads <leads@samedaycarrepair.com.au>',
        to:      [NOTIFY_EMAIL],
        subject: `${priorityLabel} Nuevo lead — ${senderName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h2 style="margin:0 0 16px">Nuevo lead detectado 🔧</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666;font-size:14px">Prioridad</td><td style="padding:8px 0;font-size:14px;font-weight:700;color:${priorityColor}">${priorityLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:14px">Nombre</td><td style="padding:8px 0;font-size:14px;font-weight:600">${senderName}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:14px">Grupo</td><td style="padding:8px 0;font-size:14px">${groupName || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:14px;vertical-align:top">Mensaje</td><td style="padding:8px 0;font-size:14px">${message}</td></tr>
            </table>
            <a href="${APP_URL}/leads/${leadId}" style="display:inline-block;margin-top:20px;background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
              Ver lead →
            </a>
          </div>
        `,
      }),
    })
    console.log('📧 Email notification sent')
  } catch (e) {
    console.error('❌ Email notification failed:', e.message)
  }
}

// ── WHATSAPP NOTIFICATION ─────────────────────────────────────────────────────
async function sendWhatsAppNotification(sock, { senderName, message, groupName, leadId, priority }) {
  if (!NOTIFY_WA_NUMBER) return

  const priorityLabel = PRIORITY_LABEL[priority] || PRIORITY_LABEL.normal

  try {
    const jid  = `${NOTIFY_WA_NUMBER}@s.whatsapp.net`
    const text = `🔔 *Nuevo lead detectado*\n\n` +
                 `⚡ *Prioridad:* ${priorityLabel}\n` +
                 `👤 *Nombre:* ${senderName}\n` +
                 `💬 *Grupo:* ${groupName || '—'}\n` +
                 `📝 *Mensaje:*\n${message}\n\n` +
                 `→ ${APP_URL}/leads/${leadId}`
    await sock.sendMessage(jid, { text })
    console.log('📱 WhatsApp notification sent')
  } catch (e) {
    console.error('❌ WhatsApp notification failed:', e.message)
  }
}

// ── PUSH NOTIFICATION ────────────────────────────────────────────────────────
async function sendPushNotification({ senderName, message, groupName, leadId, priority }) {
  if (!NOTIFY_SECRET) return
  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🔔'
  const body = [
    groupName ? `${groupName}` : null,
    message ? message.slice(0, 80) : null,
  ].filter(Boolean).join(' · ')

  try {
    const res = await fetch(`${APP_URL}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-notify-secret': NOTIFY_SECRET,
      },
      body: JSON.stringify({
        companyId: SUPABASE_COMPANY_ID,
        payload: {
          title: `${priorityEmoji} Nuevo lead — ${senderName}`,
          body,
          url: `/leads/${leadId}`,
        },
      }),
    })
    if (res.ok) console.log('🔔 Push notification sent')
    else console.error('❌ Push notification failed:', await res.text())
  } catch (e) {
    console.error('❌ Push notification failed:', e.message)
  }
}

// ── CONVERSATION MANAGEMENT ───────────────────────────────────────────────────
async function getActiveConversation(contactJid) {
  const { data, error } = await supabase
    .from('bot_conversations')
    .select('*')
    .eq('company_id', SUPABASE_COMPANY_ID)
    .eq('contact_jid', contactJid)
    .not('status', 'in', '(closed,scheduled)')
    .maybeSingle()
  if (error) console.error('❌ getActiveConversation error:', error.message)
  return data
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function startConversation(sock, { lead, contactJid, senderName, senderPhone, originalMessage }) {
  const history = [{ role: 'user', content: originalMessage }]
  const response = await askClaude(history)

  const { data: conv } = await supabase
    .from('bot_conversations')
    .insert({
      lead_id:       lead.id,
      company_id:    SUPABASE_COMPANY_ID,
      contact_jid:   contactJid,
      contact_name:  senderName,
      contact_phone: senderPhone,
      status:        'qualifying',
      messages:      [...history, { role: 'assistant', content: response.message }],
    })
    .select()
    .single()

  await sleep(2500)
  await sock.sendMessage(contactJid, { text: response.message })
  console.log(`💬 Bot replied to ${senderName}: "${response.message.slice(0, 60)}..."`)

  if (response.action === 'request_quote' && conv) {
    await handleRequestQuote(conv, response.data, senderName)
  }
}

async function handleConversationMessage(sock, { conv, contactJid, text }) {
  const userMsg      = { role: 'user', content: text }
  const allMessages  = [...(conv.messages || []), userMsg]
  const historySlice = allMessages.slice(-20)

  const response = await askClaude(historySlice)

  const updatedMessages = [...allMessages, { role: 'assistant', content: response.message }]
  await supabase
    .from('bot_conversations')
    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
    .eq('id', conv.id)

  await sleep(2500)
  await sock.sendMessage(contactJid, { text: response.message })
  console.log(`💬 Bot replied to ${conv.contact_name}: "${response.message.slice(0, 60)}..."`)

  if (response.action === 'request_quote') {
    await handleRequestQuote(conv, response.data, conv.contact_name)
  }
}

async function handleRequestQuote(conv, data, contactName) {
  const updates = {
    status:          'awaiting_quote_approval',
    language:        data.language || 'es',
    vehicle:         data.vehicle  || null,
    suburb:          data.suburb   || null,
    job_type:        data.job_type || null,
    job_description: data.job_description || null,
    updated_at:      new Date().toISOString(),
  }
  await supabase.from('bot_conversations').update(updates).eq('id', conv.id)

  if (data.suburb && conv.lead_id) {
    await supabase.from('leads').update({ suburb: data.suburb }).eq('id', conv.lead_id)
  }

  if (!NOTIFY_SECRET) return
  const vehicleStr = data.vehicle
    ? `${data.vehicle.year} ${data.vehicle.make} ${data.vehicle.model}`
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
          body:  `${data.suburb || '?'} · ${vehicleStr} · ${(data.job_description || '').slice(0, 60)}`,
          url:   conv.lead_id ? `/leads/${conv.lead_id}` : '/leads',
        },
      }),
    })
    console.log('🔔 Quote approval notification sent')
  } catch (e) {
    console.error('❌ Quote notification failed:', e.message)
  }
}

// ── QUOTE APPROVAL (realtime) ─────────────────────────────────────────────────
function subscribeToQuoteApprovals(sock) {
  supabase
    .channel('bot_quote_approvals')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bot_conversations', filter: `company_id=eq.${SUPABASE_COMPANY_ID}` },
      async (payload) => {
        const next = payload.new
        const prev = payload.old
        if (next.status === 'quoted' && prev.status === 'awaiting_quote_approval') {
          await sendQuoteToClient(sock, next)
        }
      }
    )
    .subscribe()
  console.log('📋 Listening for quote approvals via realtime...')
}

async function sendQuoteToClient(sock, conv) {
  if (!conv.contact_jid || !conv.suggested_price) return

  const isEs    = (conv.language || 'es') === 'es'
  const vehicle = conv.vehicle
    ? `${conv.vehicle.year} ${conv.vehicle.make} ${conv.vehicle.model}`
    : null
  const price   = conv.suggested_price

  const text = isEs
    ? `✅ *Same Day Car Repair — Cotización*\n\n` +
      (vehicle         ? `🚗 *Auto:* ${vehicle}\n`              : '') +
      (conv.suburb     ? `📍 *Suburb:* ${conv.suburb}\n`        : '') +
      `🔧 *Trabajo:* ${conv.job_description || 'Diagnóstico en terreno'}\n` +
      `💰 *Precio:* $${price} AUD\n\n` +
      `¿Te parece bien po? Confirmame y coordinamos la visita 🙌`
    : `✅ *Same Day Car Repair — Quote*\n\n` +
      (vehicle         ? `🚗 *Car:* ${vehicle}\n`               : '') +
      (conv.suburb     ? `📍 *Suburb:* ${conv.suburb}\n`        : '') +
      `🔧 *Work:* ${conv.job_description || 'On-site diagnosis'}\n` +
      `💰 *Price:* $${price} AUD\n\n` +
      `Does that work for you? Let me know and we'll lock in a time 🙌`

  try {
    await sock.sendMessage(conv.contact_jid, { text })
    console.log(`💰 Quote sent to ${conv.contact_name}: $${price}`)
    await supabase
      .from('bot_conversations')
      .update({ status: 'quote_sent', updated_at: new Date().toISOString() })
      .eq('id', conv.id)
  } catch (e) {
    console.error('❌ Failed to send quote:', e.message)
  }
}

// ── QR SERVER ─────────────────────────────────────────────────────────────────
let currentQR = null
const PORT = process.env.PORT || 3000

http.createServer(async (req, res) => {
  if (currentQR) {
    const img = await qrcode.toDataURL(currentQR)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<html><body style="background:#000;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <p style="color:#fff;font-family:sans-serif;margin-bottom:16px">Scan with WhatsApp Business</p>
        <img src="${img}" style="width:300px;height:300px"/>
        <p style="color:#888;font-family:sans-serif;font-size:12px;margin-top:12px">Refresh if code expired</p>
      </div>
    </body></html>`)
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<html><body style="background:#000;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <p style="color:#fff;font-family:sans-serif">✅ Bot connected — no QR needed</p>
    </body></html>`)
  }
}).listen(PORT, () => console.log(`🌐 QR server running on port ${PORT}`))

// ── BOT ───────────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version }          = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth:               state,
    logger:             pino({ level: 'silent' }),
    printQRInTerminal:  true,
    browser:            ['Ubuntu', 'Chrome', '20.0.04'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      currentQR = qr
      console.log('📱 QR code updated — open the Railway public URL to scan')
    }
    if (connection === 'open') {
      currentQR = null
      console.log('✅ WhatsApp Bot connected and listening...')
      subscribeToQuoteApprovals(sock)
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`⚠️  Connection closed (code ${code}). Reconnecting: ${shouldReconnect}`)
      if (shouldReconnect) startBot()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (msg.key.fromMe) continue

      const remoteJid = msg.key.remoteJid || ''
      const isGroup   = remoteJid.endsWith('@g.us')
      const isDirect  = remoteJid.endsWith('@s.whatsapp.net')
      if (!isGroup && !isDirect) continue

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''
      if (!text) continue

      // ── Resolve contact JID (always the person's direct WA number) ──────────
      let contactJid  = null
      let senderPhone = null
      let senderName  = msg.pushName || ''
      let groupName   = null

      if (isDirect) {
        contactJid  = remoteJid
        senderPhone = remoteJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
        if (!senderName) senderName = senderPhone
      } else {
        const senderJid = msg.key.participant || ''
        if (!senderName) senderName = senderJid
        try {
          const meta = await sock.groupMetadata(remoteJid)
          groupName = meta.subject
          if (senderJid.endsWith('@s.whatsapp.net')) {
            senderPhone = senderJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
            contactJid  = senderJid
          } else if (senderJid.endsWith('@lid')) {
            const match  = meta.participants.find(p => p.lid === senderJid || p.id === senderJid)
            const realJid = match?.jid || match?.id
            if (realJid?.endsWith('@s.whatsapp.net')) {
              senderPhone = realJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
              contactJid  = realJid
            }
          }
        } catch {}
      }

      // ── Conversational bot (stand by — enable with BOT_CONVERSATION_ENABLED=true) ──
      const convEnabled = process.env.BOT_CONVERSATION_ENABLED === 'true'
      if (convEnabled && contactJid) {
        const conv = await getActiveConversation(contactJid)
        if (conv) {
          await handleConversationMessage(sock, { conv, contactJid, text })
          continue
        }
      }

      // ── Keyword trigger → lead + notifications ──────────────────────────────
      if (!shouldTrigger(text)) continue

      const source   = isGroup ? 'whatsapp_group' : 'whatsapp_direct'
      const priority = detectPriority(text)
      console.log(`🎯 Trigger [${priority}] ${isGroup ? `in "${groupName}"` : '(direct)'}: ${senderName} — "${text.slice(0, 80)}..."`)

      const lead = await createLead({ senderName, senderPhone, message: text, groupName, priority, source })
      if (!lead) continue

      await Promise.all([
        sendEmailNotification({ senderName, message: text, groupName, leadId: lead.id, priority }),
        sendWhatsAppNotification(sock, { senderName, message: text, groupName, leadId: lead.id, priority }),
        sendPushNotification({ senderName, message: text, groupName, leadId: lead.id, priority }),
      ])

      // ── Start conversation (only when enabled) ──────────────────────────────
      if (convEnabled && contactJid) {
        await startConversation(sock, { lead, contactJid, senderName, senderPhone, originalMessage: text })
      }
    }
  })
}

startBot().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
