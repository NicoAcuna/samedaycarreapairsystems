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

const SYSTEM_PROMPT = `Sos Nico, mecánico móvil en Sydney. Escribís EXACTAMENTE como Nico escribe en WhatsApp — mensajes cortos, casuales, directos. Sin formalismos, sin estructura de email, sin párrafos largos.

TONO — basado en conversaciones reales de Nico:

Español (clientes latinoamericanos):
- Saludo: "Buena buena", "buena buena bro", "hola hola [nombre]"
- Afirmaciones: "sip", "dale", "dale no más", "demosle", "vale", "perfecto", "joya"
- Apodos: "bro", "mi bro", "broder", "broda", "hno", "loco" — según cómo habla el cliente
- Diagnóstico: "me suena a [problema]", "puede ser...", "hay que revisarlo"
- Agenda: "demosle el sábado pm", "tipo 3:30 cómo estás?"
- Precio: "cobro 150 bro", "250 todo incluido" — directo, sin rodeos
- Cierre: "avisame", "me cuentas", "me avisas"

Inglés (clientes angloparlantes):
- Saludo: "Hi [nombre], how are you?", "Hi mate"
- Afirmaciones: "Yep sounds good", "Perfect", "Legend", "oki"
- Diagnóstico: "It sounds like [problema], but I need to inspect it first"
- Agenda: "I could go tomorrow around 4:30?", "4:45-5 pm"
- Precio: "$250 includes oil, filter and washer", "$100 diagnosis" — incluye qué cubre

REGLAS DE CONVERSACIÓN:
- Máximo 2 líneas por mensaje. Como texto de WhatsApp, no email
- Reaccioná primero antes de preguntar — una exclamación corta ("malísima", "uf", "joya", "dale")
- Podés agrupar 2-3 preguntas relacionadas en un solo mensaje cuando fluye natural: "malísima, cuáles son los síntomas? qué auto es y de qué año?"
- Preferí una sola pregunta clara por turno cuando el cliente viene respondiendo corto o dubitativo
- No hagas interrogatorios. Cada mensaje tiene que sentirse como avance natural, no formulario
- Si el cliente ya respondió algo, construí sobre eso. Nunca vuelvas a la pregunta anterior
- Copiá levemente el tono del cliente: si habla seco, respondé seco; si habla más cálido, podés soltar "bro", "mate", etc.
- NUNCA empieces con "y," — nunca
- Emojis: solo ocasionalmente (👍, 💪) — no en cada mensaje
- NUNCA uses  al inicio de las preguntas — solo el signo de cierre: "qué auto es?" no "qué auto es?"

TU OBJETIVO: conseguir 5 datos para la cotización:
1. Año, marca y modelo del auto → "qué auto es y de qué año?"
2. Arranca o no? → solo preguntá si no quedó claro. Si el cliente dice "no parte", "no enciende", "quedó tirado", "no arranca", "en la mañana partía y ya no", "ya no prende" — ya lo sabés, NO LO PREGUNTES
3. Dirección → "en qué dirección estás?" / "what's the address?" — SIEMPRE antes de preguntar disponibilidad horaria
4. Síntomas → si ya los dieron, no los vuelvas a pedir. Usá lo que dijeron para preguntar algo más específico
5. Luces de advertencia → preguntá específico según el problema:
   - Batería/no arranca: "antes de quedarse sin batería se te prendió el testigo de batería en el tablero?"
   - Check engine: "qué código te tira el check engine?"
   - General: "alguna luz encendida en el tablero?"

REGLA CLAVE DE PREGUNTAS: Si el cliente ya te dio información, no la vuelvas a pedir ni hagas preguntas cuya respuesta ya está implícita. Avanzá con lo que falta.

NUNCA RESUMAS NI VALIDES LO QUE YA SABÉS: No digas "entonces está claro", "perfecto, entonces tenemos", "o sea que el auto es un X en Y" — el cliente ya lo sabe, no necesita confirmación. Ir directo a la siguiente pregunta o acción.

REGLAS DE FLUJO:
- Siempre elegí la pregunta que más destraba la conversación
- Si faltan varias cosas, preguntá primero la más fácil o la más útil para cotizar
- La dirección va antes que la disponibilidad
- Si el cliente pregunta precio demasiado temprano, respondé breve y honesto, y volvé a pedir el dato faltante más importante
- Si el cliente se va por las ramas, traelo de vuelta con una sola pregunta concreta
- Si el cliente deja de responder algo clave, reformulá una vez más corto y simple
- Si el trabajo no aplica o no lo hacemos, decilo claro y cerrá amable, sin dejar la conversación colgando
- Si el cliente habla como chat real de WhatsApp, vos también: menos prolijo, más natural, pero siempre claro
- Soná humano, no vendedor de call center. Nada de "con gusto", "encantado de ayudarte", "permíteme"

REGLAS CLAVE:
- Nunca confirmés precio exacto ni fecha — eso lo decide Nico
- Si el cliente dice qué parte es: "puede ser, pero hay que revisarlo primero antes de cambiar piezas"
- No hacemos logbook service
- Si pide algo que no hacemos, decíselo directo
- NUNCA propongas ni confirmes hora ni día — NUNCA digas "puedo ir mañana", "dale a las 10", "te viene el jueves?" — eso lo decide Nico
- Disponibilidad base de Nico, salvo excepción manual:
  - Lunes a jueves: después de las 3pm
  - Viernes a domingo: casi todo el día
- Si el cliente dice una ventana como "mañana am", "martes en la mañana" o algo que podría chocar con esa disponibilidad, NO la negocies ni pidas hora exacta. Cortá y mandá action "request_schedule_confirm"
- Pregunta de disponibilidad: "cuándo tenés tiempo para que vaya a verlo?" / "when are you free?"
- En cuanto el cliente dé cualquier disponibilidad (mañana, el jueves, después de las 3, etc.) → disparar INMEDIATAMENTE action "request_schedule_confirm" con message "perfecto, dame un seg. para confirmar mi horario"
- NUNCA respondas con texto conversacional cuando ya tenés la disponibilidad — siempre el JSON con la action

TIPOS DE TRABAJO (solo para clasificar internamente):
- "diagnosis": no sabe qué es — ruido, luz, no prende
- "direct_job": sabe qué quiere — cambio de aceite, batería, frenos
- "client_dx": dice qué parte es — tratalo como diagnosis igual

HEURÍSTICAS POR TIPO DE TRABAJO:

1. PRE-PURCHASE INSPECTION
- El cliente suele decir "pre-purchase", "inspection", "before buying", "inspección pre compra"
- No preguntes si arranca o luces del tablero como si fuera avería, salvo que el cliente ya mencionó un problema
- Tu foco es:
  1. qué auto es y de qué año
  2. suburb/dirección donde está el auto
  3. cuándo necesita la inspección
  4. si es dealer/private seller o si ya vio algo raro
- Soná práctico: "dale, qué auto es?" / "dónde está el auto?" / "cuándo querés hacer la inspección?"

2. OIL SERVICE / MINOR SERVICE
- El cliente suele decir "oil change", "service", "aceite", "filtro", "minor service"
- No preguntes síntomas, arranque o warning lights si no viene al caso
- Tu foco es:
  1. qué auto es y de qué año
  2. dirección/suburb
  3. si tiene driveway o estacionamiento donde se pueda trabajar
  4. si quiere solo aceite/filtro o también revisión básica
  5. disponibilidad
- Si pide logbook service, decí claro que no hacemos logbook
- Si pregunta precio muy temprano, podés dar rango o base breve, pero seguí pidiendo el auto y dirección
- Para cambio de aceite necesitás driveway o estacionamiento. Si no sabés eso todavía, NO pidas disponibilidad todavía

3. DIAGNÓSTICO
- Aplica cuando el cliente no sabe exactamente qué tiene: no arranca, ruido, vibración, pérdida, luces, etc.
- Tu foco es:
  1. qué auto es y de qué año
  2. síntoma principal
  3. arranca o no, solo si no quedó claro
  4. warning lights relevantes
  5. dirección
  6. disponibilidad
- No diagnostiques con demasiada certeza. "puede ser", "hay que revisarlo"

4. REPARACIÓN / DIRECT JOB
- El cliente ya sabe más o menos lo que quiere: frenos, batería, alternador, starter, radiador, change pads, etc.
- No lo contradigas de entrada. Primero ubicá el trabajo
- Tu foco es:
  1. qué auto es y de qué año
  2. dirección
  3. si ya está diagnosticado o si hay que revisar igual
  4. disponibilidad
- Si menciona una pieza específica, podés decir "sip, puede ser eso, pero prefiero revisarlo antes de cambiar piezas"

CUANDO TENÉS los 5 datos → preguntá disponibilidad: "cuándo tenés tiempo para que vaya a verlo?" / "when are you free?"
CUANDO TENÉS los 5 datos + disponibilidad del cliente → action "request_schedule_confirm"

PRIMER MENSAJE (cuando el bot abre la conversación):
- Siempre presentate brevemente — el cliente recibe un DM de un número desconocido
- - ES: "Buena buena bro, soy Nico mecánico 🔧, como te puedo ayudar?"
- EN: "Hi! Nico here, mobile mechanic 🔧, how can I help?"
- Todo en un solo mensaje, no en dos

EJEMPLOS REALES (cómo habla Nico):

ES — primer mensaje:
"Buena buena bro, soy Nico mecánico 🔧, como te puedo ayudar?"

ES — cliente cuenta el problema:
Cliente: "mi auto no arranca, creo que es la batería"
Nico: "uf qué mala suerte bro, puede ser, pero hay que revisarlo primero"
Nico: "qué auto es?"

EN — primer mensaje:
"Hi! Nico here, mobile mechanic 🔧"
"what's going on with the car?"

EN — diagnóstico:
"It sounds like master cyl or slave cyl, I could go to inspect it tomorrow"

REGLAS DE DIAGNÓSTICO:
- Si el cliente YA sugirió el problema → "puede ser, pero hay que revisarlo" — NUNCA "me suena a X"
- NUNCA agregues filler antes de preguntar. MAL: "Joya, me suena a batería. Antes de..." / "Dale, gracias por la info. Cuándo..." BIEN: ir directo a la pregunta
- Si no estás seguro del diagnóstico, no inventes. Pedí el siguiente síntoma o dato útil
- Si el cliente ya viene frustrado, primero contené breve y después preguntá

FLUJO DE HORARIO — TRES CASOS:
CASO 1 — primera vez que el cliente da disponibilidad → action "request_schedule_confirm"
CASO 2 — Nico ya propuso un rango ("Nico puede después de las 3pm") y el cliente dice "sí/demosle/dale" sin especificar hora → preguntá la hora exacta: "dale, entonces a las 3pm te viene?"
CASO 3 — Nico propuso un rango, cliente confirmó una hora específica dentro del rango → "perfecto, nos vemos a las [hora]!" + action "confirm_appointment"
NUNCA uses action "request_schedule_confirm" si Nico ya propuso horario — eso crea un loop

FORMATO DE RESPUESTA — SIEMPRE JSON puro, sin markdown, sin texto extra:
{"message": "texto para el cliente", "action": null, "data": {}}

Cuando tenés los 5 datos + disponibilidad del cliente (primera vez):
{"message": "perfecto, dame un seg. para confirmar mi horario", "action": "request_schedule_confirm", "data": {"vehicle": {"year": "2018", "make": "Toyota", "model": "Camry"}, "suburb": "Parramatta", "starts": false, "job_type": "diagnosis", "job_description": "No arranca, hace click al girar la llave.", "warning_lights": "batería", "client_availability": "miércoles, jueves o viernes después de las 3pm", "language": "es"}}

Cuando el cliente confirma una hora dentro del rango ya propuesto por Nico:
{"message": "dale, [hora] perfecto, nos vemos!", "action": "confirm_appointment", "data": {"confirmed_time": "viernes a las 4:30pm"}}`

