const BASE_URL = process.env.EVOLUTION_API_URL   // e.g. https://evolution-xxx.railway.app
const API_KEY  = process.env.EVOLUTION_API_KEY   // global API key
const INSTANCE = process.env.EVOLUTION_INSTANCE  // instance name

export async function sendText(to: string, text: string) {
  if (!BASE_URL || !API_KEY || !INSTANCE) throw new Error('Evolution API not configured')
  const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: API_KEY },
    body: JSON.stringify({ number: to, text }),
  })
  if (!res.ok) throw new Error(`Evolution sendText ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getGroupSubject(groupJid: string): Promise<string | null> {
  if (!BASE_URL || !API_KEY || !INSTANCE) return null
  try {
    const url = `${BASE_URL}/group/findGroupInfos/${encodeURIComponent(INSTANCE)}?groupJid=${encodeURIComponent(groupJid)}`
    const res = await fetch(url, { headers: { apikey: API_KEY } })
    if (!res.ok) {
      console.error(`[evolution] getGroupSubject ${res.status}: ${await res.text()}`)
      return null
    }
    const data = await res.json()
    // Evolution v2 may return an array or a single object
    const obj = Array.isArray(data) ? data[0] : data
    return obj?.subject ?? obj?.name ?? null
  } catch (e: any) {
    console.error('[evolution] getGroupSubject error:', e.message)
    return null
  }
}
