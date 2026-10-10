// Admin QA: every admin screen at phone size (and desktop), in the demo and in the real admin on
// the practice database. Checks: no console errors, no sideways scroll, every button 48px or more,
// the flows Hema uses (log in, see an order, mark it shipped, change a price, mark sold out, see
// class bookings, block a slot, download a report, setup check), and that customers never get the
// admin code. Screenshots: docs/screenshots/admin/ (used by docs/admin-guide-for-hema.md).
//
// Needs the dev server with the practice database (a fresh folder each run is best):
//   UPI_ID=dreamkitchen@okaxis HEMA_EMAIL=hema@example.com DK_DEV_ADMIN_EMAIL=hema@example.com \
//   DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 DK_DEV_DATA_DIR=.dev-data/qa-admin npx vite --port 5173
// then: node scripts/qa-admin.mjs   (exits non-zero on any problem; report in docs/screenshots/admin/qa-report.json)
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { bookableSaturdays } from '../src/lib/classes.js'

const BASE = process.env.DK_BASE || 'http://localhost:5173'
const OUT = process.env.DK_OUT || 'docs/screenshots/admin'
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
const SHOTS = process.env.DK_SHOTS !== '0'
mkdirSync(OUT, { recursive: true })
const report = { consoleErrors: [], overflow: [], smallTargets: [], flows: [], failures: [] }
const fail = (m) => {
  report.failures.push(m)
  console.error('FAIL', m)
}
const ok = (m) => {
  report.flows.push(m)
  console.log('ok  ', m)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const post = (name, body) => fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))

/* ---------- sample data in the practice database, made through the real website functions ---------- */
async function seedPractice() {
  const order = await post('create-order', {
    idempotencyKey: `qa-admin-${Date.now()}-abcdefgh`,
    items: [
      { productId: 'pista-delight-box', selection: { size: '500g', name: 'Happy Birthday Amma', drawing: true, drawingText: 'A small pink teddy bear holding a balloon' }, qty: 1, unitPrice: 1950 },
      { productId: 'walnut-brownies', selection: { ragi: true }, qty: 2, unitPrice: 700 },
    ],
    customer: { name: 'Kavya Nair', phone: '9886512345', email: 'kavya@example.com', line1: '22, Green Park Apartments', line2: '2nd Main, Indiranagar', city: 'Bengaluru', pincode: '560038', state: 'karnataka', landmark: 'Near the temple', note: 'Please call before delivering' },
    dispatchDate: dateChoices(new Date(), 1, dispatchRules({ drawing: true }))[0],
    expectedTotal: 1950 + 1400 + 100,
  })
  if (order.status !== 201) throw new Error(`seed order: ${JSON.stringify(order.body)}`)
  const code = order.body.order.code
  await post('submit-payment', { code, phone: '9886512345', utr: '612398745601' })
  const b = await post('create-booking', { idempotencyKey: `qa-admin-b-${Date.now()}-abcdefgh`, classId: 'brownie', weekend: bookableSaturdays(new Date())[0], slot: 'morning', name: 'Meera Krishnan', phone: '9000012345', email: 'meera@example.com', expectedFee: 3500, lang: 'en' })
  if (b.status !== 201) throw new Error(`seed booking: ${JSON.stringify(b.body)}`)
  await post('submit-payment', { code: b.body.booking.code, phone: '9000012345', utr: '512345678901' })
  await post('class-enquiry', { kind: 'general', name: 'Sunitha', phone: '9000088888', message: 'Do you take bulk orders for a wedding?', lang: 'en' })
  return { code, booking: b.body.booking.code }
}

/* ---------- page checks ---------- */
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const small = []
    document.querySelectorAll('a[href], button, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea, label:has(input[type=file])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only') || getComputedStyle(el).visibility === 'hidden') return
      if (b.height < 47.5 || (b.width < 47.5 && !el.matches('input, select, textarea'))) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small }
  })
  if (r.overflow > 1) report.overflow.push(`${label}: ${r.overflow}px`)
  for (const s of r.small) report.smallTargets.push(`${label}: ${s}`)
}

