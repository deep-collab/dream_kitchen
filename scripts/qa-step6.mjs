// Step 6 QA: layout at 360/390/768/1280 × English/Kannada on every page, the whole order journey
// (customer -> UPI reference -> admin -> Track Order on a different browser -> emails), the class
// enquiry, security checks, the loading screen, and a timed first-time checkout.
//
// Needs the dev server with the mock backend:
//   UPI_ID=dreamkitchen@okaxis HEMA_EMAIL=hema@example.com DK_DEV_ADMIN_EMAIL=hema@example.com \
//   DK_DEV_ADMIN_PASSWORD=dev-only-pass DK_RELAX_LIMITS=1 npx vite --port 5173
// then: node scripts/qa-step6.mjs        (exits non-zero on any problem)
// Report: docs/screenshots/step6/qa-report.json. Screenshots: docs/screenshots/step6/<width>-<lang>-<page>.png
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { chromium } from 'playwright'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { bookableSaturdays } from '../src/lib/classes.js'

const BASE = 'http://localhost:5173'
const OUT = 'docs/screenshots/step6'
// The dev server's practice emails (DK_DEV_DATA_DIR, as the server was started)
const OUTBOX = `${process.env.DK_DEV_DATA_DIR || '.dev-data'}/outbox`
const WIDTHS = [360, 390, 768, 1280]
const HEIGHT = { 360: 780, 390: 844, 768: 1024, 1280: 800 }
const ADMIN = { email: process.env.DK_DEV_ADMIN_EMAIL || 'hema@example.com', password: process.env.DK_DEV_ADMIN_PASSWORD || 'dev-only-pass' }
const report = { overflow: [], textOverflow: [], smallTargets: [], focus: [], links: [], halfWritten: [], englishOnKannada: [], journey: [], security: [], loader: [], timing: {}, consoleErrors: [], failures: [] }
const fail = (m) => report.failures.push(m)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const RED_VELVET = /Red Velvet Delight Box|ರೆಡ್ ವೆಲ್ವೆಟ್ ಡಿಲೈಟ್ ಬಾಕ್ಸ್/
mkdirSync(OUT, { recursive: true })

/* ---------------- API helpers (to set up orders for the page matrix) ---------------- */
const post = (name, body, headers = {}) =>
  fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
const adminLogin = async () => `Bearer ${(await post('admin', { action: 'login', ...ADMIN })).body.accessToken}`
const customer = { name: 'Asha Rao', phone: '9845012345', email: 'asha@example.com', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
async function apiOrder() {
  const r = await post('create-order', {
    idempotencyKey: `qa-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    items: [
      { productId: 'red-velvet-delight-box', selection: { size: '500g', name: 'Amma', drawing: true, drawingText: 'A small pink teddy bear' }, qty: 1, unitPrice: 1700 },
      { productId: 'assorted-brownies', selection: { ragi: true }, qty: 1, unitPrice: 780 },
    ],
    customer,
    dispatchDate: dateChoices(new Date(), 1, dispatchRules({ drawing: true }))[0],
    expectedTotal: 1700 + 780 + 100,
  })
  if (r.status !== 201) throw new Error(`could not create a QA order: ${JSON.stringify(r.body)}`)
  return r.body.order.code
}

/* ---------------- page helpers ---------------- */
async function newPage(browser, width, lang, { intro = false, reducedMotion = 'no-preference', orders = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: HEIGHT[width] }, deviceScaleFactor: 1, reducedMotion, hasTouch: width < 768, isMobile: width < 768 })
  await ctx.addInitScript(
    ([l, skip, mine]) => {
      if (skip) localStorage.setItem('dk_intro_seen', '1')
      localStorage.setItem('dk_lang', l)
      if (mine.length) localStorage.setItem('dk_my_orders', JSON.stringify(mine.filter((o) => !o.code.startsWith('DK-CL-'))))
      if (mine.some((o) => o.code.startsWith('DK-CL-'))) localStorage.setItem('dk_my_bookings', JSON.stringify(mine.filter((o) => o.code.startsWith('DK-CL-'))))
    },
    [lang, !intro, orders],
  )
  const page = await ctx.newPage()
  page.on('pageerror', (e) => report.consoleErrors.push(`${width}-${lang}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && !/401|404 \(Not Found\)|net::ERR_ABORTED/.test(m.text()) && report.consoleErrors.push(`${width}-${lang}: ${m.text()}`))
  return { ctx, page }
}
async function go(page, path) {
  await page.goto(BASE + path)
  await page.waitForFunction(() => window.__dkReady === true, null, { timeout: 20000 })
  await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 }).catch(() => {})
  await sleep(500)
}

