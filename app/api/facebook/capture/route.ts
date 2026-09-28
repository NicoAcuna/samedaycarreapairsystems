import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'
import { sendText } from '@/lib/evolution'
import { loadCriteria, shouldTriggerWith, detectPriorityWith } from '@/lib/leadCriteria'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Receives Facebook group posts scraped locally, filters them with the user's
// Facebook criteria, dedupes by post URL, and creates leads + alerts.
// Auth: the scraper sends the shared secret in the `x-facebook-secret` header.
const SUPABASE_USER_ID    = process.env.SUPABASE_USER_ID!
const SUPABASE_COMPANY_ID = process.env.SUPABASE_COMPANY_ID!
const NOTIFY_SECRET       = process.env.NOTIFY_SECRET
const NOTIFY_WA_NUMBER    = process.env.NOTIFY_WA_NUMBER
const APP_URL             = process.env.APP_URL || 'https://samedaycarreapairsystems.vercel.app'
const CAPTURE_SECRET      = process.env.FACEBOOK_CAPTURE_SECRET

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PRIORITY_LABEL = { high: '🔴 Alta', medium: '🟡 Media', normal: '⚪ Normal' }

type Post = { url?: string; author?: string; group?: string; groupId?: string; text?: string }

type SB = ReturnType<typeof getSupabase>

// Record every group a post comes from so the user can pick which ones to monitor.
async function upsertGroup(supabase: SB, groupId: string, groupName: string | null) {
  try {
    const row: Record<string, any> = {
      company_id: SUPABASE_COMPANY_ID,
      group_id: groupId,
      group_url: `https://www.facebook.com/groups/${groupId}`,
      last_seen: new Date().toISOString(),
    }
    if (groupName) row.group_name = groupName
    await supabase.from('facebook_groups').upsert(row, { onConflict: 'company_id,group_id' })
  } catch (e: any) {
    console.error('[facebook] upsertGroup error:', e.message)
  }
}

// Monitored unless an explicit active=false row exists (unknown groups default on).
async function isGroupActive(supabase: SB, groupId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('facebook_groups')
      .select('active')
      .eq('company_id', SUPABASE_COMPANY_ID)
      .eq('group_id', groupId)
      .maybeSingle()
    return !data || data.active !== false
  } catch {
    return true
  }
}

async function alertLead(args: { name: string; text: string; group: string | null; leadId: string; priority: string; url: string | null }) {
  const label = PRIORITY_LABEL[args.priority as keyof typeof PRIORITY_LABEL] || PRIORITY_LABEL.normal
  await Promise.allSettled([
    NOTIFY_WA_NUMBER
      ? sendText(
          NOTIFY_WA_NUMBER,
          `👥 *Nuevo lead Facebook*\n\n` +
            `⚡ ${label}\n` +
            `👤 ${args.name}\n` +
            (args.group ? `💬 ${args.group}\n` : '') +
            `📝 ${args.text.slice(0, 200)}\n` +
            (args.url ? `🔗 ${args.url}\n` : '') +
            `\n→ ${APP_URL}/leads/${args.leadId}`,
        )
      : Promise.resolve(),
    NOTIFY_SECRET
      ? fetch(`${APP_URL}/api/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-notify-secret': NOTIFY_SECRET },
          body: JSON.stringify({
            companyId: SUPABASE_COMPANY_ID,
            type: 'facebook_lead',
            payload: {
              title: `👥 Nuevo lead Facebook — ${args.name}`,
              body: [args.group, args.text.slice(0, 80)].filter(Boolean).join(' · '),
              url: `/leads/${args.leadId}`,
            },
          }),
        })
      : Promise.resolve(),
  ])
}

export async function POST(req: NextRequest) {
  // Fail closed: if the secret isn't configured, the endpoint is disabled rather
  // than open to anonymous lead injection.
  if (!CAPTURE_SECRET) {
    return NextResponse.json({ error: 'Capture endpoint not configured' }, { status: 503 })
  }
  const incoming = req.headers.get('x-facebook-secret') || ''
  if (!safeEqual(incoming, CAPTURE_SECRET)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { posts?: Post[]; groups?: Array<{ groupId?: string; group?: string }> } | Post | null
  if (!body) return NextResponse.json({ error: 'Bad body' }, { status: 400 })

  // Pure group discovery (no leads) — from the user's joined-groups list.
  if (Array.isArray((body as any).groups)) {
    const supabase = getSupabase()
    let discovered = 0
    for (const g of (body as any).groups as Array<{ groupId?: string; group?: string }>) {
      if (g?.groupId) { await upsertGroup(supabase, String(g.groupId), g.group || null); discovered++ }
    }
    return NextResponse.json({ ok: true, discovered })
  }
  const posts: Post[] = Array.isArray((body as any).posts)
    ? (body as any).posts
    : (body as Post).text ? [body as Post] : []
  if (!posts.length) return NextResponse.json({ ok: true, created: 0, skipped: 0 })

  const crit = await loadCriteria('facebook')
  // No criteria configured for Facebook → don't guess, create nothing.
  if (!crit || crit.trigger.length === 0) {
    return NextResponse.json({ ok: true, created: 0, skipped: posts.length, reason: 'no_criteria' })
  }

  const supabase = getSupabase()
  let created = 0
  let skipped = 0

  for (const p of posts) {
    const text = (p.text || '').trim()
    if (!text) { skipped++; continue }

    // Discover the group (even if this post doesn't match) so it shows in the panel,
    // then skip posts from groups the user turned off.
    if (p.groupId) {
      await upsertGroup(supabase, p.groupId, p.group || null)
      if (!(await isGroupActive(supabase, p.groupId))) { skipped++; continue }
    }

    if (!shouldTriggerWith(text, crit)) { skipped++; continue }

    // Dedupe by post URL so re-runs don't create duplicates.
    if (p.url) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', SUPABASE_COMPANY_ID)
        .eq('source', 'facebook_group')
        .eq('source_detail', p.url)
        .limit(1)
      if (existing && existing.length) { skipped++; continue }
    }

    const priority = detectPriorityWith(text, crit)
    const name = (p.author || 'Facebook').trim()
    const parts = name.split(/\s+/)

    const { data: lead, error } = await supabase
      .from('leads')
      .insert([{
        user_id:       SUPABASE_USER_ID,
        company_id:    SUPABASE_COMPANY_ID,
        first_name:    parts[0] || 'Facebook',
        last_name:     parts.slice(1).join(' ') || null,
        source:        'facebook_group',
        source_detail: p.url || null,
        message:       p.group ? `${text}\n\nGrupo: ${p.group}` : text,
        status:        'new',
        notes:         `Prioridad: ${PRIORITY_LABEL[priority]}`,
      }])
      .select()
      .single()

    if (error) { console.error('[facebook] create lead error:', error.message); continue }
    created++
    console.log(`[facebook] ✅ Lead: ${name} — "${text.slice(0, 60)}"`)
    await alertLead({ name, text, group: p.group || null, leadId: lead.id, priority, url: p.url || null })
  }

  return NextResponse.json({ ok: true, created, skipped })
}