async function newPage(browser, width = 390, height = 844) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: width < 768, isMobile: width < 768, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.consoleErrors.push(`${page.url()}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/status of 40[134]/.test(m.text()) && report.consoleErrors.push(`${page.url()}: ${m.text()}`))
  return { ctx, page }
}
const shot = async (page, name, full = false) => {
  if (SHOTS) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
}

async function screens(page, prefix, base, { code, booking }) {
  const visit = async (path, ready, name, full = false) => {
    await page.goto(`${base}${path}`)
    await page.waitForSelector(ready, { timeout: 15000 })
    await sleep(350)
    await audit(page, `${prefix}${path}`)
    await shot(page, `${prefix}${name}`, full)
  }
  await visit('', '[data-admin-card=payments]', '01-home')
  await visit('/orders', '[data-admin-order]', '02-orders')
  await visit(`/orders/${code}`, '[data-admin-history]', '03-order', true)
  await visit(`/orders/${code}/slip`, '[data-admin-packing-slip]', '04-packing-slip', true)
  await visit('/classes', '[data-admin-booking]', '05-class-bookings')
  await visit('/classes?tab=attendees', '[data-admin-attendees]', '06-class-attendees', true)
  await visit('/classes?tab=weekends', '[data-admin-weekend-card]', '07-class-weekends')
  await visit('/classes?tab=fees', '[data-admin-save-classes]', '08-class-fees', true)
  await visit(`/classes/bookings/${booking}`, '[data-admin-booking-action], h1', '09-booking', true)
  await visit('/menu', '[data-admin-product]', '10-menu')
  await visit('/more', '[data-admin-more]', '11-more')
  await visit('/settings', '[data-admin-save-settings]', '12-settings', true)
  await visit('/enquiries', '[data-admin-enquiry]', '13-enquiries')
  await visit('/reports', '[data-admin-monthly]', '14-reports')
  await visit('/setup', '[data-admin-setup]', '15-setup-check')
}

const browser = await chromium.launch()
try {
  /* ---------- 1. the demo: no login, sample data, nothing real ---------- */
  {
    const { ctx, page } = await newPage(browser)
    const realCalls = []
    page.on('request', (r) => r.url().includes('/api/') && realCalls.push(r.url()))
    await page.goto(`${BASE}/admin/demo`)
    await page.waitForSelector('[data-admin-demo]')
    ok('demo opens without a login, with the DEMO label')
    await page.waitForSelector('[data-admin-card=toPack]')
    const demoOrder = await page.evaluate(async () => {
      const a = [...document.querySelectorAll('a')].find((x) => /orders\?tab=paid/.test(x.href))
      return a ? a.href : null
    })
    if (!demoOrder) fail('demo home has no "Orders to pack" card')
    await page.goto(`${BASE}/admin/demo/orders?tab=paid`)
    await page.waitForSelector('[data-admin-order]')
    const code = await page.getAttribute('[data-admin-order]', 'data-admin-order')
    await page.goto(`${BASE}/admin/demo/classes`)
    await page.waitForSelector('[data-admin-booking]')
    const booking = await page.getAttribute('[data-admin-booking]', 'data-admin-booking')
    await screens(page, 'demo-', `${BASE}/admin/demo`, { code, booking })
    // A change in the demo works on the page (the history grows) but never reaches the server
    await page.goto(`${BASE}/admin/demo/orders/${code}`)
    await page.waitForSelector('[data-admin-action=preparing]')
    await page.click('[data-admin-action=preparing]')
    await page.waitForSelector('[data-admin-action=shipped]')
    ok('demo: "Preparing" works on sample data')
    if (realCalls.length) fail(`demo called the real server: ${realCalls.slice(0, 3).join(', ')}`)
    else ok('demo made 0 calls to /api (it can’t touch real data)')
    // Phone menu at the cheapest common size too
    const small = await newPage(browser, 360, 740)
    await small.page.goto(`${BASE}/admin/demo/orders/${code}`)
    await small.page.waitForSelector('[data-admin-history]')
    await sleep(300)
    await audit(small.page, 'demo 360px order')
    await small.ctx.close()
    await ctx.close()
  }

  /* ---------- 2. the real admin on the practice database ---------- */
  const seeded = await seedPractice()
  const { ctx, page } = await newPage(browser)
  await page.goto(`${BASE}/admin`)
  await page.waitForSelector('input[type=email]')
  await page.fill('input[type=email]', ADMIN.email)
  await shot(page, '00-login')
  await audit(page, 'login')
  // Forgot password screen
  await page.click('[data-admin-forgot]')
  await page.waitForSelector('text=Send me the link')
  await shot(page, '00-forgot-password')
  await page.click('[data-admin-forgot]')
  await page.fill('input[type=password]', 'wrong-password')
  await page.click('button[type=submit]')
  await page.waitForSelector('[role=alert]')
  ok('a wrong password says so in plain words')
  await page.fill('input[type=password]', ADMIN.password)
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-admin-card=newOrders]')
  ok('Hema logs in and lands on Home')
  await screens(page, '', `${BASE}/admin`, seeded)

  // Flow: check the UPI payment, prepare, ship (courier + tracking), deliver
  await page.goto(`${BASE}/admin/orders/${seeded.code}`)
  await page.waitForSelector('[data-admin-utr]')
  await page.click('[data-admin-action=paymentReceived]')
  await page.waitForSelector('[data-admin-action=preparing]')
  await page.click('[data-admin-action=preparing]')
  await page.waitForSelector('text=Saved. The customer has been emailed.')
  await page.click('[data-admin-action=shipped]')
  await page.fill('input[placeholder^="e.g. DTDC"]', 'DTDC')
  await page.locator('label:has-text("Tracking number") input').fill('D12345678')
  await page.locator('[data-admin-confirm=shipped]').scrollIntoViewIfNeeded()
  await shot(page, '16-mark-shipped')
  await page.click('[data-admin-confirm=shipped]')
  await page.waitForSelector('[data-admin-action=delivered]')
  ok('order: Payment received -> Preparing -> Shipped (courier + tracking), customer emailed')
  const track = await post('order', { code: seeded.code, phone: '9886512345' })
  if (track.body?.order?.status !== 'shipped' || track.body.order.trackingNo !== 'D12345678') fail(`Track Order doesn't show shipped: ${JSON.stringify(track.body)}`)
  else ok('Track Order shows Shipped with the tracking number')
  await page.click('[data-admin-action=delivered]')
  await page.waitForSelector('text=Delivered')

  // Flow: search
  await page.goto(`${BASE}/admin/orders`)
  await page.fill('#order-search', 'kavya')
  await page.click('button[aria-label=Search]')
  await page.waitForSelector(`[data-admin-order="${seeded.code}"]`)
  ok('search by name finds the order')

  // Flow: change a price, mark sold out
  await page.goto(`${BASE}/admin/menu`)
  const bar = page.locator('[data-admin-product=almond-bar]')
  await bar.locator('input[aria-label=Price]').fill('175')
  await bar.locator('[data-admin-save-product]').click()
  await bar.locator('text=Saved').waitFor()
  await shot(page, '17-price-saved')
  await bar.locator('[data-admin-soldout]').click()
  await bar.locator('text=Sold out').first().waitFor()
  const menu = await fetch(`${BASE}/api/menu?t=${Date.now()}`).then((r) => r.json())
  if (!menu.overrides.some((o) => o.id === 'almond-bar' && o.price === 175 && o.soldOut === true)) fail(`menu change not live: ${JSON.stringify(menu.overrides)}`)
  else ok('price ₹175 and Sold out are live on /api/menu at once')
  await bar.locator('[data-admin-soldout]').click()
  await bar.locator('text=Back to original').click()

  // Flow: a product photo from the "phone"
  // A phone-sized photo (1600 × 1200 JPEG, about 0.5 MB of noise, harder to shrink than a real photo)
  const raw = Buffer.alloc(1600 * 1200 * 3)
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24
  const jpg = await sharp(raw, { raw: { width: 1600, height: 1200, channels: 3 } }).jpeg({ quality: 85 }).toBuffer()
  await page.setInputFiles('[data-admin-photo=plain-brownies]', { name: 'IMG_2041.jpg', mimeType: 'image/jpeg', buffer: jpg })
  await page.locator('[data-admin-product=plain-brownies]').locator('text=Photo saved').waitFor({ timeout: 15000 })
  const menu2 = await fetch(`${BASE}/api/menu?t=${Date.now()}`).then((r) => r.json())
  const photo = menu2.overrides.find((o) => o.id === 'plain-brownies')?.photo
  const served = photo ? await fetch(`${BASE}${photo}`) : null
  const bytes = served?.ok ? Buffer.from(await served.arrayBuffer()) : null
  const meta = bytes ? await sharp(bytes).metadata() : null
  if (!meta) fail('product photo not served')
  else if (meta.width !== 1000 || meta.height !== 1000 || bytes.length > 300_000) fail(`photo not shrunk: ${meta.width}x${meta.height}, ${bytes.length} bytes`)
  else ok(`a ${(jpg.length / 1024).toFixed(0)} KB phone photo became a ${meta.width}×${meta.height} ${meta.format} of ${(bytes.length / 1024).toFixed(0)} KB, served to the website`)

  // Flow: class booking payment check, block a slot
  await page.goto(`${BASE}/admin/classes/bookings/${seeded.booking}`)
  await page.click('[data-admin-booking-action=paymentReceived]')
  await page.waitForSelector('text=Confirmed')
  ok('class booking: Payment received -> Confirmed')
  await page.goto(`${BASE}/admin/classes?tab=weekends`)
  const firstBookable = bookableSaturdays(new Date())[0]
  const weekendCard = page.locator(`[data-admin-weekend-card="${firstBookable}"]`)
  await weekendCard.waitFor()
  // A previous run may have left it closed: open it first, so this run starts the same way
  if ((await weekendCard.locator('[data-admin-block-slot=midday]').count()) === 0) {
    await weekendCard.locator('button:has-text("Open")').last().click()
    await weekendCard.locator('[data-admin-block-slot=midday]').waitFor()
  }
  await weekendCard.locator('[data-admin-block-slot=midday]').click()
  await page.locator('[data-admin-confirm-block]').click()
  await weekendCard.locator('text=Closed').first().waitFor()
  const cls = await fetch(`${BASE}/api/classes`).then((r) => r.json())
  if (cls.weekends[0].slots.find((s) => s.id === 'midday').open) fail('blocked slot still open on the website')
  else ok('a blocked slot can’t be booked on the website')
  await weekendCard.locator('button:has-text("Open")').last().click()
  await weekendCard.locator('[data-admin-block-slot=midday]').waitFor()

  // Flow: report download
  await page.goto(`${BASE}/admin/reports`)
  await page.waitForSelector('[data-admin-monthly]')
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-admin-download=orders]')])
  const name = download.suggestedFilename()
  if (!/^dream-kitchen-orders-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/.test(name)) fail(`report file name: ${name}`)
  else ok(`orders CSV downloads (${name})`)

  // Flow: enquiry handled
  await page.goto(`${BASE}/admin/enquiries`)
  await page.waitForSelector('[data-admin-handled]')
  const before = await page.locator('[data-admin-handled]').count()
  await page.click('[data-admin-handled]')
  await page.waitForFunction((n) => document.querySelectorAll('[data-admin-handled]').length === n - 1, before)
  ok('an enquiry is marked handled')

  // Desktop look, once
  const wide = await newPage(browser, 1280, 800)
  await wide.ctx.addCookies([])
  await wide.page.goto(`${BASE}/admin/demo`)
  await wide.page.waitForSelector('[data-admin-card=payments]')
  await sleep(300)
  await audit(wide.page, 'desktop home')
  await shot(wide.page, 'desktop-home')
  await wide.ctx.close()

  // Log out
  await page.goto(`${BASE}/admin/more`)
  await page.click('text=Log out >> nth=-1')
  await page.waitForSelector('input[type=email]')
  ok('Log out returns to the login page')
  await ctx.close()

  /* ---------- 3. security: customers never get the admin, strangers get nothing ---------- */
  const shop = await newPage(browser)
  const files = []
  shop.page.on('request', (r) => files.push(r.url()))
  for (const path of ['/', '/menu', '/classes', '/contact']) {
    await shop.page.goto(`${BASE}${path}`)
    await shop.page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
    await sleep(600)
  }
  const adminFiles = files.filter((u) => /\/src\/admin\/|netlify\/lib\/adminCore|demoBackend/.test(u))
  if (adminFiles.length) fail(`customer pages loaded admin code: ${adminFiles.join(', ')}`)
  else ok('customer pages load 0 admin files')
  await shop.ctx.close()
  const anon = await post('admin', { action: 'orders' })
  if (anon.status !== 401) fail(`admin without a login answered ${anon.status}`)
  else ok('the admin API refuses anyone without a login (401)')
  const head = await fetch(`${BASE}/admin`).then((r) => r.text())
  if (!/noindex/.test(head)) fail('admin page has no noindex')
  else ok('admin page tells search engines: noindex')
} finally {
  await browser.close()
}

