// The Netlify Functions, called exactly as Netlify calls them (a web Request in, a Response out),
// against the mock store. Covers the brief's server tests: tampered prices and totals, sold-out
// items, duplicate submits (idempotency), bad pincodes, and the whole order journey.
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { createMemoryStore } from '../netlify/lib/store/memory.mjs'
import { setStore } from '../netlify/lib/store/index.mjs'
import { outbox } from '../netlify/lib/email.mjs'
import createOrder from '../netlify/functions/create-order.mjs'
import orderFn from '../netlify/functions/order.mjs'
import submitPayment from '../netlify/functions/submit-payment.mjs'
import upload from '../netlify/functions/upload.mjs'
import classEnquiry from '../netlify/functions/class-enquiry.mjs'
import admin from '../netlify/functions/admin.mjs'
import menuFn from '../netlify/functions/menu.mjs'
import upiQr from '../netlify/functions/upi-qr.mjs'
import razorpayOrder from '../netlify/functions/razorpay-order.mjs'
import razorpayVerify from '../netlify/functions/razorpay-verify.mjs'
import razorpayWebhook from '../netlify/functions/razorpay-webhook.mjs'

const ADMIN = { email: 'hema@example.com', password: 'test-only-password' }
let store
let ip = 0

function call(fn, body, { method = 'POST', headers = {}, query = '', raw } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } }
  if (method !== 'GET') init.body = raw ?? JSON.stringify(body)
  // A different caller IP per test, so the rate limits only bite where a test wants them to
  return fn(new Request(`http://localhost/api/x${query}`, init), { ip: `10.0.0.${ip}` }).then(async (res) => ({ status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.arrayBuffer() }))
}

const customer = (over = {}) => ({
  name: 'Asha Rao',
  phone: '98450 12345',
  email: 'asha@example.com',
  line1: '12, 3rd Cross',
  line2: 'Jayanagar 4th Block',
  city: 'Bengaluru',
  pincode: '560011',
  state: 'karnataka',
  landmark: '',
  note: '',
  ...over,
})
let keyN = 0
const newKey = () => `test-key-${Date.now()}-${keyN++}-abcdef`
const firstDate = (drawing = false) => dateChoices(new Date(), 1, dispatchRules({ drawing }))[0]

/** A valid request for: 1 Red Velvet 500 g + name + drawing (₹1,700) and 2 Almond Bars (₹300), Bengaluru */
function orderBody(over = {}) {
  return {
    idempotencyKey: newKey(),
    items: [
      { productId: 'red-velvet-delight-box', selection: { size: '500g', name: 'Amma', drawing: true, drawingText: 'A small cat' }, qty: 1, unitPrice: 1700 },
      { productId: 'almond-bar', selection: {}, qty: 2, unitPrice: 150 },
    ],
    customer: customer(),
    dispatchDate: firstDate(true),
    expectedTotal: 1700 + 300 + 100, // large tier (500 g box), Karnataka
    lang: 'en',
    website: '',
    ...over,
  }
}

async function adminToken() {
  const r = await call(admin, { action: 'login', ...ADMIN })
  expect(r.status).toBe(200)
  return { authorization: `Bearer ${r.body.accessToken}` }
}

beforeEach(async () => {
  process.env.DK_MOCK_BACKEND = '1'
  process.env.HEMA_EMAIL = 'hema@example.com'
  delete process.env.RAZORPAY_KEY_ID
  delete process.env.RAZORPAY_KEY_SECRET
  delete process.env.RAZORPAY_WEBHOOK_SECRET
  delete process.env.RESEND_API_KEY
  store = createMemoryStore({ admin: ADMIN })
  await store.updateSettings({ upi_id: 'hema@okaxis' })
  setStore(store)
  outbox.length = 0
  ip++
})
afterEach(() => setStore(null))

