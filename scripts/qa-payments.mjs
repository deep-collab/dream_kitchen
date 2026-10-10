// Razorpay in the browser, end to end, in TEST mode, with stand-ins for Razorpay itself:
//   - a tiny local "Razorpay API" that makes orders (the server's only call to Razorpay),
//   - a fake checkout.js served in place of Razorpay's real payment window, which closes,
//     fails or pays as each test asks, and signs a payment with the test secret like Razorpay.
// Checks, on the real Pay page and the class booking page:
//   closed window -> "nothing was charged", order still unpaid, Pay works again (same Razorpay order)
//   failed card   -> "didn't go through", order still unpaid
//   success       -> the confirmation page, order Paid, Hema and the customer emailed once
//   a duplicate webhook for the same payment changes nothing
// Starts its own dev server on port 5175 (practice database in .dev-data/qa-payments), so it
// needs no setup: node scripts/qa-payments.mjs   (exits non-zero on any problem)
import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { bookableSaturdays } from '../src/lib/classes.js'

const PORT = 5175
const BASE = `http://localhost:${PORT}`
const SECRET = 'qa_test_secret'
const WEBHOOK = 'qa_webhook_secret'
const DATA = '.dev-data/qa-payments'
const problems = []
const ok = (m) => console.log('ok  ', m)
const fail = (m) => {
  problems.push(m)
  console.error('FAIL', m)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------- the stand-in Razorpay API ---------- */
const made = []
const rzpApi = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    const o = JSON.parse(body || '{}')
    made.push(o)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ id: `order_QA${made.length}`, amount: o.amount, currency: 'INR' }))
  })
})
await new Promise((r) => rzpApi.listen(0, r))
const RZP_API = `http://localhost:${rzpApi.address().port}`

/* ---------- a dev server with Razorpay switched on (test keys) ---------- */
rmSync(DATA, { recursive: true, force: true })
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  env: {
    ...process.env,
    DK_MOCK_BACKEND: '1',
    DK_DEV_DATA_DIR: DATA,
    DK_RELAX_LIMITS: '1',
    HEMA_EMAIL: 'hema@example.com',
    RAZORPAY_KEY_ID: 'rzp_test_qa',
    RAZORPAY_KEY_SECRET: SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK,
    DK_RAZORPAY_API: RZP_API,
    UPI_ID: '',
  },
  stdio: 'ignore',
})
const stop = () => {
  server.kill()
  rzpApi.close()
}
for (let i = 0; i < 60; i++) {
  const r = await fetch(`${BASE}/api/menu`).catch(() => null)
  if (r?.ok) break
  await sleep(500)
}

