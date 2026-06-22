// One-time interactive login. Run this LOCALLY (headful, on a machine with a
// screen) — not on the server. It opens a real browser window, you log in to
// the company's Facebook account by hand (password + any 2FA challenge), and
// once Facebook shows the home feed it saves the session to storage-state.json.
//
// Copy that file to the server (next to index.js, or wherever
// FB_STORAGE_STATE_PATH points) so the headless bot can reuse the same
// logged-in session without ever touching Facebook's login form.
//
//   node login.js
//
const { chromium } = require('playwright')

const STORAGE_STATE_PATH = process.env.FB_STORAGE_STATE_PATH || './storage-state.json'

async function main() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('https://www.facebook.com/login')
  console.log('👉 Log in to the company Facebook account in the opened window.')
  console.log('   Complete any 2FA/checkpoint Facebook asks for.')
  console.log('   Waiting for the home feed to load...')

  // Logged in once the login form is gone and the feed/home chrome shows up.
  await page.waitForURL(/facebook\.com\/(\?.*)?$/, { timeout: 0 }).catch(() => {})
  await page.waitForSelector('[role="feed"], [aria-label="Facebook"]', { timeout: 0 })

  await context.storageState({ path: STORAGE_STATE_PATH })
  console.log(`✅ Session saved to ${STORAGE_STATE_PATH}`)
  console.log('   Copy this file to the server and start the bot with: npm start')

  await browser.close()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
