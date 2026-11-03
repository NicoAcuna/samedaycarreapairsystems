import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Configure VAPID lazily on first send instead of at module import. Doing it at
// import time crashed any route that imports this module (e.g. /api/notify) —
// and broke the build's page-data collection — whenever the VAPID env vars were
// absent or misconfigured. Returns false if push isn't configured.
let vapidReady: boolean | null = null
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady
  const email = process.env.VAPID_EMAIL
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!email || !pub || !priv) {
    console.warn('[push] VAPID not configured — skipping push sends')
    vapidReady = false
    return false
  }
  try {
    webpush.setVapidDetails(email, pub, priv)
    vapidReady = true
  } catch (e: any) {
    console.error('[push] VAPID setup failed:', e?.message)
    vapidReady = false
  }
  return vapidReady
}

export type PushEventType =
  | 'new_lead'
  | 'lead_ready_to_schedule'
  | 'lead_needs_answer'

export type PushPayload = {
  title: string
  body: string
  url?: string
}

// Send a push to every device registered for a company.
// Uses service role so it can read all subscriptions regardless of RLS.
export async function sendPushToCompany(companyId: string, payload: PushPayload) {
  // No push config → no-op (the notification row is still written by the caller).
  if (!ensureVapid()) return { sent: 0, failed: 0 }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('company_id', companyId)

  console.log('[push] subscriptions found:', subs?.length ?? 0, 'for company', companyId)
  if (!subs?.length) return { sent: 0, failed: 0 }

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err) => {
          console.error('[push] send error', err?.statusCode, sub.endpoint.slice(-30))
          // 410 Gone / 404 Not Found = subscription is no longer valid — remove it
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          throw err
        })
    )
  )

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  }
}