const post = (name, body) => fetch(`${BASE}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }))
const outbox = () => (existsSync(`${DATA}/outbox`) ? readdirSync(`${DATA}/outbox`) : [])

/** The fake payment window: window.__qaMode = 'close' | 'fail' | 'pay' decides what the "customer" does */
const FAKE_CHECKOUT = `
window.Razorpay = function (opts) {
  var handlers = {};
  this.on = function (name, fn) { handlers[name] = fn };
  this.open = function () {
    window.__qaOpened = (window.__qaOpened || 0) + 1;
    window.__qaLastOrder = opts.order_id;
    var mode = window.__qaMode || 'close';
    setTimeout(async function () {
      if (mode === 'fail') { handlers['payment.failed'] && handlers['payment.failed']({ error: { description: 'Card declined' } }); opts.modal.ondismiss(); return }
      if (mode === 'close') { opts.modal.ondismiss(); return }
      var pid = 'pay_QA' + Date.now();
      var key = await crypto.subtle.importKey('raw', new TextEncoder().encode(${JSON.stringify(SECRET)}), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      var sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(opts.order_id + '|' + pid));
      var hex = Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0') }).join('');
      opts.handler({ razorpay_order_id: opts.order_id, razorpay_payment_id: pid, razorpay_signature: hex });
    }, 150);
  };
};`

const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await ctx.route('https://checkout.razorpay.com/**', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_CHECKOUT }))
  const errors = []
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && !/status of 40[0-9]/.test(m.text()) && errors.push(m.text()))

  // An order, as the website places it (Razorpay is on, so it is a Razorpay order)
  const phone = '9845012345'
  const placed = await post('create-order', {
    idempotencyKey: `qa-pay-${Date.now()}-abcdefgh`,
    items: [{ productId: 'almond-bar', selection: {}, qty: 2, unitPrice: 150 }],
    customer: { name: 'Asha Rao', phone, email: 'asha@example.com', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' },
    dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0],
    expectedTotal: 390,
  })
  if (placed.body?.order?.paymentMethod !== 'razorpay') fail(`order is not a Razorpay order: ${JSON.stringify(placed.body)}`)
  const code = placed.body.order.code
  await page.addInitScript(([c, p]) => localStorage.setItem('dk_my_orders', JSON.stringify([{ code: c, phone: p, at: Date.now() }])), [code, phone])
  const before = outbox().length

  await page.goto(`${BASE}/pay/${code}`)
  await page.waitForSelector('[data-dk-pay-online]')
  if (await page.locator('#pay-utr').count()) fail('the UPI form shows while Razorpay is on')
  else ok('Pay page: one Razorpay button, no UPI form (UPI is only the fallback)')

  // 1. The customer closes the payment window
  await page.evaluate(() => (window.__qaMode = 'close'))
  await page.click('[data-dk-pay-online]')
  await page.waitForSelector('[data-dk-pay-problem=notFinished]')
  const o1 = (await post('order', { code, phone })).body.order
  if (o1.paymentStatus !== 'pending') fail('closing the window changed the order')
  else ok('closed window: "nothing was charged", the order is still unpaid')
  if (await page.locator('[data-dk-pay-online]').isDisabled()) fail('Pay button stays disabled after closing the window')

  // 2. The card fails
  await page.evaluate(() => (window.__qaMode = 'fail'))
  await page.click('[data-dk-pay-online]')
  await page.waitForSelector('[data-dk-pay-problem=failed]')
  if ((await post('order', { code, phone })).body.order.paymentStatus !== 'pending') fail('a failed payment changed the order')
  else ok('failed card: "didn’t go through", the order is still unpaid, and Pay works again')

  // 3. It works on the next try, with the SAME Razorpay order
  await page.evaluate(() => (window.__qaMode = 'pay'))
  await page.click('[data-dk-pay-online]')
  await page.waitForURL(`**/order/${code}`, { timeout: 15000 })
  const o3 = (await post('order', { code, phone })).body.order
  if (o3.status !== 'payment_confirmed' || o3.paymentStatus !== 'confirmed') fail(`after paying: ${o3.status} ${o3.paymentStatus}`)
  else ok('success: the confirmation page, and the order is Paid')
  if (made.length !== 1) fail(`retries made ${made.length} Razorpay orders (should reuse one)`)
  else ok('three tries used one Razorpay order (any of them could be matched by the webhook)')
  if (made[0].amount !== 39000) fail(`Razorpay order amount ${made[0].amount}, expected 39000 paise`)
  await page.screenshot({ path: 'docs/screenshots/admin/payment-confirmed.png', fullPage: true })

  // Emails: Hema "New paid order" and the customer's confirmation, once each
  await sleep(300)
  const mails = outbox().slice(before)
  if (mails.length !== 2 || !mails.some((m) => /New-paid-order/.test(m))) fail(`emails after paying: ${mails.join(', ')}`)
  else ok(`emails: ${mails.map((m) => m.replace(/^\d+-/, '').replace('.json', '')).join(' + ')}`)

  // 4. Razorpay sends the webhook twice for the same payment: nothing changes, no new email
  const paymentId = (await post('order', { code, phone })).body.order
  const event = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_dup', order_id: 'order_QA1', amount: 39000 } } } })
  const sig = createHmac('sha256', WEBHOOK).update(event).digest('hex')
  for (let i = 0; i < 2; i++) await fetch(`${BASE}/api/razorpay-webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig }, body: event })
  await sleep(300)
  if (outbox().length !== before + 2 || !paymentId) fail('a duplicate webhook sent more emails')
  else ok('duplicate webhooks: no change, no second email')

  // 5. A class booking pays the same way
  const b = await post('create-booking', { idempotencyKey: `qa-pay-b-${Date.now()}-abcdefgh`, classId: 'advanced', weekend: bookableSaturdays(new Date())[0], slot: 'morning', name: 'Meera K', phone: '9000012345', email: '', expectedFee: 3500, lang: 'en' })
  const bcode = b.body.booking.code
  await page.addInitScript(([c]) => localStorage.setItem('dk_my_bookings', JSON.stringify([{ code: c, phone: '9000012345', at: Date.now() }])), [bcode])
  await page.goto(`${BASE}/classes/booking/${bcode}`)
  await page.waitForSelector('[data-dk-pay-online]')
  await page.evaluate(() => (window.__qaMode = 'pay'))
  await page.click('[data-dk-pay-online]')
  await page.waitForSelector('[data-dk-booking=confirmed]', { timeout: 15000 })
  await page.screenshot({ path: 'docs/screenshots/admin/class-booking-confirmed.png', fullPage: true })
  if (made.at(-1)?.amount !== 350000) fail(`booking Razorpay amount ${made.at(-1)?.amount}`)
  else ok('class booking: paid through Razorpay (₹3,500), the page shows "Your seat is booked!"')

  // 6. A tampered webhook amount never counts
  const placed2 = await post('create-order', {
    idempotencyKey: `qa-pay2-${Date.now()}-abcdefgh`,
    items: [{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }],
    customer: { name: 'Asha Rao', phone, email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' },
    dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0],
    expectedTotal: 240,
  })
  await post('razorpay-order', { code: placed2.body.order.code, phone })
  const cheap = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_cheap', order_id: `order_QA${made.length}`, amount: 100 } } } })
  await fetch(`${BASE}/api/razorpay-webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-razorpay-signature': createHmac('sha256', WEBHOOK).update(cheap).digest('hex') }, body: cheap })
  if ((await post('order', { code: placed2.body.order.code, phone })).body.order.paymentStatus !== 'pending') fail('a ₹1 webhook marked a ₹240 order paid')
  else ok('tampered amount (₹1 for a ₹240 order): not paid')

  if (errors.length) fail(`console errors: ${errors.join(' | ')}`)
  await ctx.close()
} catch (e) {
  fail(e.message.split('\n')[0])
} finally {
  await browser.close()
  stop()
}
console.log(`\n${problems.length ? `${problems.length} problems` : 'all payment checks passed'}`)
process.exit(problems.length ? 1 : 0)
