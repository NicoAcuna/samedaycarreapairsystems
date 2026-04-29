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
    const res = await fetch(
      `${BASE_URL}/group/findGroupInfos/${INSTANCE}?groupJid=${encodeURIComponent(groupJid)}`,
      { headers: { apikey: API_KEY } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.subject ?? null
  } catch {
    return null
  }
}