describe('create-order', () => {
  it('re-prices and saves: ₹1,700 + ₹300 + ₹100 large courier = ₹2,100; the UPI customer gets how to pay, Hema nothing yet', async () => {
    const r = await call(createOrder, orderBody())
    expect(r.status).toBe(201)
    const o = r.body.order
    expect(o.code).toMatch(/^DK-\d{6}-[2-9A-HJ-NP-Z]{4}$/)
    expect([o.subtotal, o.courier, o.total]).toEqual([2000, 100, 2100])
    expect(o.status).toBe('placed')
    expect(o.paymentStatus).toBe('pending')
    expect(o.items[0]).toMatchObject({ size: '500 g', nameOnBox: 'Amma', drawing: true, drawingText: 'A small cat', unitPrice: 1700 })
    const saved = await store.getOrder(o.code)
    expect(saved.customer_phone).toBe('9845012345')
    expect(saved.zone).toBe('karnataka')
    expect(saved.courier_tier).toBe('large')
    // Hema hears about an order once it is paid or has a UPI reference to check (not abandoned ones)
    expect(outbox.map((m) => m.to)).toEqual(['asha@example.com'])
    expect(outbox[0].text).toContain('Please pay ₹2,100 by UPI')
  })

  it('a tampered unit price is rejected (409) with today’s price, and nothing is saved', async () => {
    const body = orderBody()
    body.items[1].unitPrice = 1
    body.expectedTotal = 1700 + 2 + 100
    const r = await call(createOrder, body)
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ error: 'priceChanged', lines: [{ index: 1, unitPrice: 150 }] })
    expect(await store.listOrders()).toHaveLength(0)
  })

  it('a tampered total (e.g. the courier dropped) is rejected', async () => {
    const r = await call(createOrder, orderBody({ expectedTotal: 2000 }))
    expect(r.status).toBe(409)
    expect(r.body).toMatchObject({ error: 'totalChanged', total: 2100, courier: 100 })
  })

  it('a sold-out item is rejected', async () => {
    await store.upsertProducts([{ id: 'almond-bar', slug: 'almond-bar', category: 'chocolates', name_en: 'Almond Bar', sold_out: true }])
    const r = await call(createOrder, orderBody())
    expect(r.status).toBe(422)
    expect(r.body).toMatchObject({ error: 'items', lines: [{ index: 1, error: 'soldOut' }] })
  })

  it('a tub without a price yet can’t be ordered', async () => {
    const body = orderBody({ items: [{ productId: 'dream-cake-tub', selection: {}, qty: 1, unitPrice: 1 }], expectedTotal: 91 })
    const r = await call(createOrder, body)
    expect(r.status).toBe(422)
    expect(r.body.lines[0].error).toBe('unavailable')
  })

  it('a duplicate submit (same idempotency key) returns the same order, saved and emailed once', async () => {
    const body = orderBody()
    const [a, b] = await Promise.all([call(createOrder, body), call(createOrder, body)])
    const c = await call(createOrder, body)
    expect(new Set([a.body.order.code, b.body.order.code, c.body.order.code]).size).toBe(1)
    expect([a.status, b.status, c.status].sort()).toEqual([200, 200, 201])
    expect(await store.listOrders()).toHaveLength(1)
    expect(outbox.filter((m) => m.to === 'asha@example.com')).toHaveLength(1)
  })

  it.each([
    ['12345', 'format'],
    ['056001', 'format'],
    ['', 'required'],
  ])('an invalid pincode "%s" is blocked', async (pincode, reason) => {
    const r = await call(createOrder, orderBody({ customer: customer({ pincode }) }))
    expect(r.status).toBe(400)
    expect(r.body).toMatchObject({ error: 'details', fields: { pincode: reason } })
  })

  it('ships all over India: Delhi pays the outside rate, and a state mismatch is only a warning', async () => {
    const r = await call(createOrder, orderBody({ customer: customer({ pincode: '110001', state: 'karnataka' }), expectedTotal: 2000 + 150 }))
    expect(r.status).toBe(201)
    expect(r.body.order.courier).toBe(150)
    expect(r.body.stateWarning).toBe(true)
  })

  it('every detail is checked like on the page', async () => {
    const r = await call(createOrder, orderBody({ customer: customer({ name: 'A', phone: '12345', email: 'nope', line1: '', state: 'atlantis' }) }))
    expect(r.status).toBe(400)
    expect(r.body.fields).toEqual({ name: 'short', phone: 'invalid', email: 'invalid', line1: 'required', state: 'invalid' })
  })

  it('a drawing order can’t pick a date inside the drawing lead time', async () => {
    const r = await call(createOrder, orderBody({ dispatchDate: firstDate(false) }))
    expect(r.status).toBe(422)
    expect(r.body).toMatchObject({ error: 'dispatchDate', reason: 'tooSoon', earliest: firstDate(true) })
  })

  it('quantities and choices are checked: 11 of one item, a fake size, a 21-letter name', async () => {
    const bad = (item) => call(createOrder, orderBody({ items: [item], expectedTotal: 0 }))
    expect((await bad({ productId: 'almond-bar', selection: {}, qty: 11, unitPrice: 150 })).body.lines[0].error).toBe('qty')
    expect((await bad({ productId: 'mango-delight-box', selection: { size: '2kg' }, qty: 1, unitPrice: 9 })).body.lines[0]).toMatchObject({ error: 'choices', fields: { size: 'unknown' } })
    expect((await bad({ productId: 'mango-delight-box', selection: { size: '250g', name: 'x'.repeat(21) }, qty: 1, unitPrice: 650 })).body.lines[0].fields).toEqual({ name: 'long' })
    expect((await bad({ productId: 'no-such-thing', selection: {}, qty: 1, unitPrice: 1 })).body.lines[0].error).toBe('removed')
  })

  it('a reference photo path that wasn’t uploaded is refused', async () => {
    const body = orderBody()
    body.items[0].selection.drawingRef = 'refs/20261005/0b0c8f5e-6a43-4f43-9a0e-2d6f2f1b7c11.webp'
    const r = await call(createOrder, body)
    expect(r.status).toBe(422)
    expect(r.body.lines[0].fields).toEqual({ drawingRef: 'invalid' })
  })

  it('the honeypot field refuses bots', async () => {
    const r = await call(createOrder, orderBody({ website: 'http://spam.example' }))
    expect(r.status).toBe(400)
    expect(r.body.error).toBe('rejected')
  })

  it('no UPI ID yet: "payments closed", no order', async () => {
    await store.updateSettings({ upi_id: null })
    const r = await call(createOrder, orderBody())
    expect(r.status).toBe(503)
    expect(r.body.error).toBe('paymentsClosed')
  })

  it('store closed by Hema: no orders', async () => {
    await store.updateSettings({ store_open: false })
    expect((await call(createOrder, orderBody())).body.error).toBe('storeClosed')
  })

  it('rate limits: the 7th order from one phone in an hour is refused', async () => {
    const statuses = []
    for (let i = 0; i < 7; i++) statuses.push((await call(createOrder, orderBody())).status)
    expect(statuses).toEqual([201, 201, 201, 201, 201, 201, 429])
  })

  it('deployed without Supabase: "not ready", never a fake success', async () => {
    setStore(null)
    delete process.env.DK_MOCK_BACKEND
    const r = await call(createOrder, orderBody())
    expect(r.status).toBe(503)
    expect(r.body.error).toBe('notReady')
    expect((await call(menuFn, null, { method: 'GET' })).body).toEqual({ ready: false })
  })

  it('refuses other methods and oversized bodies', async () => {
    expect((await call(createOrder, null, { method: 'GET' })).status).toBe(405)
    expect((await call(createOrder, null, { raw: 'x'.repeat(70_000) })).status).toBe(413)
    expect((await call(createOrder, null, { raw: '{oops' })).status).toBe(400)
  })
})