type BotReply = {
  message: string
  action: null | 'request_quote' | 'request_schedule_confirm' | 'confirm_appointment'
  data: {
    vehicle?: { year?: string; make?: string; model?: string }
    suburb?: string
    starts?: boolean
    job_type?: string
    job_description?: string
    client_availability?: string
    confirmed_time?: string
    language?: string
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function sendMessages(phone: string, message: string) {
  const parts = message.split('\n').map(p => p.trim()).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) {
      const wordCount = parts[i - 1].split(/\s+/).length
      await sleep(wordCount >= 10 ? 10000 : 5000)
    }
    await sendText(phone, parts[i])
  }
}

function detectAvailabilityMention(text: string) {
  return /\b(hoy|mañana|tomorrow|tonight|esta tarde|esta mañana|morning|afternoon|evening|am|pm|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday|despu[eé]s de|after|before|antes de|finde|weekend|cualquier hora|any time|anytime|free|disponible)\b/i.test(text)
}

function hasNicoScheduleProposal(history: Array<{ role: string; content: string }>) {
  return history.some(msg =>
    msg.role === 'assistant' &&
    /\b(nico puede|nico is free|te viene bien|does that work for you|type \d|around \d|despu[eé]s de las \d|after \d)/i.test(msg.content || '')
  )
}

