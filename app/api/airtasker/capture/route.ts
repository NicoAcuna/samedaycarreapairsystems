import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { sendText } from '@/lib/evolution'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Receives an Airtasker task shared from the iOS Shortcut and turns it into a CRM lead.
// Auth: the Shortcut sends the shared secret in the `x-airtasker-secret` header.
const SUPABASE_USER_ID    = process.env.SUPABASE_USER_ID!
const SUPABASE_COMPANY_ID = process.env.SUPABASE_COMPANY_ID!
const NOTIFY_SECRET       = process.env.NOTIFY_SECRET
const NOTIFY_WA_NUMBER    = process.env.NOTIFY_WA_NUMBER
const APP_URL             = process.env.APP_URL || 'https://samedaycarreapairsystems.vercel.app'
const CAPTURE_SECRET      = process.env.AIRTASKER_CAPTURE_SECRET

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

type CaptureBody = {
  url?: string
  title?: string
  text?: string
  suburb?: string
}

// The iOS share sheet often dumps everything into one string — pull the task URL out of it.
function extractUrl(s: string | undefined): string | null {
  if (!s) return null
  const m = s.match(/https?:\/\/\S+/)
  return m ? m[0] : null
}

export async function POST(req: NextRequest) {
  // Fail closed: no secret configured → endpoint disabled, not open.
  if (!CAPTURE_SECRET) {
    return NextResponse.json({ error: 'Capture endpoint not configured' }, { status: 503 })
  }
  const incoming = req.headers.get('x-airtasker-secret') || ''
  if (!safeEqual(incoming, CAPTURE_SECRET)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as CaptureBody | null
  if (!body) return NextResponse.json({ error: 'Bad body' }, { status: 400 })

  const url = body.url || extractUrl(body.text) || extractUrl(body.title)
  const rawText = [body.title, body.text].filter(Boolean).join(' — ').trim()

  // Headline shown in the CRM list — prefer an explicit title, else first line of text.
  const headline =
    (body.title && body.title.trim()) ||
    (rawText.split('\n')[0] || '').trim() ||
    'Airtasker task'

  const message = [rawText || headline, url].filter(Boolean).join('\n\n')

  const supabase = getSupabase()

  // Dedupe by task URL so a re-shared / retried Shortcut doesn't create dupes.
  if (url) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', SUPABASE_COMPANY_ID)
      .eq('source', 'airtasker')
      .eq('source_detail', url)
      .limit(1)
    if (existing && existing.length) {
      return NextResponse.json({ ok: true, deduped: true, leadId: existing[0].id })
    }
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert([{
      user_id:       SUPABASE_USER_ID,
      company_id:    SUPABASE_COMPANY_ID,
      first_name:    headline.slice(0, 80),
      last_name:     null,
      source:        'airtasker',
      source_detail: url || null,
      message,
      suburb:        body.suburb || null,
      status:        'new',
    }])
    .select()
    .single()

  if (error) {
    console.error('[airtasker] create lead error:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  console.log(`[airtasker] ✅ Lead created: ${headline.slice(0, 60)} (${lead.id})`)

  // Same alert channels as the WhatsApp leads (best-effort, never block the response).
  await Promise.allSettled([
    NOTIFY_WA_NUMBER
      ? sendText(
          NOTIFY_WA_NUMBER,
          `🔨 *Nuevo lead Airtasker*\n\n` +
            `📝 ${headline}\n` +
            (body.suburb ? `📍 ${body.suburb}\n` : '') +
            (url ? `🔗 ${url}\n` : '') +
            `\n→ ${APP_URL}/leads/${lead.id}`,
        )
      : Promise.resolve(),
    NOTIFY_SECRET
      ? fetch(`${APP_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
          body: JSON.stringify({
            companyId: SUPABASE_COMPANY_ID,
            type: 'airtasker_lead',
            payload: { title: '🔨 Nuevo lead Airtasker', body: headline, url: `/leads/${lead.id}` },
          }),
        })
      : Promise.resolve(),
  ])

  return NextResponse.json({ ok: true, leadId: lead.id })
}