// Sideways scroll, clipped text, small targets, Call / WhatsApp links
async function audit(page, label) {
  const r = await page.evaluate(() => {
    const small = []
    const clipped = []
    const scope = document.querySelector('[role=dialog]') || document
    scope.querySelectorAll('a[href], button, input:not([type=hidden]):not([tabindex="-1"]), select, textarea, summary, [role=switch], label:has(input[type=radio]), label:has(input[type=checkbox])').forEach((el) => {
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height || el.closest('.sr-only, [aria-hidden=true]') || getComputedStyle(el).visibility === 'hidden') return
      if (el.matches('input[type=radio], input[type=checkbox], input[type=file]')) return
      if (b.height < 47.5 || b.width < 47.5) small.push(`${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`)
    })
    scope.querySelectorAll('button, a, .btn, legend, h1, h2, h3, label, dd, dt, p, li, summary, span').forEach((el) => {
      if (el.closest('.sr-only, [aria-hidden=true]') || el.classList.contains('truncate')) return
      const cs = getComputedStyle(el)
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'auto' && cs.display !== 'inline' && el.clientWidth > 2) clipped.push(`${el.tagName.toLowerCase()} "${el.innerText.trim().slice(0, 30)}"`)
    })
    const doc = document.documentElement
    return { overflow: doc.scrollWidth > doc.clientWidth + 1, small, clipped, tel: [...document.querySelectorAll('a[href^="tel:"]')].map((a) => a.getAttribute('href')), wa: [...document.querySelectorAll('a[href*="wa.me"]')].length }
  })
  if (r.overflow) report.overflow.push(label)
  r.small.forEach((s) => report.smallTargets.push(`${label}: ${s}`))
  r.clipped.forEach((s) => report.textOverflow.push(`${label}: ${s}`))
  // Hema, 7 Oct 2026: no Call links on customer pages; WhatsApp only on Home, Contact and the class cards
  // (with the database connected, as here; Track, cart and review add WhatsApp only without it)
  r.tel.forEach((h) => report.links.push(`${label}: Call link ${h}`))
  if (r.wa && !/-(home|contact|classes)$/.test(label)) report.links.push(`${label}: WhatsApp link outside Home, Contact and Classes`)
}

// Half-written text, and English left on a Kannada page
const ALLOWED_LATIN = /Dream Kitchen|Dream|Kitchen|Handmade|Chocolates|DREAM|KITCHEN|Ferrero Rocher|Nutella|Lotus Biscoff|Biscoff|Oreo|Google Pay|PhonePe|Paytm|UTR|UPI|FSSAI|JPG|PNG|WebP|English|EN|Razorpay|Meera K|DK[‑-]CL[‑-]\d{6}[‑-][A-Z0-9]{4}|DK[‑-]\d{6}[‑-][A-Z0-9]{4}|DK|[\w.+-]+@[\w.-]+|dreamkitchen_01_homemade|Asha Rao|Jayanagar 4th Block|3rd Cross|Bengaluru|Amma|A small pink teddy bear|Karnataka|Instagram/g
async function contentChecks(page, label, lang) {
  const text = await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => (d.open = true))
    const parts = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || el.closest('script, style, svg, #dk-intro, input, textarea, select, [aria-hidden=true]')) continue
      if (!el.checkVisibility() && !el.closest('.sr-only')) continue
      if (n.textContent.trim()) parts.push(n.textContent.trim())
    }
    document.querySelectorAll('[aria-label], [alt], [placeholder]').forEach((el) => ['aria-label', 'alt', 'placeholder'].forEach((a) => el.getAttribute(a) && parts.push(el.getAttribute(a))))
    return `${parts.join(' ¦ ')} ¦ ${document.title}`
  })
  for (const [re, what] of [
    [/₹\s*(?![\d,]+)/, 'a ₹ with no amount'],
    [/\b(undefined|null|NaN)\b/, 'undefined/null/NaN'],
    [/\{[a-zA-Z]+\}/, 'an unfilled {placeholder}'],
    [/\b(checkout|cart|sheet|menu|pay|order|track|classes|book|story|contact|faq|errors|common|nav|seo)\.[a-zA-Z]+\b/, 'a raw text key'],
  ]) {
    const m = text.match(new RegExp(`.{0,40}${re.source}.{0,30}`))
    if (m) report.halfWritten.push(`${label}: ${what}: "${m[0]}"`)
  }
  if (lang === 'kn') {
    const left = text.replace(ALLOWED_LATIN, ' ').match(/[A-Za-z]{4,}(?:\s+[A-Za-z]{2,})*/g)
    if (left) report.englishOnKannada.push(`${label}: ${[...new Set(left)].slice(0, 6).join(' | ')}`)
  }
}

