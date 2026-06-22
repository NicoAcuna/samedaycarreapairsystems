const { chromium } = require('playwright')
const fs = require('fs')
const http = require('http')

// ── CONFIG ────────────────────────────────────────────────────────────────────
const APP_URL              = process.env.APP_URL || 'https://samedaycarreapairsystems.vercel.app'
const CAPTURE_SECRET       = process.env.FACEBOOK_CAPTURE_SECRET
const STORAGE_STATE_PATH   = process.env.FB_STORAGE_STATE_PATH || './storage-state.json'
const SEEN_POSTS_PATH      = process.env.FB_SEEN_POSTS_PATH || './seen-posts.json'
const POLL_INTERVAL_MS     = Number(process.env.FB_POLL_INTERVAL_MS || 5 * 60 * 1000)
const SCROLL_PASSES        = Number(process.env.FB_SCROLL_PASSES || 6)
const PORT                 = process.env.PORT || 3000
const MAX_SEEN             = 3000

if (!CAPTURE_SECRET) console.warn('⚠️  FACEBOOK_CAPTURE_SECRET not set — capture endpoint may reject requests')

// ── SEEN-POST DEDUPE (persisted across restarts) ────────────────────────────
function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_POSTS_PATH, 'utf8')))
  } catch {
    return new Set()
  }
}

function saveSeen(seen) {
  const arr = Array.from(seen).slice(-MAX_SEEN)
  fs.writeFileSync(SEEN_POSTS_PATH, JSON.stringify(arr))
}

// ── STATUS (for the health-check server) ────────────────────────────────────
let lastStatus = { startedAt: new Date().toISOString(), lastRun: null, lastError: null, lastFound: 0 }

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(lastStatus, null, 2))
}).listen(PORT, () => console.log(`🌐 Status server on port ${PORT}`))

// ── SCRAPE ────────────────────────────────────────────────────────────────────
async function scrapePosts(page) {
  // The unified "Group feed" aggregates posts from every group you've joined,
  // each post tagged with its source group — exactly the surface we need.
  await page.goto('https://www.facebook.com/groups/feed/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('[role="feed"]', { timeout: 30000 }).catch(() => {})

  for (let i = 0; i < SCROLL_PASSES; i++) {
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(1500)
  }

  // Selectors below target Facebook's current DOM and WILL break when Facebook
  // changes its markup — that's an inherent cost of scraping an undocumented UI.
  return page.evaluate(() => {
    const posts = []
    const articles = document.querySelectorAll('[role="feed"] > div [role="article"]')
    articles.forEach(article => {
      const links = Array.from(article.querySelectorAll('a[href*="/groups/"]'))

      const groupLink = links.find(a => /\/groups\/[^/]+\/?$/.test(a.getAttribute('href') || ''))
      const postLink = links.find(a => /\/groups\/[^/]+\/(posts|permalink)\/[^/?]+/.test(a.getAttribute('href') || ''))
      if (!postLink) return

      const href = postLink.getAttribute('href') || ''
      const url = href.startsWith('http') ? href : `https://www.facebook.com${href}`

      const authorLink = article.querySelector('h2 a, h3 a, strong a')
      const author = authorLink ? authorLink.textContent.trim() : null

      const textEl = article.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]')
      const text = textEl ? textEl.innerText.trim() : ''

      const groupHref = groupLink ? groupLink.getAttribute('href') || '' : ''
      const groupIdMatch = groupHref.match(/\/groups\/([^/?]+)/)

      posts.push({
        url,
        author,
        text,
        group: groupLink ? groupLink.textContent.trim() : null,
        groupId: groupIdMatch ? groupIdMatch[1] : null,
      })
    })
    return posts
  })
}

async function sendToCapture(posts) {
  const res = await fetch(`${APP_URL}/api/facebook/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(CAPTURE_SECRET ? { 'x-facebook-secret': CAPTURE_SECRET } : {}),
    },
    body: JSON.stringify({ posts }),
  })
  if (!res.ok) throw new Error(`capture endpoint ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── MAIN LOOP ─────────────────────────────────────────────────────────────────
async function runOnce(context) {
  const seen = loadSeen()
  const page = await context.newPage()
  try {
    const posts = await scrapePosts(page)
    const fresh = posts.filter(p => p.url && p.text && !seen.has(p.url))

    if (fresh.length) {
      const result = await sendToCapture(fresh)
      console.log(`✅ Sent ${fresh.length} posts — created ${result.created ?? '?'}, skipped ${result.skipped ?? '?'}`)
      fresh.forEach(p => seen.add(p.url))
      saveSeen(seen)
    } else {
      console.log('— No new posts this pass')
    }

    lastStatus = { ...lastStatus, lastRun: new Date().toISOString(), lastError: null, lastFound: fresh.length }
  } catch (e) {
    console.error('❌ Scrape pass failed:', e.message)
    lastStatus = { ...lastStatus, lastRun: new Date().toISOString(), lastError: e.message }
  } finally {
    await page.close()
  }
}

async function main() {
  if (!fs.existsSync(STORAGE_STATE_PATH)) {
    console.error(`❌ ${STORAGE_STATE_PATH} not found — run "npm run login" locally first and copy the file here.`)
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH })

  console.log(`🤖 Facebook group monitor started — polling every ${Math.round(POLL_INTERVAL_MS / 60000)}m`)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await runOnce(context)
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