describe('order lookup (confirmation page, Track Order)', () => {
  it('needs the code AND the phone; a wrong phone looks exactly like a wrong code', async () => {
    const code = (await call(createOrder, orderBody())).body.order.code
    const ok = await call(orderFn, { code: code.toLowerCase().replaceAll('-', ' '), phone: '+91 98450-12345' })
    expect(ok.status).toBe(200)
    expect(ok.body.order.code).toBe(code)
    expect(JSON.stringify(ok.body)).not.toMatch(/Jayanagar|3rd Cross|asha@example/) // no address or email
    const wrongPhone = await call(orderFn, { code, phone: '9999999999' })
    const wrongCode = await call(orderFn, { code: 'DK-261005-ZZZZ', phone: '9845012345' })
    expect([wrongPhone.status, wrongCode.status]).toEqual([404, 404])
    expect(wrongPhone.body).toEqual(wrongCode.body)
  })

  it('stops anyone guessing codes: 40 lookups per 10 minutes per IP', async () => {
    let last
    for (let i = 0; i < 41; i++) last = await call(orderFn, { code: 'DK-261005-ZZZZ', phone: '9845012345' })
    expect(last.status).toBe(429)
  })
})

describe('UPI payment', () => {
  it('the UTR (12 digits) makes the order "submitted – awaiting check" and emails Hema', async () => {
    const code = (await call(createOrder, orderBody())).body.order.code
    outbox.length = 0
    expect((await call(submitPayment, { code, phone: '9845012345', utr: '1234' })).body).toMatchObject({ error: 'utr', reason: 'format' })
    const r = await call(submitPayment, { code, phone: '9845012345', utr: '4123 5678 9012' })
    expect(r.status).toBe(200)
    expect(r.body.order.paymentStatus).toBe('submitted')
    expect(r.body.order.utrLast4).toBe('9012')
    expect((await store.getOrder(code)).utr).toBe('412356789012')
    expect(outbox[0]).toMatchObject({ to: 'hema@example.com' })
    expect(outbox[0].subject).toBe(`New order, payment to check ${code} – ₹2,100`)
    expect(outbox[0].text).toContain('UPI reference 412356789012')
    expect(outbox[0].text).toContain(`/admin/orders/${code}`)
    expect((await call(submitPayment, { code, phone: '9000000000', utr: '412356789012' })).status).toBe(404)
  })

  it('a payment screenshot must be an image uploaded for that order', async () => {
    const code = (await call(createOrder, orderBody())).body.order.code
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3])
    const up = await call(upload, null, { raw: png, query: `?kind=payment&code=${code}&phone=9845012345`, headers: { 'content-type': 'image/png' } })
    expect(up.status).toBe(201)
    expect(up.body.path).toMatch(new RegExp(`^payments/${code}/[0-9a-f-]{36}\\.png$`))
    expect((await call(submitPayment, { code, phone: '9845012345', utr: '412356789012', screenshot: 'payments/DK-261005-ZZZZ/x.png' })).body.error).toBe('screenshot')
    const r = await call(submitPayment, { code, phone: '9845012345', utr: '412356789012', screenshot: up.body.path })
    expect(r.status).toBe(200)
  })
})