async function focusCheck(page, label) {
  const missing = []
  await page.mouse.click(1, 300)
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const r = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      return { name: (el.innerText || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 25), ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }
    })
    if (r && !r.ring) missing.push(r.name)
  }
  if (missing.length) report.focus.push(`${label}: no focus ring on ${missing.join(', ')}`)
}

/* ---------------- 1. layout matrix ---------------- */
async function matrix(browser, codes) {
  const pages = [
    ['home', '/'],
    ['menu', '/menu'],
    ['sheet-delight', '/menu', async (p) => openSheet(p, RED_VELVET, async () => {
      await p.locator('[role=dialog] label').filter({ hasText: /^(500 g|500 ಗ್ರಾಂ)/ }).first().click()
      await p.fill('#ps-name', 'Amma')
      await p.locator('[role=dialog] [role=switch]').last().click()
      await p.fill('#ps-drawingText', 'A small pink teddy bear')
    })],
    ['sheet-brownie', '/menu#brownies', async (p) => openSheet(p, /Assorted|ಅಸಾರ್ಟೆಡ್/, async () => {
      await p.locator('[role=dialog] [role=switch]').first().click()
      await p.locator('[role=dialog] details summary').click()
    })],
    // Products without a price (the Dream Cake Tub until Hema prices it) are not on the menu at all
    ['menu-no-unpriced', '/menu#brownie-tubs', async (p) => {
      if (await p.getByText(/Dream Cake|ಡ್ರೀಮ್ ಕೇಕ್/).count()) throw new Error('an unpriced product is on the menu')
    }],
    ['customize', '/customize'],
    ['cart', '/cart'],
    ['checkout', '/checkout', async (p) => p.locator('[data-dk-next]').click()],
    ['review', '/checkout/review'],
    ['pay', `/pay/${codes.pay}`],
    ['order', `/order/${codes.order}`],
    ['track', `/track?id=${codes.order}`],
    ['classes', '/classes'],
    ['book', '/classes/book?class=brownie', async (p) => {
      await p.locator('label:has(input[name=bk-weekend]:not([disabled]))').first().click()
      await p.locator('label:has(input[name=bk-slot]:not([disabled]))').first().click()
    }],
    ['booking', `/classes/booking/${codes.booking}`],
    ['contact', '/contact'],
    ['story', '/our-story'],
    ['faq', '/faq'],
    ['404', '/no-such-page'],
  ]
  for (const width of WIDTHS)
    for (const lang of ['en', 'kn']) {
      const { ctx, page } = await newPage(browser, width, lang, { orders: [codes.pay, codes.order, codes.booking].map((code) => ({ code, phone: code.startsWith('DK-CL-') ? '9000012345' : customer.phone, at: Date.now() })) })
      // A cart and a checkout draft, as a customer would have them
      await page.addInitScript((c) => {
        sessionStorage.setItem('dk_checkout_draft', JSON.stringify({ form: c, remember: true }))
      }, customer)
      try {
        await go(page, '/menu')
        await addToCart(page, RED_VELVET, true)
        await addToCart(page, /Assorted|ಅಸಾರ್ಟೆಡ್/, false)
      } catch (e) {
        fail(`${width}-${lang} filling the cart: ${e.message.split('\n')[0]}`)
      }
      for (const [name, path, act] of pages) {
        const label = `${width}-${lang}-${name}`
        try {
          await go(page, path)
          if (act) await act(page)
          await sleep(300)
          await audit(page, label)
          await contentChecks(page, label, lang)
          if (lang === 'en' && ['home', 'menu', 'checkout'].includes(name)) await focusCheck(page, label)
          await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: !name.startsWith('sheet') && width <= 390 })
          await page.keyboard.press('Escape')
        } catch (e) {
          fail(`${label}: ${e.message.split('\n')[0]}`)
        }
      }
      await ctx.close()
    }
}
async function openSheet(page, name, then) {
  await page.locator('[data-dk-card] button').filter({ hasText: name }).first().click()
  await page.waitForSelector('[role=dialog]')
  await sleep(450)
  if (then) await then()
}
async function addToCart(page, name, custom) {
  await openSheet(page, name, async () => {
    if (custom) {
      await page.locator('[role=dialog] label').filter({ hasText: /^(500 g|500 ಗ್ರಾಂ)/ }).first().click()
      await page.fill('#ps-name', 'Amma')
      await page.locator('[role=dialog] [role=switch]').last().click()
      await page.fill('#ps-drawingText', 'A small pink teddy bear')
    } else await page.locator('[role=dialog] [role=switch]').first().click()
  })
  await page.locator('[data-dk-add]').click()
  await sleep(400)
}