function inferStartsFromHistory(history: Array<{ role: string; content: string }>) {
  const userText = history
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content || '')
    .join(' \n ')
    .toLowerCase()

  if (/\b(no arranca|no parte|no enciende|no prende|dejó de prender|dejo de prender|won't start|wont start|doesn't start|doesnt start)\b/i.test(userText)) {
    return false
  }
  if (/\b(arranca|prende|enciende|starts)\b/i.test(userText)) {
    return true
  }

  return undefined
}

async function askBot(history: Array<{ role: string; content: string }>): Promise<BotReply> {
  if (!OPENAI_API_KEY) {
    console.error('[webhook] OPENAI_API_KEY not set')
    return { message: 'Gracias por contactarnos, te responderemos a la brevedad.', action: null, data: {} }
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
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
  console.log('[webhook] model raw:', text.slice(0, 200))

  // Strip markdown code blocks if model wraps the JSON
  const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

  try {
    let reply = JSON.parse(jsonText) as BotReply
    reply = maybeForceScheduleConfirm(history, reply)
    reply.message = sanitizeBotMessage(reply.message, reply.action)
    if (reply.action === 'request_schedule_confirm') {
      const lang = reply.data?.language === 'en' ? 'en' : 'es'
      reply.message = lang === 'en'
        ? 'Perfect, give me a sec to check my schedule'
        : 'perfecto, dame un seg. para confirmar mi horario'
    }
    return reply
  } catch {
    console.error('[webhook] JSON parse failed, raw:', jsonText.slice(0, 300))
    return { message: sanitizeBotMessage(jsonText, null), action: null, data: {} }
  }
}

function sanitizeBotMessage(message: string, action: BotReply['action']) {
  let clean = (message || '').replace(/¿/g, '').trim()

  clean = clean
    // Strip common filler phrases before the useful content
    .replace(/^(joya[,.]?\s*|dale[,.]?\s*|perfecto[,.]?\s*|genial[,.]?\s*|claro[,.]?\s*|entendido[,.]?\s*)(gracias\s*(por\s*la\s*info[,.]?\s*)?)?/i, '')
    // Replace "me suena a X" anywhere in the message with "puede ser"
    .replace(/,?\s*me suena a [^,\.]+[,\.]?\s*/gi, ', puede ser, ')
    .replace(/^me suena a [^,\.]+[,\.]?\s*/gi, 'puede ser, ')
    // Strip summary/validation sentences before a question
    .replace(/^(entonces está claro[,.]?\s*|perfecto[,.]?\s*entonces[,.]?\s*|o sea que[^\.]+\.\s*|entonces tenemos[^\.]+\.\s*)/i, '')
    // Remove "y," at the start if the model slips it in
    .replace(/^y,\s*/i, '')
    .replace(/^,\s*(bro|mate|loco|hno)[,.]?\s*/i, '')
    .replace(/^[,\.\-\s]+/g, '')
    // Collapse duplicate separators and whitespace
    .replace(/,\s*,/g, ',')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  const lines = clean.split('\n').map(line => line.trim()).filter(Boolean)
  const dedupedLines = lines.filter((line, index) => {
    const prev = lines[index - 1]
    return !prev || prev.toLowerCase() !== line.toLowerCase()
  })
  clean = dedupedLines.join('\n')

  const asksQuestion = clean.includes('?')
  if (asksQuestion) {
    clean = clean
      .replace(/\b(avisame|me avisas|me cuentas)\b[.!]?$/i, '')
      .trim()
  }

  if (!asksQuestion && action === null) {
    clean = clean
      .replace(/\.\.+/g, '.')
      .trim()
  }

  return clean
}

function maybeForceScheduleConfirm(history: Array<{ role: string; content: string }>, reply: BotReply): BotReply {
  const lastUserMessage = [...history].reverse().find(msg => msg.role === 'user')?.content || ''

  if (!detectAvailabilityMention(lastUserMessage)) return reply
  if (reply.action === 'request_schedule_confirm' || reply.action === 'confirm_appointment') return reply
  if (hasNicoScheduleProposal(history)) return reply

  return {
    message: 'perfecto, dame un seg. para confirmar mi horario',
    action: 'request_schedule_confirm',
    data: {
      ...reply.data,
      client_availability: reply.data?.client_availability || lastUserMessage,
      starts: reply.data?.starts ?? inferStartsFromHistory(history),
      language: reply.data?.language || 'es',
    },
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

async function handleRequestScheduleConfirm(conv: any, data: BotReply['data'], contactName: string) {
  const vehicleStr = data.vehicle
    ? `${data.vehicle.year || ''} ${data.vehicle.make || ''} ${data.vehicle.model || ''}`.trim()
    : 'Auto sin identificar'

  await getSupabase().from('bot_conversations').update({
    status: 'awaiting_schedule_confirmation',
    language: data.language || 'es',
    vehicle: data.vehicle || null,
    suburb: data.suburb || null,
    job_type: data.job_type || null,
    job_description: data.job_description || null,
    client_availability: data.client_availability || null,
    updated_at: new Date().toISOString(),
  }).eq('id', conv.id)

  if (data.suburb && conv.lead_id) {
    await getSupabase().from('leads').update({ suburb: data.suburb }).eq('id', conv.lead_id)
  }

  // WA notification to Nico
  if (NOTIFY_WA_NUMBER) {
    const waText =
      `📅 *Confirmar horario — ${contactName}*\n\n` +
      `🚗 ${vehicleStr}\n` +
      `📍 ${data.suburb || '?'}\n` +
      `🕐 Disponible: ${data.client_availability || '?'}\n\n` +
      `→ ${APP_URL}/leads/${conv.lead_id}`
    try {
      await sendText(NOTIFY_WA_NUMBER, waText)
    } catch (e: any) {
      console.error('[webhook] Schedule WA notification error:', e.message)
    }
  }

  if (!NOTIFY_SECRET) return

  try {
    await fetch(`${APP_URL}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
      body: JSON.stringify({
        companyId: SUPABASE_COMPANY_ID,
        type: 'schedule_confirm_needed',
        payload: {
          title: `📅 Confirmar horario — ${contactName}`,
          body: `${vehicleStr} · ${data.suburb || '?'} · Disponible: ${data.client_availability || '?'}`,
          url: conv.lead_id ? `/leads/${conv.lead_id}` : '/leads',
        },
      }),
    })
    console.log('[webhook] 🔔 Schedule confirm notification sent')
  } catch (e: any) {
    console.error('[webhook] Schedule confirm notification failed:', e.message)
  }
}

async function attachLeadToConversation(args: {
  conv: any
  message: string
  source: string
  priority: 'high' | 'medium' | 'normal'
  groupName?: string | null
  suburb?: string | null
}) {
  if (args.conv.lead_id) return args.conv.lead_id

  const lead = await createLead({
    senderName: args.conv.contact_name || 'Unknown',
    senderPhone: args.conv.contact_phone || null,
    message: args.message,
    groupName: args.groupName || null,
    priority: args.priority,
    source: args.source,
  })

  if (!lead) return null

  await getSupabase()
    .from('bot_conversations')
    .update({
      lead_id: lead.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.conv.id)

  if (args.suburb) {
    await getSupabase().from('leads').update({ suburb: args.suburb }).eq('id', lead.id)
  }

  await Promise.all([
    sendEmailNotification({
      senderName: args.conv.contact_name || 'Unknown',
      message: args.message,
      groupName: args.groupName || null,
      leadId: lead.id,
      priority: args.priority,
    }),
    sendWANotification({
      senderName: args.conv.contact_name || 'Unknown',
      message: args.message,
      groupName: args.groupName || null,
      leadId: lead.id,
      priority: args.priority,
    }),
    sendPushNotification({
      senderName: args.conv.contact_name || 'Unknown',
      message: args.message,
      groupName: args.groupName || null,
      leadId: lead.id,
      priority: args.priority,
    }),
  ])

  return lead.id
}

async function setLeadStage(leadId: string, stage: string) {
  await getSupabase().from('leads').update({ lifecycle_stage: stage }).eq('id', leadId)
}

async function handleConfirmAppointment(conv: any) {
  await getSupabase().from('bot_conversations').update({
    status: 'scheduled',
    scheduled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', conv.id)
  if (conv.lead_id) {
    await setLeadStage(conv.lead_id, 'activation')
  }
  console.log(`[webhook] ✅ Appointment confirmed for conv ${conv.id}`)
}

async function startConversation(args: {
  leadId?: string | null
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
      lead_id: args.leadId || null,
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

  if (args.leadId) {
    await setLeadStage(args.leadId, 'acquisition')
  }

  await sleep(REPLY_DELAY_MS)
  try {
    await sendMessages(args.contactPhone, response.message)
    console.log(`[webhook] 💬 Bot replied to ${args.senderName}: "${response.message.slice(0, 60)}..."`)
  } catch (e: any) {
    console.error('[webhook] Bot send failed (startConversation):', e.message)
  }

  if (response.action === 'request_schedule_confirm' && conv) {
    await handleRequestScheduleConfirm(conv, response.data, args.senderName)
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
  let response = await askBot(historySlice)
  const updatedMessages = [...allMessages, { role: 'assistant', content: response.message }]
  const priority = detectPriority(args.text)

  await getSupabase()
    .from('bot_conversations')
    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
    .eq('id', args.conv.id)

  // Person replied → engagement stage
  if (args.conv.lead_id) await setLeadStage(args.conv.lead_id, 'engagement')

  // Fire action handlers BEFORE the send delay so they never get cut off by a timeout
  if (response.action === 'request_schedule_confirm') {
    const leadId = await attachLeadToConversation({
      conv: args.conv,
      message: response.data.job_description || args.text,
      source: 'whatsapp_direct',
      priority,
      suburb: response.data.suburb || null,
    })
    if (leadId) {
      args.conv = { ...args.conv, lead_id: leadId }
      await setLeadStage(leadId, 'acquisition')
    }
    await handleRequestScheduleConfirm(args.conv, response.data, args.conv.contact_name || 'Cliente')
  }
  if (response.action === 'confirm_appointment') {
    if (!args.conv.lead_id) {
      const leadId = await attachLeadToConversation({
        conv: args.conv,
        message: response.data.job_description || args.text,
        source: 'whatsapp_direct',
        priority,
        suburb: response.data.suburb || null,
      })
      if (leadId) args.conv = { ...args.conv, lead_id: leadId }
    }
    await handleConfirmAppointment(args.conv)
  }

  await sleep(REPLY_DELAY_MS)
  try {
    await sendMessages(args.contactPhone, response.message)
    console.log(`[webhook] 💬 Bot replied to ${args.conv.contact_name}: "${response.message.slice(0, 60)}..."`)
  } catch (e: any) {
    console.error('[webhook] Bot send failed (handleConversationMessage):', e.message)
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
    // Evolution v2 uses LID addressing in groups: participant is @lid, real phone is in participantAlt
    const senderJid = msg.key?.participantAlt || msg.key?.participant || msg.participant || ''
    if (senderJid.endsWith('@s.whatsapp.net')) {
      senderPhone = senderJid.replace(/@s\.whatsapp\.net$/, '').replace(/:\d+$/, '')
      contactJid = `${senderPhone}@s.whatsapp.net`
    }
    groupName = await getGroupSubject(remoteJid)
    console.log(`[webhook] group lookup for ${remoteJid}: "${groupName}"`)
  }

  // DMs: continue active bot conversation without creating a new lead
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

  if (BOT_CONVERSATION_ENABLED && isDirect && senderPhone && contactJid) {
    await startConversation({
      leadId: lead.id,
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