describe('uploads', () => {
  it('accepts real images only, 5 MB at most, under a random private name', async () => {
    const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
    const ok = await call(upload, null, { raw: jpg, query: '?kind=drawing', headers: { 'content-type': 'image/jpeg' } })
    expect(ok.status).toBe(201)
    expect(ok.body.path).toMatch(/^refs\/\d{8}\/[0-9a-f-]{36}\.jpg$/)
    const html = new TextEncoder().encode('<html><script>alert(1)</script>')
    expect((await call(upload, null, { raw: html, query: '?kind=drawing', headers: { 'content-type': 'image/png' } })).status).toBe(415)
    expect((await call(upload, null, { raw: jpg, query: '?kind=other' })).status).toBe(400)
    expect((await call(upload, null, { raw: new Uint8Array(5 * 1024 * 1024 + 10), query: '?kind=drawing' })).status).toBe(413)
    expect((await call(upload, null, { raw: jpg, query: '?kind=payment&code=DK-261005-ZZZZ&phone=9845012345' })).status).toBe(404)
  })

  it('a drawing order can carry its uploaded reference photo', async () => {
    const webp = Uint8Array.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), 1, 2])
    const path = (await call(upload, null, { raw: webp, query: '?kind=drawing', headers: { 'content-type': 'image/webp' } })).body.path
    const body = orderBody()
    body.items[0].selection.drawingRef = path
    const r = await call(createOrder, body)
    expect(r.status).toBe(201)
    expect(r.body.order.items[0].hasDrawingRef).toBe(true)
    expect((await store.getOrder(r.body.order.code)).items[0].drawingRef).toBe(path)
  })
})