if (report.consoleErrors.length) fail(`console errors: ${report.consoleErrors.length}`)
if (report.overflow.length) fail(`sideways scroll: ${report.overflow.join('; ')}`)
if (report.smallTargets.length) fail(`targets under 48px: ${report.smallTargets.length}`)
writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
console.log(`\n${report.flows.length} checks passed, ${report.failures.length} problems. Report: ${OUT}/qa-report.json`)
if (report.consoleErrors.length) console.log(report.consoleErrors.slice(0, 10).join('\n'))
if (report.smallTargets.length) console.log(report.smallTargets.slice(0, 20).join('\n'))

/* ---------- screenshots for docs/admin-guide-for-hema.md (DK_GUIDE=1) ---------- */
// The demo's sample data, with the DEMO labels hidden, so Hema sees her admin as it will look.
if (process.env.DK_GUIDE === '1') {
  const GUIDE = 'docs/screenshots/admin/guide'
  mkdirSync(GUIDE, { recursive: true })
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const clean = () => page.addStyleTag({ content: '[data-admin-demo],[data-admin-demo-badge],[data-admin-leave]{display:none!important}' })
  const at = async (path, ready, name, act, full = false) => {
    await page.goto(`${BASE}/admin/demo${path}`)
    await page.waitForSelector(ready)
    await clean()
    if (act) await act()
    await sleep(400)
    await page.screenshot({ path: `${GUIDE}/${name}.png`, fullPage: full })
  }
  await page.goto(`${BASE}/admin`)
  await page.waitForSelector('input[type=email]')
  await page.fill('input[type=email]', 'hema@example.com')
  await page.screenshot({ path: `${GUIDE}/01-login.png` })
  await page.click('[data-admin-forgot]')
  await page.screenshot({ path: `${GUIDE}/02-forgot.png` })
  await at('', '[data-admin-card=payments]', '03-home')
  await at('/orders?tab=paid', '[data-admin-order]', '04-orders')
  const code = await page.getAttribute('[data-admin-order]', 'data-admin-order')
  await at(`/orders/${code}`, '[data-admin-history]', '05-order-top')
  await at(`/orders/${code}`, '[data-admin-history]', '06-order-customer', () => page.locator('[data-admin-address]').scrollIntoViewIfNeeded())
  await at(`/orders/${code}`, '[data-admin-action=shipped]', '07-mark-shipped', async () => {
    await page.click('[data-admin-action=shipped]')
    await page.fill('input[placeholder^="e.g. DTDC"]', 'DTDC')
    await page.locator('label:has-text("Tracking number") input').fill('D12345678')
    await page.locator('[data-admin-confirm=shipped]').scrollIntoViewIfNeeded()
  })
  await at(`/orders/${code}/slip`, '[data-admin-packing-slip]', '08-packing-slip')
  await at('/menu', '[data-admin-product]', '09-menu-price', async () => {
    const bar = page.locator('[data-admin-product=almond-bar]')
    await bar.scrollIntoViewIfNeeded()
    await bar.locator('input[aria-label=Price]').fill('175')
    await bar.locator('[data-admin-save-product]').click()
    await bar.locator('text=Saved').waitFor()
  })
  await at('/menu', '[data-admin-product]', '10-menu-sold-out', async () => {
    const bar = page.locator('[data-admin-product=walnut-brownies]')
    await bar.scrollIntoViewIfNeeded()
    await bar.locator('[data-admin-soldout]').click()
    await bar.locator('text=Sold out').first().waitFor()
  })
  await at('/classes', '[data-admin-booking]', '11-class-bookings')
  await at('/classes?tab=attendees', '[data-admin-attendees]', '12-class-attendees')
  await at('/classes?tab=weekends', '[data-admin-weekend-card]', '13-class-weekends')
  await at('/classes?tab=fees', '[data-admin-save-classes]', '14-class-fees')
  await at('/settings', '[data-admin-save-settings]', '15-settings', null, true)
  await at('/enquiries', '[data-admin-enquiry]', '16-enquiries')
  await at('/reports', '[data-admin-monthly]', '17-reports')
  await at('/more', '[data-admin-more]', '18-more')
  await b.close()
  console.log(`guide screenshots in ${GUIDE}`)
}

process.exit(report.failures.length ? 1 : 0)
