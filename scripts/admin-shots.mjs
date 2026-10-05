// Screenshots for docs/admin-guide-for-hema.md (phone size), from the dev server's practice
// database. Needs the dev server as in scripts/qa-step6.mjs. Run: node scripts/admin-shots.mjs
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'

const BASE = 'http://localhost:5173'
const OUT = 'docs/screenshots/step6/admin'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const post = (name, body) => fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())

// An order with a name, a drawing and a UTR to check, like a real one
const made = await post('create-order', {
  idempotencyKey: `shots-${Date.now()}-abcdefgh`,
  items: [
    { productId: 'pista-delight-box', selection: { size: '500g', name: 'Happy Birthday Amma', drawing: true, drawingText: 'A small pink teddy bear holding a balloon' }, qty: 1, unitPrice: 1950 },
    { productId: 'walnut-brownies', selection: { ragi: true }, qty: 2, unitPrice: 700 },
  ],
  customer: { name: 'Kavya Nair', phone: '9886512345', email: '', line1: '22, Green Park Apartments', line2: '2nd Main, Indiranagar', city: 'Bengaluru', pincode: '560038', state: 'karnataka', landmark: 'Near the temple', note: 'Please call before delivering' },
  dispatchDate: dateChoices(new Date(), 1, dispatchRules({ drawing: true }))[0],
  expectedTotal: 1950 + 1400 + 100,
})
const code = made.order.code
await post('submit-payment', { code, phone: '9886512345', utr: '612398745601' })

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage()
const shot = (name, full = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })

await page.goto(`${BASE}/admin`)
await page.waitForSelector('input[type=email]')
await page.fill('input[type=email]', ADMIN.email)
await shot('1-login')
await page.fill('input[type=password]', ADMIN.password)
await page.click('button[type=submit]')
await page.waitForSelector('[role=tablist]')
await sleep(800)
await shot('2-orders')
await page.goto(`${BASE}/admin/orders/${code}`)
await page.waitForSelector('[data-admin-utr]')
await sleep(500)
await shot('3-order', true)
await page.click('[data-admin-action=paymentReceived]')
await page.waitForSelector('[data-admin-action=shipped]')
await page.click('[data-admin-action=shipped]')
await page.fill('input[placeholder^="e.g. DTDC"]', 'DTDC')
await page.locator('label:has-text("Tracking number") input').fill('D12345678')
await page.locator('[data-admin-confirm=shipped]').scrollIntoViewIfNeeded()
await shot('4-shipped')
await page.goto(`${BASE}/admin/menu`)
await page.waitForSelector('[data-admin-product]')
await sleep(400)
await shot('5-menu')
await page.goto(`${BASE}/admin/settings`)
await page.waitForSelector('[data-admin-save-settings]')
await sleep(400)
await shot('6-settings', true)
await page.goto(`${BASE}/admin/enquiries`)
await sleep(800)
await shot('7-classes')
await browser.close()
console.log(`admin screenshots in ${OUT} (order ${code})`)
