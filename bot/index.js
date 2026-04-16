const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const { createClient } = require('@supabase/supabase-js')
const pino = require('pino')

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
  /\bpre.?purchase\s+inspection\b/i,
  /inspecci[oó]n\s+(pre|antes|de\s+compra)/i,
  // Spanish variations
  /taller\s+mec[aá]nico/i,
  /arreglar\s+(el\s+)?auto/i,
  /reparar\s+(el\s+)?auto/i,
  /falla\s+(el\s+)?auto/i,
  /problem[a]?\s+(con\s+(el\s+|mi\s+)?auto|con\s+(el\s+|mi\s+)?carro)/i,
]

// Patterns that indicate "mecanico" is used as adjective (not a person)
const FALSE_POSITIVES = [
  /\bcaja\s+mec[aá]nica\b/i,
  /\btransmisi[oó]n\s+mec[aá]nica\b/i,
  /\bmarcha\s+mec[aá]nica\b/i,
  /\bfreno\s+mec[aá]nico\b/i,
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

// ── LEAD CREATION ─────────────────────────────────────────────────────────────
async function createLead({ senderName, senderPhone, message, groupName }) {
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
      source:        'whatsapp_group',
      source_detail: groupName || null,
      message:       message || null,
      status:        'new',
    }])
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create lead:', error.message)
    return null
  }

  console.log(`✅ Lead created: ${first_name} ${last_name || ''} (${data.id})`)
  return data
}

// ── EMAIL NOTIFICATION ────────────────────────────────────────────────────────
async function sendEmailNotification({ senderName, message, groupName, leadId }) {
  if (!RESEND_API_KEY || !NOTIFY_EMAIL) return

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
        subject: `🔔 New lead — ${senderName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px">
            <h2 style="margin:0 0 16px">New lead detected 🔧</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#666;font-size:14px">Name</td><td style="padding:8px 0;font-size:14px;font-weight:600">${senderName}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:14px">Group</td><td style="padding:8px 0;font-size:14px">${groupName || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:14px;vertical-align:top">Message</td><td style="padding:8px 0;font-size:14px">${message}</td></tr>
            </table>
            <a href="${APP_URL}/leads/${leadId}" style="display:inline-block;margin-top:20px;background:#171717;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px">
              View lead →
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
async function sendWhatsAppNotification(sock, { senderName, message, groupName, leadId }) {
  if (!NOTIFY_WA_NUMBER) return

  try {
    const jid  = `${NOTIFY_WA_NUMBER}@s.whatsapp.net`
    const text = `🔔 *Nuevo lead detectado*\n\n` +
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

// ── BOT ───────────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version }          = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth:               state,
    logger:             pino({ level: 'silent' }),
    printQRInTerminal:  false,  // we use pairing code instead
    browser:            ['Ubuntu', 'Chrome', '20.0.04'],
  })

  sock.ev.on('creds.update', saveCreds)

  // Pairing code on first connect
  if (!state.creds.registered && BOT_WA_NUMBER) {
    await new Promise(r => setTimeout(r, 2000))
    const code = await sock.requestPairingCode(BOT_WA_NUMBER.replace(/\D/g, ''))
    console.log(`\n🔑 ─────────────────────────────────`)
    console.log(`   PAIRING CODE: ${code}`)
    console.log(`   Go to WhatsApp > Linked Devices`)
    console.log(`   > Link with phone number`)
    console.log(`   and enter the code above`)
    console.log(`─────────────────────────────────\n`)
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`⚠️  Connection closed (code ${code}). Reconnecting: ${shouldReconnect}`)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Bot connected and listening...')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      // Only group messages
      if (!msg.key.remoteJid?.endsWith('@g.us')) continue
      // Skip own messages
      if (msg.key.fromMe) continue

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        ''

      if (!shouldTrigger(text)) continue

      // Sender info
      const senderJid   = msg.key.participant || ''
      const senderPhone = senderJid.replace('@s.whatsapp.net', '')
      const senderName  = msg.pushName || senderPhone

      // Group name
      let groupName = null
      try {
        const meta = await sock.groupMetadata(msg.key.remoteJid)
        groupName = meta.subject
      } catch {}

      console.log(`🎯 Trigger in "${groupName}": ${senderName} — "${text.slice(0, 80)}..."`)

      const lead = await createLead({ senderName, senderPhone, message: text, groupName })
      if (!lead) continue

      await Promise.all([
        sendEmailNotification({ senderName, message: text, groupName, leadId: lead.id }),
        sendWhatsAppNotification(sock, { senderName, message: text, groupName, leadId: lead.id }),
      ])
    }
  })
}

startBot().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