describe('admin', () => {
  it('every action except login needs Hema’s token', async () => {
    expect((await call(admin, { action: 'orders' })).status).toBe(401)
    expect((await call(admin, { action: 'orders' }, { headers: { authorization: 'Bearer nope' } })).status).toBe(401)
    expect((await call(admin, { action: 'login', email: ADMIN.email, password: 'wrong' })).status).toBe(401)
    const h = await adminToken()
    expect((await call(admin, { action: 'orders' }, { headers: h })).status).toBe(200)
  })

  it('the whole journey: placed → UTR → payment received → shipped (+ email) → delivered, each step on Track Order', async () => {
    const h = await adminToken()
    const code = (await call(createOrder, orderBody())).body.order.code
    let list = await call(admin, { action: 'orders', tab: 'new' }, { headers: h })
    expect(list.body.counts).toMatchObject({ new: 1, paid: 0 })
    expect(list.body.orders[0]).toMatchObject({ code, total: 2100, paymentStatus: 'pending', hasDrawing: true })
    expect(list.body.orders[0].itemsText).toBe('Red Velvet Delight Box 500 g + drawing × 1, Almond Bar × 2')

    await call(submitPayment, { code, phone: '9845012345', utr: '412356789012' })
    list = await call(admin, { action: 'orders', tab: 'new' }, { headers: h })
    expect(list.body.orders.map((o) => [o.code, o.paymentStatus])).toEqual([[code, 'submitted']])

    const step = (name, extra = {}) => call(admin, { action: 'orderAction', code, step: name, ...extra }, { headers: h })
    const track = async () => (await call(orderFn, { code, phone: '9845012345' })).body.order

    // Hema can't skip ahead: "shipped" isn't allowed before the payment is received
    expect((await step('shipped', { courierName: 'DTDC', trackingNo: 'D123' })).body).toMatchObject({ error: 'transition', status: 'placed' })

    let r = await step('paymentReceived')
    expect(r.body.order).toMatchObject({ status: 'payment_confirmed', paymentStatus: 'confirmed', actions: ['preparing', 'shipped', 'cancel'] })
    expect((await track()).status).toBe('payment_confirmed')

    expect(outbox.at(-1)).toMatchObject({ to: 'asha@example.com', subject: `Payment received: order ${code}` })
    r = await step('preparing')
    expect((await track()).status).toBe('preparing')
    expect(outbox.at(-1).subject).toBe(`Your order ${code} is being prepared`)

    // Shipping needs the courier and tracking number
    expect((await step('shipped')).body).toMatchObject({ error: 'fields', fields: { courierName: 'required', trackingNo: 'required' } })
    expect((await step('shipped', { courierName: 'DTDC', trackingNo: 'D1234567', trackingUrl: 'javascript:alert(1)' })).body.fields).toEqual({ trackingUrl: 'invalid' })
    outbox.length = 0
    r = await step('shipped', { courierName: 'DTDC', trackingNo: 'D1234567', trackingUrl: 'https://www.dtdc.in/tracking' })
    expect(r.status).toBe(200)
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ to: 'asha@example.com' })
    expect(outbox[0].text).toContain('D1234567')
    let t = await track()
    expect(t).toMatchObject({ status: 'shipped', courierName: 'DTDC', trackingNo: 'D1234567', trackingUrl: 'https://www.dtdc.in/tracking' })

    r = await step('delivered')
    expect(outbox.at(-1).subject).toBe(`Your order ${code} has been delivered`)
    t = await track()
    expect(t.status).toBe('delivered')
    expect(Object.keys(t.timeline)).toEqual(['placed', 'payment_confirmed', 'preparing', 'shipped', 'delivered'])

    // Every change is in order_events, with who did it
    expect(r.body.order.events.map((e) => [e.kind, e.to_status, e.by])).toEqual([
      ['status', 'placed', 'customer'],
      ['payment', 'submitted', 'customer'],
      ['status', 'payment_confirmed', ADMIN.email],
      ['status', 'preparing', ADMIN.email],
      ['status', 'shipped', ADMIN.email],
      ['status', 'delivered', ADMIN.email],
    ])
    expect((await step('cancel', { reason: 'Too late' })).status).toBe(409)
    expect((await call(admin, { action: 'orders', tab: 'delivered' }, { headers: h })).body.counts.delivered).toBe(1)
  })

  it('cancel asks for a reason, and Track Order shows it separately', async () => {
    const h = await adminToken()
    const code = (await call(createOrder, orderBody())).body.order.code
    expect((await call(admin, { action: 'orderAction', code, step: 'cancel' }, { headers: h })).body.fields).toEqual({ reason: 'required' })
    await call(admin, { action: 'orderAction', code, step: 'cancel', reason: 'Customer asked to cancel' }, { headers: h })
    const t = (await call(orderFn, { code, phone: '9845012345' })).body.order
    expect(t).toMatchObject({ status: 'cancelled', cancelReason: 'Customer asked to cancel' })
  })

  it('the order page shows reference photos through private links only', async () => {
    const h = await adminToken()
    const webp = Uint8Array.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), 1, 2])
    const path = (await call(upload, null, { raw: webp, query: '?kind=drawing' })).body.path
    const body = orderBody()
    body.items[0].selection.drawingRef = path
    const code = (await call(createOrder, body)).body.order.code
    const o = (await call(admin, { action: 'order', code }, { headers: h })).body.order
    expect(o.items[0].drawingRefUrl).toMatch(/^data:image\/webp;base64,/) // with Supabase: a 10-minute signed URL
    expect(o.address).toMatchObject({ line1: '12, 3rd Cross', pincode: '560011', state: 'Karnataka' })
    expect(o.phone).toBe('9845012345')
  })

  it('menu: a price change applies to the website and the server at once', async () => {
    const h = await adminToken()
    let r = await call(admin, { action: 'updateProduct', id: 'almond-bar', price: 175 }, { headers: h })
    expect(r.body.products.find((p) => p.id === 'almond-bar')).toMatchObject({ price: 175, changed: true })
    // The website reads the change from /api/menu...
    const menu = (await call(menuFn, null, { method: 'GET' })).body
    expect(menu.overrides).toEqual([{ id: 'almond-bar', price: 175 }])
    // ...and an order priced before the change is refused with the new price
    const stale = await call(createOrder, orderBody())
    expect(stale.body).toMatchObject({ error: 'priceChanged', lines: [{ index: 1, unitPrice: 175 }] })
    // Back to the config price
    r = await call(admin, { action: 'updateProduct', id: 'almond-bar', reset: true }, { headers: h })
    expect(r.body.products.find((p) => p.id === 'almond-bar')).toMatchObject({ price: 150, changed: false })
  })

  it('menu: Hema turns on the Dream Cake Tub by giving its sizes and prices', async () => {
    const h = await adminToken()
    expect((await call(admin, { action: 'updateProduct', id: 'dream-cake-tub', priceStatus: 'live' }, { headers: h })).body.fields).toEqual({ sizes: 'needPrices' })
    const sizes = [
      { label: 'Small', price: 499 },
      { label: 'Large', price: 899 },
    ]
    const r = await call(admin, { action: 'updateProduct', id: 'dream-cake-tub', priceStatus: 'live', sizes }, { headers: h })
    expect(r.body.products.find((p) => p.id === 'dream-cake-tub')).toMatchObject({
      priceStatus: 'live',
      sizes: [
        { id: 'size-1', label: 'Small', price: 499 },
        { id: 'size-2', label: 'Large', price: 899 },
      ],
    })
    const order = orderBody({ items: [{ productId: 'dream-cake-tub', selection: { size: 'size-2' }, qty: 1, unitPrice: 899 }], dispatchDate: firstDate(false), expectedTotal: 899 + 90 })
    expect((await call(createOrder, order)).status).toBe(201)
  })

  it('menu: sold out and hidden', async () => {
    const h = await adminToken()
    await call(admin, { action: 'updateProduct', id: 'pista-bar', soldOut: true }, { headers: h })
    await call(admin, { action: 'updateProduct', id: 'walnut-brownies', active: false }, { headers: h })
    const menu = (await call(menuFn, null, { method: 'GET' })).body
    expect(menu.overrides).toEqual(
      expect.arrayContaining([
        { id: 'pista-bar', soldOut: true },
        { id: 'walnut-brownies', active: false },
      ]),
    )
    expect((await call(admin, { action: 'updateProduct', id: 'pista-bar', price: -3 }, { headers: h })).body.fields).toEqual({ price: 'price' })
  })

  it('settings: UPI, QR, lead times, courier rates, store open, announcement; the red UPI warning', async () => {
    const h = await adminToken()
    await store.updateSettings({ upi_id: null })
    expect((await call(admin, { action: 'me' }, { headers: h })).body.warnings).toContain('paymentsOff')
    expect((await call(admin, { action: 'updateSettings', upiId: 'not a upi' }, { headers: h })).body.fields).toEqual({ upiId: 'invalid' })
    const png = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1]).toString('base64')}`
    const r = await call(
      admin,
      {
        action: 'updateSettings',
        upiId: 'dreamkitchen@okaxis',
        upiQr: png,
        leadStandard: 3,
        courierRates: { small: { karnataka: 95, outside: 110 }, large: { karnataka: 105, outside: 160 }, xl: { karnataka: 120, outside: 180 } },
        announcement: 'Diwali orders close on 25 Oct',
        storeOpen: true,
      },
      { headers: h },
    )
    expect(r.status).toBe(200)
    expect(r.body.warnings).not.toContain('paymentsOff')
    expect(r.body.settings).toMatchObject({ effectiveUpiId: 'dreamkitchen@okaxis', hasQr: true, leadStandard: 3, announcement: 'Diwali orders close on 25 Oct' })
    const menu = (await call(menuFn, null, { method: 'GET' })).body
    expect(menu.settings).toMatchObject({ upiId: 'dreamkitchen@okaxis', leadStandard: 3, courierRates: { small: { karnataka: 95 } }, announcement: 'Diwali orders close on 25 Oct' })
    expect(menu.settings.upiQr).toMatch(/^\/api\/upi-qr\?v=\d+$/)
    expect((await call(upiQr, null, { method: 'GET' })).status).toBe(200)
    // New rates apply to orders straight away (the old total is refused with the new courier)
    expect((await call(createOrder, orderBody())).body).toMatchObject({ error: 'totalChanged', courier: 105 })
  })

  it('class enquiries: checked, saved, emailed to Hema, listed in admin', async () => {
    const bad = await call(classEnquiry, { name: '', phone: '123', interest: '' })
    expect(bad.body).toMatchObject({ error: 'details', fields: { name: 'required', phone: 'invalid', interest: 'required' } })
    const ok = await call(classEnquiry, { name: 'Ravi', phone: '9000012345', interest: 'Chocolate making', dates: 'Weekends in November', message: 'Two people', lang: 'kn', website: '' })
    expect(ok.status).toBe(201)
    expect(outbox.at(-1)).toMatchObject({ to: 'hema@example.com', subject: 'Class enquiry: Ravi' })
    const h = await adminToken()
    const list = (await call(admin, { action: 'enquiries' }, { headers: h })).body.enquiries
    expect(list[0]).toMatchObject({ name: 'Ravi', phone: '9000012345', interest: 'Chocolate making', preferred_dates: 'Weekends in November', status: 'new', lang: 'kn' })
    const upd = await call(admin, { action: 'updateEnquiry', id: list[0].id, status: 'handled' }, { headers: h })
    expect(upd.body.enquiry).toMatchObject({ status: 'handled', handled: true, kind: 'class' })
    expect((await call(classEnquiry, { name: 'Bot', phone: '9000012345', interest: 'x x', website: 'spam' })).body.error).toBe('rejected')
  })
})

describe('Razorpay (built, off until its keys are set)', () => {
  it('is off without keys', async () => {
    expect((await call(razorpayOrder, { code: 'DK-261005-ZZZZ', phone: '9845012345' })).status).toBe(404)
    expect((await call(menuFn, null, { method: 'GET' })).body.razorpay).toEqual({ enabled: false })
  })

  it('with keys: creates the order server-side, accepts only a valid signature, and the webhook confirms too', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_123'
    process.env.RAZORPAY_KEY_SECRET = 'secret_abc'
    process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_xyz'
    const code = (await call(createOrder, orderBody())).body.order.code
    const realFetch = globalThis.fetch
    let sent
    globalThis.fetch = async (url, init) => {
      sent = { url, body: JSON.parse(init.body) }
      return new Response(JSON.stringify({ id: 'order_RZP1', amount: sent.body.amount }), { status: 200 })
    }
    try {
      const r = await call(razorpayOrder, { code, phone: '9845012345' })
      expect(r.body).toMatchObject({ keyId: 'rzp_test_123', razorpayOrderId: 'order_RZP1', amount: 210000 })
      expect(sent).toMatchObject({ url: 'https://api.razorpay.com/v1/orders', body: { amount: 210000, currency: 'INR', receipt: code } })
    } finally {
      globalThis.fetch = realFetch
    }
    const bad = await call(razorpayVerify, { code, phone: '9845012345', razorpayOrderId: 'order_RZP1', razorpayPaymentId: 'pay_1', signature: 'forged' })
    expect(bad.status).toBe(400)
    const signature = createHmac('sha256', 'secret_abc').update('order_RZP1|pay_1').digest('hex')
    const good = await call(razorpayVerify, { code, phone: '9845012345', razorpayOrderId: 'order_RZP1', razorpayPaymentId: 'pay_1', signature })
    expect(good.body.order).toMatchObject({ status: 'payment_confirmed', paymentStatus: 'confirmed', paymentMethod: 'razorpay' })

    // The webhook path (a second order, paid while the customer closed the page)
    const code2 = (await call(createOrder, orderBody())).body.order.code
    await store.setRazorpayOrderId(code2, 'order_RZP2')
    const event = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_2', order_id: 'order_RZP2', amount: 210000 } } } })
    expect((await call(razorpayWebhook, null, { raw: event, headers: { 'x-razorpay-signature': 'nope' } })).status).toBe(400)
    const sig = createHmac('sha256', 'whsec_xyz').update(event).digest('hex')
    expect((await call(razorpayWebhook, null, { raw: event, headers: { 'x-razorpay-signature': sig } })).status).toBe(200)
    expect((await store.getOrder(code2)).payment_status).toBe('confirmed')
    // A webhook for the wrong amount doesn't count
    const code3 = (await call(createOrder, orderBody())).body.order.code
    await store.setRazorpayOrderId(code3, 'order_RZP3')
    const cheap = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_3', order_id: 'order_RZP3', amount: 100 } } } })
    await call(razorpayWebhook, null, { raw: cheap, headers: { 'x-razorpay-signature': createHmac('sha256', 'whsec_xyz').update(cheap).digest('hex') } })
    expect((await store.getOrder(code3)).payment_status).toBe('pending')
  })
})