/* ---------------- 2. the whole journey, timed like a first-time customer ---------------- */
async function journey(browser) {
  const outboxBefore = existsSync(OUTBOX) ? readdirSync(OUTBOX).length : 0
  const { ctx, page } = await newPage(browser, 390, 'en')
  let steps = 0
  const tap = async (sel) => {
    steps++
    await page.locator(sel).first().tap()
  }
  const type = async (sel, text) => {
    steps++
    await page.locator(sel).click()
    await page.locator(sel).pressSequentially(text, { delay: 110 }) // about 9 letters a second, a careful phone typist
  }
  await go(page, '/')
  await tap('a[data-dk-tile]')
  await sleep(600)
  await tap('[data-dk-card] button[data-dk-open]')
  await page.waitForSelector('[role=dialog]')
  await sleep(400)
  await tap('[data-dk-add]')
  await sleep(500)
  report.journey.push(`taps from opening the site to Add to cart: ${steps}`)
  const start = Date.now()
  steps = 0
  await tap('[data-dk-cart]')
  await page.waitForURL(/\/cart$/)
  await sleep(500)
  await tap('[data-dk-continue]')
  await page.waitForURL(/\/checkout$/)
  await sleep(400)
  await type('#co-name', 'Meera Shetty')
  await type('#co-phone', '9741012345')
  await type('#co-line1', '7, Lake View Apartments')
  await type('#co-line2', 'Kuvempu Nagar')
  await type('#co-city', 'Mysuru')
  await type('#co-pincode', '570023')
  steps++
  await page.selectOption('#co-state', 'karnataka')
  await tap('[data-dk-next]')
  await page.waitForURL(/\/review$/)
  await sleep(500)
  await tap('[data-dk-place]')
  await page.waitForURL(/\/pay\//, { timeout: 15000 })
  const code = page.url().split('/pay/')[1]
  await sleep(400)
  await type('#pay-utr', '412345678901')
  await tap('[data-dk-paid]')
  await page.waitForURL(/\/order\//, { timeout: 15000 })
  const seconds = Math.round((Date.now() - start) / 1000)
  report.timing = { checkoutSteps: steps, checkoutSeconds: seconds, note: 'cart -> confirmation, typing at ~9 letters a second, waiting for each page' }
  if (seconds >= 90) fail(`checkout took ${seconds} s`)
  await sleep(400)
  report.journey.push(`order ${code}: confirmation shows "${await page.locator('[data-dk-payment]').getAttribute('data-dk-payment')}"`)
  await page.reload()
  await page.waitForSelector('[data-dk-code]')
  report.journey.push(`confirmation after reload: ${await page.locator('[data-dk-code]').textContent()}`)
  await ctx.close()

  // Hema, in the admin
  const auth = await adminLogin()
  const step = (s, extra = {}) => post('admin', { action: 'orderAction', code, step: s, ...extra }, { authorization: auth })
  // Track Order on a different browser, after each step
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const tp = await other.newPage()
  const track = async () => {
    await tp.goto(`${BASE}/track`)
    await tp.waitForFunction(() => window.__dkReady === true)
    await tp.fill('#tr-id', code)
    await tp.fill('#tr-phone', '97410 12345')
    await tp.locator('[data-dk-track]').click()
    await tp.waitForSelector('[data-dk-status]')
    return tp.locator('[data-dk-status]').getAttribute('data-dk-status')
  }
  const seen = [await track()]
  for (const [s, extra] of [['paymentReceived'], ['preparing'], ['shipped', { courierName: 'DTDC', trackingNo: 'D12345678', trackingUrl: 'https://www.dtdc.in/tracking' }], ['delivered']]) {
    const r = await step(s, extra)
    if (r.status !== 200) fail(`admin ${s}: ${r.status} ${JSON.stringify(r.body)}`)
    seen.push(await track())
    if (s === 'shipped') {
      const text = await tp.locator('[data-dk-status]').innerText()
      report.journey.push(`Track Order (other browser) after Shipped shows the courier: ${/DTDC/.test(text) && /D12345678/.test(text)}`)
      await tp.screenshot({ path: `${OUT}/journey-track-shipped.png`, fullPage: true })
    }
  }
  report.journey.push(`Track Order on another browser, step by step: ${seen.join(' -> ')}`)
  if (seen.join() !== 'placed,payment_confirmed,preparing,shipped,delivered') fail(`track steps: ${seen.join()}`)
  await other.close()
  // Emails (dev outbox): Hema's new order, Hema's payment to check (no customer email given here)
  const outbox = existsSync(OUTBOX) ? readdirSync(OUTBOX).slice(outboxBefore) : []
  report.journey.push(`emails written to .dev-data/outbox: ${outbox.length} (${outbox.map((f) => f.replace(/^\d+-/, '').replace('.json', '')).join(', ')})`)
  // Hema hears about an order once it has a payment (or a UPI reference) to check, not when it is placed
  if (outbox.length < 1) fail('expected the "new order, payment to check" email to Hema')

  // Class enquiry -> admin
  const before = (await post('admin', { action: 'enquiries' }, { authorization: auth })).body.enquiries.length
  const { ctx: c2, page: p2 } = await newPage(browser, 390, 'kn')
  await go(p2, '/classes')
  await p2.fill('#ce-name', 'Lakshmi')
  await p2.fill('#ce-phone', '9886012345')
  await p2.fill('#ce-interest', 'Chocolate making')
  await p2.locator('[data-dk-enquire]').click()
  await p2.waitForSelector('[role=status]')
  await p2.screenshot({ path: `${OUT}/journey-enquiry-sent-kn.png` })
  await c2.close()
  const after = (await post('admin', { action: 'enquiries' }, { authorization: auth })).body.enquiries
  report.journey.push(`class enquiry appears in admin: ${after.length === before + 1 && after[0].name === 'Lakshmi'} (lang ${after[0].lang})`)
  if (after.length !== before + 1) fail('class enquiry did not reach the admin')
}

/* ---------------- 3. security ---------------- */
async function security(browser) {
  const noToken = await post('admin', { action: 'orders' })
  report.security.push(`admin action without a login: ${noToken.status}`)
  if (noToken.status !== 401) fail('admin answered without a login')
  const fake = await post('admin', { action: 'orders' }, { authorization: 'Bearer forged-token' })
  report.security.push(`admin action with a forged token: ${fake.status}`)
  if (fake.status !== 401) fail('admin accepted a forged token')
  const code = await apiOrder()
  const wrong = await post('order', { code, phone: '9000000001' })
  report.security.push(`order lookup with the wrong phone: ${wrong.status}`)
  if (wrong.status !== 404) fail('order shown with the wrong phone')
  const tampered = await post('create-order', {
    idempotencyKey: `qa-tamper-${Date.now()}-xxxxxxxx`,
    items: [{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 1 }],
    customer,
    dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0],
    expectedTotal: 91,
  })
  report.security.push(`order with a tampered price: ${tampered.status} ${tampered.body?.error}`)
  if (tampered.status !== 409) fail('tampered price accepted')
  // The admin page shows only the login form until Hema logs in, and customers never load its code
  const { ctx, page } = await newPage(browser, 390, 'en')
  const requests = []
  page.on('request', (r) => requests.push(r.url()))
  await go(page, '/')
  await go(page, '/menu')
  report.security.push(`customer pages loaded admin code: ${requests.some((u) => /src\/admin|assets\/admin/.test(u))}`)
  if (requests.some((u) => /src\/admin|assets\/admin/.test(u))) fail('customer pages loaded admin code')
  await page.goto(`${BASE}/admin/orders`)
  await page.waitForSelector('input[type=password]')
  report.security.push(`/admin/orders without a login shows: the login form (orders list visible: ${(await page.locator('[data-admin-order]').count()) > 0})`)
  await ctx.close()
}

/* ---------------- 4. loading screen ---------------- */
async function loader(browser) {
  const { ctx, page } = await newPage(browser, 390, 'en', { intro: true })
  await page.goto(BASE + '/')
  const shown = await page.evaluate(() => document.documentElement.classList.contains('dk-intro-on') || !!document.getElementById('dk-intro'))
  const t0 = Date.now()
  await page.waitForFunction(() => !document.getElementById('dk-intro'), null, { timeout: 5000 })
  const ms = await page.evaluate(() => Math.round(performance.now()))
  report.loader.push(`first visit: shown ${shown}, gone ${Date.now() - t0} ms after first check (page time ${ms} ms)`)
  await page.goto(BASE + '/')
  report.loader.push(`second visit shows it: ${await page.evaluate(() => document.documentElement.classList.contains('dk-intro-on'))}`)
  await ctx.close()
  const rm = await newPage(browser, 390, 'en', { intro: true, reducedMotion: 'reduce' })
  await rm.page.goto(BASE + '/')
  report.loader.push(`reduced motion shows it: ${await rm.page.evaluate(() => document.documentElement.classList.contains('dk-intro-on'))}`)
  await rm.ctx.close()
}

/* ---------------- run ---------------- */
const browser = await chromium.launch()
try {
  // Start from Hema's defaults: no menu changes, no banner, shop open
  const auth = await adminLogin()
  for (const id of ['almond-bar', 'pista-bar', 'walnut-brownies']) await post('admin', { action: 'updateProduct', id, reset: true }, { authorization: auth })
  await post('admin', { action: 'updateSettings', announcement: '', storeOpen: true, closedMessage: '' }, { authorization: auth })
  const booking = await post('create-booking', { idempotencyKey: `qa6-b-${Date.now()}-abcdefgh`, classId: 'basic', weekend: bookableSaturdays(new Date())[1], slot: 'midday', name: 'Meera K', phone: '9000012345', email: '', expectedFee: 2500, lang: 'en' })
  if (booking.status !== 201) throw new Error(`could not create a QA booking: ${JSON.stringify(booking.body)}`)
  const codes = { pay: await apiOrder(), order: await apiOrder(), booking: booking.body.booking.code }
  await post('submit-payment', { code: codes.order, phone: customer.phone, utr: '412345678901' })
  await loader(browser)
  await journey(browser)
  await security(browser)
  await matrix(browser, codes)
} catch (e) {
  fail(`QA stopped: ${e.message}`)
} finally {
  await browser.close()
}

const counts = Object.fromEntries(Object.entries(report).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]))
writeFileSync(`${OUT}/qa-report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ counts, journey: report.journey, timing: report.timing, security: report.security, loader: report.loader }, null, 2))
for (const k of ['overflow', 'textOverflow', 'smallTargets', 'focus', 'links', 'halfWritten', 'englishOnKannada', 'consoleErrors', 'failures']) if (report[k].length) console.log(`\n${k}:\n  ${report[k].slice(0, 25).join('\n  ')}`)
const problems = ['overflow', 'textOverflow', 'smallTargets', 'focus', 'links', 'halfWritten', 'englishOnKannada', 'consoleErrors', 'failures'].reduce((n, k) => n + report[k].length, 0)
process.exit(problems ? 1 : 0)
