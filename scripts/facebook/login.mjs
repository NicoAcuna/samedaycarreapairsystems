// One-time Facebook login for the scraper. Saves the session so scrape.mjs
// can reuse it without re-authenticating.
//   node scripts/facebook/login.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import readline from 'node:readline'

const SESSION = 'credentials/facebook_session.json'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((r) => rl.question(q, r))

console.log('\n=== Facebook login (cuenta NUEVA del scraper) ===\n')
console.log('Se abre Chrome. Iniciá sesión en Facebook con tu cuenta nueva.')
console.log('Cuando veas tu feed, volvé a esta terminal y apretá ENTER.\n')

mkdirSync(dirname(SESSION), { recursive: true })

const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] })
const ctx = await browser.newContext({ viewport: null })
const page = await ctx.newPage()
await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' })

await ask('[fb-login] Apretá ENTER cuando estés logueado y veas tu feed... ')

await ctx.storageState({ path: SESSION })
await browser.close()
rl.close()
console.log(`\n[fb-login] ✅ Sesión guardada en ${SESSION}\n`)
