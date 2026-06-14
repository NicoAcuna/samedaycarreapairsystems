// Facebook groups scraper — LOCAL ONLY (residential IP, never the cloud).
// Reads the combined groups feed with your saved session, extracts recent posts,
// and sends them to /api/facebook/capture (which filters + creates leads).
//
//   FACEBOOK_CAPTURE_SECRET=xxxx node scripts/facebook/scrape.mjs
//
// Goes low-and-slow on purpose to keep the (new) account from getting flagged.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const SESSION     = 'credentials/facebook_session.json'
const SEEN        = 'credentials/facebook_seen.json'
const CAPTURE_URL = process.env.FB_CAPTURE_URL || 'https://samedaycarreapairsystems.vercel.app/api/facebook/capture'
const SECRET      = process.env.FACEBOOK_CAPTURE_SECRET || ''
const FEED        = 'https://www.facebook.com/groups/feed/'
const MAX_SCROLLS = Number(process.env.FB_SCROLLS || 8)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const rand  = (a, b) => a + Math.floor(Math.random() * (b - a))

if (!existsSync(SESSION)) {
  console.error('[fb] No hay sesión. Corré primero:  node scripts/facebook/login.mjs')
  process.exit(1)
}
if (!SECRET) {
  console.error('[fb] Falta FACEBOOK_CAPTURE_SECRET. Corré:  FACEBOOK_CAPTURE_SECRET=xxxx node scripts/facebook/scrape.mjs')
  process.exit(1)
}

const seen = existsSync(SEEN) ? new Set(JSON.parse(readFileSync(SEEN, 'utf8'))) : new Set()

const browser = await chromium.launch({ headless: false })
const ctx = await browser.newContext({ storageState: SESSION, viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

console.log('[fb] abriendo feed de grupos…')
await page.goto(FEED, { waitUntil: 'domcontentloaded' })
await sleep(rand(3000, 6000))

// Human-like scrolling to load more posts
for (let i = 0; i < MAX_SCROLLS; i++) {
  await page.mouse.wheel(0, rand(800, 1600))
  await sleep(rand(1500, 3500))
}

const posts = await page.$$eval('[role="article"]', (arts) => {
  // FB often duplicates link text (visible + aria-hidden) → "NameName". Halve it.
  const clean = (s) => {
    s = (s || '').replace(/\s+/g, ' ').trim()
    const h = s.length / 2
    if (s.length % 2 === 0 && s.slice(0, h) === s.slice(h)) s = s.slice(0, h)
    return s
  }
  const out = []
  for (const a of arts) {
    const text = (a.innerText || '').trim()
    if (!text || text.length < 15) continue
    let url = null
    let author = ''
    let groupId = null
    let groupName = ''
    const links = a.querySelectorAll('a[href]')
    for (const l of links) {
      const h = l.href || ''
      if (!url && /\/groups\/[^/]+\/(posts|permalink)\//.test(h)) url = h.split('?')[0]
      if (!author) {
        const t = clean(l.textContent || '')
        if (t && t.length > 1 && t.length < 60 && !t.includes('\n')) author = t
      }
    }
    if (url) { const m = url.match(/\/groups\/([^/]+)\//); if (m) groupId = m[1] }
    // Group name: the link pointing at this group that has visible text
    for (const l of links) {
      const h = l.href || ''
      if (!/\/groups\/\d+|\/groups\/[\w.]+/.test(h)) continue
      if (/\/(posts|permalink|user|members|media|events|about|search)\b/.test(h)) continue
      if (groupId && !h.includes(`/groups/${groupId}`)) continue
      const t = clean(l.textContent || '')
      if (t && t.length > 1 && t.length < 100 && !t.includes('\n')) { groupName = t; break }
    }
    out.push({ url, author, text, group: groupName, groupId })
  }
  return out
})

await browser.close()

const fresh = posts.filter((p) => p.text && (!p.url || !seen.has(p.url)))
console.log(`[fb] posts leídos: ${posts.length} · nuevos: ${fresh.length}`)
if (!fresh.length) {
  console.log('[fb] nada nuevo, listo.')
  process.exit(0)
}

const payload = JSON.stringify({ posts: fresh.map((p) => ({ url: p.url, author: p.author, text: p.text, group: p.group, groupId: p.groupId })) })

async function postWithRetry(tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      return await fetch(CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-facebook-secret': SECRET },
        body: payload,
        signal: AbortSignal.timeout(30000),
      })
    } catch (e) {
      const reason = e?.cause?.code || e?.message || 'error'
      console.error(`[fb] envío intento ${i}/${tries} falló (${reason})`)
      if (i < tries) await sleep(rand(3000, 7000))
    }
  }
  throw new Error('No se pudo conectar al endpoint tras varios intentos (revisá tu conexión a internet)')
}

const res = await postWithRetry()
const body = await res.json().catch(() => ({}))
console.log('[fb] capture →', res.status, JSON.stringify(body))

for (const p of fresh) if (p.url) seen.add(p.url)
writeFileSync(SEEN, JSON.stringify([...seen].slice(-2000)))
console.log('[fb] ✅ listo.')
